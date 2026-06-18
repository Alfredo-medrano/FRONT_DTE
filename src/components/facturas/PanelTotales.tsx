/**
 * ========================================
 * PanelTotales — Columna derecha (sticky)
 * ========================================
 * Panel de totales en tiempo real, botones de
 * acción (siguiente, emitir, borrador, limpiar)
 * y vista previa del DTE en modal.
 *
 * Contiene lógica de navegación de pasos y
 * los modals de "Vista Previa" y "Limpiar Form".
 */
'use client';

import { UseFormReturn } from 'react-hook-form';
import { FacturaFormValues } from '@/lib/validators';
import { CONDICIONES_OPERACION } from '@/lib/constants';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  Loader2, ArrowRight, ArrowLeft, CheckCircle2, RotateCcw,
  Save, Eye, FileText,
} from 'lucide-react';
import { DteLifecycleTracker } from '@/components/ui/dte-lifecycle-tracker';

interface TotalesResumen {
  subTotalVentas?: number;
  subTotal?: number;
  totalDescu?: number;
  totalIva?: number;
  totalDonado?: number;
  totalCompra?: number;
  montoTotalOperacion?: number;
  reteRenta?: number;
  ivaRete1?: number;
  ivaPerci1?: number;
  totalPagar?: number;
  totalLetras?: string;
}

interface LineaCalculada {
  ventaGravada?: number;
  ivaItem?: number;
  donacion?: number;
}

interface Props {
  form: UseFormReturn<FacturaFormValues>;
  tipoDte: string;
  esCCF: boolean;
  esFEX: boolean;
  esFSE: boolean;
  esCD: boolean;
  esNCND: boolean;
  step: number;
  setStep: (v: number) => void;
  nextStep: () => void;
  isSubmitting: boolean;
  loadingMessage: string;
  syntheticStatus: string;
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  showClearConfirm: boolean;
  setShowClearConfirm: (v: boolean) => void;
  saveDraft: () => void;
  clearForm: () => void;
  borradorMsg: string | null;
  resumen: TotalesResumen;
  lineasCalculadas: LineaCalculada[];
  sumarIvaAutomatico: boolean;
  tipoActual: { nombreCorto: string; nombre: string } | undefined;
}

