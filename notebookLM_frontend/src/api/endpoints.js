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


export async function askChat({ session_id, question, genre }) {
  return api.post('chatbot/ask', { json: { session_id, question, genre } }).json();
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
