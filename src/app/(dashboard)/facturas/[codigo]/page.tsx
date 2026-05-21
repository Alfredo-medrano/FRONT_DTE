'use client';

import { use } from 'react';
import { useAPI } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DTE_STATUS_COLORS, TIPOS_DTE } from '@/lib/constants';
import { fetchClient } from '@/lib/api-client';
import { Ban, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FacturaDetallePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const router = useRouter();
  
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
  const tipo = TIPOS_DTE.find(t => t.codigo === dte.tipoDte);

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



  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Detalle de Factura</h2>
          <p className="text-muted-foreground font-mono">{dte.codigoGeneracion}</p>
        </div>
        <div className="flex gap-2">
          {isProcesado && (
            <>
              <Button variant="outline"><Download className="h-4 w-4 mr-2" /> PDF</Button>
              <Button variant="outline"><ExternalLink className="h-4 w-4 mr-2" /> JSON MH</Button>
              <Button variant="destructive" onClick={handleAnular}><Ban className="h-4 w-4 mr-2" /> Anular DTE</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
                <span className="text-muted-foreground block">N° de Control</span>
                <span className="font-mono font-medium">{dte.numeroControl || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Fecha de Emisión</span>
                <span>{dte.fecEmi && dte.horEmi ? `${dte.fecEmi} ${dte.horEmi}` : new Date(dte.fechaEmision).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Sello Hacienda</span>
                {dte.selloRecibido ? (
                   <span className="flex items-center gap-1 font-mono text-green-600">
                      <ShieldCheck className="h-4 w-4" /> {dte.selloRecibido}
                   </span>
                ) : (
                   <span className="text-muted-foreground italic">Ausente</span>
                )}
              </div>
            </div>

            <div className="mt-6 border rounded-lg p-4 bg-muted/20">
               <h4 className="font-semibold mb-2">Datos del Receptor</h4>
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
                   <span className="text-muted-foreground">Subtotal Ventas</span>
                   <span>${(dte.resumen?.subTotalVentas || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">IVA (13%)</span>
                   <span>${(dte.resumen?.totalIva || 0).toFixed(2)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between text-lg font-bold">
                   <span>Total a Pagar</span>
                   <span className="text-primary">${(dte.resumen?.totalPagar || 0).toFixed(2)}</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items Facturados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cant.</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Precio Unitario</TableHead>
                <TableHead className="text-right">Total Grabado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {dte.items?.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                     <TableCell>{item.cantidad}</TableCell>
                     <TableCell>{item.descripcion}</TableCell>
                     <TableCell className="text-right">${item.precioUni?.toFixed(2)}</TableCell>
                     <TableCell className="text-right">${(item.ventaGravada || item.compra || 0).toFixed(2)}</TableCell>
                  </TableRow>
               ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {(dte.observaciones || dte.errorLog) && (
         <Card className="border-destructive/50 bg-destructive/10">
            <CardHeader>
               <CardTitle className="text-sm flex items-center text-destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Motivo de Rechazo o Error (MH)
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {dte.observaciones && (
                 <div>
                    <h5 className="font-semibold text-sm">Observaciones</h5>
                    <pre className="text-xs font-mono whitespace-pre-wrap mt-1">
                       {dte.observaciones}
                    </pre>
                 </div>
               )}
               {dte.errorLog && (
                 <div>
                    <h5 className="font-semibold text-sm">Registro de Error Técnico</h5>
                    <pre className="text-xs font-mono whitespace-pre-wrap mt-1 text-muted-foreground">
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
