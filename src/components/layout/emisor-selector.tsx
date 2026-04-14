'use client';

import { useEffect, useState } from 'react';
import { useEmisorStore } from '@/hooks/use-emisor';
import { fetchClient } from '@/lib/api-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmisorSelector() {
  const { emisorId, emisorName, setEmisor } = useEmisorStore();
  const [emisores, setEmisores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // We would normally fetch the current tenant's emisores from GET /admin/tenants/:tenantId/emisores.
    // For now, since the login API returns the default authorized emisor, we use `useEmisorStore` state state.
    // We ensure the current emisor from the store is always shown as an option.
    if (emisorId && emisorName) {
      setEmisores([{ id: emisorId, nombre: emisorName, nit: 'Verificado MH' }]);
    } else {
      setEmisores([]);
    }
  }, [emisorId, emisorName]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-[240px]">
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{emisorName || 'Seleccionar Emisor...'}</span>
        </div>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tus Emisores</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {emisores.map((em) => (
            <DropdownMenuItem 
              key={em.id} 
              onClick={() => setEmisor(em.id, em.nombre)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium truncate">{em.nombre}</span>
                <span className="text-xs text-muted-foreground">NIT: {em.nit}</span>
              </div>
              {emisorId === em.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-primary font-medium cursor-pointer">
          + Agregar Nuevo Emisor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
