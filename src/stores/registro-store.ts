'use client';

import { create } from 'zustand';

/**
 * ========================================
 * STORE TEMPORAL — Wizard de Registro
 * ========================================
 * Mantiene el estado del formulario multi-paso
 * en memoria (NO persiste — datos sensibles).
 */

export interface RegistroData {
  // Paso 1: Datos de Empresa
  razonSocial: string;
  nombreComercial: string;
  nit: string;
  nrc: string;
  codActividad: string;
  descActividad: string;
  correo: string;
  telefono: string;

  // Paso 2: Dirección Fiscal
  departamento: string;
  municipio: string;
  complemento: string;

  // Paso 3: Credenciales & Plan
  mhClaveApi: string;
  plan: 'BASICO' | 'PROFESIONAL' | 'EMPRESARIAL' | 'ILIMITADO' | '';

  // Opcionales
  codEstableMH: string;
  codPuntoVentaMH: string;
  ambiente: '00' | '01';
}

interface RegistroStore {
  step: number;
  data: RegistroData;
  maxSteps: number;
  isSubmitting: boolean;
  submitError: string | null;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (partial: Partial<RegistroData>) => void;
  setSubmitting: (value: boolean) => void;
  setSubmitError: (error: string | null) => void;
  reset: () => void;
}

const initialData: RegistroData = {
  razonSocial: '',
  nombreComercial: '',
  nit: '',
  nrc: '',
  codActividad: '',
  descActividad: '',
  correo: '',
  telefono: '',
  departamento: '',
  municipio: '',
  complemento: '',
  mhClaveApi: '',
  plan: '',
  codEstableMH: 'M001',
  codPuntoVentaMH: 'P001',
  ambiente: '00',
};

export const useRegistroStore = create<RegistroStore>()((set) => ({
  step: 0,
  data: { ...initialData },
  maxSteps: 4,
  isSubmitting: false,
  submitError: null,

  setStep: (step: number) => set({ step }),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, state.maxSteps - 1) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 0) })),
  updateData: (partial: Partial<RegistroData>) =>
    set((state) => ({
      data: { ...state.data, ...partial },
    })),
  setSubmitting: (value: boolean) => set({ isSubmitting: value }),
  setSubmitError: (error: string | null) => set({ submitError: error }),
  reset: () =>
    set({
      step: 0,
      data: { ...initialData },
      isSubmitting: false,
      submitError: null,
    }),
}));
