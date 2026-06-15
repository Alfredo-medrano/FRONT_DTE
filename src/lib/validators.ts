import { z } from 'zod';

// ═══════════════════════════════════════════════
// TIPOS DE DOCUMENTO DEL RECEPTOR
// ═══════════════════════════════════════════════
// 36 = NIT, 13 = DUI, 37 = Otro, 03 = Pasaporte, 02 = Carné extranjero
export const tipoDocumentoReceptorSchema = z.enum(['36', '13', '37', '03', '02']);

// ═══════════════════════════════════════════════
// DIRECCIÓN FISCAL
// ═══════════════════════════════════════════════
export const direccionSchema = z.object({
  departamento: z.string().length(2, 'Departamento requerido (2 dígitos)').default('06'),
  municipio: z.string().min(2).max(3, 'Municipio máximo 3 dígitos').default('14'),
  complemento: z.string().max(200).optional().or(z.literal('')),
});

// ═══════════════════════════════════════════════
// RECEPTOR (CLIENTE)
// Alineado con backend base.schema.js
// ═══════════════════════════════════════════════
export const receptorSchema = z.object({
  tipoDocumento: tipoDocumentoReceptorSchema.optional(),
  numDocumento: z.string().optional(),
  // CCF / NC / ND / NR usa nit directamente (no numDocumento)
  nit: z.string().optional(),
  nrc: z.string().nullable().optional(),
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  // CCF / NC / ND requieren actividad económica
  codActividad: z.string().nullable().optional(),
  descActividad: z.string().nullable().optional(),
  nombreComercial: z.string().nullable().optional(),
  // Dirección fiscal (requerida para CCF/NC/ND)
  direccion: direccionSchema.nullable().optional(),
  telefono: z.string()
    .regex(/^\d{8}$/, 'Teléfono de 8 dígitos')
    .optional()
    .or(z.literal('')),
  // Backend SIEMPRE requiere correo válido (excepto FEX y CD donde es opcional)
  correo: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  // FEX: campos internacionales
  codPais: z.string().length(4).optional(),
  nombrePais: z.string().optional(),
  complemento: z.string().optional(), // Para FEX (receptor internacional sin direccion)
  tipoPersona: z.number().int().min(1).max(2).optional(), // 1=Jurídica, 2=Natural
  // CD (donante): codDomiciliado
  codDomiciliado: z.number().int().min(1).max(2).optional(),
});

// ═══════════════════════════════════════════════
// DOCUMENTO RELACIONADO (NC/ND obligatorio)
// ═══════════════════════════════════════════════
export const documentoRelacionadoSchema = z.object({
  tipoDocumento: z.enum(['03', '07'], {
    message: 'Solo se puede relacionar con CCF (03) o NR (07)',
  }),
  tipoGeneracion: z.number().int().min(1).max(2).default(2),
  numeroDocumento: z.string().min(1, 'Número de documento requerido'),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
});

// ═══════════════════════════════════════════════
// ITEM / PRODUCTO
// Alineado con backend base.schema.js
// ═══════════════════════════════════════════════
export const itemSchema = z.object({
  codigo: z.string().max(25).optional().or(z.literal('')),
  descripcion: z.string().min(1, 'Descripción requerida').max(1000),
  cantidad: z.number().positive('Debe ser > 0').max(999999999),
  precioUnitario: z.number().nonnegative('No negativo'),
  descuento: z.number().nonnegative().default(0),
  tipoItem: z.number().min(1).max(4).default(1),
  uniMedida: z.number().int().default(99), // 99 = Otra (alineado con backend)
});

