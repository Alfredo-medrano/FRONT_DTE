export const TIPOS_DTE = [
  { codigo: '01', nombre: 'Factura Electrónica', nombreCorto: 'FE' },
  { codigo: '03', nombre: 'Comprobante de Crédito Fiscal', nombreCorto: 'CCF' },
  { codigo: '04', nombre: 'Nota de Remisión', nombreCorto: 'NR' },
  { codigo: '05', nombre: 'Nota de Crédito', nombreCorto: 'NC' },
  { codigo: '06', nombre: 'Nota de Débito', nombreCorto: 'ND' },
  { codigo: '11', nombre: 'Factura de Exportación', nombreCorto: 'FEX' },
  { codigo: '14', nombre: 'Factura de Sujeto Excluido', nombreCorto: 'FSE' },
  { codigo: '15', nombre: 'Comprobante de Donación', nombreCorto: 'CD' },
];

export const CONDICIONES_OPERACION = [
  { codigo: 1, nombre: 'Contado' },
  { codigo: 2, nombre: 'Crédito' },
  { codigo: 3, nombre: 'Otro' },
];

export const TIPOS_ITEM = [
  { codigo: 1, nombre: 'Bienes' },
  { codigo: 2, nombre: 'Servicios' },
  { codigo: 3, nombre: 'Ambos' },
  { codigo: 4, nombre: 'Otros' },
];

export const DTE_STATUS_COLORS: Record<string, string> = {
  CREADO: 'bg-blue-100 text-blue-800',
  VALIDADO: 'bg-blue-200 text-blue-800',
  FIRMADO: 'bg-blue-300 text-blue-900',
  ENVIADO: 'bg-yellow-100 text-yellow-800 animate-pulse',
  PROCESADO: 'bg-green-100 text-green-800',
  RECHAZADO: 'bg-red-100 text-red-800',
  ERROR: 'bg-orange-100 text-orange-800',
  ANULADO: 'bg-gray-100 text-gray-800',
};

// Configuración general
export const TASA_IVA = 0.13;
export const TASA_RETENCION_RENTA = 0.10;
export const CODIGO_TRIBUTO_IVA = '20';
