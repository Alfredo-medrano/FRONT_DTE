export interface ApiResponse<T = any> {
  exito: boolean;
  mensaje?: string;
  datos?: T;
  error?: any;
  [key: string]: any;
}

export class ApiError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string,
    public resDetails?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

import { useAuthStore } from '@/hooks/use-auth';

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

export const fetchClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const { apiKey } = useAuthStore.getState();
  if (apiKey) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }

  const url = `${getBaseUrl()}${endpoint}`;

  try {
    const res = await fetch(url, { ...options, credentials: 'include', headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // Auto logout en caso de 401 (token expirado o faltante)
      if (res.status === 401 && typeof window !== 'undefined' && !url.includes('/auth/login')) {
        useAuthStore.getState().clearKeys();
        window.location.href = '/setup';
      }

      throw new ApiError(
        data?.mensaje || data?.error || 'Error en la petición API',
        res.status,
        data?.codigo || 'UNKNOWN_ERROR',
        data
      );
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : 'Error desconocido de red');
  }
};
