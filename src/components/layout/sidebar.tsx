'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAPI } from '@/hooks/use-api';
import {
  Zap,
  LayoutDashboard,
  FileText,
  Users,
  KanbanSquare,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  List,
  Building2,
  Plug,
  HelpCircle,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmisorStore } from '@/hooks/use-emisor';

const mainNav = [
  {
    title: 'Inicio',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Facturación',
    icon: FileText,
    subMenu: [
      { title: 'Crear Factura', href: '/facturas/nueva', icon: PlusCircle },
      { title: 'Historial', href: '/facturas', icon: List },
    ],
  },
  {
    title: 'Mis Clientes',
    href: '/clientes',
    icon: Users,
  },
  {
    title: 'Oportunidades',
    href: '/pipeline',
    icon: KanbanSquare,
  },
];

const configNav = [
  {
    title: 'Mi Empresa',
    href: '/admin/emisores',
    icon: Building2,
  },
  {
    title: 'Integraciones',
    href: '/admin/api-keys',
    icon: Plug,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const emisorName = useEmisorStore((s) => s.emisorName);

  // ── Datos del plan en tiempo real ──
  const { data: statsRaw } = useAPI<any[]>('/api/dte/v2/estadisticas');
  const { data: tenantData } = useAPI('/admin/tenants/current');

  const PLAN_LIMITS: Record<string, number> = {
    BASICO: 100, PROFESIONAL: 500, EMPRESARIAL: 2000, ILIMITADO: Infinity,
  };
  const tenant = tenantData as any;
  const planNombre = tenant?.plan || 'BASICO';
  const planLimite = PLAN_LIMITS[planNombre] || 100;
  const totalMes = Array.isArray(statsRaw)
    ? statsRaw.reduce((sum: number, r: any) => sum + (typeof r._count === 'number' ? r._count : 0), 0)
    : 0;
  const porcentajeUso = planLimite === Infinity ? 0 : Math.round((totalMes / planLimite) * 100);

  // Primera letra del nombre de la empresa
  const initial = emisorName ? emisorName.charAt(0).toUpperCase() : 'E';

  return (
    <div
      className={cn(
        'relative flex flex-col border-r bg-card transition-all duration-300',
        isCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* ── Branding ──────────────────── */}
      <div className="flex h-16 items-center border-b px-4 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-md shadow-blue-500/20">
            <Zap className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight truncate">Factura DTE</span>
              <span className="text-[10px] text-muted-foreground truncate">El Salvador</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 absolute -right-3.5 top-4 rounded-full border bg-background shadow-sm z-10"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* ── Empresa actual ────────────── */}
      {!isCollapsed && emisorName && (
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs">
              {initial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate">{emisorName}</span>
              <span className="text-[10px] text-muted-foreground">Cuenta activa</span>
            </div>
          </div>
        </div>
      )}
      {isCollapsed && emisorName && (
        <div className="flex justify-center pt-4 pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm" title={emisorName}>
            {initial}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {/* ── Menú principal ──────────── */}
          {!isCollapsed && (
            <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              Menú
            </div>
          )}
          {mainNav.map((item, index) => (
            <div key={index} className="flex flex-col gap-0.5">
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                    'hover:bg-accent hover:text-accent-foreground',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground',
                    isCollapsed && 'justify-center px-0'
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </Link>
              ) : (
                <>
                  {item.subMenu?.map((subItem, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subItem.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                        'hover:bg-accent hover:text-accent-foreground',
                        pathname === subItem.href
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground',
                        isCollapsed && 'justify-center px-0'
                      )}
                      title={isCollapsed ? subItem.title : undefined}
                    >
                      <subItem.icon className="h-[18px] w-[18px] shrink-0" />
                      {!isCollapsed && <span>{subItem.title}</span>}
                    </Link>
                  ))}
                </>
              )}
            </div>
          ))}

          {/* ── Configuración ──────────── */}
          {!isCollapsed && (
            <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              Configuración
            </div>
          )}
          {isCollapsed && <div className="mx-auto mt-4 mb-2 h-px w-8 bg-border" />}
          {configNav.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                'hover:bg-accent hover:text-accent-foreground',
                pathname === item.href
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground',
                isCollapsed && 'justify-center px-0'
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* ── Footer: Uso del plan ──────── */}
      <div className="border-t p-3">
        {!isCollapsed ? (
          <div className="space-y-2 rounded-lg bg-muted/40 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Mi Plan
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{totalMes}/{planLimite === Infinity ? '∞' : planLimite}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all rounded-full ${porcentajeUso > 80 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{planNombre} · Facturas este mes</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div className="h-1.5 w-8 overflow-hidden rounded-full bg-secondary" title="Uso del plan">
              <div className="h-full bg-primary" style={{ width: '0%' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
