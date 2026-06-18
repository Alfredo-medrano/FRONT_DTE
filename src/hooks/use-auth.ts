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
 *
 * SECURITY FIX (S3): isReady starts as FALSE.
 * Previously was TRUE, causing the idle timeout to start running on
 * unauthenticated pages like /setup (before any login), which could
 * trigger unexpected redirects after 5 minutes of inactivity.
 * isReady is only set to TRUE after a successful login via setReady().
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
  isReady: false,  // SECURITY FIX (S3): false until explicitly set by login
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

