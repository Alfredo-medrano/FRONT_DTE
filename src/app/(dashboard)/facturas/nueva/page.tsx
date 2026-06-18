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
import { FormEncabezado } from '@/components/facturas/FormEncabezado';
import { FormReceptor } from '@/components/facturas/FormReceptor';
import { FormDetalles } from '@/components/facturas/FormDetalles';
import { PanelTotales } from '@/components/facturas/PanelTotales';

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
      { descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, tipoItem: 1, uniMedida: 59, codigo: '' },
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
    form.setValue(`items.${index}.tipoItem`, producto.uniMedida === 99 ? 2 : 1);
    setProductoDropdownIndex(null);
    setProductoQuery('');
  };

  // ── Módulo 4: Tab en Descuento → nueva línea ─────────────
  const handleDescuentoTab = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Tab' && !e.shiftKey && index === itemsFields.length - 1) {
      e.preventDefault();
      appendItem({ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, tipoItem: 1, uniMedida: 59, codigo: '' });
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
          {/* PASO 1: TIPO DTE + RECEPTOR */}
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
                <FormEncabezado
                  form={form}
                  tipoDte={tipoDte}
                  esCCF={esCCF}
                  esNCND={esNCND}
                />
                <FormReceptor
                  form={form}
                  tipoDte={tipoDte}
                  esCCF={esCCF}
                  esFiscal={esFiscal}
                  esFSE={esFSE}
                  esFEX={esFEX}
                  esCD={esCD}
                  handleDocumentoChange={handleDocumentoChange}
                  handleNrcChange={handleNrcChange}
                  selectCliente={selectCliente}
                  clienteSugerencias={clienteSugerencias}
                  showClienteDropdown={showClienteDropdown}
                  clienteInputRef={clienteInputRef}
                  clienteDropdownRef={clienteDropdownRef}
                  docValidation={docValidation}
                  nrcValidation={nrcValidation}
                  docPlaceholder={docPlaceholder}
                  docMaxLength={docMaxLength}
                  municipiosFiltrados={municipiosFiltrados}
                />
              </CardContent>
            </Card>
          )}

          {/* PASO 2: DETALLES */}
          {step === 2 && (
            <Card>
              <CardContent className="pt-6">
                <FormDetalles
                  form={form}
                  tipoDte={tipoDte}
                  esCD={esCD}
                  esFiscal={esFiscal}
                  sumarIvaAutomatico={sumarIvaAutomatico}
                  setSumarIvaAutomatico={setSumarIvaAutomatico}
                  itemsFields={itemsFields}
                  appendItem={appendItem}
                  removeItem={removeItem}
                  lineasCalculadas={lineasCalculadas}
                  productoDropdownIndex={productoDropdownIndex}
                  setProductoDropdownIndex={setProductoDropdownIndex}
                  productoQuery={productoQuery}
                  setProductoQuery={setProductoQuery}
                  productoSugerencias={productoSugerencias}
                  selectProducto={selectProducto}
                  handleDescuentoTab={handleDescuentoTab}
                  precioLabel={precioLabel}
                />
              </CardContent>
            </Card>
          )}

          {/* PASO 3: RESUMEN Y OBSERVACIONES */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-5">
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

                    {esNCND && watchAll.documentoRelacionado?.numeroDocumento && (
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Documento Relacionado
                        </h4>
                        <p className="text-xs font-mono">{watchAll.documentoRelacionado.numeroDocumento}</p>
                        <p className="text-xs text-muted-foreground">{watchAll.documentoRelacionado.fechaEmision}</p>
                      </div>
                    )}

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
                                  <span className="text-orange-500 ml-1">(desc: -$${item.descuento?.toFixed(2)})</span>
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
          <PanelTotales
            form={form}
            tipoDte={tipoDte}
            esCCF={esCCF}
            esFEX={esFEX}
            esFSE={esFSE}
            esCD={esCD}
            esNCND={esNCND}
            step={step}
            setStep={setStep}
            nextStep={nextStep}
            isSubmitting={isSubmitting}
            loadingMessage={loadingMessage}
            syntheticStatus={syntheticStatus}
            showPreview={showPreview}
            setShowPreview={setShowPreview}
            showClearConfirm={showClearConfirm}
            setShowClearConfirm={setShowClearConfirm}
            saveDraft={saveDraft}
            clearForm={clearForm}
            borradorMsg={borradorMsg}
            resumen={resumen}
            lineasCalculadas={lineasCalculadas}
            sumarIvaAutomatico={sumarIvaAutomatico}
            tipoActual={tipoActual}
          />
        </div>
      </form>
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
