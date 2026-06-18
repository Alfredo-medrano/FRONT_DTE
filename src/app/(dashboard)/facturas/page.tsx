'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAPI } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { DTE_STATUS_COLORS, TIPOS_DTE } from '@/lib/constants';

export default function FacturasPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tipoDte, setTipoDte] = useState('');
  const [status, setStatus] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // BUG FIX (S4): Debounce de 300ms para no disparar un fetch por cada tecla.
  // Resetea la página a 1 cuando cambia el término de búsqueda.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1); // Siempre volver a página 1 al buscar
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // BUG FIX (S4): searchTerm ya entra en la URL. Antes, el estado existía
  // pero NUNCA se incluyó en la URL del fetch, haciendo la búsqueda completamente inoperante.
  const apiUrl = `/api/dte/v2/facturas?page=${page}&limit=20${
    debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''
  }${tipoDte ? `&tipoDte=${tipoDte}` : ''}${status ? `&status=${status}` : ''}${
    fechaDesde ? `&fechaDesde=${fechaDesde}` : ''
  }${fechaHasta ? `&fechaHasta=${fechaHasta}` : ''}`;

  const { data, isLoading } = useAPI<{ data: any[]; pagination?: { total: number; totalPages: number } }>(apiUrl);

  const dtes = Array.isArray(data) ? data : data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Facturas emitidas</h2>
          <p className="text-muted-foreground">Listado de DTEs y su estado en el Ministerio de Hacienda.</p>
        </div>
        <Link href="/facturas/nueva">
          <Button><FileText className="h-4 w-4 mr-2" /> Nueva Factura</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Historial de Emisiones</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por N° Control o Cliente" 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* BUG FIX (M1): Botón Filter ahora tiene onClick funcional */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="icon"
              onClick={() => setShowFilters((v) => !v)}
              title="Filtros avanzados"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border bg-muted/30 relative">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Tipo DTE</label>
                <select
                  value={tipoDte}
                  onChange={(e) => { setTipoDte(e.target.value); setPage(1); }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Todos</option>
                  {TIPOS_DTE.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.nombreCorto} — {t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Estado</label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Todos</option>
                  {Object.keys(DTE_STATUS_COLORS).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Desde</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Hasta</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
                  className="h-9"
                />
              </div>

              {(tipoDte || status || fechaDesde || fechaHasta) && (
                <div className="col-span-1 sm:col-span-2 md:col-span-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTipoDte('');
                      setStatus('');
                      setFechaDesde('');
                      setFechaHasta('');
                      setPage(1);
                    }}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>N° Control / Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Receptor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dtes.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        No se encontraron facturas.
                     </TableCell>
                  </TableRow>
                ) : (
                  dtes.map((dte: any) => {
                     const tipo = TIPOS_DTE.find(t => t.codigo === dte.tipoDte);
                     return (
                        <TableRow key={dte.codigoGeneracion}>
                           <TableCell>{new Date(dte.fechaEmision).toLocaleDateString()}</TableCell>
                           <TableCell className="font-mono text-xs">{dte.codigoGeneracion}</TableCell>
                           <TableCell>
                              <Badge variant="outline">{tipo?.nombreCorto || dte.tipoDte}</Badge>
                           </TableCell>
                           <TableCell className="max-w-[200px] truncate" title={dte.receptorNombre}>
                              {dte.receptorNombre || 'Consumidor Final'}
                           </TableCell>
                           <TableCell className="text-right font-medium">
                              ${(dte.totalPagar != null ? Number(dte.totalPagar) : 0).toFixed(2)}
                           </TableCell>
                           <TableCell>
                              <Badge className={DTE_STATUS_COLORS[dte.status] || ''} variant="outline">
                                 {dte.status}
                              </Badge>
                           </TableCell>
                           <TableCell className="text-right">
                              <Link href={`/facturas/${dte.codigoGeneracion}`}>
                                 <Button variant="ghost" size="sm">Ver Detalle</Button>
                              </Link>
                           </TableCell>
                        </TableRow>
                     )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between space-x-2 py-4">
             <div className="text-sm text-muted-foreground">
                Página {page} {pagination ? `de ${totalPages} (Total: ${pagination.total})` : ''}
             </div>
             <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
                   <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || isLoading}>
                   Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
