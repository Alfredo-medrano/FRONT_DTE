'use client';

import { usePathname } from 'next/navigation';
import { Moon, Sun, Monitor, LogOut, User, ChevronDown, AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth';
import { useEmisorStore } from '@/hooks/use-emisor';
import { useAPI } from '@/hooks/use-api';
import { useState, useEffect } from 'react';

// Mapeo de rutas a títulos amigables para el cliente
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/facturas': 'Historial de Facturas',
  '/facturas/nueva': 'Crear Factura',
  '/clientes': 'Mis Clientes',
  '/pipeline': 'Oportunidades',
  '/admin/emisores': 'Mi Empresa',
  '/admin/api-keys': 'Integraciones',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();

  const clearKeys = useAuthStore((state) => state.clearKeys);
  const clearEmisor = useEmisorStore((state) => state.clearEmisor);
  const emisorName = useEmisorStore((state) => state.emisorName);

  const { data: alerts } = useAPI<{
    contingenciaActiva: boolean;
    cantidadPendientes: number;
    proximoVencer: string | null;
  }>('/api/dte/v2/mi-cuenta/alertas-contingencia', {
    refreshInterval: 10000,
  });

  const { data: contingenciaInfo } = useAPI<{
    contingenciaManual: boolean;
    tipoContingencia: number;
    motivoContingencia: string;
    fechaInicio: string | null;
    horaInicio: string | null;
    dtesPendientes: number;
    conexionMH: boolean;
  }>('/api/dte/v2/mi-cuenta/contingencia', {
    refreshInterval: 12000,
  });

  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!alerts?.proximoVencer) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const diffMs = new Date(alerts.proximoVencer!).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft('Plazo vencido');
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [alerts?.proximoVencer]);

  const handleLogout = () => {
    clearKeys();
    clearEmisor();
    router.push('/setup');
  };

  // Obtener título de página amigable
  const pageTitle = PAGE_TITLES[pathname] || pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || '';
  const initial = emisorName ? emisorName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex flex-col w-full sticky top-0 z-10">
      {contingenciaInfo && !contingenciaInfo.conexionMH && !contingenciaInfo.contingenciaManual && (
        <div className="flex items-center justify-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium bg-gradient-to-r from-red-500/15 via-rose-500/15 to-red-500/15 border-b border-red-500/20 text-red-800 dark:text-red-300 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>
            <strong>Sin conexión con Hacienda:</strong> Se ha perdido la comunicación con los servidores de Hacienda. Activa el Modo Contingencia para seguir facturando.
            <span onClick={() => router.push('/admin/emisores')} className="ml-2 underline cursor-pointer hover:text-red-900 dark:hover:text-red-100 font-semibold">
              Activar en Panel
            </span>
          </span>
        </div>
      )}
      {(alerts?.contingenciaActiva || contingenciaInfo?.contingenciaManual || (contingenciaInfo && contingenciaInfo.dtesPendientes > 0)) && (
        <div className="flex items-center justify-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span>
            <strong>Modo Contingencia Activo:</strong> {contingenciaInfo?.contingenciaManual ? 'Forzado Manual' : 'Automático'}. Hay {contingenciaInfo?.dtesPendientes ?? alerts?.cantidadPendientes ?? 0} {(contingenciaInfo?.dtesPendientes ?? alerts?.cantidadPendientes) === 1 ? 'documento pendiente' : 'documentos pendientes'} de transmisión diferida a Hacienda.
            <span onClick={() => router.push('/admin/emisores')} className="ml-2 underline cursor-pointer hover:text-amber-900 dark:hover:text-amber-100 font-semibold">
              Gestionar en Panel
            </span>
          </span>
          {timeLeft && (
            <span className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 dark:bg-amber-500/35 border border-amber-500/30 text-[10px] md:text-xs font-semibold tabular-nums uppercase">
              Plazo: {timeLeft}
            </span>
          )}
        </div>
      )}
      <header className="flex h-14 w-full items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold capitalize">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* ── MH Connection Status ── */}
          {contingenciaInfo && (
            <div 
              onClick={() => router.push('/admin/emisores')}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium cursor-pointer hover:bg-accent transition-colors"
              title="Estado de conexión con el Ministerio de Hacienda. Haz clic para ir al panel de contingencia."
            >
              <span className={`h-1.5 w-1.5 rounded-full ${contingenciaInfo.conexionMH ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-red-500 shadow-[0_0_4px_#ef4444] animate-pulse'}`} />
              <span className="text-muted-foreground">MH:</span>
              <span className={contingenciaInfo.conexionMH ? 'text-green-600 dark:text-green-400' : 'text-red-500 font-semibold'}>
                {contingenciaInfo.conexionMH ? 'En Línea' : 'Desconectado'}
              </span>
            </div>
          )}

          {/* ── Theme Toggle ──────────── */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring relative">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambiar tema</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" /> Claro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" /> Oscuro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" /> Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ── User Menu ─────────────── */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md h-8 px-2 pr-1 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {initial}
                </div>
                <span className="hidden md:inline text-sm font-medium truncate max-w-[120px]">
                  {emisorName || 'Mi Cuenta'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* DropdownMenuLabel MUST be inside DropdownMenuGroup per Base UI */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{emisorName || 'Mi Cuenta'}</p>
                    <p className="text-xs text-muted-foreground">Facturación Electrónica</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/admin/emisores')}>
                <User className="mr-2 h-4 w-4" />
                Mi Empresa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}
