'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { fetchClient } from '@/lib/api-client';
import { useCRMStore } from '@/stores/crm-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isReady = useAuthStore((state) => state.isReady);
  const setReady = useAuthStore((state) => state.setReady);
  const syncClientes = useCRMStore((s) => s.syncClientes);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);

  // Auto-logout: cerrar sesión tras 5 minutos sin actividad
  useIdleTimeout(5);

  useEffect(() => {
    setMounted(true);

    // SECURITY FIX (S3): Con isReady: false inicial, verificamos la cookie de sesión
    // contra el servidor al montar el layout. Esto permite que una recarga de página
    // no expulse a un usuario con sesión válida.
    const checkSession = async () => {
      try {
        const resp = await fetchClient<any>('/api/auth/me');
        if (resp?.exito) {
          setReady();
          // Sincronizar clientes centralizadamente al verificar sesión exitosa
          syncClientes();
        }
        setChecking(false);
      } catch (err: any) {
        // Silencioso: fetchClient se encarga de redirigir a /setup en caso de 401.
        // Si es 401, evitamos setChecking(false) para no disparar router.push('/setup') redundante.
        if (err?.status !== 401) {
          setChecking(false);
        }
      }
    };

    // Si ya tenemos isReady (login reciente en la misma sesión de JS), no re-verificar
    if (!isReady) {
      checkSession();
    } else {
      setChecking(false);
      // Sincronizar clientes centralizadamente si ya está listo
      syncClientes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted && !checking && !isReady) {
      router.push('/setup');
    }
  }, [mounted, checking, isReady, router]);

  if (!mounted || checking || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-32 bg-primary/20 rounded mb-4" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