// ═══════════════════════════════════════════════
// SCHEMA PRINCIPAL DE FACTURA
// Soporta todos los tipos DTE emitibles
// ═══════════════════════════════════════════════
export const crearFacturaSchema = z.object({
  tipoDte: z.enum(['01', '03', '04', '05', '06', '11', '14', '15']).default('01'),
  receptor: receptorSchema,
  items: z.array(itemSchema).min(1, 'Mínimo un ítem'),
  condicionOperacion: z.number().int().min(1).max(3).default(1),
  observaciones: z.string().max(3000).optional().or(z.literal('')),
  // NC (05) y ND (06): documento relacionado obligatorio
  documentoRelacionado: documentoRelacionadoSchema.optional(),
  // FEX (11): datos de exportación
  datosExportacion: z.object({
    tipoItemExpor: z.number().int().min(1).max(3).default(1),
    recintoFiscal: z.string().nullable().optional(),
    regimen: z.string().nullable().optional(),
    seguro: z.number().nonnegative().default(0),
    flete: z.number().nonnegative().default(0),
    codIncoterms: z.string().nullable().optional(),
    descIncoterms: z.string().nullable().optional(),
  }).optional(),
  // Retenciones e impuestos especiales dinámicos
  aplicarReteRenta: z.boolean().optional().default(false),
  aplicarReteIva1: z.boolean().optional().default(false),
  aplicarPerciIva1: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
  const tipo = data.tipoDte;

  // ── CCF (03) y NR (04): mismo receptor que CCF ──────────────────────────────
  if (tipo === '03' || tipo === '04') {
    if (!data.receptor.nit && !data.receptor.numDocumento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['receptor', 'numDocumento'],
        message: `NIT requerido para ${tipo === '03' ? 'CCF' : 'Nota de Remisión'}`,
      });
    }
    if (tipo === '03' && !data.receptor.nrc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['receptor', 'nrc'],
        message: 'NRC requerido para CCF',
      });
    }
    if (!data.receptor.codActividad) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['receptor', 'codActividad'],
        message: 'Actividad Económica requerida',
      });
    }
    if (!data.receptor.direccion?.departamento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['receptor', 'direccion', 'departamento'], message: 'Departamento requerido' });
    }
    if (!data.receptor.direccion?.municipio) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['receptor', 'direccion', 'municipio'], message: 'Municipio requerido' });
    }
    if (!data.receptor.direccion?.complemento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['receptor', 'direccion', 'complemento'], message: 'Dirección (Complemento) requerida' });
    }
  }

  // ── NC (05) y ND (06): requieren documentoRelacionado ───────────────────────
  if (tipo === '05' || tipo === '06') {
    if (!data.documentoRelacionado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentoRelacionado'],
        message: `documentoRelacionado es obligatorio para ${tipo === '05' ? 'Nota de Crédito' : 'Nota de Débito'}`,
      });
    }
    // NC/ND también requieren receptor tipo CCF
    if (!data.receptor.nit && !data.receptor.numDocumento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['receptor', 'numDocumento'], message: 'NIT requerido' });
    }
  }

  // ── FE (01): requiere correo ─────────────────────────────────────────────────
  if (tipo === '01' && !data.receptor.correo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['receptor', 'correo'],
      message: 'Correo electrónico requerido',
    });
  }

  // ── Validación de formatos de Documentos de Identidad ───────────────────────
  if (data.receptor.numDocumento && tipo !== '11' && tipo !== '15') {
    if (data.receptor.tipoDocumento === '13') {
      if (!/^\d{8}-\d$/.test(data.receptor.numDocumento)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['receptor', 'numDocumento'],
          message: 'DUI Inválido. Debe tener formato 00000000-0',
        });
      } else {
        // Validación del algoritmo Módulo 10 para DUI
        const digits = data.receptor.numDocumento.replace('-', '');
        let sum = 0;
        for (let i = 0; i < 8; i++) {
          sum += parseInt(digits[i], 10) * (9 - i);
        }
        const mod = sum % 10;
        const checkDigit = mod === 0 ? 0 : 10 - mod;
        if (parseInt(digits[8], 10) !== checkDigit) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['receptor', 'numDocumento'],
            message: 'DUI Inválido. Dígito verificador incorrecto',
          });
        }
      }
    } else if (data.receptor.tipoDocumento === '36') {
      const nitLimpio = data.receptor.numDocumento.replace(/-/g, '');
      if (!/^(\d{14}|\d{9})$/.test(nitLimpio)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['receptor', 'numDocumento'],
          message: 'NIT Inválido. Debe tener 14 o 9 dígitos',
        });
      }
    }
  }
});

export type FacturaFormValues = z.infer<typeof crearFacturaSchema>;
