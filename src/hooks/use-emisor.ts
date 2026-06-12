'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EmisorState {
  emisorId: string | null;
  emisorName: string | null;
  setEmisor: (id: string, name: string) => void;
  clearEmisor: () => void;
}

/**
 * Store de emisor seleccionado.
 * Zustand persist ya gestiona localStorage automáticamente.
 * SECURITY FIX: Eliminado acceso directo a localStorage que
 * causaba duplicación de estado y posible desincronización.
 */
export const useEmisorStore = create<EmisorState>()(
  persist(
    (set: any) => ({
      emisorId: null as string | null,
      emisorName: null as string | null,
      setEmisor: (id: string, name: string) => {
        set({ emisorId: id, emisorName: name });
      },
      clearEmisor: () => {
        set({ emisorId: null, emisorName: null });
      },
    }),
    {
      name: 'dte-emisor-storage',
    }
  ) as any
);
