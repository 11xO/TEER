import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WHATSAPP_VERIFICATION_ENABLED } from './http.js';
import { clearPrivateSession, isPrivateQuery, SESSION_QUERY_KEY } from './queryClient.js';
import { getSession, logoutSession } from './whatsappVerification.js';
export function useSession({ enabled = WHATSAPP_VERIFICATION_ENABLED } = {}) {
  return useQuery({ queryKey: SESSION_QUERY_KEY, queryFn: ({ signal }) => getSession({ signal }), enabled, meta: { private: true }, refetchInterval: enabled ? 60000 : false });
}
export function useLogout() {
  const client = useQueryClient();
  return useMutation({ mutationKey: ['api', 'logout'], mutationFn: () => logoutSession(), retry: false,
    onMutate: () => client.cancelQueries({ predicate: isPrivateQuery }), onSuccess: () => clearPrivateSession(client) });
}
