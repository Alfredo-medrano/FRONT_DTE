import useSWR, { SWRConfiguration } from 'swr';
import { fetchClient } from '@/lib/api-client';

export function useAPI<T>(endpoint: string | null, options?: SWRConfiguration) {
  const { data, error, mutate, isValidating } = useSWR(
    endpoint,
    (url: string) => fetchClient<T>(url).then((res) => res.datos ?? res.data ?? res),
    options
  );

  return {
    data: data as T | undefined,
    isLoading: !error && !data,
    isError: error,
    isValidating,
    mutate
  };
}
