'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';
import { fetchClient } from '@/lib/api-client';
import { useEmisorStore } from '@/hooks/use-emisor';

export interface Cliente {
  id: string;
  nit: string;
  tipoDocumento?: string; // e.g. '36' (NIT), '13' (DUI), etc.
  nrc?: string;
  nombre: string;
  actividadEconomica?: string; // Código de actividad económica (MH)
  correo: string;
  telefono?: string;
  departamento?: string; // Código de depto (e.g. '06')
  municipio?: string;    // Código de municipio (e.g. '14')
  complemento?: string;  // Dirección complemento
  createdAt: number;
  _source?: 'dte' | 'manual' | 'local'; // Origen del cliente
}

export interface PipelineCard {
  id: string;
  clienteId: string;
  titulo: string;
  montoEstimado: number;
  columna: 'Prospecto' | 'Contactado' | 'Propuesta' | 'Negociacion' | 'Cerrado';
  createdAt: number;
  emisorId?: string;
}

interface CRMStore {
  clientes: Cliente[];
  cards: PipelineCard[];
  syncing: boolean;
  lastSyncAt: number | null;
  // Acciones
  setClientes: (clientes: Cliente[]) => void;
  addCliente: (cliente: Omit<Cliente, 'id' | 'createdAt'>) => Promise<Cliente>;
  updateCliente: (id: string, cli: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  addCard: (card: Omit<PipelineCard, 'id' | 'createdAt'>) => void;
  updateCard: (id: string, card: Partial<PipelineCard>) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, toColumn: PipelineCard['columna']) => void;
  setSyncing: (v: boolean) => void;
  setLastSync: () => void;
  syncClientes: () => Promise<void>;
}

export const useCRMStore = create<CRMStore>()(
  persist(
    (set, get) => ({
      clientes: [] as Cliente[],
      cards: [] as PipelineCard[],
      syncing: false,
      lastSyncAt: null,

      setClientes: (clientes) => set({ clientes }),
      setSyncing: (v) => set({ syncing: v }),
      setLastSync: () => set({ lastSyncAt: Date.now() }),

      // BUG FIX (S5): addCliente ahora llama a la API y persiste en BD.
      addCliente: async (cli) => {
        const tempId = `local_${crypto.randomUUID()}`;
        const localCliente: Cliente = { ...cli, id: tempId, createdAt: Date.now(), _source: 'local' };
        set((state) => ({ clientes: [...state.clientes, localCliente] }));

        try {
          const resp = await fetchClient<{ cliente: Cliente }>('/api/dte/v2/clientes', {
            method: 'POST',
            body: JSON.stringify(cli),
          });
          const serverCliente = { ...(resp.cliente ?? resp as any), createdAt: Date.now() };
          set((state) => ({
            clientes: state.clientes.map((c) => c.id === tempId ? serverCliente : c),
          }));
          return serverCliente;
        } catch {
          return localCliente;
        }
      },

      updateCliente: async (id, cli) => {
        set((state) => ({
          clientes: state.clientes.map((c) => c.id === id ? { ...c, ...cli } : c),
        }));
        if (!id.startsWith('local_') && !id.startsWith('temp_')) {
          try {
            const resp = await fetchClient<{ cliente: Cliente }>(`/api/dte/v2/clientes/${id}`, {
              method: 'PUT',
              body: JSON.stringify(cli),
            });
            const serverCliente = resp.cliente ?? resp as any;
            if (serverCliente && serverCliente.id && serverCliente.id !== id) {
              set((state) => ({
                clientes: state.clientes.map((c) => c.id === id ? { ...c, id: serverCliente.id, _source: 'manual' } : c),
              }));
            }
          } catch { /* silently keep local */ }
        }
      },

      deleteCliente: async (id) => {
        set((state) => ({ clientes: state.clientes.filter((c) => c.id !== id) }));
        if (!id.startsWith('local_') && !id.startsWith('temp_')) {
          try {
            await fetchClient(`/api/dte/v2/clientes/${id}`, { method: 'DELETE' });
          } catch { /* silently keep deleted locally */ }
        }
      },

      addCard: (card) => set((state) => {
        const emisorId = useEmisorStore.getState().emisorId || 'default';
        return {
          cards: [...state.cards, { ...card, id: crypto.randomUUID(), createdAt: Date.now(), emisorId }]
        };
      }),
      updateCard: (id, updates) => set((state) => ({
        cards: state.cards.map((c) => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteCard: (id) => set((state) => ({
        cards: state.cards.filter((c) => c.id !== id)
      })),
      moveCard: (id, toColumn) => set((state) => ({
        cards: state.cards.map((c) => c.id === id ? { ...c, columna: toColumn } : c)
      })),
      
      syncClientes: async () => {
        set({ syncing: true });
        try {
          const resp = await fetchClient<{ data: Cliente[] }>('/api/dte/v2/clientes?limit=200');
          const clientes = Array.isArray(resp) ? resp : (resp?.data ?? []);
          set({ clientes, lastSyncAt: Date.now() });
        } catch {
          // Mantener caché local en caso de error
        } finally {
          set({ syncing: false });
        }
      },
    }),
    {
      name: 'dte-crm-storage',
      version: 1, // Migración de versión para tarjetas legacy
      migrate: (persistedState: any, version) => {
        if (version === 0 || version === undefined) {
          const emisorActual = useEmisorStore.getState().emisorId || 'default';
          if (persistedState && persistedState.cards) {
            persistedState.cards = persistedState.cards.map((c: PipelineCard) =>
              c.emisorId ? c : { ...c, emisorId: emisorActual }
            );
          }
        }
        return persistedState;
      },
      // Persistir solo cards (pipeline) y lastSyncAt en localStorage.
      partialize: (state) => ({
        cards: state.cards,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

/**
 * useCRMSync — Hook de sincronización CRM.
 */
export function useCRMSync() {
  const syncClientes = useCRMStore((s) => s.syncClientes);
  const syncing     = useCRMStore((s) => s.syncing);
  const lastSyncAt  = useCRMStore((s) => s.lastSyncAt);

  useEffect(() => {
    syncClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { syncing, lastSyncAt, refresh: syncClientes };
}
