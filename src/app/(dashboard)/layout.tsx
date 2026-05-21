'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isReady = useAuthStore((state) => state.isReady);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Auto-logout: cerrar sesión tras 5 minutos sin actividad
  useIdleTimeout(5);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isReady) {
      router.push('/setup');
    }
  }, [mounted, isReady, router]);

  if (!mounted || !isReady) {
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
