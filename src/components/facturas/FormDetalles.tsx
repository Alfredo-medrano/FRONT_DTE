/**
 * ========================================
 * FormDetalles — Paso 2
 * ========================================
 * Líneas de productos/servicios/donaciones con:
 * - Búsqueda predictiva de catálogo
 * - Tab al último descuento → nueva línea
 * - Cálculo de subtotal por línea
 * - Toggle "sumar IVA automático" (solo FE-01)
 */
'use client';

import { UseFormReturn, FieldArrayWithId } from 'react-hook-form';
import { FacturaFormValues } from '@/lib/validators';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

export interface ProductoCatalogo {
  codigo: string;
  descripcion: string;
  precioUnitario: number;
  uniMedida: number;
}

interface LineaCalculada {
  ventaGravada?: number;
  ivaItem?: number;
  donacion?: number;
}

interface Props {
  form: UseFormReturn<FacturaFormValues>;
  tipoDte: string;
  esCD: boolean;
  esFiscal: boolean;
  sumarIvaAutomatico: boolean;
  setSumarIvaAutomatico: (v: boolean) => void;
  itemsFields: FieldArrayWithId<FacturaFormValues, 'items', 'id'>[];
  appendItem: (item: any) => void;
  removeItem: (index: number) => void;
  lineasCalculadas: LineaCalculada[];
  productoDropdownIndex: number | null;
  setProductoDropdownIndex: (v: number | null) => void;
  productoQuery: string;
  setProductoQuery: (v: string) => void;
  productoSugerencias: ProductoCatalogo[];
  selectProducto: (p: ProductoCatalogo, index: number) => void;
  handleDescuentoTab: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
  precioLabel: string;
}

export function FormDetalles({
  form, tipoDte, esCD, esFiscal, sumarIvaAutomatico, setSumarIvaAutomatico,
  itemsFields, appendItem, removeItem, lineasCalculadas,
  productoDropdownIndex, setProductoDropdownIndex, productoQuery, setProductoQuery,
  productoSugerencias, selectProducto, handleDescuentoTab, precioLabel,
}: Props) {
  const watchAll = form.watch();

  return (
    <div className="space-y-4">
      {/* ── Header con toggle IVA y botón Agregar ─── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {tipoDte === '01'
            ? (sumarIvaAutomatico ? 'Se sumará +13% IVA a tus precios' : 'Los precios incluyen IVA (13%)')
            : esFiscal ? 'Los precios son sin IVA — el impuesto se desglosa'
            : tipoDte === '14' ? 'Sin IVA — aplica retención de renta 10%'
            : tipoDte === '11' ? 'Sin IVA — exportación exenta'
            : esCD ? 'Ingresa el valor de cada bien o servicio donado'
            : 'Agrega los items'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
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
              appendItem({ descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0, tipoItem: 1, uniMedida: 59, codigo: '' })
            }
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Agregar Línea
          </Button>
        </div>
      </div>

      {/* ── Líneas de items ───────────────────────── */}
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
            {/* Código con búsqueda predictiva */}
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

            {/* Tipo de Item */}
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Tipo *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={watchAll.items[index]?.tipoItem ?? 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  form.setValue(`items.${index}.tipoItem`, val);
                  form.setValue(`items.${index}.uniMedida`, val === 2 ? 99 : 59);
                }}
              >
                <option value={1}>Bien</option>
                <option value={2}>Servicio</option>
              </select>
            </div>

            {/* Descripción con búsqueda predictiva */}
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
              {/* Dropdown catálogo */}
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

            {/* Cantidad */}
            <div className="space-y-1 md:col-span-1">
              <Label className="text-xs">Cantidad *</Label>
              <Input
                type="number" step="0.01"
                {...form.register(`items.${index}.cantidad`, { valueAsNumber: true })}
                className="h-9 text-sm"
              />
            </div>

            {/* Precio */}
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">{precioLabel} *</Label>
              <Input
                type="number" step="0.01"
                {...form.register(`items.${index}.precioUnitario`, { valueAsNumber: true })}
                className="h-9 text-sm"
              />
            </div>

            {/* Descuento + Tab → nueva línea */}
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

          {/* Subtotal por línea */}
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
              ${(esCD
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
    </div>
  );
}
