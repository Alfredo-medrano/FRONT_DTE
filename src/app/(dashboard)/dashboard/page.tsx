'use client';

import { useAPI } from '@/hooks/use-api';
import { useEmisorStore } from '@/hooks/use-emisor';
import { useAuthStore } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DTE_STATUS_COLORS, TIPOS_DTE } from '@/lib/constants';
import {
  FileText,
  FileCheck,
  FileX,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  CreditCard,
  Clock,
  Sparkles,
  AlertTriangle,
  Loader2,
  Send,
} from 'lucide-react';
import Link from 'next/link';

// ── Tipo para la respuesta de estadísticas del backend ──
interface StatRow {
  status: string;
  tipoDte: string;
  _count: number;
  _sum: { totalPagar: number | null };
}

// ── Planes y sus límites (reflejan backend plan-limits.js) ──
const PLAN_LIMITS: Record<string, number> = {
  BASICO: 100,
  PROFESIONAL: 500,
  EMPRESARIAL: 2000,
  ILIMITADO: Infinity,
};

export default function DashboardPage() {
  const emisorName = useEmisorStore((s) => s.emisorName);

  // ── Fetch datos reales ───────────────────────
  const { data: statsRaw, isLoading: statsLoading } = useAPI<StatRow[]>('/api/dte/v2/estadisticas');
  const { data: facturasData, isLoading: facturasLoading } = useAPI('/api/dte/v2/facturas?limit=5');
  const { data: tenantData } = useAPI('/api/dte/v2/mi-cuenta');

  // ── Parsear facturas recientes ───────────────
  const dtes = Array.isArray(facturasData) ? facturasData : (facturasData as any)?.data || [];

  // ── Parsear estadísticas del backend ─────────
  // El backend devuelve groupBy([status, tipoDte]) con _count y _sum.totalPagar
  const statsArray: StatRow[] = Array.isArray(statsRaw) ? statsRaw : [];

  let totalMes = 0;
  let procesados = 0;
  let rechazados = 0;
  let errores = 0;
  let enviados = 0;
  let totalVentas = 0;

  statsArray.forEach((row) => {
    const count = typeof row._count === 'number' ? row._count : 0;
    totalMes += count;
    totalVentas += Number(row._sum?.totalPagar) || 0;

    if (row.status === 'PROCESADO') procesados += count;
    if (row.status === 'RECHAZADO') rechazados += count;
    if (row.status === 'ERROR') errores += count;
    if (row.status === 'ENVIADO') enviados += count;
  });

  const porcentajeExito = totalMes > 0 ? Math.round((procesados / totalMes) * 100) : 0;

  // ── Datos del plan ───────────────────────────
  const tenant = tenantData as any;
  const planNombre = tenant?.plan || 'BASICO';
  const planLimite = PLAN_LIMITS[planNombre] || 100;
  // Contamos los DTEs del mes como usados (estados exitosos + en progreso)
  const planUsados = totalMes;
  const planDisponibles = planLimite === Infinity ? Infinity : Math.max(0, planLimite - planUsados);
  const porcentajeUso = planLimite === Infinity ? 0 : Math.round((planUsados / planLimite) * 100);

  // ── Saludo inteligente ───────────────────────
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-8">
      {/* ── Bienvenida ──────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {saludo}{emisorName ? `, ${emisorName.split(' ')[0]}` : ''} 👋
          </h2>
          <p className="text-muted-foreground text-sm">
            Aquí tienes un resumen de tu facturación de este mes.
          </p>
        </div>
        <Link href="/facturas/nueva">
          <Button className="shadow-md">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva Factura
          </Button>
        </Link>
      </div>

      {/* ── KPIs ────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturas Emitidas</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : totalMes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalVentas > 0 ? `$${totalVentas.toFixed(2)} en ventas` : 'Este mes'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aceptadas por Hacienda</CardTitle>
            <FileCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : procesados}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalMes > 0 ? `${porcentajeExito}% de éxito` : 'Sin facturas aún'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rechazadas / Error</CardTitle>
            {rechazados + errores > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-400" />
            ) : (
              <FileX className="h-4 w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : rechazados + errores}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rechazados > 0 && `${rechazados} rechazadas`}
              {rechazados > 0 && errores > 0 && ' · '}
              {errores > 0 && `${errores} con error`}
              {rechazados === 0 && errores === 0 && 'Sin problemas'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mi Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  {planUsados}
                  <span className="text-base font-normal text-muted-foreground">
                    {' '}/ {planLimite === Infinity ? '∞' : planLimite}
                  </span>
                </>
              )}
            </div>
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${
                    porcentajeUso > 80
                      ? 'bg-gradient-to-r from-orange-400 to-red-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-muted-foreground">
                  {planDisponibles === Infinity
                    ? 'Sin límite'
                    : `${planDisponibles} disponibles`}
                </p>
                <Badge variant="outline" className="text-[10px] h-4">
                  {planNombre}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Desglose por estado + Últimas facturas ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Desglose por estado */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Desglose por Estado</CardTitle>
            <CardDescription>Distribución de facturas este mes</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : totalMes === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Emite tu primera factura</p>
              </div>
            ) : (
              <div className="space-y-3">
                <StatBar label="Procesadas" count={procesados} total={totalMes} color="bg-green-500" />
                <StatBar label="Rechazadas" count={rechazados} total={totalMes} color="bg-red-400" />
                <StatBar label="Error" count={errores} total={totalMes} color="bg-orange-400" />
                <StatBar label="Enviadas" count={enviados} total={totalMes} color="bg-yellow-400" />
                <StatBar
                  label="Otros"
                  count={totalMes - procesados - rechazados - errores - enviados}
                  total={totalMes}
                  color="bg-blue-400"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas facturas */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Últimas Facturas</CardTitle>
              <CardDescription>Tu actividad reciente</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {facturasLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dtes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Sin facturas aún</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu primera factura aparecerá aquí
                </p>
                <Link href="/facturas/nueva">
                  <Button variant="outline" size="sm" className="mt-4">
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Crear mi primera factura
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {dtes.map((dte: any) => {
                  const tipo = TIPOS_DTE.find((t) => t.codigo === dte.tipoDte);
                  return (
                    <Link
                      key={dte.id || dte.codigoGeneracion}
                      href={`/facturas/${dte.codigoGeneracion}`}
                      className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">
                          {tipo?.nombreCorto || dte.tipoDte}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {dte.receptorNombre || 'Consumidor Final'}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dte.fechaEmision
                              ? new Date(dte.fechaEmision).toLocaleDateString()
                              : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-semibold">
                          ${(dte.totalPagar != null ? Number(dte.totalPagar) : 0).toFixed(2)}
                        </p>
                        <Badge
                          className={`${DTE_STATUS_COLORS[dte.status] || ''} text-[10px]`}
                          variant="outline"
                        >
                          {dte.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
          {dtes.length > 0 && (
            <CardFooter className="pt-0">
              <Link href="/facturas" className="w-full">
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                  Ver todo el historial
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* ── Accesos rápidos ─────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/facturas/nueva" className="group">
          <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-blue-500/10 p-3 group-hover:bg-blue-500/20 transition-colors">
                <PlusCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Crear Factura</p>
                <p className="text-xs text-muted-foreground">Emitir un nuevo DTE</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clientes" className="group">
          <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-green-500/10 p-3 group-hover:bg-green-500/20 transition-colors">
                <FileCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mis Clientes</p>
                <p className="text-xs text-muted-foreground">Directorio de contactos</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/emisores" className="group">
          <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-purple-500/10 p-3 group-hover:bg-purple-500/20 transition-colors">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mi Empresa</p>
                <p className="text-xs text-muted-foreground">Datos fiscales y configuración</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// ── Componente de barra de estado ──────────────
function StatBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  if (count === 0) return null;
  const pct = Math.round((count / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {count} <span className="text-muted-foreground text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
