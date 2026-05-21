'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { crearFacturaSchema, FacturaFormValues } from '@/lib/validators';
import { calcularLineaProducto, calcularResumenFactura } from '@/lib/dte-calculator';
import { fetchClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { DEPARTAMENTOS, getMunicipiosPorDepto, ACTIVIDADES_ECONOMICAS } from '@/lib/catalogos-mh';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  FileText,
  User,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Package,
  Info,
  Heart,
  Globe,
  Link2,
} from 'lucide-react';
import { TIPOS_DTE, CONDICIONES_OPERACION } from '@/lib/constants';

// ── Tipos de documento receptor ────────────────────────────
const TIPOS_DOCUMENTO = [
  { codigo: '36', nombre: 'NIT' },
  { codigo: '13', nombre: 'DUI' },
  { codigo: '02', nombre: 'Carné de Extranjero' },
  { codigo: '03', nombre: 'Pasaporte' },
  { codigo: '37', nombre: 'Otro' },
];

// ── Todos los tipos de DTE emitibles por el contribuyente ──
const DTE_USUARIO = TIPOS_DTE.filter((t) =>
  ['01', '03', '04', '05', '06', '11', '14', '15'].includes(t.codigo)
);

// ── Mapa de info adicional por tipo ──
const DTE_INFO: Record<string, { descripcion: string; alertColor: string; requiereDocRelacionado?: boolean; esFiscal?: boolean; esExportacion?: boolean; esDonacion?: boolean; esExcluido?: boolean }> = {
  '01': { descripcion: 'Factura para consumidor final. Precios con IVA incluido.', alertColor: 'blue' },
  '03': { descripcion: 'Para clientes con NIT/NRC. Precios sin IVA — el impuesto se desglosa.', alertColor: 'purple', esFiscal: true },
  '04': { descripcion: 'Nota de Remisión. Para traslados de mercancía sin transacción de venta inmediata.', alertColor: 'amber', esFiscal: true },
  '05': { descripcion: 'Nota de Crédito: ajuste a un CCF existente (devoluciones, descuentos). Requiere documento relacionado.', alertColor: 'green', esFiscal: true, requiereDocRelacionado: true },
  '06': { descripcion: 'Nota de Débito: cargo adicional a un CCF existente. Requiere documento relacionado.', alertColor: 'orange', esFiscal: true, requiereDocRelacionado: true },
  '11': { descripcion: 'Para ventas al exterior. El receptor es una entidad extranjera. Sin IVA.', alertColor: 'cyan', esExportacion: true },
  '14': { descripcion: 'Para personas naturales sin obligaciones tributarias (sujetos excluidos de IVA). Con retención de renta 10%.', alertColor: 'rose', esExcluido: true },
  '15': { descripcion: 'Comprobante de Donación. El donante puede ser anónimo.', alertColor: 'pink', esDonacion: true },
};

