'use client';

import { useEffect } from 'react';
import { useEmisorStore } from '@/hooks/use-emisor';
import { useAPI } from '@/hooks/use-api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';

export function EmisorSelector() {
  const { emisorId, emisorName, setEmisor } = useEmisorStore();
  const { data, isLoading } = useAPI<any[]>('/api/dte/v2/mi-cuenta/emisores');
  const emisores = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (emisores.length > 0 && (!emisorId || !emisores.some(e => e.id === emisorId))) {
      const first = emisores[0];
      setEmisor(first.id, first.nombre || first.nombreComercial || 'Emisor');
    }
  }, [emisores, emisorId, setEmisor]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-[240px]">
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">
            {isLoading ? 'Cargando...' : emisorName || 'Seleccionar Emisor...'}
          </span>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin opacity-50" />
        ) : (
          <ChevronDown className="h-4 w-4 opacity-50" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tus Emisores</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {emisores.length === 0 && !isLoading && (
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              No se encontraron emisores
            </DropdownMenuItem>
          )}
          {emisores.map((em) => {
            const displayName = em.nombre || em.nombreComercial || 'Emisor sin nombre';
            return (
              <DropdownMenuItem 
                key={em.id} 
                onClick={() => setEmisor(em.id, displayName)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex flex-col truncate max-w-[170px]">
                  <span className="font-medium truncate">{displayName}</span>
                  <span className="text-xs text-muted-foreground truncate font-mono">NIT: {em.nit}</span>
                </div>
                {emisorId === em.id && <Check className="h-4 w-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-primary font-medium cursor-pointer">
          + Agregar Nuevo Emisor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
