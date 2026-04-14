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

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

export const fetchClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('dte_api_key') : null;
  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('dte_admin_key') : null;
  const emisorId = typeof window !== 'undefined' ? localStorage.getItem('dte_emisor_id') : null;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (apiKey) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }
  if (emisorId) {
    headers.set('X-Emisor-Id', emisorId);
  }

  const url = `${getBaseUrl()}${endpoint}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
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
