import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { createSession } from '../api/endpoints';

export function useEnsureSession() {
  const token = useAuthStore(s => s.accessToken);
  const sessionId = useAuthStore(s => s.sessionId);
  const setSessionId = useAuthStore(s => s.setSessionId);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!token || sessionId) return;
      try {
        const res = await createSession();
        if (!ignore) setSessionId(res.session_id);
      } catch (e) {
        // visible failures should be handled by pages; keep this silent
        console.error('createSession failed:', e);
      }
    }
    run();
    return () => { ignore = true; };
  }, [token, sessionId, setSessionId]);
}
