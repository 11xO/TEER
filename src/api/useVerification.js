import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SESSION_QUERY_KEY } from './queryClient.js';
import { sendVerificationCode, verifyVerificationCode } from './whatsappVerification.js';
export function useVerification() {
  const client = useQueryClient();
  const active = useRef({ revision: 0, controller: null });
  const mounted = useRef(true);
  const verifiedRevision = useRef(-1);
  const cancel = useCallback(() => { active.current.revision += 1; active.current.controller?.abort(); active.current.controller = null; }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancel(); }; }, [cancel]);
  const execute = useCallback(async (service, payload, verified = false) => {
    cancel(); const revision = active.current.revision;
    const controller = new AbortController(); active.current.controller = controller;
    try {
      const result = await service(payload, { signal: controller.signal });
      if (controller.signal.aborted || active.current.revision !== revision || !mounted.current) throw new DOMException('Verification cancelled', 'AbortError');
      if (verified) verifiedRevision.current = revision;
      return result;
    } finally { if (active.current.controller === controller) active.current.controller = null; }
  }, [cancel]);
  const sendMutation = useMutation({ mutationKey: ['api', 'whatsapp', 'send'], mutationFn: (payload) => execute(sendVerificationCode, payload), retry: false });
  const verifyMutation = useMutation({ mutationKey: ['api', 'whatsapp', 'verify'], mutationFn: (payload) => execute(verifyVerificationCode, payload, true), retry: false,
    onSuccess: async () => { if (mounted.current && verifiedRevision.current === active.current.revision) await client.invalidateQueries({ queryKey: SESSION_QUERY_KEY }); } });
  return { sendMutation, verifyMutation, cancel, reset() { cancel(); sendMutation.reset(); verifyMutation.reset(); } };
}
