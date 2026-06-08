'use client';

import { create } from 'zustand';

/**
 * ========================================
 * AUTH STORE — Session State
 * ========================================
 * SECURITY FIX (C1): No longer persists JWT in localStorage.
 * The JWT lives exclusively in an httpOnly cookie set by the backend.
 * This store only tracks:
 *  - adminKey: for X-Admin-Key header (IAM admin panel)
 *  - isReady: session hydration flag for UI
 *
 * Authenticated API calls use `credentials: 'include'` to send
 * the cookie automatically — no Authorization header needed.
 */

interface AuthState {
  adminKey: string | null;
  isReady: boolean;
  setAdminKey: (adminKey: string) => void;
  setReady: () => void;
  clearKeys: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  adminKey: null,
  isReady: true,
  setAdminKey: (adminKey: string) => {
    set({ adminKey, isReady: true });
  },
  setReady: () => {
    set({ isReady: true });
  },
  clearKeys: () => {
    set({ adminKey: null, isReady: false });
  },
}));
