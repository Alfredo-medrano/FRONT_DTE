'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  apiKey: string | null;
  adminKey: string | null;
  setKeys: (apiKey: string, adminKey: string) => void;
  clearKeys: () => void;
  isReady: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: any) => ({
      apiKey: null,
      adminKey: null,
      isReady: false,
      setKeys: (apiKey: string, adminKey: string) => {
        set({ apiKey, adminKey, isReady: true });
      },
      clearKeys: () => {
        set({ apiKey: null, adminKey: null, isReady: false });
      },
    }),
    {
      name: 'dte-auth-storage',
      onRehydrateStorage: () => (state: AuthState | undefined) => {
        if (state) state.isReady = true;
      },
    }
  )
);
