import { api } from './http';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';

export async function getGenres() {
  return api.get('books/genres').json();
}
export async function getBooksByGenre(genre) {
  return api.get(`books/${encodeURIComponent(genre)}`).json();
}

export async function createSession() {
  // (Optional) read current user id for the body; server will still trust token.sub
  const { data: { user } } = await supabase.auth.getUser();
  const user_id = user?.id ?? undefined;

  return api.post('user/session/create', {
    json: { user_id }, // or {} if you don’t want to pass it
  }).json();
}


export async function askChat({ user_id, session_id, question, genre }) {
  return api.post("chatbot/ask", {
    json: { user_id, session_id, question, genre },
  }).json();
}

// --------------------------
// Conversation API helpers
// --------------------------
export function _conversationStorageKey() {
  return 'conversation_id'
}

export function getStoredConversationId() {
  try {
    return localStorage.getItem(_conversationStorageKey()) || null
  } catch (e) {
    return null
  }
}

export function setStoredConversationId(id) {
  try {
    if (id) localStorage.setItem(_conversationStorageKey(), id)
    else localStorage.removeItem(_conversationStorageKey())
  } catch (e) {}
}

export async function createConversationEmpty({ title, genre, book_ids } = {}) {
  // include user id where available (optional)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const user_id = user?.id ?? undefined;
    const body = { user_id, title, genre, book_ids };
    return api.post('conversations/new-chat', { json: body }).json();
  } catch (e) {
    // still try without user info
    return api.post('conversations/new-chat', { json: { title, genre, book_ids } }).json();
  }
}

// Generic create conversation endpoint (non-"new-chat")
export async function createConversation({ user_id, title, genre, book_ids } = {}) {
  // prefer including current user id when available (follow same style as createConversationEmpty)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? user_id ?? undefined;
    const body = { user_id: uid, title, genre, book_ids };
    return api.post('conversations', { json: body }).json();
  } catch (e) {
    return api.post('conversations', { json: { user_id, title, genre, book_ids } }).json();
  }
}

export async function addConversationMessage(conversationId, { sender, message, citations, metadata } = {}) {
  return api.post(`conversations/${conversationId}/messages`, {
    json: { sender, message, citations: citations || [], metadata: metadata || {} }
  }).json();
}

export async function listConversations({ user_id, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (user_id) params.set('user_id', user_id);
  if (limit) params.set('limit', String(limit));
  return api.get(`conversations?${params.toString()}`).json();
}

export async function getConversation(conversationId) {
  return api.get(`conversations/${conversationId}`).json();
}

export async function getConversationMessages(conversationId, { limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return api.get(`conversations/${conversationId}/messages?${params.toString()}`).json();
}

export async function getConversationInfo(conversationId) {
  return api.get(`conversations/${conversationId}/info`).json();
}

export async function updateConversation(conversationId, updates = {}) {
  return api.put(`conversations/${conversationId}`, { json: updates }).json();
}

export async function deleteConversation(conversationId) {
  return api.delete(`conversations/${conversationId}`).json();
}

export async function createConversationAutoTitle({ user_id, question, answer, genre, book_ids } = {}) {
  const body = { user_id, question, answer, genre, book_ids };
  return api.post('conversations/auto-title', { json: body }).json();
}

export async function ingestUpload({ file, title, author, genre }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', title);
  if (author) fd.append('author', author);
  fd.append('genre', genre);
  return api.post('ingest/upload', { body: fd }).json();
}

export async function mcqGenerate({ genre, context }) {
  // First try without user_id; if backend still expects it, retry w/ user_id
  try {
    return await api.post('mcq/generate', { json: { genre, context } }).json();
  } catch (e) {
    if (e.response?.status === 422) {
      const uid = useAuthStore.getState().user?.id;
      return api.post('mcq/generate', { json: { user_id: uid, genre, context } }).json();
    }
    throw e;
  }
}

export async function mcqEvaluate({ quiz_id, answers }) {
  try {
    return await api.post('mcq/evaluate', { json: { quiz_id, answers } }).json();
  } catch (e) {
    if (e.response?.status === 422) {
      const uid = useAuthStore.getState().user?.id;
      return api.post('mcq/evaluate', { json: { user_id: uid, quiz_id, answers } }).json();
    }
    throw e;
  }
}

export async function ocrParse({ imageBase64 }) {
  return api.post('ocr/parse', { json: { image: imageBase64 } }).json();
}
