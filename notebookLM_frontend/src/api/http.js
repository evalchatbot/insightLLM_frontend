// http.js
import ky from 'ky';
import { supabase } from '../lib/supabase';

// Helper to get a fresh token (no store race conditions)
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_BASE_URL, // e.g. http://127.0.0.1:8000
  timeout: 15000,
  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await getAccessToken();
        if (!token) return; // let protected endpoints 401 if not signed in
        request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],

    // Auto-refresh on 401 then retry once with the new token
    afterResponse: [
      async (request, options, response) => {
        if (response.status !== 401) return;

        // Try to refresh the session
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data?.session?.access_token) return; // bubble the 401

        const newToken = data.session.access_token;

        // Re-issue the original request with the new token
        const headers = new Headers(request.headers);
        headers.set('Authorization', `Bearer ${newToken}`);

        // ky re-call with same options, updated headers
        return ky(request, { ...options, headers });
      },
    ],
  },
  // Optional: small retry for transient errors (not 401)
  retry: {
    limit: 1,
    methods: ['get', 'post', 'put', 'patch', 'delete'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
});
