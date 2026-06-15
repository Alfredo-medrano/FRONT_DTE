'use client';

import { use, useEffect } from 'react';
import { useAPI } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DTE_STATUS_COLORS, TIPOS_DTE } from '@/lib/constants';
import { Download, FileJson, Printer, ShieldCheck, Mail, Phone, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PublicInvoicePage({ params }: { params: Promise<{ codigoGeneracion: string }> }) {
  const { codigoGeneracion } = use(params);

  // Consultar endpoint público session-less
  const { data: dteRes, isLoading, isError } = useAPI<any>(
    codigoGeneracion ? `/api/dte/public/factura/${codigoGeneracion}` : null
  );

  // Adaptación de datos del receptor, emisor e items
  const dte = dteRes?.dte ? {
    ...dteRes.dte,
    status: dteRes.local?.status || 'PROCESADO',
    selloRecibido: dteRes.local?.selloRecibido,
    fecEmi: dteRes.dte?.identificacion?.fecEmi || dteRes.local?.fechaEmision?.split('T')[0],
    horEmi: dteRes.dte?.identificacion?.horEmi,
    fechaEmision: dteRes.local?.fechaEmision || dteRes.dte?.identificacion?.fecEmi,
    numeroControl: dteRes.local?.numeroControl || dteRes.dte?.identificacion?.numeroControl,
    codigoGeneracion: dteRes.dte?.identificacion?.codigoGeneracion || codigoGeneracion,
    tipoDte: dteRes.dte?.identificacion?.tipoDte || '01',
    receptor: dteRes.dte?.receptor || {},
    resumen: dteRes.dte?.resumen || {},
    items: dteRes.dte?.cuerpoDocumento || [],
    emisor: dteRes.local?.emisor || {},
  } : null;

  // Imprimir comprobante
  const handlePrint = () => {
    window.print();
  };

  // Descargar archivo legal JSON firmado (JWS)
  const handleDownloadJson = () => {
    if (!dte) return;
    const jsonString = typeof dteRes.dte === 'string' 
      ? dteRes.dte 
      : JSON.stringify(dteRes.dte, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dte_${dte.codigoGeneracion}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Descargar representación gráfica PDF desde el servidor
  const handleDownloadPdf = () => {
    if (!dte) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const link = document.createElement('a');
    link.href = `${baseUrl}/api/dte/public/factura/${codigoGeneracion}/pdf`;
    link.download = `Factura_${dte.codigoGeneracion}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse text-sm">Cargando representación gráfica oficial...</p>
        </div>
      </div>
    );
  }

  if (isError || !dte) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200/50 bg-white dark:bg-slate-900 shadow-xl rounded-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950/50 flex items-center justify-center rounded-full text-red-600 mb-2">
              <ShieldCheck className="w-6 h-6 rotate-180" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">Documento no encontrado</CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              El código de generación suministrado no es válido o ha expirado.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifique que el enlace copiado desde su correo electrónico esté completo o contacte al emisor del documento fiscal.
            </p>
            <Link href="/" className="inline-block w-full">
              <Button className="w-full font-semibold">Ir al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tipo = TIPOS_DTE.find(t => t.codigo === dte.tipoDte);
  const isProcesado = dte.status === 'PROCESADO';
  const isCCF = dte.tipoDte === '03';
  const isFSE = dte.tipoDte === '14';
  const isCD = dte.tipoDte === '15';
  const totalIva = dte.resumen?.totalIva ?? dte.resumen?.tributos?.find((t: any) => t.codigo === '20')?.valor ?? 0;
  const tieneRetenciones = isFSE || (isCCF && ((dte.resumen?.reteRenta || 0) > 0 || (dte.resumen?.ivaRete1 || 0) > 0 || (dte.resumen?.ivaPerci1 || 0) > 0));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:min-h-0">
      
      {/* Barra de Acciones Superior (Oculta en Impresión) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium">Validado Oficialmente por el Ministerio de Hacienda</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white dark:bg-slate-900 shadow-sm border-slate-200">
            <Printer className="h-4 w-4 mr-2 text-slate-500" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="bg-white dark:bg-slate-900 shadow-sm border-slate-200">
            <Download className="h-4 w-4 mr-2 text-slate-500" /> Descargar PDF
          </Button>
          <Button variant="default" size="sm" onClick={handleDownloadJson} className="shadow-sm">
            <FileJson className="h-4 w-4 mr-2 text-white" /> Descargar JSON Legal
          </Button>
        </div>
      </div>

      {/* COMPROBANTE PRINCIPAL */}
      <Card className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden print:shadow-none print:border-none print:bg-white print:rounded-none">
        
        {/* Encabezado Premium con Degradado Suave */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 dark:from-slate-950 dark:to-slate-900 text-white p-8 sm:p-10 border-b border-slate-800 print:bg-none print:text-slate-900 print:p-0 print:border-b-2 print:border-slate-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:text-black">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-black print:text-black print:px-0">
                <ShieldCheck className="h-3.5 w-3.5" /> Transmisión Autorizada
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 text-white print:text-black print:text-2xl">
                {dte.emisor?.nombreComercial || dte.emisor?.nombre || 'Emisor Comercial'}
              </h1>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 print:text-slate-700">
                {dte.emisor?.nombre || 'Razón Social'}
              </p>
            </div>
            <div className="text-left md:text-right space-y-1 print:text-black">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Comprobante de</div>
              <div className="text-lg font-bold text-white print:text-black">{tipo?.nombre || `DTE Tipo ${dte.tipoDte}`}</div>
              <div className="text-sm font-semibold font-mono text-emerald-400 print:text-slate-700 mt-1">
                N° Control: {dte.numeroControl || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO DEL COMPROBANTE */}
        <CardContent className="p-8 sm:p-10 space-y-10 print:p-0 print:pt-6">
          
          {/* Fila de Datos del Emisor y Receptor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 dark:border-slate-800 pb-8 print:grid-cols-2 print:border-slate-200">
            {/* Datos del Emisor */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Datos del Emisor</h3>
              <div className="text-slate-800 dark:text-slate-200 text-sm space-y-2">
                <div className="font-bold text-base text-slate-900 dark:text-white print:text-black">{dte.emisor?.nombre}</div>
                {dte.emisor?.nit && <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" /> NIT: {dte.emisor.nit}</div>}
                {dte.emisor?.correo && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {dte.emisor.correo}</div>}
                {dte.emisor?.telefono && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {dte.emisor.telefono}</div>}
                {dte.emisor?.direccion && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-slate-400 mt-0.5" /> {dte.emisor.direccion}</div>}
              </div>
            </div>

            {/* Datos del Receptor */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Receptor del Documento</h3>
              <div className="text-slate-800 dark:text-slate-200 text-sm space-y-2">
                <div className="font-bold text-base text-slate-900 dark:text-white print:text-black">{dte.receptor?.nombre || 'CONSUMIDOR FINAL'}</div>
                {(dte.receptor?.numDocumento || dte.receptor?.nit) && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" /> 
                    Doc Identificación: {dte.receptor?.numDocumento || dte.receptor?.nit}
                  </div>
                )}
                {dte.receptor?.correo && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {dte.receptor.correo}</div>}
                {dte.receptor?.telefono && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {dte.receptor.telefono}</div>}
                {dte.receptor?.direccion && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-slate-400 mt-0.5" /> {dte.receptor.direccion}</div>}
              </div>
            </div>
          </div>

          {/* Fila de Trazabilidad del Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 print:bg-none print:border-none print:p-0">
            <div>
              <span className="text-xs text-slate-400 block font-semibold uppercase">Código Generación (UUID)</span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 break-all select-all block mt-1 print:text-black">
                {dte.codigoGeneracion}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold uppercase">Fecha y Hora de Emisión</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block mt-1 print:text-black">
                {dte.fecEmi} {dte.horEmi || ''}
              </span>
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <span className="text-xs text-slate-400 block font-semibold uppercase">Ambiente Fiscal</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1 print:text-black">
                {dte.emisor?.ambiente === '01' ? 'PRODUCCIÓN (LIVE)' : 'PRUEBAS (SANDBOX)'}
              </span>
            </div>
          </div>

          {/* Tabla de Items */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Detalle de Productos o Servicios</h3>
            <div className="border rounded-2xl overflow-hidden dark:border-slate-800 print:border-none">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/40 print:bg-none">
                  <TableRow>
                    <TableHead className="w-16 text-center font-bold">Cant.</TableHead>
                    <TableHead className="font-bold">Descripción</TableHead>
                    <TableHead className="text-right w-32 font-bold">Precio Unitario</TableHead>
                    <TableHead className="text-right w-32 font-bold">Venta Grabada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dte.items?.map((item: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <TableCell className="text-center font-medium">{item.cantidad}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100 print:text-black">
                        {item.descripcion}
                      </TableCell>
                      <TableCell className="text-right font-mono">${parseFloat(item.precioUni || item.precioUnitario || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-slate-900 dark:text-slate-100 print:text-black">
                        ${parseFloat(item.ventaGravada || item.compra || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Desglose de Totales */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-4">
            {/* Certificación Legal y Sello */}
            <div className="max-w-md w-full border border-slate-100 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/10 space-y-4 print:border-none print:p-0">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black">
                  Firma Electrónica Homologada
                </span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold block text-slate-500">Sello de Recepción MH:</span>
                  <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold select-all break-all block mt-0.5 print:text-slate-800 print:text-xs">
                    {dte.selloRecibido || 'PENDIENTE DE ASIGNACIÓN'}
                  </code>
                </div>
                <p className="leading-relaxed">
                  Este documento digital representa fielmente un Comprobante de Documento Tributario Electrónico (DTE) transmitido y aprobado por el Ministerio de Hacienda de El Salvador de acuerdo a la normativa legal vigente.
                </p>
              </div>
            </div>

            {/* Cuadro de Totales */}
            <div className="w-full sm:w-80 space-y-3 text-sm">
              {isCCF ? (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal Ventas Gravadas</span>
                    <span className="font-mono">${(dte.resumen?.totalGravada || dte.resumen?.subTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Ventas No Sujetas</span>
                    <span className="font-mono">${(dte.resumen?.totalNoSuj || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Ventas Exentas</span>
                    <span className="font-mono">${(dte.resumen?.totalExenta || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Descuento Comercial</span>
                    <span className="font-mono">-${(dte.resumen?.totalDescu || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>IVA Gravado (13%)</span>
                    <span className="font-mono">${totalIva.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 dark:text-slate-250 font-semibold border-t pt-1.5 mt-1.5 print:border-slate-300">
                    <span>Monto Total Operación</span>
                    <span className="font-mono">${(dte.resumen?.montoTotalOperacion || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Retención Impuesto Renta (10%)</span>
                    <span className="font-mono">-${(dte.resumen?.reteRenta || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Retención IVA (1%)</span>
                    <span className="font-mono">-${(dte.resumen?.ivaRete1 || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Percepción IVA (1%)</span>
                    <span className="font-mono">+${(dte.resumen?.ivaPerci1 || 0).toFixed(2)}</span>
                  </div>
                </>
              ) : isFSE ? (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal Compra</span>
                    <span className="font-mono">${(dte.resumen?.totalCompra || dte.resumen?.subTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Descuento</span>
                    <span className="font-mono">-${(dte.resumen?.totalDescu || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Retención Impuesto Renta (10%)</span>
                    <span className="font-mono">-${(dte.resumen?.reteRenta || 0).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal Ventas</span>
                    <span className="font-mono">${(dte.resumen?.subTotalVentas || dte.resumen?.subTotal || dte.totalGravada || 0).toFixed(2)}</span>
                  </div>
                  {dte.resumen?.totalDescu > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Descuento</span>
                      <span className="font-mono">-${dte.resumen.totalDescu.toFixed(2)}</span>
                    </div>
                  )}
                  {!isCD && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>IVA (13%)</span>
                      <span className="font-mono">${totalIva.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
              
              <div className="flex justify-between text-lg font-bold text-slate-950 dark:text-slate-50 print:text-black">
                <span>{tieneRetenciones ? 'Líquido a Entregar' : 'Monto Total'}</span>
                <span className="text-emerald-500 font-mono">${(dte.resumen?.totalPagar || dte.resumen?.totalDonado || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Pie de Página */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 print:bg-none print:border-t-2 print:border-slate-300 print:text-slate-700 print:mt-10">
          <p>
            Este comprobante es una representación gráfica del documento fiscal electrónico firmado legalmente.<br />
            Para verificar su autenticidad legal ante el Ministerio de Hacienda, puede descargar el archivo <strong>JSON Legal</strong> firmado en el botón superior.
          </p>
        </div>
      </Card>
      
      {/* Stylesheet especial para impresión perfecta a papel/PDF */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 12pt !important;
          }
          .print\\:bg-none {
            background: none !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:pt-6 {
            padding-top: 24px !important;
          }
          .print\\:mt-10 {
            margin-top: 40px !important;
          }
          .print\\:border-b-2 {
            border-bottom: 2px solid #ccc !important;
          }
          .print\\:border-t-2 {
            border-top: 2px solid #ccc !important;
          }
        }
      `}</style>
    </div>
  );
}
