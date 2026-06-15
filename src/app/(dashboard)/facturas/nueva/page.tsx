'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { crearFacturaSchema, FacturaFormValues } from '@/lib/validators';
import { calcularLineaProducto, calcularResumenFactura } from '@/lib/dte-calculator';
import { fetchClient } from '@/lib/api-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEPARTAMENTOS, getMunicipiosPorDepto, ACTIVIDADES_ECONOMICAS } from '@/lib/catalogos-mh';
import { useCRMStore } from '@/stores/crm-store';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
  Eye,
  Save,
  RotateCcw,
  XCircle,
  Search,
} from 'lucide-react';
import { TIPOS_DTE, CONDICIONES_OPERACION } from '@/lib/constants';
import { DteLifecycleTracker } from '@/components/ui/dte-lifecycle-tracker';

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

// ── Módulo 2: Clientes frecuentes (mock — reemplazar por llamada API) ──
const CLIENTES_FRECUENTES = [
  {
    numDocumento: '06142803941019',
    tipoDocumento: '36' as const,
    nombre: 'DISTRIBUIDORA EL SOL, S.A. DE C.V.',
    correo: 'facturacion@distribuidoraelsol.com',
    telefono: '22234455',
    nrc: '1234567',
    codActividad: '46100',
    descActividad: 'COMERCIO AL POR MAYOR NO ESPECIALIZADO',
    direccion: { departamento: '06', municipio: '14', complemento: 'Col. Escalón, Calle El Progreso #123, San Salvador' },
  },
  {
    numDocumento: '06141502001015',
    tipoDocumento: '36' as const,
    nombre: 'INVERSIONES MODERNA, S.A. DE C.V.',
    correo: 'contabilidad@moderna.com.sv',
    telefono: '25558899',
    nrc: '2345678',
    codActividad: '47190',
    descActividad: 'COMERCIO AL POR MENOR EN ALMACENES NO ESPECIALIZADOS',
    direccion: { departamento: '06', municipio: '14', complemento: 'Blvd. Los Héroes, Edificio Central #500' },
  },
  {
    numDocumento: '06140101880123',
    tipoDocumento: '36' as const,
    nombre: 'TECNOLOGÍA AVANZADA, S.A. DE C.V.',
    correo: 'admin@tecavanzada.com',
    telefono: '22119988',
    nrc: '3456789',
    codActividad: '62010',
    descActividad: 'PROGRAMACIÓN INFORMÁTICA',
    direccion: { departamento: '06', municipio: '14', complemento: 'Residencial San Luis, Pasaje 5, Casa #12' },
  },
  {
    numDocumento: '04231507950032',
    tipoDocumento: '36' as const,
    nombre: 'AGRO SERVICIOS DEL ORIENTE, S.A. DE C.V.',
    correo: 'agroservicios@gmail.com',
    telefono: '26001122',
    nrc: '4567890',
    codActividad: '01110',
    descActividad: 'CULTIVO DE CEREALES (EXCEPTO ARROZ), LEGUMBRES Y SEMILLAS OLEAGINOSAS',
    direccion: { departamento: '12', municipio: '01', complemento: 'Km 120 Carretera al Oriente, San Miguel' },
  },
  {
    numDocumento: '023456789',
    tipoDocumento: '13' as const,
    nombre: 'JUAN CARLOS LÓPEZ MARTÍNEZ',
    correo: 'jclopez@gmail.com',
    telefono: '78889900',
    nrc: '',
    codActividad: '',
    descActividad: '',
    direccion: { departamento: '06', municipio: '14', complemento: 'Colonia Maquilishuat, Calle Principal #45' },
  },
];

// ── Módulo 3: Catálogo de productos (mock — reemplazar por llamada API) ──
const CATALOGO_PRODUCTOS = [
  { codigo: 'SERV-001', descripcion: 'Servicio de Consultoría Empresarial (hora)', precioUnitario: 75.00, uniMedida: 99 },
  { codigo: 'PROD-100', descripcion: 'Laptop Dell Latitude 5540 i7 16GB', precioUnitario: 1250.00, uniMedida: 59 },
  { codigo: 'PROD-101', descripcion: 'Monitor Samsung 27" 4K UHD', precioUnitario: 385.00, uniMedida: 59 },
  { codigo: 'SERV-002', descripcion: 'Desarrollo de Software a Medida (hora)', precioUnitario: 55.00, uniMedida: 99 },
  { codigo: 'PROD-200', descripcion: 'Resma de Papel Bond Carta (500 hojas)', precioUnitario: 4.50, uniMedida: 59 },
  { codigo: 'PROD-201', descripcion: 'Toner HP LaserJet 26A Original', precioUnitario: 68.00, uniMedida: 59 },
];