export function PanelTotales({
  form, tipoDte, esCCF, esFEX, esFSE, esCD, esNCND, step, setStep, nextStep,
  isSubmitting, loadingMessage, syntheticStatus, showPreview, setShowPreview,
  showClearConfirm, setShowClearConfirm, saveDraft, clearForm, borradorMsg,
  resumen, lineasCalculadas, sumarIvaAutomatico, tipoActual,
}: Props) {
  const watchAll = form.watch();
  const r = resumen as any;

  const hasRetenciones = (r?.reteRenta || 0) > 0 || (r?.ivaRete1 || 0) > 0;

  return (
    <>
      {/* ── Panel sticky de totales + botones ─────── */}
      <Card className="border shadow-lg">
        <CardHeader className="pb-3 bg-muted/30">
          <CardTitle className="text-base">{esCD ? 'Total Donado' : 'Totales de Transacción'}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {esFSE ? 'Total Compra' : esCD ? 'Total Donado' : 'Subtotal Ventas'}
              </span>
              <span>
                ${(esCD ? (r?.totalDonado ?? 0) : esFSE ? (r?.totalCompra ?? 0) : r?.subTotalVentas || r?.subTotal || 0).toFixed(2)}
              </span>
            </div>

            {(r?.totalDescu || 0) > 0 && (
              <div className="flex justify-between text-sm text-orange-500">
                <span>Descuento</span>
                <span>-${r?.totalDescu?.toFixed(2)}</span>
              </div>
            )}

            {!esFSE && !esCD && !esFEX && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (13%)</span>
                <span>${(r?.totalIva || 0).toFixed(2)}</span>
              </div>
            )}

            {((r?.reteRenta || 0) > 0 || (r?.ivaRete1 || 0) > 0 || (r?.ivaPerci1 || 0) > 0) && (
              <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                <span className="text-muted-foreground">Monto Total Operación</span>
                <span>${(r?.montoTotalOperacion || 0).toFixed(2)}</span>
              </div>
            )}

            {r?.reteRenta > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Retención Renta (10%)</span>
                <span>-${r?.reteRenta?.toFixed(2)}</span>
              </div>
            )}
            {(r?.ivaRete1 || 0) > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Retención IVA (1%)</span>
                <span>-${r?.ivaRete1?.toFixed(2)}</span>
              </div>
            )}
            {(r?.ivaPerci1 || 0) > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Percepción IVA (1%)</span>
                <span>+${r?.ivaPerci1?.toFixed(2)}</span>
              </div>
            )}

            <div className="h-px w-full bg-border my-4" />

            <div className="flex justify-between font-bold text-2xl">
              <span>{hasRetenciones ? 'Líquido a Entregar' : 'Total'}</span>
              <span className="text-primary">
                ${(esCD ? (r?.totalDonado ?? 0) : (r?.totalPagar ?? 0)).toFixed(2)}
              </span>
            </div>

            {r?.totalLetras && (
              <p className="text-[10px] text-muted-foreground border-t pt-2 uppercase text-center mt-2">
                {r.totalLetras}
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

          {/* Borrador y Limpiar */}
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

      {/* ── Loading overlay premium ─────────────────── */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center text-white flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-20 w-20 rounded-full bg-primary/20 animate-pulse blur-xl" />
              <div className="h-16 w-16 rounded-full border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
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

      {/* ── Vista Previa Modal ──────────────────────── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa — {tipoActual?.nombreCorto} {tipoActual?.nombre}</DialogTitle>
            <DialogDescription>Representación visual del documento fiscal antes de emitirlo.</DialogDescription>
          </DialogHeader>
          <div className="relative border rounded-lg p-6 bg-white dark:bg-background space-y-6 text-sm overflow-hidden">
            {/* Marca de agua */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <span className="text-4xl font-bold text-muted-foreground/[0.07] -rotate-[30deg] whitespace-nowrap select-none tracking-widest">
                VISTA PREVIA — DOCUMENTO NO VINCULANTE
              </span>
            </div>
            {/* Encabezado */}
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
            {/* Tabla items */}
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
                        ${(esCD ? (lineasCalculadas[idx]?.donacion || 0) : (lineasCalculadas[idx]?.ventaGravada || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totales */}
            <div className="border-t pt-4 flex justify-end">
              <div className="space-y-1.5 text-right w-64">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{esFSE ? 'Total Compra' : esCD ? 'Total Donado' : 'Subtotal'}:</span>
                  <span>${(esCD ? (r?.totalDonado ?? 0) : esFSE ? (r?.totalCompra ?? 0) : r?.subTotalVentas || r?.subTotal || 0).toFixed(2)}</span>
                </div>
                {(r?.totalDescu || 0) > 0 && (
                  <div className="flex justify-between text-xs text-orange-500">
                    <span>Descuento:</span>
                    <span>-${r?.totalDescu?.toFixed(2)}</span>
                  </div>
                )}
                {!esFSE && !esCD && !esFEX && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">IVA (13%):</span>
                    <span>${(r?.totalIva || 0).toFixed(2)}</span>
                  </div>
                )}
                {hasRetenciones && (
                  <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                    <span className="text-muted-foreground">Monto Total Operación:</span>
                    <span>${(r?.montoTotalOperacion || 0).toFixed(2)}</span>
                  </div>
                )}
                {r?.reteRenta > 0 && (
                  <div className="flex justify-between text-xs text-orange-600">
                    <span>Retención Renta:</span>
                    <span>-${r?.reteRenta?.toFixed(2)}</span>
                  </div>
                )}
                {(r?.ivaRete1 || 0) > 0 && (
                  <div className="flex justify-between text-xs text-orange-600">
                    <span>Retención IVA (1%):</span>
                    <span>-${r?.ivaRete1?.toFixed(2)}</span>
                  </div>
                )}
                {(r?.ivaPerci1 || 0) > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Percepción IVA (1%):</span>
                    <span>+${r?.ivaPerci1?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>{hasRetenciones ? 'Líquido a Entregar:' : 'Total a Pagar:'}</span>
                  <span className="text-primary">${(esCD ? (r?.totalDonado ?? 0) : (r?.totalPagar ?? 0)).toFixed(2)}</span>
                </div>
                {r?.totalLetras && (
                  <p className="text-[10px] text-muted-foreground uppercase pt-1">{r.totalLetras}</p>
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

      {/* ── Confirmar limpieza del formulario ────────── */}
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
    </>
  );
}