const PAISES_FEX = [
  { codigo: '9320', nombre: 'ESTADOS UNIDOS' },
  { codigo: '9539', nombre: 'MEXICO' },
  { codigo: '9303', nombre: 'CANADA' },
  { codigo: '9306', nombre: 'GUATEMALA' },
  { codigo: '9309', nombre: 'HONDURAS' },
  { codigo: '9310', nombre: 'NICARAGUA' },
  { codigo: '9315', nombre: 'COSTA RICA' },
  { codigo: '9999', nombre: 'OTRO PAÍS' },
];

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FacturaFormValues>({
    resolver: zodResolver(crearFacturaSchema as any),
    defaultValues: {
      tipoDte: '01',
      condicionOperacion: 1,
      receptor: {
        tipoDocumento: '36',
        nombre: '',
        numDocumento: '',
        nit: '',
        nrc: '',
        codActividad: '',
        descActividad: '',
        correo: '',
        telefono: '',
        direccion: { departamento: '06', municipio: '14', complemento: '' },
      },
      items: [
        { descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, tipoItem: 1, uniMedida: 99, codigo: '' },
      ],
      observaciones: '',
      documentoRelacionado: undefined,
      datosExportacion: { tipoItemExpor: 1, seguro: 0, flete: 0 },
    },
  });

  const { fields: itemsFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchAll = form.watch();
  const tipoDte = watchAll.tipoDte;
  const dteInfo = DTE_INFO[tipoDte] || DTE_INFO['01'];
  const esCCF = tipoDte === '03';
  const esNR = tipoDte === '04';
  const esNCND = tipoDte === '05' || tipoDte === '06';
  const esFEX = tipoDte === '11';
  const esFSE = tipoDte === '14';
  const esCD = tipoDte === '15';
  const esFiscal = esCCF || esNR || esNCND;

  // ── Cálculos en tiempo real ──────────────────────────────
  const lineasCalculadas = watchAll.items.map((item, idx) =>
    calcularLineaProducto(item, idx + 1, tipoDte)
  );
  const resumen = calcularResumenFactura(lineasCalculadas, watchAll.condicionOperacion, tipoDte);

  // ── Municipios filtrados ─────────────────────────────────
  const deptoReceptor = watchAll.receptor?.direccion?.departamento || '';
  const municipiosFiltrados = useMemo(
    () => (deptoReceptor ? getMunicipiosPorDepto(deptoReceptor) : []),
    [deptoReceptor]
  );

  // ── Submit ───────────────────────────────────────────────
  const onSubmit = async (data: FacturaFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload: any = { ...data };

      // ── Limpiar receptor según tipo DTE ────────────────
      if (payload.tipoDte === '01') {
        // FE: usa numDocumento, elimina campos CCF
        delete payload.receptor.nit;
        delete payload.receptor.nrc;
        delete payload.receptor.codActividad;
        delete payload.receptor.descActividad;
        if (payload.receptor.numDocumento) {
          if (payload.receptor.tipoDocumento !== '13') {
            payload.receptor.numDocumento = payload.receptor.numDocumento.replace(/-/g, '');
          }
        } else {
          delete payload.receptor.tipoDocumento;
          delete payload.receptor.numDocumento;
        }
      }

      if (payload.tipoDte === '03' || payload.tipoDte === '04') {
        // CCF/NR: usa nit (sin tipoDocumento/numDocumento separados)
        if (!payload.receptor.nit && payload.receptor.numDocumento) {
          payload.receptor.nit = payload.receptor.numDocumento;
        }
        if (payload.receptor.nit) {
          payload.receptor.nit = payload.receptor.nit.replace(/-/g, '');
        }
        payload.receptor.tipoDocumento = '36';
        delete payload.receptor.numDocumento;
      }

      if (payload.tipoDte === '05' || payload.tipoDte === '06') {
        // NC/ND: usa nit
        if (!payload.receptor.nit && payload.receptor.numDocumento) {
          payload.receptor.nit = payload.receptor.numDocumento;
        }
        if (payload.receptor.nit) {
          payload.receptor.nit = payload.receptor.nit.replace(/-/g, '');
        }
        delete payload.receptor.numDocumento;
      }

      if (payload.tipoDte === '11') {
        // FEX: receptor internacional — mapear complemento desde direccion si existe
        if (!payload.receptor.complemento && payload.receptor.direccion?.complemento) {
          payload.receptor.complemento = payload.receptor.direccion.complemento;
        }
        delete payload.receptor.direccion;
        delete payload.receptor.nit;
        delete payload.receptor.nrc;
        delete payload.receptor.codActividad;
        delete payload.receptor.descActividad;
      }

      if (payload.tipoDte === '14') {
        // FSE: sujetoExcluido, sin nit/nrc
        delete payload.receptor.nit;
        delete payload.receptor.nrc;
        delete payload.receptor.codActividad;
        delete payload.receptor.descActividad;
      }

      if (payload.tipoDte === '15') {
        // CD: el receptor es el donante — puede estar vacío
        if (!payload.receptor.nombre) {
          delete payload.receptor;
        }
        delete payload.documentoRelacionado;
      }

      // Limpiar campos globales
      if (!payload.receptor?.telefono) delete payload.receptor?.telefono;
      if (!payload.observaciones) delete payload.observaciones;
      if (!dteInfo.requiereDocRelacionado) delete payload.documentoRelacionado;
      if (!esFEX) delete payload.datosExportacion;

      const res = await fetchClient('/api/dte/v2/facturar', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/facturas/${(res.datos as any)?.codigoGeneracion || ''}`);
    } catch (error: any) {
      let errorMsg =
        error.resDetails?.observaciones ||
        error.resDetails?.error ||
        error.message ||
        'Error al emitir la factura';
      if (error.resDetails?.errores && Array.isArray(error.resDetails.errores)) {
        const backendErrors = error.resDetails.errores
          .map((e: any) => `${e.campo}: ${e.mensaje}`)
          .join(' | ');
        errorMsg = `${errorMsg}. Detalles: ${backendErrors}`;
      }
      setSubmitError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await form.trigger(['tipoDte', 'receptor', 'condicionOperacion', 'documentoRelacionado']);
    } else if (step === 2) {
      isValid = await form.trigger(['items']);
    }
    if (isValid) {
      setStep((prev) => prev + 1);
      setSubmitError(null);
    } else {
      const errorList: string[] = [];
      const flattenErrors = (obj: any, path = '') => {
        if (!obj) return;
        if (obj.message) { errorList.push(`${path}: ${obj.message}`); }
        else { Object.keys(obj).forEach((k) => flattenErrors(obj[k], path ? `${path}.${k}` : k)); }
      };
      flattenErrors(form.formState.errors);
      setSubmitError(`Corrige estos campos: ${errorList.join(' | ')}`);
    }
  };

  const tipoActual = DTE_USUARIO.find((t) => t.codigo === tipoDte) || TIPOS_DTE.find((t) => t.codigo === tipoDte);
  const precioLabel = tipoDte === '01' ? 'Precio (IVA incluido)' : esCD ? 'Valor Donado' : 'Precio (sin IVA)';

  // ── Etiquetas dinámicas según tipo ──────────────────────
  const labelReceptor = esCD ? 'Donante (opcional)' : esFEX ? 'Receptor Internacional' : esFSE ? 'Sujeto Excluido' : 'Datos del Cliente';
  const labelDocumento = esCD ? 'Comprobante de Donación' : 'Factura / Documento';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Crear Documento</h2>
          <p className="text-sm text-muted-foreground">
            {tipoActual ? `${tipoActual.nombreCorto} — ${tipoActual.nombre}` : 'Selecciona el tipo de documento'}
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          Paso {step} de 3
        </Badge>
      </div>

      {/* ── Stepper visual ─────────────────────────────── */}
      <div className="flex items-center gap-1">
        {[
          { icon: FileText, label: labelDocumento },
          { icon: ShoppingCart, label: esCD ? 'Donaciones' : 'Productos' },
          { icon: CheckCircle2, label: 'Emitir' },
        ].map((s, idx) => (
          <div key={idx} className="flex items-center flex-1 gap-1">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium flex-1 transition-all ${
                step === idx + 1
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : step > idx + 1
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <s.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {idx < 2 && <div className={`h-0.5 w-4 shrink-0 ${step > idx + 1 ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {submitError && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Hay un problema</p>
            <p className="text-sm mt-1">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit as any)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: PASOS DEL FORMULARIO */}
        <div className="lg:col-span-2 space-y-6">
        {/* ═════════════════════════════════════════════════ */}
        {/* PASO 1: TIPO DTE + RECEPTOR / DONANTE / RECEPTOR */}
        {/* ═════════════════════════════════════════════════ */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {esCD ? <Heart className="h-5 w-5 text-pink-500" /> : esFEX ? <Globe className="h-5 w-5 text-cyan-500" /> : <User className="h-5 w-5 text-primary" />}
                {labelReceptor === 'Datos del Cliente' ? 'Datos del Documento y Cliente' : labelReceptor}
              </CardTitle>
              <CardDescription>{dteInfo.descripcion}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ── Tipo DTE + Condición Operación ────── */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Documento *</Label>
                  <Select
                    value={tipoDte}
                    onValueChange={(val) => {
                      form.setValue('tipoDte', val as any);
                      // Reset documentoRelacionado al cambiar tipo
                      if (!['05', '06'].includes(val || '')) {
                        form.setValue('documentoRelacionado', undefined as any);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {DTE_USUARIO.map((t) => (
                        <SelectItem key={t.codigo} value={t.codigo}>
                          {t.nombreCorto} — {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condición de Operación *</Label>
                  <Select
                    value={String(watchAll.condicionOperacion)}
                    onValueChange={(val) => { if (val) form.setValue('condicionOperacion', parseInt(val, 10)); }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDICIONES_OPERACION.map((c) => (
                        <SelectItem key={c.codigo} value={String(c.codigo)}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Banner informativo ───────────────── */}
              <div className="flex items-start gap-3 rounded-lg bg-muted/50 border p-3">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{dteInfo.descripcion}</p>
              </div>

              {/* ── Documento Relacionado (NC/ND) ──── */}
              {esNCND && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground font-semibold flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        Documento Relacionado (Obligatorio)
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tipo de Documento Origen *</Label>
                      <Select
                        value={watchAll.documentoRelacionado?.tipoDocumento || '03'}
                        onValueChange={(val) => form.setValue('documentoRelacionado.tipoDocumento', val as any)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="03">CCF (03)</SelectItem>
                          <SelectItem value="07">Nota de Remisión (07)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>N° Documento Relacionado *</Label>
                      <Input
                        {...form.register('documentoRelacionado.numeroDocumento')}
                        placeholder="DTE-03-XXXXXXXX-000000000000000"
                      />
                      {(form.formState.errors.documentoRelacionado as any)?.numeroDocumento && (
                        <span className="text-xs text-destructive">
                          {(form.formState.errors.documentoRelacionado as any).numeroDocumento.message}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Emisión del Documento Origen *</Label>
                    <Input
                      type="date"
                      {...form.register('documentoRelacionado.fechaEmision')}
                    />
                    {(form.formState.errors.documentoRelacionado as any)?.fechaEmision && (
                      <span className="text-xs text-destructive">
                        {(form.formState.errors.documentoRelacionado as any).fechaEmision.message}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* ── Separador datos del cliente ───── */}
              {!esCD && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-semibold">
                      {esFEX ? 'Datos del Receptor Internacional' : esFSE ? 'Datos del Sujeto Excluido' : 'Datos del Cliente'}
                    </span>
                  </div>
                </div>
              )}

              {esCD && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-semibold flex items-center gap-1">
                      <Heart className="h-3 w-3 text-pink-500" />
                      Datos del Donante (Opcional — puede ser anónimo)
                    </span>
                  </div>
                </div>
              )}

              {/* ── Tipo Documento + N° Documento ──── */}
              {!esFEX && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={watchAll.receptor?.tipoDocumento || '36'}
                      onValueChange={(val) => form.setValue('receptor.tipoDocumento', val as any)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_DOCUMENTO.map((t) => (
                          <SelectItem key={t.codigo} value={t.codigo}>{t.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {esFiscal ? 'NIT del Cliente *' : esFSE ? 'N° Documento *' : esCD ? 'N° Documento (opcional)' : 'N° Documento'}
                    </Label>
                    <Input
                      {...form.register('receptor.numDocumento')}
                      placeholder={esFiscal ? '0614-000000-000-0' : esFSE ? '00000000-0' : 'N° documento'}
                    />
                    {form.formState.errors.receptor?.numDocumento && (
                      <span className="text-xs text-destructive">
                        {form.formState.errors.receptor.numDocumento.message}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Nombre + Correo ───────────────── */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{esCD ? 'Nombre del Donante' : 'Nombre del Cliente *'}</Label>
                  <Input
                    {...form.register('receptor.nombre')}
                    placeholder={esCD ? 'Nombre o ANÓNIMO' : 'Nombre completo o razón social'}
                  />
                  {form.formState.errors.receptor?.nombre && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.receptor.nombre.message}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{esCD || esFEX ? 'Correo Electrónico' : 'Correo Electrónico *'}</Label>
                  <Input
                    type="email"
                    {...form.register('receptor.correo')}
                    placeholder="cliente@correo.com"
                  />
                  {form.formState.errors.receptor?.correo && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.receptor.correo.message}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Teléfono + NRC (CCF) ─────────── */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input {...form.register('receptor.telefono')} placeholder="22223333" maxLength={8} />
                </div>
                {esCCF && (
                  <div className="space-y-2">
                    <Label>NRC del Cliente *</Label>
                    <Input {...form.register('receptor.nrc')} placeholder="123456-7" />
                    {form.formState.errors.receptor?.nrc && (
                      <span className="text-xs text-destructive">
                        {(form.formState.errors.receptor.nrc as any)?.message}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Actividad Económica (CCF/NR/NC/ND) ── */}
              {(esFiscal) && (
                <div className="space-y-2">
                  <Label>Actividad Económica del Cliente *</Label>
                  <select
                    className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={watchAll.receptor?.codActividad || ''}
                    onChange={(e) => {
                      const act = ACTIVIDADES_ECONOMICAS.find((a) => a.codigo === e.target.value);
                      form.setValue('receptor.codActividad', e.target.value);
                      form.setValue('receptor.descActividad', act?.descripcion || '');
                    }}
                  >
                    <option value="">Seleccionar actividad...</option>
                    {ACTIVIDADES_ECONOMICAS.map((act) => (
                      <option key={act.codigo} value={act.codigo}>
                        {act.codigo} — {act.descripcion}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.receptor?.codActividad && (
                    <span className="text-xs text-destructive">
                      {form.formState.errors.receptor.codActividad.message as string}
                    </span>
                  )}
                </div>
              )}

              {/* ── Dirección Fiscal (CCF/NR/NC/ND/FSE) ── */}
              {(esFiscal || esFSE) && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground font-semibold">Dirección Fiscal</span>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Departamento *</Label>
                      <select
                        className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={deptoReceptor}
                        onChange={(e) => {
                          form.setValue('receptor.direccion.departamento', e.target.value);
                          form.setValue('receptor.direccion.municipio', '');
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {DEPARTAMENTOS.map((d) => (
                          <option key={d.codigo} value={d.codigo}>{d.nombre}</option>
                        ))}
                      </select>
                      {form.formState.errors.receptor?.direccion?.departamento && (
                        <span className="text-xs text-destructive">
                          {form.formState.errors.receptor.direccion.departamento.message as string}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Municipio *</Label>
                      <select
                        className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                        value={watchAll.receptor?.direccion?.municipio || ''}
                        onChange={(e) => form.setValue('receptor.direccion.municipio', e.target.value)}
                        disabled={!deptoReceptor}
                      >
                        <option value="">{deptoReceptor ? 'Seleccionar...' : 'Primero selecciona departamento'}</option>
                        {municipiosFiltrados.map((m) => (
                          <option key={`${m.departamento}-${m.codigo}`} value={m.codigo}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección exacta (Complemento) *</Label>
                    <Input
                      {...form.register('receptor.direccion.complemento')}
                      placeholder="Calle, Barrio, Edificio, Local..."
                    />
                    {form.formState.errors.receptor?.direccion?.complemento && (
                      <span className="text-xs text-destructive">
                        {form.formState.errors.receptor.direccion.complemento.message as string}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* ── Receptor FEX (Internacional) ──── */}
              {esFEX && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>País *</Label>
                      <select
                        className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={watchAll.receptor?.codPais || '9320'}
                        onChange={(e) => {
                          const pais = PAISES_FEX.find((p) => p.codigo === e.target.value);
                          form.setValue('receptor.codPais', e.target.value);
                          form.setValue('receptor.nombrePais', pais?.nombre || '');
                        }}
                      >
                        {PAISES_FEX.map((p) => (
                          <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Persona *</Label>
                      <Select
                        value={String(watchAll.receptor?.tipoPersona || 1)}
                        onValueChange={(val) => form.setValue('receptor.tipoPersona', parseInt(val || '1') as any)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Jurídica (Empresa)</SelectItem>
                          <SelectItem value="2">Natural (Personal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección Internacional *</Label>
                    <Input
                      {...form.register('receptor.direccion.complemento')}
                      placeholder="1234 Main St, New York, NY 10001"
                    />
                  </div>
                  {/* Datos de exportación */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground font-semibold">Datos de Exportación</span>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Tipo de Item a Exportar</Label>
                      <Select
                        value={String(watchAll.datosExportacion?.tipoItemExpor || 1)}
                        onValueChange={(v) => form.setValue('datosExportacion.tipoItemExpor', parseInt(v || '1') as any)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Bienes</SelectItem>
                          <SelectItem value="2">Servicios</SelectItem>
                          <SelectItem value="3">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Seguro ($)</Label>
                      <Input
                        type="number" step="0.01"
                        {...form.register('datosExportacion.seguro', { valueAsNumber: true })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Flete ($)</Label>
                      <Input
                        type="number" step="0.01"
                        {...form.register('datosExportacion.flete', { valueAsNumber: true })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* PASO 2: PRODUCTOS / DONACIONES / SERVICIOS      */}
        {/* ════════════════════════════════════════════════ */}
        {step === 2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {esCD ? 'Bienes / Servicios Donados' : 'Productos o Servicios'}
                </CardTitle>
                <CardDescription>
                  {tipoDte === '01'
                    ? 'Los precios incluyen IVA (13%)'
                    : tipoDte === '03' || esFiscal
                      ? 'Los precios son sin IVA — el impuesto se desglosa'
                      : tipoDte === '14'
                        ? 'Sin IVA — aplica retención de renta 10%'
                        : tipoDte === '11'
                          ? 'Sin IVA — exportación exenta'
                          : esCD
                            ? 'Ingresa el valor de cada bien o servicio donado'
                            : 'Agrega los items'}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendItem({ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, tipoItem: 1, uniMedida: 99, codigo: '' })
                }
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Agregar Línea
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {itemsFields.map((field, index) => (
                <div key={field.id} className="relative rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">Línea {index + 1}</Badge>
                    {itemsFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-6">
                    <div className="space-y-1">
                      <Label className="text-xs">Código</Label>
                      <Input {...form.register(`items.${index}.codigo`)} placeholder="SKU" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Descripción *</Label>
                      <Input
                        {...form.register(`items.${index}.descripcion`)}
                        placeholder={esCD ? 'Descripción de la donación' : 'Nombre del producto o servicio'}
                        className="h-9 text-sm"
                      />
                      {form.formState.errors.items?.[index]?.descripcion && (
                        <span className="text-[11px] text-destructive">
                          {form.formState.errors.items[index]?.descripcion?.message}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cantidad *</Label>
                      <Input
                        type="number" step="0.01"
                        {...form.register(`items.${index}.cantidad`, { valueAsNumber: true })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{precioLabel} *</Label>
                      <Input
                        type="number" step="0.01"
                        {...form.register(`items.${index}.precioUnitario`, { valueAsNumber: true })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descuento $</Label>
                      <Input
                        type="number" step="0.01"
                        {...form.register(`items.${index}.descuento`, { valueAsNumber: true })}
                        className="h-9 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Subtotal de línea */}
                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {esCD ? (
                        <span>Donación: ${lineasCalculadas[index]?.donacion?.toFixed(2) || '0.00'}</span>
                      ) : (
                        <>
                          <span>Gravado: ${lineasCalculadas[index]?.ventaGravada?.toFixed(2) || '0.00'}</span>
                          {tipoDte === '01' && (
                            <span>IVA: ${lineasCalculadas[index]?.ivaItem?.toFixed(2) || '0.00'}</span>
                          )}
                        </>
                      )}
                    </div>
                    <span className="font-bold text-primary">
                      ${(
                        esCD
                          ? (lineasCalculadas[index]?.donacion || 0)
                          : (lineasCalculadas[index]?.ventaGravada || 0) +
                            (tipoDte === '01' ? 0 : lineasCalculadas[index]?.ivaItem || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {form.formState.errors.items.root.message}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* PASO 3: RESUMEN Y EMISIÓN                       */}
        {/* ════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-5">
              {/* ── Detalles del documento ─────── */}
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">Resumen del Documento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Tipo</span>
                      <span className="font-medium">{tipoActual?.nombreCorto} — {tipoActual?.nombre}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Condición</span>
                      <span className="font-medium">
                        {CONDICIONES_OPERACION.find((c) => c.codigo === watchAll.condicionOperacion)?.nombre}
                      </span>
                    </div>
                  </div>

                  {/* Resumen del receptor / donante */}
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {esCD ? 'Donante' : esFEX ? 'Receptor Internacional' : 'Cliente'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Nombre:</span>{' '}
                        <span className="font-medium">{watchAll.receptor?.nombre || (esCD ? 'ANÓNIMO' : '—')}</span>
                      </div>
                      {watchAll.receptor?.numDocumento && (
                        <div>
                          <span className="text-muted-foreground text-xs">Documento:</span>{' '}
                          <span className="font-mono text-xs">{watchAll.receptor.numDocumento}</span>
                        </div>
                      )}
                      {watchAll.receptor?.correo && (
                        <div>
                          <span className="text-muted-foreground text-xs">Correo:</span>{' '}
                          <span>{watchAll.receptor.correo}</span>
                        </div>
                      )}
                      {esCCF && watchAll.receptor?.nrc && (
                        <div>
                          <span className="text-muted-foreground text-xs">NRC:</span>{' '}
                          <span className="font-mono text-xs">{watchAll.receptor.nrc}</span>
                        </div>
                      )}
                      {esFEX && watchAll.receptor?.nombrePais && (
                        <div>
                          <span className="text-muted-foreground text-xs">País:</span>{' '}
                          <span>{watchAll.receptor.nombrePais}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documento relacionado (NC/ND) */}
                  {esNCND && watchAll.documentoRelacionado?.numeroDocumento && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Documento Relacionado
                      </h4>
                      <p className="text-xs font-mono">{watchAll.documentoRelacionado.numeroDocumento}</p>
                      <p className="text-xs text-muted-foreground">{watchAll.documentoRelacionado.fechaEmision}</p>
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {esCD ? 'Donaciones' : 'Items'} ({watchAll.items.length})
                    </h4>
                    <div className="divide-y rounded-lg border overflow-hidden">
                      {watchAll.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <span className="font-medium truncate block">{item.descripcion || 'Sin descripción'}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.cantidad} × ${(item.precioUnitario || 0).toFixed(2)}
                              {(item.descuento || 0) > 0 && (
                                <span className="text-orange-500 ml-1">(desc: -${item.descuento?.toFixed(2)})</span>
                              )}
                            </span>
                          </div>
                          <span className="font-semibold shrink-0 ml-3">
                            ${(esCD
                              ? (lineasCalculadas[idx]?.donacion || 0)
                              : (lineasCalculadas[idx]?.ventaGravada || 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="space-y-2">
                    <Label className="text-xs">Observaciones (opcional)</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      {...form.register('observaciones')}
                      placeholder="Notas adicionales..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        </div>

        {/* COLUMNA DERECHA: PANEL STICKY DE TOTALES Y BOTONES */}
        <div className="lg:col-span-1 sticky top-6">
              {/* ── Totales ──────────────────────── */}
              <Card className="border shadow-lg">
                <CardHeader className="pb-3 bg-muted/30">
                  <CardTitle className="text-base">{esCD ? 'Total Donado' : 'Totales de Transacción'}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {/* Subtotal / compra / donado */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {esFSE ? 'Total Compra' : esCD ? 'Total Donado' : 'Subtotal Ventas'}
                      </span>
                      <span>
                        ${(
                          esCD
                            ? (resumen as any)?.totalDonado ?? 0
                            : esFSE
                              ? (resumen as any)?.totalCompra ?? 0
                              : resumen?.subTotalVentas || resumen?.subTotal || 0
                        ).toFixed(2)}
                      </span>
                    </div>

                    {((resumen as any)?.totalDescu || 0) > 0 && (
                      <div className="flex justify-between text-sm text-orange-500">
                        <span>Descuento</span>
                        <span>-${(resumen as any)?.totalDescu?.toFixed(2)}</span>
                      </div>
                    )}

                    {!esFSE && !esCD && !esFEX && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA (13%)</span>
                        <span>${((resumen as any)?.totalIva || 0).toFixed(2)}</span>
                      </div>
                    )}

                    {(resumen as any)?.reteRenta > 0 && (
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>Retención Renta (10%)</span>
                        <span>-${(resumen as any)?.reteRenta?.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="h-px w-full bg-border my-4" />

                    <div className="flex justify-between font-bold text-2xl">
                      <span>Total</span>
                      <span className="text-primary">
                        ${(
                          esCD
                            ? ((resumen as any)?.totalDonado ?? 0)
                            : (resumen as any)?.totalPagar ?? 0
                        ).toFixed(2)}
                      </span>
                    </div>

                    {(resumen as any)?.totalLetras && (
                      <p className="text-[10px] text-muted-foreground border-t pt-2 uppercase text-center mt-2">
                        {(resumen as any).totalLetras}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pb-6 bg-muted/10 border-t pt-4">
                  {step < 3 ? (
                    <Button type="button" onClick={nextStep} className="w-full h-11" size="lg">
                      Siguiente
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {esCD ? 'Emitir Donación' : 'Emitir Factura'}
                        </>
                      )}
                    </Button>
                  )}
                  
                  {step > 1 && (
                    <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(step - 1)}>
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Volver
                    </Button>
                  )}
                </CardFooter>
              </Card>
        </div>
      </form>
    </div>
  );
}
