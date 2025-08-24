import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create(set => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('access_token') || '',
  sessionId: localStorage.getItem('session_id') || '',

  setFromSession: (session) => {
    const user = session?.user ?? null;
    const token = session?.access_token ?? '';
    if (user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user');
    if (token) localStorage.setItem('access_token', token); else localStorage.removeItem('access_token');
    set({ user, accessToken: token });
  },

  setSessionId: (sessionId) => {
    if (sessionId) localStorage.setItem('session_id', sessionId);
    else localStorage.removeItem('session_id');
    set({ sessionId: sessionId || '' });
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('session_id');
    set({ user: null, accessToken: '', sessionId: '' });
  }
}));

// Bootstrap once on app start
export async function initAuthListener() {
  // pick up any existing session on refresh
  const { data } = await supabase.auth.getSession();
  useAuthStore.getState().setFromSession(data.session || null);

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setFromSession(session || null);
  });
}
