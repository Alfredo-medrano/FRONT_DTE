'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';
import { fetchClient } from '@/lib/api-client';

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
      // El id viene del servidor para garantizar consistencia multi-device.
      addCliente: async (cli) => {
        // Optimistic local insert
        const tempId = `local_${crypto.randomUUID()}`;
        const localCliente: Cliente = { ...cli, id: tempId, createdAt: Date.now(), _source: 'local' };
        set((state) => ({ clientes: [...state.clientes, localCliente] }));

        try {
          const resp = await fetchClient<{ cliente: Cliente }>('/api/dte/v2/clientes', {
            method: 'POST',
            body: JSON.stringify(cli),
          });
          const serverCliente = { ...(resp.cliente ?? resp as any), createdAt: Date.now() };
          // Reemplazar el cliente temporal con el del servidor
          set((state) => ({
            clientes: state.clientes.map((c) => c.id === tempId ? serverCliente : c),
          }));
          return serverCliente;
        } catch {
          // Fallo de red: mantener local (_source: 'local')
          return localCliente;
        }
      },

      updateCliente: async (id, cli) => {
        set((state) => ({
          clientes: state.clientes.map((c) => c.id === id ? { ...c, ...cli } : c),
        }));
        // Solo sincronizar si no es un id temporal local
        if (!id.startsWith('local_') && !id.startsWith('temp_') && !id.startsWith('dte_')) {
          try {
            await fetchClient(`/api/dte/v2/clientes/${id}`, {
              method: 'PUT',
              body: JSON.stringify(cli),
            });
          } catch { /* silently keep local */ }
        }
      },

      deleteCliente: async (id) => {
        set((state) => ({ clientes: state.clientes.filter((c) => c.id !== id) }));
        if (!id.startsWith('local_') && !id.startsWith('temp_') && !id.startsWith('dte_')) {
          try {
            await fetchClient(`/api/dte/v2/clientes/${id}`, { method: 'DELETE' });
          } catch { /* silently keep deleted locally */ }
        }
      },

      addCard: (card) => set((state) => ({
        cards: [...state.cards, { ...card, id: crypto.randomUUID(), createdAt: Date.now() }]
      })),
      updateCard: (id, updates) => set((state) => ({
        cards: state.cards.map((c) => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteCard: (id) => set((state) => ({
        cards: state.cards.filter((c) => c.id !== id)
      })),
      moveCard: (id, toColumn) => set((state) => ({
        cards: state.cards.map((c) => c.id === id ? { ...c, columna: toColumn } : c)
      })),
    }),
    {
      name: 'dte-crm-storage',
      // Persistir solo cards (pipeline) y lastSyncAt en localStorage.
      // Los clientes se re-sincronizan desde la API al montar el dashboard.
      partialize: (state) => ({
        cards: state.cards,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

/**
 * useCRMSync — Hook de sincronización CRM.
 * BUG FIX (S5): Reemplaza la dependencia exclusiva de localStorage.
 * Al montar el componente que use este hook, descarga los clientes
 * del servidor (GET /api/dte/v2/clientes) y actualiza el store local.
 * Retorna { syncing, lastSyncAt, refresh }.
 */
export function useCRMSync() {
  const setClientes = useCRMStore((s) => s.setClientes);
  const setSyncing  = useCRMStore((s) => s.setSyncing);
  const setLastSync = useCRMStore((s) => s.setLastSync);
  const syncing     = useCRMStore((s) => s.syncing);
  const lastSyncAt  = useCRMStore((s) => s.lastSyncAt);

  const sync = async () => {
    setSyncing(true);
    try {
      const resp = await fetchClient<{ data: Cliente[] }>('/api/dte/v2/clientes?limit=200');
      const clientes = Array.isArray(resp) ? resp : (resp?.data ?? []);
      setClientes(clientes);
      setLastSync();
    } catch {
      // Sin conexión o error — mantener caché local del store
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { syncing, lastSyncAt, refresh: sync };
}

