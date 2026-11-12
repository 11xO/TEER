import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http.js';
export const SESSION_QUERY_KEY = ['api', 'session'];
export const isPrivateQuery = (query) => query.meta?.private === true || query.queryKey[0] === 'firebase' || query.queryKey[0] === 'api' && query.queryKey[1] === 'session';
export async function clearPrivateSession(client) {
  await client.cancelQueries({ predicate: isPrivateQuery });
  client.removeQueries({ predicate: (query) => isPrivateQuery(query) && !(query.queryKey[0] === 'api' && query.queryKey[1] === 'session') });
  client.setQueryData(SESSION_QUERY_KEY, null);
}
export const queryClient = new QueryClient({ defaultOptions: {
  queries: { staleTime: 30000, retry: (count, error) => count < 1 && error instanceof ApiError && (error.status >= 500 || ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(error.code)) },
  mutations: { retry: false },
} });
