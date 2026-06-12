'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Cliente {
  id: string;
  nit: string;
  nrc?: string;
  nombre: string;
  actividadEconomica?: string;
  correo: string;
  telefono?: string;
  createdAt: number;
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
  addCliente: (cliente: Omit<Cliente, 'id' | 'createdAt'>) => void;
  updateCliente: (id: string, cli: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  addCard: (card: Omit<PipelineCard, 'id' | 'createdAt'>) => void;
  updateCard: (id: string, card: Partial<PipelineCard>) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, toColumn: PipelineCard['columna']) => void;
}
export const useCRMStore = create<CRMStore>()(
  persist(
    (set) => ({
      clientes: [] as Cliente[],
      cards: [] as PipelineCard[],
      addCliente: (cli) => set((state) => ({
        clientes: [...state.clientes, { ...cli, id: crypto.randomUUID(), createdAt: Date.now() }]
      })),
      updateCliente: (id, cli) => set((state) => ({
        clientes: state.clientes.map((c) => c.id === id ? { ...c, ...cli } : c)
      })),
      deleteCliente: (id) => set((state) => ({
        clientes: state.clientes.filter((c) => c.id !== id)
      })),
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
    }
  )
);
