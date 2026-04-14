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
    (set: any) => ({
      clientes: [],
      cards: [],
      addCliente: (cli: any) => set((state: any) => ({
        clientes: [...state.clientes, { ...cli, id: crypto.randomUUID(), createdAt: Date.now() }]
      })),
      updateCliente: (id: any, cli: any) => set((state: any) => ({
        clientes: state.clientes.map((c: any) => c.id === id ? { ...c, ...cli } : c)
      })),
      deleteCliente: (id: any) => set((state: any) => ({
        clientes: state.clientes.filter((c: any) => c.id !== id)
      })),
      addCard: (card: any) => set((state: any) => ({
        cards: [...state.cards, { ...card, id: crypto.randomUUID(), createdAt: Date.now() }]
      })),
      updateCard: (id: any, updates: any) => set((state: any) => ({
        cards: state.cards.map((c: any) => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteCard: (id: any) => set((state: any) => ({
        cards: state.cards.filter((c: any) => c.id !== id)
      })),
      moveCard: (id: any, toColumn: any) => set((state: any) => ({
        cards: state.cards.map((c: any) => c.id === id ? { ...c, columna: toColumn } : c)
      })),
    }),
    {
      name: 'dte-crm-storage',
    }
  ) as any
);
