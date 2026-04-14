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
        // Sync to localStorage for simple fetch client access
        localStorage.setItem('dte_api_key', apiKey);
        localStorage.setItem('dte_admin_key', adminKey);
        set({ apiKey, adminKey, isReady: true });
      },
      clearKeys: () => {
        localStorage.removeItem('dte_api_key');
        localStorage.removeItem('dte_admin_key');
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