// ── Módulo 1: Formateo de documentos con guiones automáticos ────────
function formatDocumento(raw: string, tipoDoc: string): string {
  const digits = raw.replace(/\D/g, '');
  if (tipoDoc === '13') {
    // DUI: 00000000-0
    const d = digits.slice(0, 9);
    if (d.length <= 8) return d;
    return `${d.slice(0, 8)}-${d.slice(8, 9)}`;
  }
  if (tipoDoc === '36') {
    // NIT: 0000-000000-000-0
    const d = digits.slice(0, 14);
    if (d.length <= 4) return d;
    if (d.length <= 10) return `${d.slice(0, 4)}-${d.slice(4)}`;
    if (d.length <= 13) return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10, 13)}-${d.slice(13, 14)}`;
  }
  return raw;
}

function formatNrc(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 6) return d;
  // Inserta guion antes del último dígito (check digit)
  return `${d.slice(0, d.length - 1)}-${d.slice(-1)}`;
}

function validarFormatoDoc(valor: string, tipoDoc: string): 'valid' | 'invalid' | 'incomplete' {
  if (!valor) return 'incomplete';
  if (tipoDoc === '13') {
    if (!/^\d{8}-\d$/.test(valor)) {
      const digs = valor.replace(/\D/g, '');
      return digs.length < 9 ? 'incomplete' : 'invalid';
    }
    // Validación Módulo 10
    const digits = valor.replace(/\D/g, '');
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(digits[i], 10) * (9 - i);
    }
    const checkDigit = (sum % 10) === 0 ? 0 : 10 - (sum % 10);
    if (parseInt(digits[8], 10) !== checkDigit) return 'invalid';
    return 'valid';
  }
  if (tipoDoc === '36') {
    const digs = valor.replace(/-/g, '');
    if (/^(\d{14}|\d{9})$/.test(digs)) return 'valid';
    if (/^\d{0,13}$/.test(digs)) return 'incomplete';
    return 'invalid';
  }
  return valor.length > 0 ? 'valid' : 'incomplete';
}

function validarNrc(valor: string): 'valid' | 'invalid' | 'incomplete' {
  if (!valor) return 'incomplete';
  if (/^\d{1,7}-\d$/.test(valor)) return 'valid';
  return 'incomplete';
}

// ── Clave de LocalStorage para borradores ──
const DRAFT_KEY = 'dte-borrador-factura';

function NuevaFacturaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get('cliente');
  const { clientes: crmClientes } = useCRMStore();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Preparando datos de facturación...');
  const [syntheticStatus, setSyntheticStatus] = useState('CREADO');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sumarIvaAutomatico, setSumarIvaAutomatico] = useState(false);

  // ── Módulo 2: Clientes frecuentes ──
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  // ── Módulo 3: Catálogo de productos ──
  const [productoDropdownIndex, setProductoDropdownIndex] = useState<number | null>(null);
  const [productoQuery, setProductoQuery] = useState('');

  // ── Módulo 5: Vista previa PDF ──
  const [showPreview, setShowPreview] = useState(false);

  // ── Módulo 6: Borrador y limpieza ──
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [borradorMsg, setBorradorMsg] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const defaultValues: FacturaFormValues = {
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
    aplicarReteRenta: false,
    aplicarReteIva1: false,
    aplicarPerciIva1: false,
  };

  const form = useForm<FacturaFormValues>({
    resolver: zodResolver(crearFacturaSchema as any),
    defaultValues,
    mode: 'onBlur', // Validate each field on blur for real-time feedback
  });

  useEffect(() => {
    if (clienteId && crmClientes && crmClientes.length > 0) {
      const cli = crmClientes.find(c => c.id === clienteId);
      if (cli) {
        const tipoDoc = (cli.tipoDocumento || '36') as '36' | '13' | '02' | '03' | '37';
        form.setValue('receptor.tipoDocumento', tipoDoc);
        form.setValue('receptor.numDocumento', formatDocumento(cli.nit, tipoDoc));
        form.setValue('receptor.nombre', cli.nombre);
        form.setValue('receptor.correo', cli.correo);
        form.setValue('receptor.telefono', cli.telefono || '');
        if (cli.nrc) form.setValue('receptor.nrc', formatNrc(cli.nrc));
        if (cli.actividadEconomica) {
          form.setValue('receptor.codActividad', cli.actividadEconomica);
          const act = ACTIVIDADES_ECONOMICAS.find(a => a.codigo === cli.actividadEconomica);
          form.setValue('receptor.descActividad', act ? act.descripcion : 'No especificada');
        }
        if (cli.departamento) form.setValue('receptor.direccion.departamento', cli.departamento);
        if (cli.municipio) form.setValue('receptor.direccion.municipio', cli.municipio);
        if (cli.complemento) form.setValue('receptor.direccion.complemento', cli.complemento);
      }
    }
  }, [clienteId, crmClientes, form]);

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
  const lineasCalculadas = watchAll.items.map((item, idx) => {
    // Si es Factura Consumidor Final (01) y el usuario indicó que sus precios NO incluyen IVA,
    // multiplicamos el precioUnitario por 1.13 solo para el cálculo de preview.
    if (tipoDte === '01' && sumarIvaAutomatico) {
      const itemConIva = {
        ...item,
        precioUnitario: parseFloat((item.precioUnitario * 1.13).toFixed(8)),
      };
      return calcularLineaProducto(itemConIva, idx + 1, tipoDte);
    }
    return calcularLineaProducto(item, idx + 1, tipoDte);
  });
  const resumen = calcularResumenFactura(lineasCalculadas, watchAll.condicionOperacion, tipoDte, {
    aplicarReteRenta: watchAll.aplicarReteRenta,
    aplicarReteIva1: watchAll.aplicarReteIva1,
    aplicarPerciIva1: watchAll.aplicarPerciIva1,
  });

  // ── Municipios filtrados ─────────────────────────────────
  const deptoReceptor = watchAll.receptor?.direccion?.departamento || '';
  const municipiosFiltrados = useMemo(
    () => (deptoReceptor ? getMunicipiosPorDepto(deptoReceptor) : []),
    [deptoReceptor]
  );

  // ── Módulo 1: Validación de formato en tiempo real ───────
  const docValidation = useMemo(() => {
    const tipoDoc = watchAll.receptor?.tipoDocumento || '36';
    const valor = watchAll.receptor?.numDocumento || '';
    return validarFormatoDoc(valor, tipoDoc);
  }, [watchAll.receptor?.tipoDocumento, watchAll.receptor?.numDocumento]);

  const nrcValidation = useMemo(() => {
    return validarNrc(watchAll.receptor?.nrc || '');
  }, [watchAll.receptor?.nrc]);

  // ── Módulo 2: Sugerencias de clientes ────────────────────
  const clienteSugerencias = useMemo(() => {
    const doc = (watchAll.receptor?.numDocumento || '').replace(/-/g, '').toLowerCase();
    if (doc.length < 3) return [];

    // Filtrar y mapear clientes del CRM
    const crmMatches = crmClientes.filter(c =>
      (c.nit || '').replace(/-/g, '').includes(doc) ||
      c.nombre.toLowerCase().includes(doc)
    ).map(c => ({
      numDocumento: c.nit,
      tipoDocumento: (c.tipoDocumento || '36') as '36' | '13' | '02' | '03' | '37',
      nombre: c.nombre,
      correo: c.correo,
      telefono: c.telefono || '',
      nrc: c.nrc || '',
      codActividad: c.actividadEconomica || '',
      descActividad: ACTIVIDADES_ECONOMICAS.find(a => a.codigo === c.actividadEconomica)?.descripcion || 'No especificada',
      direccion: {
        departamento: c.departamento || '06',
        municipio: c.municipio || '14',
        complemento: c.complemento || '',
      }
    }));

    // Filtrar clientes estáticos frecuentes
    const mockMatches = CLIENTES_FRECUENTES.filter(c =>
      c.numDocumento.includes(doc) || c.nombre.toLowerCase().includes(doc)
    );

    // Unir ambos (dando prioridad a los del CRM)
    const combined = [...crmMatches];
    mockMatches.forEach(m => {
      if (!combined.some(c => c.numDocumento === m.numDocumento)) {
        combined.push(m);
      }
    });

    return combined;
  }, [watchAll.receptor?.numDocumento, crmClientes]);

  // ── Módulo 3: Sugerencias de productos ───────────────────
  const productoSugerencias = useMemo(() => {
    if (productoDropdownIndex === null || productoQuery.length < 2) return [];
    const q = productoQuery.toLowerCase();
    return CATALOGO_PRODUCTOS.filter(p =>
      p.codigo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)
    );
  }, [productoDropdownIndex, productoQuery]);

  // ── Módulo 1+2: Handler de documento con máscara ─────────
  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tipoDoc = form.getValues('receptor.tipoDocumento') || '36';
    const formatted = formatDocumento(e.target.value, tipoDoc);
    form.setValue('receptor.numDocumento', formatted, { shouldValidate: false });

    // Módulo 2: Mostrar/ocultar dropdown de clientes frecuentes
    const digits = formatted.replace(/-/g, '');
    setShowClienteDropdown(digits.length >= 3);
  };

  const handleNrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNrc(e.target.value);
    form.setValue('receptor.nrc', formatted, { shouldValidate: false });
  };

  const selectCliente = (cliente: {
    numDocumento: string;
    tipoDocumento: '36' | '13' | '02' | '03' | '37';
    nombre: string;
    correo?: string;
    telefono?: string;
    nrc?: string;
    codActividad?: string;
    descActividad?: string;
    direccion?: { departamento: string; municipio: string; complemento: string };
  }) => {
    const tipoDoc = cliente.tipoDocumento;
    form.setValue('receptor.tipoDocumento', tipoDoc);
    form.setValue('receptor.numDocumento', formatDocumento(cliente.numDocumento, tipoDoc));
    form.setValue('receptor.nombre', cliente.nombre);
    form.setValue('receptor.correo', cliente.correo || '');
    form.setValue('receptor.telefono', cliente.telefono || '');
    if (cliente.nrc) form.setValue('receptor.nrc', formatNrc(cliente.nrc));
    if (cliente.codActividad) {
      form.setValue('receptor.codActividad', cliente.codActividad);
      form.setValue('receptor.descActividad', cliente.descActividad || 'No especificada');
    }
    if (cliente.direccion) {
      form.setValue('receptor.direccion.departamento', cliente.direccion.departamento);
      form.setValue('receptor.direccion.municipio', cliente.direccion.municipio);
      form.setValue('receptor.direccion.complemento', cliente.direccion.complemento);
    }
    setShowClienteDropdown(false);
  };

  // ── Módulo 3: Seleccionar producto ───────────────────────
  const selectProducto = (producto: typeof CATALOGO_PRODUCTOS[0], index: number) => {
    form.setValue(`items.${index}.codigo`, producto.codigo);
    form.setValue(`items.${index}.descripcion`, producto.descripcion);
    form.setValue(`items.${index}.precioUnitario`, producto.precioUnitario);
    form.setValue(`items.${index}.uniMedida`, producto.uniMedida);
    setProductoDropdownIndex(null);
    setProductoQuery('');
  };

  // ── Módulo 4: Tab en Descuento → nueva línea ─────────────
  const handleDescuentoTab = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Tab' && !e.shiftKey && index === itemsFields.length - 1) {
      e.preventDefault();
      appendItem({ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, tipoItem: 1, uniMedida: 99, codigo: '' });
      setTimeout(() => {
        document.getElementById(`item-codigo-${index + 1}`)?.focus();
      }, 60);
    }
  };

  // ── Módulo 6: Borrador y limpieza ────────────────────────
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form.getValues()));
      setBorradorMsg('✓ Borrador guardado');
      setTimeout(() => setBorradorMsg(null), 3000);
    } catch { /* localStorage no disponible */ }
  }, [form]);

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        form.reset(parsed);
        setShowDraftBanner(false);
        setBorradorMsg('✓ Borrador restaurado');
        setTimeout(() => setBorradorMsg(null), 3000);
      }
    } catch { /* ignore */ }
  }, [form]);

  const dismissDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
  }, []);

  const clearForm = useCallback(() => {
    form.reset(defaultValues);
    setStep(1);
    setSumarIvaAutomatico(false);
    setShowClearConfirm(false);
    setSubmitError(null);
    localStorage.removeItem(DRAFT_KEY);
    setBorradorMsg('✓ Formulario limpiado');
    setTimeout(() => setBorradorMsg(null), 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // ── Módulo 6: Restaurar borrador al montar ───────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setShowDraftBanner(true);
    } catch { /* ignore */ }
  }, []);

  // ── Click outside para cerrar dropdowns ──────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Cerrar dropdown de clientes
      if (
        clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node) &&
        clienteInputRef.current && !clienteInputRef.current.contains(e.target as Node)
      ) {
        setShowClienteDropdown(false);
      }
      // Cerrar dropdown de productos
      const target = e.target as HTMLElement;
      if (!target.closest('[data-product-dropdown]')) {
        setProductoDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Submit ───────────────────────────────────────────────
  const onSubmit = async (data: FacturaFormValues) => {
    let progressTimer: NodeJS.Timeout | null = null;
    let progressTimer2: NodeJS.Timeout | null = null;
    let progressTimer3: NodeJS.Timeout | null = null;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSyntheticStatus('CREADO');
      setLoadingMessage('Preparando datos de facturación...');

      // Simular progreso de firma y transmisión para la UI
      progressTimer = setTimeout(() => {
        setLoadingMessage('Firmando digitalmente el documento (JWS)...');
        setSyntheticStatus('FIRMADO');
      }, 900);

      progressTimer2 = setTimeout(() => {
        setLoadingMessage('Transmitiendo al Ministerio de Hacienda...');
        setSyntheticStatus('TRANSMITIDO');
      }, 1900);

      progressTimer3 = setTimeout(() => {
        setLoadingMessage('Guardando y registrando documento fiscal...');
        setSyntheticStatus('VALIDANDO');
      }, 3100);

      const payload: any = { ...data };

      // ── Sumar IVA a precios unitarios si el usuario indicó que sus precios son sin IVA ──
      if (payload.tipoDte === '01' && sumarIvaAutomatico) {
        payload.items = payload.items.map((item: any) => ({
          ...item,
          precioUnitario: parseFloat((item.precioUnitario * 1.13).toFixed(8)),
        }));
      }

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

      // Limpiar borrador al emitir exitosamente
      localStorage.removeItem(DRAFT_KEY);

      const res = await fetchClient<{ codigoGeneracion: string }>('/api/dte/v2/facturar', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (progressTimer) clearTimeout(progressTimer);
      if (progressTimer2) clearTimeout(progressTimer2);
      if (progressTimer3) clearTimeout(progressTimer3);

      setLoadingMessage(res.enCola ? 'Guardada en cola con éxito...' : '¡Documento emitido con éxito!');

      const targetCodigo = (res.datos as any)?.codigoGeneracion || res.codigoGeneracion || '';
      
      // Delay de 500ms para que el usuario perciba el éxito de forma elegante
      setTimeout(() => {
        router.push(`/facturas/${targetCodigo}`);
      }, 500);
    } catch (error: any) {
      if (progressTimer) clearTimeout(progressTimer);
      if (progressTimer2) clearTimeout(progressTimer2);
      if (progressTimer3) clearTimeout(progressTimer3);

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
  const precioLabel = tipoDte === '01'
    ? (sumarIvaAutomatico ? 'Precio (sin IVA)' : 'Precio (IVA incluido)')
    : esCD ? 'Valor Donado' : 'Precio (sin IVA)';

  // ── Etiquetas dinámicas según tipo ──────────────────────
  const labelReceptor = esCD ? 'Donante (opcional)' : esFEX ? 'Receptor Internacional' : esFSE ? 'Sujeto Excluido' : 'Datos del Cliente';
  const labelDocumento = esCD ? 'Comprobante de Donación' : 'Factura / Documento';

  // ── Placeholders y maxLength dinámicos por tipo de documento ──
  const tipoDocReceptor = watchAll.receptor?.tipoDocumento || '36';
  const docPlaceholder = tipoDocReceptor === '13' ? '00000000-0'
    : (tipoDocReceptor === '36' || esFiscal) ? '0614-000000-000-0'
    : 'N° documento';
  const docMaxLength = tipoDocReceptor === '13' ? 10 : tipoDocReceptor === '36' ? 17 : 25;

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

      {/* ── Módulo 6: Banner de borrador disponible ────── */}
      {showDraftBanner && (
        <div className="rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 p-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Save className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Borrador disponible</p>
              <p className="text-xs opacity-80">Tienes un documento sin terminar. ¿Deseas continuar donde lo dejaste?</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button type="button" size="sm" variant="default" onClick={restoreDraft} className="text-xs">
              Restaurar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismissDraft} className="text-xs">
              Descartar
            </Button>
          </div>
        </div>
      )}

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

              {/* ── Retenciones e Impuestos Especiales (DTE-03 / CCF) ── */}
              {esCCF && (
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Retenciones e Impuestos Especiales
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-start gap-2.5 rounded-md border p-3 bg-muted/20">
                      <Checkbox
                        id="aplicarReteRenta"
                        checked={watchAll.aplicarReteRenta}
                        onCheckedChange={(checked) => form.setValue('aplicarReteRenta', !!checked)}
                        className="mt-0.5"
                      />
                      <div className="grid gap-1 leading-none">
                        <Label htmlFor="aplicarReteRenta" className="text-xs font-medium cursor-pointer">
                          Retención Renta 10%
                        </Label>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Sobre servicios profesionales (tipoItem: Servicio)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-md border p-3 bg-muted/20">
                      <Checkbox
                        id="aplicarReteIva1"
                        checked={watchAll.aplicarReteIva1}
                        onCheckedChange={(checked) => form.setValue('aplicarReteIva1', !!checked)}
                        className="mt-0.5"
                      />
                      <div className="grid gap-1 leading-none">
                        <Label htmlFor="aplicarReteIva1" className="text-xs font-medium cursor-pointer">
                          Retención IVA 1%
                        </Label>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Si el cliente receptor es catalogado como Gran Contribuyente
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-md border p-3 bg-muted/20">
                      <Checkbox
                        id="aplicarPerciIva1"
                        checked={watchAll.aplicarPerciIva1}
                        onCheckedChange={(checked) => form.setValue('aplicarPerciIva1', !!checked)}
                        className="mt-0.5"
                      />
                      <div className="grid gap-1 leading-none">
                        <Label htmlFor="aplicarPerciIva1" className="text-xs font-medium cursor-pointer">
                          Percepción IVA 1%
                        </Label>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Si tu empresa (emisor) es catalogada como Gran Contribuyente
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

              {/* ── Tipo Documento + N° Documento (con máscara + autocomplete) ──── */}
              {!esFEX && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={watchAll.receptor?.tipoDocumento || '36'}
                      onValueChange={(val) => {
                        form.setValue('receptor.tipoDocumento', val as any);
                        // Re-formatear el documento actual para el nuevo tipo
                        const currentDoc = form.getValues('receptor.numDocumento') || '';
                        if (currentDoc && typeof val === 'string') {
                          form.setValue('receptor.numDocumento', formatDocumento(currentDoc, val));
                        }
                        setShowClienteDropdown(false);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_DOCUMENTO.map((t) => (
                          <SelectItem key={t.codigo} value={t.codigo}>{t.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 relative">
                    <Label>
                      {esFiscal ? 'NIT del Cliente *' : esFSE ? 'N° Documento *' : esCD ? 'N° Documento (opcional)' : 'N° Documento'}
                    </Label>
                    <div className="relative">
                      <Input
                        ref={clienteInputRef}
                        value={watchAll.receptor?.numDocumento || ''}
                        onChange={handleDocumentoChange}
                        onFocus={() => {
                          const digits = (watchAll.receptor?.numDocumento || '').replace(/-/g, '');
                          if (digits.length >= 3) setShowClienteDropdown(true);
                        }}
                        placeholder={docPlaceholder}
                        maxLength={docMaxLength}
                        className="pr-8"
                        autoComplete="off"
                      />
                      {/* ── Módulo 1: Indicador visual de validación ── */}
                      {(esCCF || esFiscal) && watchAll.receptor?.numDocumento && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors duration-200">
                          {docValidation === 'valid' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : docValidation === 'invalid' ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : null}
                        </span>
                      )}
                    </div>
                    {form.formState.errors.receptor?.numDocumento && (
                      <span className="text-xs text-destructive">
                        {form.formState.errors.receptor.numDocumento.message}
                      </span>
                    )}
                    {/* ── Módulo 2: Dropdown de clientes frecuentes ── */}
                    {showClienteDropdown && clienteSugerencias.length > 0 && (
                      <div
                        ref={clienteDropdownRef}
                        className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
                          Clientes frecuentes
                        </div>
                        {clienteSugerencias.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors text-sm flex items-center gap-3 border-b last:border-b-0"
                            onClick={() => selectCliente(c)}
                          >
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="font-medium block truncate text-xs">{c.nombre}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {formatDocumento(c.numDocumento, c.tipoDocumento)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
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
                    <div className="relative">
                      <Input
                        value={watchAll.receptor?.nrc || ''}
                        onChange={handleNrcChange}
                        placeholder="123456-7"
                        maxLength={9}
                        className="pr-8"
                        autoComplete="off"
                      />
                      {/* ── Módulo 1: Indicador de NRC ── */}
                      {watchAll.receptor?.nrc && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors duration-200">
                          {nrcValidation === 'valid' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : nrcValidation === 'invalid' ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : null}
                        </span>
                      )}
                    </div>
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
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {esCD ? 'Bienes / Servicios Donados' : 'Productos o Servicios'}
                </CardTitle>
                <CardDescription>
                  {tipoDte === '01'
                    ? (sumarIvaAutomatico
                        ? 'Se sumará +13% IVA automáticamente a tus precios'
                        : 'Los precios incluyen IVA (13%)')
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
              <div className="flex items-center gap-2 flex-wrap">
                {/* ── Checkbox: Sumar IVA automáticamente (solo para Factura Consumidor Final) ── */}
                {tipoDte === '01' && (
                  <label
                    htmlFor="chk-sumar-iva"
                    className="flex items-center gap-2 cursor-pointer select-none rounded-md bg-muted border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                  >
                    <Checkbox
                      id="chk-sumar-iva"
                      checked={sumarIvaAutomatico}
                      onCheckedChange={(checked) => setSumarIvaAutomatico(Boolean(checked))}
                    />
                    <span>Mis precios NO tienen IVA (Sumar +13%)</span>
                  </label>
                )}
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
              </div>
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

                  <div className="grid gap-3 grid-cols-1 md:grid-cols-12">
                    {/* ── Módulo 3+4: Campo Código con búsqueda predictiva ── */}
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Código</Label>
                      <Input
                        id={`item-codigo-${index}`}
                        value={watchAll.items[index]?.codigo || ''}
                        onChange={(e) => {
                          form.setValue(`items.${index}.codigo`, e.target.value);
                          if (e.target.value.length >= 2) {
                            setProductoQuery(e.target.value);
                            setProductoDropdownIndex(index);
                          } else if (productoDropdownIndex === index) {
                            setProductoDropdownIndex(null);
                          }
                        }}
                        placeholder="SKU"
                        className="h-9 text-sm"
                        autoComplete="off"
                      />
                    </div>
                    {/* Tipo de Item (Bien / Servicio) */}
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Tipo *</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={watchAll.items[index]?.tipoItem ?? 1}
                        onChange={(e) => {
                          form.setValue(`items.${index}.tipoItem`, parseInt(e.target.value, 10));
                        }}
                      >
                        <option value={1}>Bien</option>
                        <option value={2}>Servicio</option>
                      </select>
                    </div>
                    {/* ── Módulo 3: Campo Descripción con búsqueda predictiva ── */}
                    <div className="space-y-1 md:col-span-3 relative">
                      <Label className="text-xs">Descripción *</Label>
                      <Input
                        value={watchAll.items[index]?.descripcion || ''}
                        onChange={(e) => {
                          form.setValue(`items.${index}.descripcion`, e.target.value);
                          if (e.target.value.length >= 2) {
                            setProductoQuery(e.target.value);
                            setProductoDropdownIndex(index);
                          } else if (productoDropdownIndex === index) {
                            setProductoDropdownIndex(null);
                          }
                        }}
                        placeholder={esCD ? 'Descripción de la donación' : 'Nombre del producto o servicio'}
                        className="h-9 text-sm"
                        autoComplete="off"
                      />
                      {/* ── Módulo 3: Dropdown de productos ── */}
                      {productoDropdownIndex === index && productoSugerencias.length > 0 && (
                        <div
                          data-product-dropdown
                          className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
                        >
                          <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
                            Catálogo de productos
                          </div>
                          {productoSugerencias.map((p, pi) => (
                            <button
                              key={pi}
                              type="button"
                              data-product-dropdown
                              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm border-b last:border-b-0"
                              onClick={() => selectProducto(p, index)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="font-mono text-[10px] text-muted-foreground">{p.codigo}</span>
                                  <span className="block truncate text-xs">{p.descripcion}</span>
                                </div>
                                <span className="text-xs text-primary font-semibold shrink-0">${p.precioUnitario.toFixed(2)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {form.formState.errors.items?.[index]?.descripcion && (
                        <span className="text-[11px] text-destructive">
                          {form.formState.errors.items[index]?.descripcion?.message}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 md:col-span-1">
                      <Label className="text-xs">Cantidad *</Label>
                      <Input
                        type="number" step="0.01"
                        {...form.register(`items.${index}.cantidad`, { valueAsNumber: true })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">{precioLabel} *</Label>
                      <Input
                        type="number" step="0.01"
                        {...form.register(`items.${index}.precioUnitario`, { valueAsNumber: true })}
                        className="h-9 text-sm"
                      />
                    </div>
                    {/* ── Módulo 4: Tab en Descuento → nueva línea ── */}
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Descuento $</Label>
                      <Input
                        type="number" step="0.01"
                        {...form.register(`items.${index}.descuento`, { valueAsNumber: true })}
                        className="h-9 text-sm"
                        placeholder="0.00"
                        onKeyDown={(e) => handleDescuentoTab(e as React.KeyboardEvent<HTMLInputElement>, index)}
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

                    {/* Monto Total Operación (si hay retenciones/percepciones) */}
                    {(((resumen as any)?.reteRenta || 0) > 0 || ((resumen as any)?.ivaRete1 || 0) > 0 || ((resumen as any)?.ivaPerci1 || 0) > 0) && (
                      <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                        <span className="text-muted-foreground">Monto Total Operación</span>
                        <span>
                          ${((resumen as any)?.montoTotalOperacion || 0).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {(resumen as any)?.reteRenta > 0 && (
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>Retención Renta (10%)</span>
                        <span>-${(resumen as any)?.reteRenta?.toFixed(2)}</span>
                      </div>
                    )}

                    {((resumen as any)?.ivaRete1 || 0) > 0 && (
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>Retención IVA (1%)</span>
                        <span>-${(resumen as any)?.ivaRete1?.toFixed(2)}</span>
                      </div>
                    )}

                    {((resumen as any)?.ivaPerci1 || 0) > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>Percepción IVA (1%)</span>
                        <span>+${(resumen as any)?.ivaPerci1?.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="h-px w-full bg-border my-4" />

                    <div className="flex justify-between font-bold text-2xl">
                      <span>
                        {(((resumen as any)?.reteRenta || 0) > 0 || ((resumen as any)?.ivaRete1 || 0) > 0) 
                          ? 'Líquido a Entregar' 
                          : 'Total'}
                      </span>
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
                    <>
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
                      {/* ── Módulo 5: Botón Vista Previa ── */}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowPreview(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Vista Previa del DTE
                      </Button>
                    </>
                  )}
                  
                  {step > 1 && (
                    <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(step - 1)}>
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Volver
                    </Button>
                  )}

                  {/* ── Módulo 6: Borrador y Limpieza ── */}
                  <div className="flex gap-2 w-full pt-1 border-t">
                    <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" onClick={saveDraft}>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Borrador
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs text-destructive hover:text-destructive"
                      onClick={() => setShowClearConfirm(true)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Limpiar
                    </Button>
                  </div>
                  {borradorMsg && (
                    <p className="text-xs text-center text-green-600 dark:text-green-400 animate-in fade-in">{borradorMsg}</p>
                  )}
                </CardFooter>
              </Card>
        </div>
      </form>
      
      {/* Premium Glassmorphic Loading Screen Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center text-white scale-in flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center">
              {/* Pulsing glow under loader */}
              <div className="absolute h-20 w-20 rounded-full bg-primary/20 animate-pulse blur-xl" />
              {/* Outer rotating ring */}
              <div className="h-16 w-16 rounded-full border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
              {/* Inner document icon */}
              <div className="absolute h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary animate-bounce" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Procesando Documento</h3>
              <p className="text-sm text-gray-300 min-h-[40px] flex items-center justify-center px-4 font-medium transition-all duration-300">
                {loadingMessage}
              </p>
            </div>
            
            <div className="w-full bg-black/20 rounded-xl p-2 mb-2 shadow-inner">
              <DteLifecycleTracker currentStatus={syntheticStatus} className="!py-2" />
            </div>

            <p className="text-[10px] text-gray-400">Por favor, no recargues la página ni cierres el navegador.</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* Módulo 5: Vista Previa del DTE (Dialog Modal)       */}
      {/* ════════════════════════════════════════════════════ */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa — {tipoActual?.nombreCorto} {tipoActual?.nombre}</DialogTitle>
            <DialogDescription>Representación visual del documento fiscal antes de emitirlo.</DialogDescription>
          </DialogHeader>
          <div className="relative border rounded-lg p-6 bg-white dark:bg-background space-y-6 text-sm overflow-hidden">
            {/* Marca de agua diagonal */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <span className="text-4xl font-bold text-muted-foreground/[0.07] -rotate-[30deg] whitespace-nowrap select-none tracking-widest">
                VISTA PREVIA — DOCUMENTO NO VINCULANTE
              </span>
            </div>

            {/* Encabezado del documento */}
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Documento</h4>
                <p className="font-medium">{tipoActual?.nombreCorto} — {tipoActual?.nombre}</p>
                <p className="text-xs text-muted-foreground">Fecha: {new Date().toLocaleDateString('es-SV')}</p>
                <p className="text-xs text-muted-foreground">
                  Condición: {CONDICIONES_OPERACION.find(c => c.codigo === watchAll.condicionOperacion)?.nombre}
                </p>
                {sumarIvaAutomatico && tipoDte === '01' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">⚡ IVA +13% sumado automáticamente</p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {esCD ? 'Donante' : 'Receptor'}
                </h4>
                <p className="font-medium">{watchAll.receptor?.nombre || (esCD ? 'ANÓNIMO' : '—')}</p>
                {watchAll.receptor?.numDocumento && (
                  <p className="text-xs font-mono text-muted-foreground">{watchAll.receptor.numDocumento}</p>
                )}
                {watchAll.receptor?.correo && (
                  <p className="text-xs text-muted-foreground">{watchAll.receptor.correo}</p>
                )}
                {esCCF && watchAll.receptor?.nrc && (
                  <p className="text-xs text-muted-foreground">NRC: {watchAll.receptor.nrc}</p>
                )}
              </div>
            </div>

            {/* Tabla de ítems */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detalle de Items</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 font-medium w-8">#</th>
                    <th className="py-1.5 font-medium">Código</th>
                    <th className="py-1.5 font-medium">Descripción</th>
                    <th className="py-1.5 font-medium text-right">Cant.</th>
                    <th className="py-1.5 font-medium text-right">P.U.</th>
                    <th className="py-1.5 font-medium text-right">Desc.</th>
                    <th className="py-1.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {watchAll.items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="py-1.5 text-muted-foreground">{idx + 1}</td>
                      <td className="py-1.5 font-mono">{item.codigo || '—'}</td>
                      <td className="py-1.5 max-w-[200px] truncate">{item.descripcion || 'Sin descripción'}</td>
                      <td className="py-1.5 text-right">{item.cantidad}</td>
                      <td className="py-1.5 text-right">${(item.precioUnitario || 0).toFixed(2)}</td>
                      <td className="py-1.5 text-right">${(item.descuento || 0).toFixed(2)}</td>
                      <td className="py-1.5 text-right font-medium">
                        ${(esCD
                          ? (lineasCalculadas[idx]?.donacion || 0)
                          : (lineasCalculadas[idx]?.ventaGravada || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bloque de totales */}
            <div className="border-t pt-4 flex justify-end">
              <div className="space-y-1.5 text-right w-64">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{esFSE ? 'Total Compra' : esCD ? 'Total Donado' : 'Subtotal'}:</span>
                  <span>${(
                    esCD ? ((resumen as any)?.totalDonado ?? 0)
                    : esFSE ? ((resumen as any)?.totalCompra ?? 0)
                    : (resumen?.subTotalVentas || resumen?.subTotal || 0)
                  ).toFixed(2)}</span>
                </div>
                {((resumen as any)?.totalDescu || 0) > 0 && (
                  <div className="flex justify-between text-xs text-orange-500">
                    <span>Descuento:</span>
                    <span>-${(resumen as any)?.totalDescu?.toFixed(2)}</span>
                  </div>
                )}
                {!esFSE && !esCD && !esFEX && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">IVA (13%):</span>
                    <span>${((resumen as any)?.totalIva || 0).toFixed(2)}</span>
                  </div>
                )}
                {/* Monto Total Operación (si hay retenciones/percepciones) */}
                {(((resumen as any)?.reteRenta || 0) > 0 || ((resumen as any)?.ivaRete1 || 0) > 0 || ((resumen as any)?.ivaPerci1 || 0) > 0) && (
                  <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                    <span className="text-muted-foreground">Monto Total Operación:</span>
                    <span>${((resumen as any)?.montoTotalOperacion || 0).toFixed(2)}</span>
                  </div>
                )}
                {(resumen as any)?.reteRenta > 0 && (
                  <div className="flex justify-between text-xs text-orange-600">
                    <span>Retención Renta:</span>
                    <span>-${(resumen as any)?.reteRenta?.toFixed(2)}</span>
                  </div>
                )}
                {((resumen as any)?.ivaRete1 || 0) > 0 && (
                  <div className="flex justify-between text-xs text-orange-600">
                    <span>Retención IVA (1%):</span>
                    <span>-${(resumen as any)?.ivaRete1?.toFixed(2)}</span>
                  </div>
                )}
                {((resumen as any)?.ivaPerci1 || 0) > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Percepción IVA (1%):</span>
                    <span>+${(resumen as any)?.ivaPerci1?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>
                    {(((resumen as any)?.reteRenta || 0) > 0 || ((resumen as any)?.ivaRete1 || 0) > 0) 
                      ? 'Líquido a Entregar:' 
                      : 'Total a Pagar:'}
                  </span>
                  <span className="text-primary">${(
                    esCD ? ((resumen as any)?.totalDonado ?? 0) : ((resumen as any)?.totalPagar ?? 0)
                  ).toFixed(2)}</span>
                </div>
                {(resumen as any)?.totalLetras && (
                  <p className="text-[10px] text-muted-foreground uppercase pt-1">{(resumen as any).totalLetras}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cerrar Vista Previa
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════ */}
      {/* Módulo 6: Confirmar limpieza del formulario         */}
      {/* ════════════════════════════════════════════════════ */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Descartar documento?</DialogTitle>
            <DialogDescription>
              ¿Deseas descartar los datos de este DTE? Esta acción no se puede deshacer y se perderá todo el progreso actual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button variant="destructive" onClick={clearForm}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Sí, Limpiar Todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Suspense } from 'react';

export default function NuevaFacturaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <NuevaFacturaForm />
    </Suspense>
  );
}
