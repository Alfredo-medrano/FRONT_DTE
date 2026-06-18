/**
 * ========================================
 * FormReceptor — Paso 1, Sección B
 * ========================================
 * Datos del cliente/receptor: tipo de documento,
 * autocomplete desde CRM, nombre, correo, NRC,
 * dirección fiscal, datos internacionales (FEX).
 */
'use client';

import { RefObject } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FacturaFormValues } from '@/lib/validators';
import { DEPARTAMENTOS, getMunicipiosPorDepto, ACTIVIDADES_ECONOMICAS } from '@/lib/catalogos-mh';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Search, Globe } from 'lucide-react';

// Tipos de documento receptor
const TIPOS_DOCUMENTO = [
  { codigo: '36', nombre: 'NIT' },
  { codigo: '13', nombre: 'DUI' },
  { codigo: '02', nombre: 'Carné de Extranjero' },
  { codigo: '03', nombre: 'Pasaporte' },
  { codigo: '37', nombre: 'Otro' },
];

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

// Utilidades de formato de documento (se re-exportan para uso en page.tsx)
export function formatDocumento(raw: string, tipoDoc: string): string {
  const digits = raw.replace(/\D/g, '');
  if (tipoDoc === '13') {
    const d = digits.slice(0, 9);
    if (d.length <= 8) return d;
    return `${d.slice(0, 8)}-${d.slice(8, 9)}`;
  }
  if (tipoDoc === '36') {
    const d = digits.slice(0, 14);
    if (d.length <= 4) return d;
    if (d.length <= 10) return `${d.slice(0, 4)}-${d.slice(4)}`;
    if (d.length <= 13) return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10, 13)}-${d.slice(13, 14)}`;
  }
  return raw;
}

export function formatNrc(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 6) return d;
  return `${d.slice(0, d.length - 1)}-${d.slice(-1)}`;
}

export function validarFormatoDoc(valor: string, tipoDoc: string): 'valid' | 'invalid' | 'incomplete' {
  if (!valor) return 'incomplete';
  if (tipoDoc === '13') {
    if (!/^\d{8}-\d$/.test(valor)) {
      const digs = valor.replace(/\D/g, '');
      return digs.length < 9 ? 'incomplete' : 'invalid';
    }
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

export function validarNrc(valor: string): 'valid' | 'invalid' | 'incomplete' {
  if (!valor) return 'incomplete';
  if (/^\d{1,7}-\d$/.test(valor)) return 'valid';
  return 'incomplete';
}

// Tipo de sugerencia de cliente
export interface ClienteSugerencia {
  numDocumento: string;
  tipoDocumento: '36' | '13' | '02' | '03' | '37';
  nombre: string;
  correo?: string;
  telefono?: string;
  nrc?: string;
  codActividad?: string;
  descActividad?: string;
  direccion?: { departamento: string; municipio: string; complemento: string };
}

interface Props {
  form: UseFormReturn<FacturaFormValues>;
  tipoDte: string;
  esCCF: boolean;
  esFiscal: boolean;
  esFSE: boolean;
  esFEX: boolean;
  esCD: boolean;
  // Handlers del monolito (mantienen el estado compartido)
  handleDocumentoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNrcChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectCliente: (c: ClienteSugerencia) => void;
  clienteSugerencias: ClienteSugerencia[];
  showClienteDropdown: boolean;
  clienteInputRef: RefObject<HTMLInputElement | null>;
  clienteDropdownRef: RefObject<HTMLDivElement | null>;
  docValidation: 'valid' | 'invalid' | 'incomplete';
  nrcValidation: 'valid' | 'invalid' | 'incomplete';
  docPlaceholder: string;
  docMaxLength: number;
  municipiosFiltrados: Array<{ codigo: string; nombre: string; departamento: string }>;
}

export function FormReceptor({
  form, tipoDte, esCCF, esFiscal, esFSE, esFEX, esCD,
  handleDocumentoChange, handleNrcChange, selectCliente,
  clienteSugerencias, showClienteDropdown, clienteInputRef, clienteDropdownRef,
  docValidation, nrcValidation, docPlaceholder, docMaxLength, municipiosFiltrados,
}: Props) {
  const watchAll = form.watch();
  const deptoReceptor = watchAll.receptor?.direccion?.departamento || '';

  return (
    <div className="space-y-4">
      {/* ── Tipo de Documento + N° con autocomplete ── */}
      {!esFEX && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de Documento</Label>
            <Select
              value={watchAll.receptor?.tipoDocumento || '36'}
              onValueChange={(val) => {
                form.setValue('receptor.tipoDocumento', val as any);
                const currentDoc = form.getValues('receptor.numDocumento') || '';
                if (currentDoc && typeof val === 'string') {
                  form.setValue('receptor.numDocumento', formatDocumento(currentDoc, val));
                }
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
                  if (digits.length >= 3) { /* setShowClienteDropdown handled in parent */ }
                }}
                placeholder={docPlaceholder}
                maxLength={docMaxLength}
                className="pr-8"
                autoComplete="off"
              />
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
            {/* Dropdown autocomplete */}
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

      {/* ── Nombre + Correo ──────────────────────────── */}
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
          <Input type="email" {...form.register('receptor.correo')} placeholder="cliente@correo.com" />
          {form.formState.errors.receptor?.correo && (
            <span className="text-xs text-destructive">
              {form.formState.errors.receptor.correo.message}
            </span>
          )}
        </div>
      </div>

      {/* ── Teléfono + NRC ───────────────────────────── */}
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
              {watchAll.receptor?.nrc && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {nrcValidation === 'valid' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : nrcValidation === 'invalid' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : null}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Actividad Económica (CCF/NR/NC/ND) ──────── */}
      {esFiscal && (
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
        </div>
      )}

      {/* ── Dirección Fiscal (CCF/NR/NC/ND/FSE) ──────── */}
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

      {/* ── Receptor Internacional (FEX) ─────────────── */}
      {esFEX && (
        <>
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-600 dark:text-cyan-400">
            <Globe className="h-4 w-4" />
            Receptor Internacional
          </div>
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
            <Label>Nombre del Receptor *</Label>
            <Input {...form.register('receptor.nombre')} placeholder="Company Name / Full Name" />
          </div>
          <div className="space-y-2">
            <Label>Dirección Internacional *</Label>
            <Input
              {...form.register('receptor.direccion.complemento')}
              placeholder="1234 Main St, New York, NY 10001"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Correo Electrónico</Label>
              <Input type="email" {...form.register('receptor.correo')} placeholder="contact@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input {...form.register('receptor.telefono')} placeholder="+1 555 123 4567" />
            </div>
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
              <Input type="number" step="0.01" {...form.register('datosExportacion.seguro', { valueAsNumber: true })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Flete ($)</Label>
              <Input type="number" step="0.01" {...form.register('datosExportacion.flete', { valueAsNumber: true })} placeholder="0.00" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
