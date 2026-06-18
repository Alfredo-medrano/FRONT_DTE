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
    // BUG FIX (S7): isLoading debe ser true mientras SWR est\u00e1 fetching sin datos.
    // El patr\u00f3n anterior (!error && !data) fallaba en revalidaciones: si hab\u00eda un
    // error cacheado y data era undefined, retornaba false (isLoading=false)
    // incorrectamente, haciendo que el spinner desapareciera antes de los datos.
    isLoading: isValidating && !data,
    isError: error,
    isValidating,
    mutate
  };
}
