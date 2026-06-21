import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIdleTimeout } from '../use-idle-timeout';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../use-auth';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('../use-auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  fetchClient: vi.fn().mockResolvedValue({ exito: true }),
}));

describe('useIdleTimeout', () => {
  let mockPush: any;
  let mockClearKeys: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockPush = vi.fn();
    mockClearKeys = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockPush });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe cerrar sesión después del tiempo especificado si el usuario esta listo', async () => {
    (useAuthStore as any).mockImplementation((selector: any) => {
      const state = { isReady: true, clearKeys: mockClearKeys };
      return selector(state);
    });

    renderHook(() => useIdleTimeout(5)); // 5 minutes

    // Avanzamos 4 minutos (sin superar el límite)
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    expect(mockPush).not.toHaveBeenCalled();

    // Avanzamos 1 minuto extra
    await vi.advanceTimersByTimeAsync(1 * 60 * 1000);
    expect(mockClearKeys).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/setup');
  });

  it('no debe disparar logout si detecta actividad del usuario', async () => {
    (useAuthStore as any).mockImplementation((selector: any) => {
        const state = { isReady: true, clearKeys: mockClearKeys };
        return selector(state);
    });

    renderHook(() => useIdleTimeout(5));

    // Avanzamos 3 minutos
    await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    // Simulamos movimiento de mouse
    window.dispatchEvent(new Event('mousemove'));

    // Avanzamos otros 3 minutos (un total de 6 minutos desde el inicio)
    await vi.advanceTimersByTimeAsync(3 * 60 * 1000);

    // Como hubo reset, no debe haber cerrado la sesión todavia
    expect(mockPush).not.toHaveBeenCalled();
  });
});
