'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './use-auth';

export function useIdleTimeout(timeoutMinutes = 5) {
  const router = useRouter();
  const clearKeys = useAuthStore((state) => state.clearKeys);
  const isReady = useAuthStore((state) => state.isReady);
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Sólo iniciamos el timer si el usuario está autenticado
    if (!isReady) return;

    const logout = async () => {
      try {
        // SECURITY FIX (S2): Invalidar la cookie httpOnly en el servidor ANTES de
        // limpiar el store local. Sin esta llamada, la cookie sobrevivía al clearKeys()
        // y el usuario seguía autenticado al recargar la página.
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include', // Envía la cookie para que el servidor la invalide
        });
      } catch {
        // Si el servidor no responde, procedemos igual con el logout local.
        // El token expirará solo en 24h, pero la sesión UI queda limpia.
      } finally {
        clearKeys();
        router.push('/setup');
      }
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(logout, timeoutMs);
    };

    // Eventos que indican actividad del usuario
    const events = ['mousemove', 'mousedown', 'scroll', 'keydown', 'touchstart', 'click'];
    
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Iniciar temporizador
    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isReady, router, clearKeys, timeoutMs]);
}
