'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EmisorState {
  emisorId: string | null;
  emisorName: string | null;
  setEmisor: (id: string, name: string) => void;
  clearEmisor: () => void;
}

export const useEmisorStore = create<EmisorState>()(
  persist(
    (set: any) => ({
      emisorId: null,
      emisorName: null,
      setEmisor: (id: string, name: string) => {
        localStorage.setItem('dte_emisor_id', id);
        set({ emisorId: id, emisorName: name });
      },
      clearEmisor: () => {
        localStorage.removeItem('dte_emisor_id');
        set({ emisorId: null, emisorName: null });
      },
    }),
    {
      name: 'dte-emisor-storage',
    }
  ) as any
);
