// src/features/chat/ChatPage.jsx
import { useEffect, useRef, useState } from 'react';
import { getGenres, askChat, createSession } from '../../api/endpoints';
import { useAuthStore } from '../../store/auth';

function Banner({ kind = 'info', children }) {
  const base =
    kind === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : kind === 'warn'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';
  return (
    <div className={`border rounded p-3 text-sm ${base}`}>
      {children}
    </div>
  );
}

function Message({ role, content, onCopy }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[80%] rounded-2xl p-3 text-sm shadow-sm
        ${isUser ? 'bg-black text-white' : 'bg-white border'}`}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        <button
          onClick={onCopy}
          className={`absolute -bottom-3 right-2 text-[10px] px-2 py-0.5 rounded border ${
            isUser ? 'bg-white text-black' : 'bg-gray-50 text-gray-700'
          }`}
          title="Copy"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

function Sources({ items }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Sources</h3>
      <div className="space-y-2">
        {items.map((s, i) => (
          <details key={i} className="bg-white border rounded p-3">
            <summary className="cursor-pointer">
              <span className="font-medium">{s.book_title || s.book_id || `Source ${i + 1}`}</span>
              {s.chunk_index != null && (
                <span className="text-gray-500"> — chunk {s.chunk_index}</span>
              )}
            </summary>
            {s.text && (
              <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">
                {s.text}
              </div>
            )}
          </details>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [genres, setGenres] = useState([]);
  const [genre, setGenre] = useState(localStorage.getItem('chat.genre') || '');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]); // [{role:'user'|'assistant', content:string, ts:number}]
  const [lastSources, setLastSources] = useState([]);
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const sessionId = useAuthStore((s) => s.sessionId);
  const setSessionId = useAuthStore((s) => s.setSessionId);
  const scrollerRef = useRef(null);

  // scroll to bottom on new messages
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // load genres
  useEffect(() => {
    (async () => {
      try {
        const g = await getGenres();
        const arr = Array.isArray(g?.genres) ? g.genres : [];
        setGenres(arr);
        if (!genre) {
          const chosen = arr[0] || 'history';
          setGenre(chosen);
          localStorage.setItem('chat.genre', chosen);
        }
      } catch (e) {
        console.error(e);
        setErr('Failed to load genres. Please refresh.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // offline hint
  useEffect(() => {
    function handleOnline() {
      setInfo('');
    }
    function handleOffline() {
      setInfo('You appear to be offline. Requests will fail until connection is restored.');
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) handleOffline();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function setGenrePersist(val) {
    setGenre(val);
    localStorage.setItem('chat.genre', val);
  }

  async function ensureSession() {
    if (sessionId) return sessionId;
    try {
      const res = await createSession();
      setSessionId(res.session_id);
      return res.session_id;
    } catch (e) {
      throw new Error('Could not create a chat session. Try logging out and back in.');
    }
  }

  async function onAsk(e) {
    e?.preventDefault?.();
    setErr('');
    setInfo('');
    setMeta(null);
    setLastSources([]);
    if (!draft.trim()) return;
    if (!navigator.onLine) {
      setErr('No internet connection.');
      return;
    }
    setBusy(true);

    const userMsg = { role: 'user', content: draft.trim(), ts: Date.now() };
    setMessages((m) => [...m, userMsg]);

    try {
      const sid = await ensureSession();
      const res = await askChat({
        session_id: sid,
        question: userMsg.content,
        genre,
      });

      const assistantMsg = {
        role: 'assistant',
        content: res.answer || '[Empty answer]',
        ts: Date.now(),
      };
      setMessages((m) => [...m, assistantMsg]);
      setLastSources(res.sources || []);
      setMeta(res.metadata || null);
      setDraft('');
    } catch (e) {
      let details = e?.message || 'Chat failed';
      if (e?.response) {
        try {
          const data = await e.response.json();
          details = data?.detail || details;
        } catch {
          /* ignore JSON parse errors */
        }
      }
      setErr(details);
      // keep the user's last question, but also add a system-ish bubble
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `[Error] ${details}`, ts: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function onRetryLast() {
    // find last user message
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setDraft(lastUser.content);
    await onAsk();
  }

  async function onNewChat() {
    setErr('');
    setInfo('');
    setMeta(null);
    setLastSources([]);
    setMessages([]);
    setBusy(true);
    try {
      const res = await createSession();
      setSessionId(res.session_id);
      setInfo('Started a new chat session.');
    } catch (e) {
      setErr('Could not start a new chat. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function onCopy(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const disabled = busy || !draft.trim();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <div className="flex gap-2">
          <button
            onClick={onNewChat}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50 disabled:opacity-50"
            title="Start a fresh session (clears short-term memory)"
          >
            New chat
          </button>
        </div>
      </div>

      {err && <Banner kind="error">{err}</Banner>}
      {info && !err && <Banner>{info}</Banner>}

      <div className="flex gap-2 items-center">
        <label className="text-sm text-gray-600">Genre</label>
        <select
          className="border rounded px-3 py-2"
          value={genre}
          onChange={(e) => setGenrePersist(e.target.value)}
        >
          {genres.length ? (
            genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))
          ) : (
            <option value="history">history</option>
          )}
        </select>
      </div>

      {/* message list */}
      <div
        ref={scrollerRef}
        className="bg-gray-100/60 border rounded p-3 h-[380px] overflow-y-auto space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-gray-600">
            Ask anything about your ingested books. Use the genre to steer context.{" "}
            Try: <span className="font-mono">"Give me a one-line fun fact"</span>
          </div>
        ) : (
          messages.map((m, i) => (
            <Message
              key={i}
              role={m.role}
              content={m.content}
              onCopy={() => onCopy(m.content)}
            />
          ))
        )}

        {busy && (
          <div className="text-xs text-gray-600 animate-pulse">Thinking…</div>
        )}
      </div>

      {/* ask form */}
      <form onSubmit={onAsk} className="space-y-2">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 border rounded px-3 py-2 min-h-[60px] max-h-[160px]"
            placeholder="Ask something… (Shift+Enter for newline)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onAsk();
              }
            }}
          />
          <button
            disabled={disabled}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {busy ? 'Asking…' : 'Ask'}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRetryLast}
            disabled={busy || messages.filter((m) => m.role === 'user').length === 0}
            className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50 disabled:opacity-50"
          >
            Retry last
          </button>
          <div className="text-xs text-gray-500 self-center">
            Press <kbd className="px-1 border rounded">Enter</kbd> to send •{' '}
            <kbd className="px-1 border rounded">Shift</kbd>+<kbd className="px-1 border rounded">Enter</kbd> for newline
          </div>
        </div>
      </form>

      {/* sources + metadata */}
      <Sources items={lastSources} />
      {meta && (
        <div className="text-xs text-gray-600">
          Retrieved chunks: <span className="font-mono">{meta.retrieved_chunks}</span>
        </div>
      )}
    </div>
  );
}
