'use client';

import { usePathname } from 'next/navigation';
import { Moon, Sun, Monitor, LogOut, User, ChevronDown } from 'lucide-react';
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

  const handleLogout = () => {
    clearKeys();
    clearEmisor();
    router.push('/setup');
  };

  // Obtener título de página amigable
  const pageTitle = PAGE_TITLES[pathname] || pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || '';
  const initial = emisorName ? emisorName.charAt(0).toUpperCase() : 'U';

  return (
    <header className="flex h-14 w-full items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6 z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold capitalize">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
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
  );
}
