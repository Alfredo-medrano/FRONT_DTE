/**
 * ========================================
 * DEFINICIÓN DE PLANES DTE SAAS
 * ========================================
 * Metadata visual para el selector de planes
 * en el wizard de registro.
 */

export interface PlanDTE {
  id: 'BASICO' | 'PROFESIONAL' | 'EMPRESARIAL' | 'ILIMITADO';
  nombre: string;
  precio: string;
  precioNumerico: number;
  dteMes: number | null; // null = ilimitado
  popular: boolean;
  descripcion: string;
  features: string[];
  color: string; // Tailwind gradient class
  iconName: string;
}

export const PLANES: PlanDTE[] = [
  {
    id: 'BASICO',
    nombre: 'Básico',
    precio: '$29.99/mes',
    precioNumerico: 29.99,
    dteMes: 100,
    popular: false,
    descripcion: 'Ideal para pequeños negocios que están iniciando con la facturación electrónica.',
    features: [
      '100 DTEs por mes',
      '1 Emisor (NIT)',
      'Soporte por email',
      'Dashboard de estadísticas',
      'Reintentos automáticos',
    ],
    color: 'from-slate-500 to-slate-700',
    iconName: 'Store',
  },
  {
    id: 'PROFESIONAL',
    nombre: 'Profesional',
    precio: '$59.99/mes',
    precioNumerico: 59.99,
    dteMes: 500,
    popular: true,
    descripcion: 'Para empresas en crecimiento que necesitan volumen y flexibilidad.',
    features: [
      '500 DTEs por mes',
      '3 Emisores (NITs)',
      'Soporte prioritario',
      'API Keys múltiples',
      'Dashboard avanzado',
      'Pipeline de ventas CRM',
    ],
    color: 'from-blue-500 to-indigo-600',
    iconName: 'Building2',
  },
  {
    id: 'EMPRESARIAL',
    nombre: 'Empresarial',
    precio: '$129.99/mes',
    precioNumerico: 129.99,
    dteMes: 2000,
    popular: false,
    descripcion: 'Para operaciones de alto volumen con múltiples puntos de venta.',
    features: [
      '2,000 DTEs por mes',
      'Emisores ilimitados',
      'Soporte dedicado 24/7',
      'API Keys ilimitadas',
      'Webhooks y notificaciones',
      'Reportes fiscales exportables',
      'Integración contable',
    ],
    color: 'from-purple-500 to-violet-700',
    iconName: 'Landmark',
  },
  {
    id: 'ILIMITADO',
    nombre: 'Ilimitado',
    precio: '$249.99/mes',
    precioNumerico: 249.99,
    dteMes: null,
    popular: false,
    descripcion: 'Sin límites. Para operaciones enterprise y revendedores.',
    features: [
      'DTEs ilimitados',
      'Emisores ilimitados',
      'Account manager dedicado',
      'SLA 99.9% disponibilidad',
      'Prioridad en cola de firma',
      'Reportería personalizada',
      'Soporte implementación',
      'Multi-ambiente (prueba + producción)',
    ],
    color: 'from-amber-500 to-orange-600',
    iconName: 'Rocket',
  },
];

/**
 * Obtiene un plan por su ID
 */
export function getPlanById(id: string): PlanDTE | undefined {
  return PLANES.find((p) => p.id === id);
}
