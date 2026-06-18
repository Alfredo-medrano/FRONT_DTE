/**
 * ========================================
 * FormEncabezado — Paso 1, Sección A
 * ========================================
 * Tipo DTE, Condición de Operación, Retenciones,
 * Documento Relacionado (NC/ND), Banner info.
 *
 * Recibe form de react-hook-form como prop (patrón
 * recomendado para evitar re-renders innecesarios).
 */
'use client';

import { UseFormReturn } from 'react-hook-form';
import { FacturaFormValues } from '@/lib/validators';
import { TIPOS_DTE, CONDICIONES_OPERACION } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, Link2 } from 'lucide-react';

// ── Tipos emitibles por el contribuyente ────────────
const DTE_USUARIO = TIPOS_DTE.filter((t) =>
  ['01', '03', '04', '05', '06', '11', '14', '15'].includes(t.codigo)
);

// ── Mapa de info adicional por tipo ──────────────────
export const DTE_INFO: Record<string, {
  descripcion: string;
  alertColor: string;
  requiereDocRelacionado?: boolean;
  esFiscal?: boolean;
  esExportacion?: boolean;
  esDonacion?: boolean;
  esExcluido?: boolean;
}> = {
  '01': { descripcion: 'Factura para consumidor final. Precios con IVA incluido.', alertColor: 'blue' },
  '03': { descripcion: 'Para clientes con NIT/NRC. Precios sin IVA — el impuesto se desglosa.', alertColor: 'purple', esFiscal: true },
  '04': { descripcion: 'Nota de Remisión. Para traslados de mercancía sin transacción de venta inmediata.', alertColor: 'amber', esFiscal: true },
  '05': { descripcion: 'Nota de Crédito: ajuste a un CCF existente. Requiere documento relacionado.', alertColor: 'green', esFiscal: true, requiereDocRelacionado: true },
  '06': { descripcion: 'Nota de Débito: cargo adicional a un CCF existente. Requiere documento relacionado.', alertColor: 'orange', esFiscal: true, requiereDocRelacionado: true },
  '11': { descripcion: 'Para ventas al exterior. El receptor es una entidad extranjera. Sin IVA.', alertColor: 'cyan', esExportacion: true },
  '14': { descripcion: 'Para personas naturales sin obligaciones tributarias (sujetos excluidos de IVA). Con retención de renta 10%.', alertColor: 'rose', esExcluido: true },
  '15': { descripcion: 'Comprobante de Donación. El donante puede ser anónimo.', alertColor: 'pink', esDonacion: true },
};

interface Props {
  form: UseFormReturn<FacturaFormValues>;
  tipoDte: string;
  esCCF: boolean;
  esNCND: boolean;
}

export function FormEncabezado({ form, tipoDte, esCCF, esNCND }: Props) {
  const dteInfo = DTE_INFO[tipoDte] || DTE_INFO['01'];
  const watchAll = form.watch();

  return (
    <div className="space-y-6">
      {/* ── Tipo DTE + Condición Operación ──────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de Documento *</Label>
          <Select
            value={tipoDte}
            onValueChange={(val) => {
              form.setValue('tipoDte', val as any);
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

      {/* ── Retenciones e Impuestos Especiales (CCF) ─ */}
      {esCCF && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Retenciones e Impuestos Especiales
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: 'aplicarReteRenta' as const, label: 'Retención Renta 10%', desc: 'Sobre servicios profesionales (tipoItem: Servicio)' },
              { id: 'aplicarReteIva1' as const,  label: 'Retención IVA 1%',   desc: 'Si el cliente receptor es Gran Contribuyente' },
              { id: 'aplicarPerciIva1' as const, label: 'Percepción IVA 1%',  desc: 'Si tu empresa (emisor) es Gran Contribuyente' },
            ].map(({ id, label, desc }) => (
              <div key={id} className="flex items-start gap-2.5 rounded-md border p-3 bg-muted/20">
                <Checkbox
                  id={id}
                  checked={watchAll[id] as boolean}
                  onCheckedChange={(checked) => form.setValue(id, !!checked)}
                  className="mt-0.5"
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor={id} className="text-xs font-medium cursor-pointer">{label}</Label>
                  <p className="text-[10px] text-muted-foreground leading-normal">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Banner informativo ──────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg bg-muted/50 border p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{dteInfo.descripcion}</p>
      </div>

      {/* ── Documento Relacionado (NC/ND) ────────────── */}
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
            <Input type="date" {...form.register('documentoRelacionado.fechaEmision')} />
            {(form.formState.errors.documentoRelacionado as any)?.fechaEmision && (
              <span className="text-xs text-destructive">
                {(form.formState.errors.documentoRelacionado as any).fechaEmision.message}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
