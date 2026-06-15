'use client';

import { use, useState } from 'react';
import { useAPI } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DTE_STATUS_COLORS, TIPOS_DTE } from '@/lib/constants';
import { fetchClient } from '@/lib/api-client';
import { Ban, Download, ExternalLink, ShieldCheck, Printer, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DteLifecycleTracker } from '@/components/ui/dte-lifecycle-tracker';

export default function FacturaDetallePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const router = useRouter();
  const [isConciliando, setIsConciliando] = useState(false);
  
  const { data: dteRes, isLoading, mutate } = useAPI<any>(`/api/dte/v2/factura/${codigo}`);
  
  // Adapt data from backend mapping jsonOriginal and local database values
  const dte = dteRes?.dte ? {
      ...dteRes.dte,
      status: dteRes.local?.status || 'SIN ESTADO',
      selloRecibido: dteRes.local?.selloRecibido,
      fecEmi: dteRes.dte?.identificacion?.fecEmi,
      horEmi: dteRes.dte?.identificacion?.horEmi,
      fechaEmision: dteRes.local?.fechaEmision || dteRes.dte?.identificacion?.fecEmi,
      numeroControl: dteRes.local?.numeroControl || dteRes.dte?.identificacion?.numeroControl,
      codigoGeneracion: dteRes.dte?.identificacion?.codigoGeneracion || codigo,
      tipoDte: dteRes.dte?.identificacion?.tipoDte,
      observaciones: dteRes.local?.observaciones,
      errorLog: dteRes.local?.errorLog,
      receptor: dteRes.dte?.receptor || {},
      resumen: dteRes.dte?.resumen || {},
      items: dteRes.dte?.cuerpoDocumento || []
  } : null;

  if (isLoading) return <div className="p-8 text-center animate-pulse">Cargando...</div>;
  if (!dte) return <div className="p-8 text-center text-muted-foreground">Factura no encontrada.</div>;

  const isProcesado = dte.status === 'PROCESADO';
  const isError = dte.status === 'ERROR' || dte.status === 'RECHAZADO';
  const tipo = TIPOS_DTE.find(t => t.codigo === dte.tipoDte);

  const isCCF = dte.tipoDte === '03';
  const isFSE = dte.tipoDte === '14';
  const isCD = dte.tipoDte === '15';
  const totalIva = dte.resumen?.totalIva ?? dte.resumen?.tributos?.find((t: any) => t.codigo === '20')?.valor ?? 0;
  const tieneRetenciones = isFSE || (isCCF && ((dte.resumen?.reteRenta || 0) > 0 || (dte.resumen?.ivaRete1 || 0) > 0 || (dte.resumen?.ivaPerci1 || 0) > 0));

  const handleAnular = async () => {
    if (!confirm('¿Estás seguro de que deseas anular este DTE? Esta acción no se puede deshacer.')) return;
    
    try {
      await fetchClient(`/api/dte/v2/factura/${codigo}/anular`, {
        method: 'POST',
        body: JSON.stringify({
           motivoAnulacion: 2, // Anulación de la operación
           motivoDescripcion: 'Anulado por usuario desde Dashboard'
        })
      });
      alert('DTE anulado correctamente.');
      mutate();
    } catch (e: any) {
      alert(`Error al anular: ${e.message}`);
    }
  };

  const handleConciliar = async () => {
    setIsConciliando(true);
    try {
      const res = await fetchClient(`/api/dte/v2/factura/${codigo}/conciliar`, { method: 'POST' });
      alert(res.mensaje || 'Conciliación terminada.');
      mutate();
    } catch (e: any) {
      alert(`Error al conciliar: ${e.message}`);
    } finally {
      setIsConciliando(false);
    }
  };

  const downloadJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dteRes?.dte || {}, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `dte-${dte.codigoGeneracion}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // ── Parámetros del QR oficial del MH ──────────────────────
  const ambiente = dteRes?.dte?.identificacion?.ambiente || dteRes?.local?.ambiente || '00';
  const fechaEmi = dte.fecEmi || (dte.fechaEmision ? dte.fechaEmision.split('T')[0] : '');
  const qrUrl = `https://admin.factura.gob.sv/consultaPublica?ambiente=${ambiente}&codGeneracion=${dte.codigoGeneracion}&fechaEmi=${fechaEmi}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}`;

  // ── Emisor ────────────────────────────────────────────────
  const emisorNombre = dteRes?.local?.emisor?.nombre || 'TUFACTURATECH S.A. DE C.V.';
  const emisorNit = dteRes?.local?.emisor?.nit || '0614-230823-101-9';
  const emisorNrc = dteRes?.local?.emisor?.nrc || '304928-1';
  const emisorDireccion = dteRes?.local?.emisor?.direccion || 'Alameda Roosevelt, Edificio Centro de Negocios, Nivel 4, San Salvador';
  const emisorActividad = dteRes?.local?.emisor?.nombreComercial || 'Servicios Tecnológicos de Facturación';
  const emisorCorreo = dteRes?.local?.emisor?.correo || 'soporte@tufacturatech.sv';
  const emisorTelefono = dteRes?.local?.emisor?.telefono || '2255-8888';

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-0">
      {/* Print styles are defined in globals.css @media print */}

      {/* ── Banner de Contingencia o Cola ── */}
      {dte.status === 'ERROR' && (
        <Card className="border-amber-500/50 bg-amber-500/10 no-print">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center text-amber-700 dark:text-amber-500 gap-2">
              <AlertTriangle className="h-5 w-5" />
              Documento guardado localmente (En cola de transmisión diferida)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-800 dark:text-amber-300">
            El sistema de Hacienda experimenta demoras o desconexión. Tu documento fiscal ya está asegurado en nuestra base de datos con el identificador correlativo fiscal y será retransmitido automáticamente por nuestro servicio en background. No es necesario realizar ninguna acción adicional ni volver a emitir el documento.
          </CardContent>
        </Card>
      )}

      {/* ── Header no imprimible ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 no-print">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Detalle de Factura</h2>
          <p className="text-muted-foreground font-mono text-xs">{dte.codigoGeneracion}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          <Button variant="outline" onClick={() => {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            window.open(`${baseUrl}/api/dte/v2/factura/${codigo}/pdf`, '_blank');
          }}>
            <Download className="h-4 w-4 mr-2" /> Descargar PDF
          </Button>
          <Button variant="outline" onClick={downloadJson}>
            <ExternalLink className="h-4 w-4 mr-2" /> JSON DTE
          </Button>
          {isProcesado && (
            <Button variant="destructive" onClick={handleAnular}>
              <Ban className="h-4 w-4 mr-2" /> Anular DTE
            </Button>
          )}
          {(dte.status === 'TRANSMITIDO' || dte.status === 'ERROR' || dte.status === 'CREADO') && (
            <Button variant="secondary" onClick={handleConciliar} disabled={isConciliando}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isConciliando ? 'animate-spin' : ''}`} /> 
              {isConciliando ? 'Conciliando...' : 'Conciliar Estado'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Ciclo de Vida DTE ── */}
      <Card className="hide-on-print">
        <CardHeader className="pb-2">
          <CardTitle>Ciclo de Vida Fiscal</CardTitle>
          <CardDescription>Seguimiento en tiempo real ante el Ministerio de Hacienda</CardDescription>
        </CardHeader>
        <CardContent>
          <DteLifecycleTracker currentStatus={dte.status} errorMessage={dte.errorLog || dte.observaciones} />
        </CardContent>
      </Card>

      {/* ── Panel de Resumen Rápido (Solo Pantalla) ── */}
      <div className="grid gap-6 md:grid-cols-3 hide-on-print">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Información General</CardTitle>
              <Badge className={DTE_STATUS_COLORS[dte.status]} variant="outline">{dte.status}</Badge>
            </div>
            <CardDescription>{tipo?.nombre || `DTE Tipo ${dte.tipoDte}`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">N° de Control</span>
                <span className="font-mono font-medium">{dte.numeroControl || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Fecha de Emisión</span>
                <span>{dte.fecEmi && dte.horEmi ? `${dte.fecEmi} ${dte.horEmi}` : new Date(dte.fechaEmision).toLocaleString()}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs">Sello Hacienda</span>
                {dte.selloRecibido ? (
                   <span className="flex items-center gap-1 font-mono text-green-600 font-medium">
                      <ShieldCheck className="h-4 w-4 shrink-0" /> {dte.selloRecibido}
                   </span>
                ) : (
                   <span className="text-muted-foreground italic text-xs">Pendiente de sello (En cola o procesando)</span>
                )}
              </div>
            </div>

            <div className="mt-4 border rounded-lg p-4 bg-muted/20">
               <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">Datos del Receptor</h4>
               <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nombre:</span> {dte.receptor?.nombre}</div>
                  <div><span className="text-muted-foreground">NIT/Doc:</span> {dte.receptor?.nit || dte.receptor?.numDocumento || 'N/A'}</div>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                   <span className="text-muted-foreground">{isFSE ? 'Total Compra' : 'Subtotal Ventas'}</span>
                   <span>${(isFSE ? (dte.resumen?.totalCompra || dte.resumen?.subTotal || 0) : (dte.resumen?.totalGravada || dte.resumen?.subTotalVentas || dte.resumen?.subTotal || 0)).toFixed(2)}</span>
                </div>
                {isCCF && (
                   <>
                      <div className="flex justify-between text-xs text-muted-foreground/80">
                         <span>Ventas No Sujetas</span>
                         <span>${(dte.resumen?.totalNoSuj || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground/80">
                         <span>Ventas Exentas</span>
                         <span>${(dte.resumen?.totalExenta || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground/80 text-orange-500">
                         <span>Descuento</span>
                         <span>-${(dte.resumen?.totalDescu || 0).toFixed(2)}</span>
                      </div>
                   </>
                )}
                {!isFSE && !isCD && (
                   <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA (13%)</span>
                      <span>${totalIva.toFixed(2)}</span>
                   </div>
                )}
                {tieneRetenciones && (
                   <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                      <span className="text-muted-foreground">Monto Total Operación</span>
                      <span>${(dte.resumen?.montoTotalOperacion || 0).toFixed(2)}</span>
                   </div>
                )}
                {isCCF && (
                   <>
                      {(dte.resumen?.reteRenta || 0) >= 0 && (
                         <div className="flex justify-between text-xs text-orange-600">
                            <span>Retención Renta (10%)</span>
                            <span>-${(dte.resumen?.reteRenta || 0).toFixed(2)}</span>
                         </div>
                      )}
                      {(dte.resumen?.ivaRete1 || 0) >= 0 && (
                         <div className="flex justify-between text-xs text-orange-600">
                            <span>Retención IVA (1%)</span>
                            <span>-${(dte.resumen?.ivaRete1 || 0).toFixed(2)}</span>
                         </div>
                      )}
                      {(dte.resumen?.ivaPerci1 || 0) >= 0 && (
                         <div className="flex justify-between text-xs text-emerald-600">
                            <span>Percepción IVA (1%)</span>
                            <span>+${(dte.resumen?.ivaPerci1 || 0).toFixed(2)}</span>
                         </div>
                      )}
                   </>
                )}
                {isFSE && (dte.resumen?.reteRenta || 0) >= 0 && (
                   <div className="flex justify-between text-orange-600">
                      <span>Retención Renta (10%)</span>
                      <span>-${(dte.resumen?.reteRenta || 0).toFixed(2)}</span>
                   </div>
                )}
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between text-lg font-bold">
                   <span>{tieneRetenciones ? 'Líquido a Entregar' : 'Total a Pagar'}</span>
                   <span className="text-primary">${(dte.resumen?.totalPagar || dte.resumen?.totalDonado || 0).toFixed(2)}</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Vista Previa de Representación Gráfica (Visible en Pantalla y en Impresión) ── */}
      <Card className="printable-card border bg-card text-card-foreground p-6 md:p-8 rounded-lg shadow-sm font-sans relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black">
        {/* Banner de marca de agua en pantalla si no está procesada */}
        {!isProcesado && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 select-none pointer-events-none opacity-[0.08] dark:opacity-[0.04] text-center w-full z-0 no-print">
            <p className="text-7xl md:text-9xl font-black tracking-widest text-primary uppercase">EN PROCESO</p>
            <p className="text-lg font-bold text-gray-500 uppercase tracking-widest">Validez Tributaria en Cola</p>
          </div>
        )}

        <div className="relative z-10 space-y-6">
          {/* Fila 1: Logo / Datos del Emisor y Cuadro Tributario */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-6">
            {/* Izquierda: Emisor */}
            <div className="space-y-2 flex-1">
              <h3 className="text-xl font-bold tracking-tight uppercase text-primary print:text-black">{emisorNombre}</h3>
              <p className="text-xs text-muted-foreground print:text-black max-w-md">{emisorActividad}</p>
              <div className="text-xs space-y-1 text-muted-foreground print:text-black">
                <p><span className="font-semibold">NIT:</span> {emisorNit} &nbsp;|&nbsp; <span className="font-semibold">NRC:</span> {emisorNrc}</p>
                <p><span className="font-semibold">Dirección:</span> {emisorDireccion}</p>
                <p><span className="font-semibold">Tel:</span> {emisorTelefono} &nbsp;|&nbsp; <span className="font-semibold">Correo:</span> {emisorCorreo}</p>
              </div>
            </div>

            {/* Derecha: Datos Tributarios */}
            <div className="border border-primary/20 print:border-black rounded-lg p-4 bg-muted/20 print:bg-transparent min-w-[280px] w-full md:w-auto text-center space-y-2">
              <h4 className="text-xs font-bold tracking-wider text-primary print:text-black uppercase">Documento Tributario Electrónico</h4>
              <p className="text-lg font-extrabold uppercase tracking-tight text-primary print:text-black">
                {tipo?.nombreCorto || 'DTE'} — {tipo?.nombre || 'FACTURA'}
              </p>
              <div className="h-px bg-primary/10 print:bg-black/20 my-2" />
              <div className="text-left text-[11px] space-y-1 font-mono">
                <p><span className="font-sans font-semibold">Código Generación:</span><br />{dte.codigoGeneracion}</p>
                <p><span className="font-sans font-semibold">Número de Control:</span><br />{dte.numeroControl}</p>
                <p>
                  <span className="font-sans font-semibold">Sello Hacienda:</span><br />
                  <span className={dte.selloRecibido ? "text-green-600 font-bold" : "text-muted-foreground italic"}>
                    {dte.selloRecibido || 'PENDIENTE DE SELLO'}
                  </span>
                </p>
                <p><span className="font-sans font-semibold">Ambiente:</span> {ambiente === '01' ? 'PRODUCCIÓN' : 'PRUEBAS'}</p>
              </div>
            </div>
          </div>

          {/* Fila 2: Datos del Receptor / Cliente */}
          <div className="bg-muted/10 print:bg-transparent rounded-lg border p-4">
            <h4 className="text-xs font-bold text-muted-foreground print:text-black uppercase tracking-wider mb-3">Receptor / Cliente</h4>
            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div>
                <p className="py-0.5"><span className="font-semibold text-muted-foreground print:text-black">Nombre/Razón Social:</span> {dte.receptor?.nombre || 'CONSUMIDOR FINAL'}</p>
                <p className="py-0.5"><span className="font-semibold text-muted-foreground print:text-black">DUI/NIT/Doc:</span> {dte.receptor?.nit || dte.receptor?.numDocumento || 'N/A'}</p>
                {dte.receptor?.nrc && <p className="py-0.5"><span className="font-semibold text-muted-foreground print:text-black">NRC:</span> {dte.receptor.nrc}</p>}
              </div>
              <div>
                <p className="py-0.5"><span className="font-semibold text-muted-foreground print:text-black">Dirección:</span> {dte.receptor?.direccion?.complemento || dte.receptor?.direccion || 'Dirección no provista'}</p>
                <p className="py-0.5"><span className="font-semibold text-muted-foreground print:text-black">Correo Electrónico:</span> {dte.receptor?.correo || 'N/A'}</p>
                <p className="py-0.5"><span className="font-semibold text-muted-foreground print:text-black">Teléfono:</span> {dte.receptor?.telefono || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Fila 3: Tabla de Items Facturados */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 print:bg-transparent print:border-b">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-bold text-black print:text-black">N°</TableHead>
                  <TableHead className="text-xs font-bold text-black print:text-black">Descripción del Producto / Servicio</TableHead>
                  <TableHead className="w-16 text-center text-xs font-bold text-black print:text-black">Cant.</TableHead>
                  <TableHead className="w-24 text-right text-xs font-bold text-black print:text-black">P. Unitario</TableHead>
                  <TableHead className="w-20 text-right text-xs font-bold text-black print:text-black">Descto</TableHead>
                  <TableHead className="w-28 text-right text-xs font-bold text-black print:text-black">Gravado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {dte.items?.map((item: any, idx: number) => {
                  const itemPrecio = item.precioUnitario || item.precioUni || 0;
                  const itemTotal = item.ventaGravada || item.donacion || item.compra || 0;
                  const itemDescuento = item.descuento || 0;
                  return (
                    <TableRow key={idx} className="print:border-b print:border-black/10">
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.descripcion}</TableCell>
                      <TableCell className="text-center">{item.cantidad}</TableCell>
                      <TableCell className="text-right">${itemPrecio.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground print:text-black">
                        {itemDescuento > 0 ? `-$${itemDescuento.toFixed(2)}` : '$0.00'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">${itemTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Fila 4: QR Code y Totales */}
          <div className="grid gap-6 md:grid-cols-5 pt-4">
            {/* Código QR oficial del MH */}
            <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-4 border rounded-lg p-4 bg-muted/10 print:bg-transparent">
              <div className="h-40 w-40 shrink-0 bg-white border rounded p-1 flex items-center justify-center">
                {/* QR Code image dynamically fetched */}
                <img 
                  src={qrCodeUrl} 
                  alt="QR MH Consulta" 
                  className="h-36 w-36" 
                  crossOrigin="anonymous"
                />
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <h5 className="text-xs font-bold uppercase tracking-wider text-primary print:text-black">Consulta Pública del DTE</h5>
                <p className="text-[10px] text-muted-foreground print:text-black leading-relaxed">
                  Este es el documento de representación gráfica oficial de la factura electrónica. Escanea este código QR con tu dispositivo móvil o haz clic en el enlace para validar el sello tributario en el portal público de consulta del Ministerio de Hacienda de El Salvador.
                </p>
                <a 
                  href={qrUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center text-[10px] font-bold text-primary hover:underline break-all"
                >
                  {qrUrl}
                  <ExternalLink className="h-2.5 w-2.5 ml-1 inline shrink-0" />
                </a>
              </div>
            </div>

            {/* Cuadro de Totales */}
            <div className="md:col-span-2 border rounded-lg p-4 bg-muted/5 print:bg-transparent flex flex-col justify-between">
              <div className="space-y-2 text-xs">
                {isCCF ? (
                  <>
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground print:text-black">Subtotal Ventas Gravadas:</span>
                      <span>${(dte.resumen?.totalGravada || dte.resumen?.subTotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground print:text-black">Ventas No Sujetas:</span>
                      <span>${(dte.resumen?.totalNoSuj || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground print:text-black">Ventas Exentas:</span>
                      <span>${(dte.resumen?.totalExenta || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-orange-600 print:text-black">
                      <span>Descuento Comercial:</span>
                      <span>-${(dte.resumen?.totalDescu || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground print:text-black">IVA Gravado (13%):</span>
                      <span>${totalIva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 font-bold border-t pt-1 mt-1 print:border-black/20">
                      <span className="text-muted-foreground print:text-black">Monto Total Operación:</span>
                      <span>${(dte.resumen?.montoTotalOperacion || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-orange-600 print:text-black">
                      <span>Retención Impuesto Renta (10%):</span>
                      <span>-${(dte.resumen?.reteRenta || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-orange-600 print:text-black">
                      <span>Retención IVA (1%):</span>
                      <span>-${(dte.resumen?.ivaRete1 || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-emerald-600 print:text-black">
                      <span>Percepción IVA (1%):</span>
                      <span>+${(dte.resumen?.ivaPerci1 || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : isFSE ? (
                  <>
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground print:text-black">Subtotal Compra:</span>
                      <span>${(dte.resumen?.totalCompra || dte.resumen?.subTotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-orange-600 print:text-black">
                      <span>Descuento:</span>
                      <span>-${(dte.resumen?.totalDescu || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-orange-600 print:text-black">
                      <span>Retención Impuesto Renta (10%):</span>
                      <span>-${(dte.resumen?.reteRenta || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground print:text-black">Monto Subtotal:</span>
                      <span>${(dte.resumen?.subTotalVentas || dte.resumen?.subTotal || dte.resumen?.totalSujeto || 0).toFixed(2)}</span>
                    </div>
                    {dte.resumen?.totalDescu > 0 && (
                      <div className="flex justify-between py-0.5 text-orange-600 print:text-black">
                        <span>Descuento Comercial:</span>
                        <span>-${dte.resumen.totalDescu.toFixed(2)}</span>
                      </div>
                    )}
                    {!isCD && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground print:text-black">IVA Gravado (13%):</span>
                        <span>${totalIva.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                
                <div className="h-px bg-border my-2 print:bg-black/20" />
                <div className="flex justify-between text-base font-extrabold">
                  <span className="text-primary print:text-black">
                    {tieneRetenciones ? 'LÍQUIDO A ENTREGAR:' : 'TOTAL A PAGAR:'}
                  </span>
                  <span className="text-primary print:text-black">
                    ${(dte.resumen?.totalPagar || dte.resumen?.totalDonado || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              {dte.resumen?.totalLetras && (
                <div className="mt-4 pt-2 border-t text-[10px] text-muted-foreground print:text-black uppercase text-center font-bold tracking-tight">
                  {dte.resumen.totalLetras}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Secciones Técnicas Adicionales (Solo en Pantalla, Oculto en Impresión) ── */}
      {(dte.observaciones || dte.errorLog) && (
         <Card className="border-destructive/50 bg-destructive/10 hide-on-print no-print">
            <CardHeader>
               <CardTitle className="text-sm flex items-center text-destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Motivo de Rechazo o Error Técnico (MH)
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {dte.observaciones && (
                 <div>
                    <h5 className="font-semibold text-xs">Observaciones / Motivos</h5>
                    <pre className="text-xs font-mono whitespace-pre-wrap mt-1 p-2 bg-black/5 dark:bg-white/5 rounded border">
                       {dte.observaciones}
                    </pre>
                 </div>
               )}
               {dte.errorLog && (
                 <div>
                    <h5 className="font-semibold text-xs">Registro de Excepción Técnica</h5>
                    <pre className="text-xs font-mono whitespace-pre-wrap mt-1 p-2 bg-black/5 dark:bg-white/5 rounded border text-muted-foreground">
                       {dte.errorLog}
                    </pre>
                 </div>
               )}
            </CardContent>
         </Card>
      )}
    </div>
  );
}
