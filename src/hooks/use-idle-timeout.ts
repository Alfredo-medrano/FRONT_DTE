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

    const logout = () => {
      clearKeys();
      router.push('/setup');
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
