// src/features/ingest/IngestPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ingestUpload, getGenres } from '../../api/endpoints';
import { useAuthStore } from '../../store/auth';
import { Link } from 'react-router-dom';

const ACCEPTED_EXT = ['.pdf', '.txt', '.md'];
const MAX_MB = 25; // client-side cap; adjust if your backend differs
const MAX_BYTES = MAX_MB * 1024 * 1024;

function Banner({ kind = 'info', children }) {
  const base =
    kind === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : kind === 'warn'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';
  return <div className={`border rounded p-3 text-sm ${base}`}>{children}</div>;
}

function FileBadge({ file, onClear }) {
  if (!file) return null;
  const mb = (file.size / (1024 * 1024)).toFixed(2);
  return (
    <div className="flex items-center gap-2 bg-white border rounded p-2">
      <div className="text-sm">
        <div className="font-medium">{file.name}</div>
        <div className="text-gray-500 text-xs">
          {file.type || 'application/octet-stream'} • {mb} MB
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs px-2 py-1 border rounded hover:bg-gray-50"
      >
        Remove
      </button>
    </div>
  );
}

export default function IngestPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('history');
  const [genres, setGenres] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('');
  const [info, setInfo] = useState('');
  const [result, setResult] = useState(null);
  const controllerRef = useRef(null);
  const sessionId = useAuthStore(s => s.sessionId);

  // load genres once
  useEffect(() => {
    (async () => {
      try {
        const g = await getGenres();
        const arr = Array.isArray(g?.genres) ? g.genres : [];
        setGenres(arr);
        if (!arr.includes(genre) && arr.length) setGenre(arr[0]);
      } catch (e) {
        // non-fatal; user can still type a genre
        console.warn('getGenres failed:', e);
      }
    })();
  }, []);

  // offline banner
  useEffect(() => {
    function onLine() { setInfo(''); }
    function offLine() { setInfo('You appear to be offline. Uploads will fail until connection is restored.'); }
    window.addEventListener('online', onLine);
    window.addEventListener('offline', offLine);
    if (!navigator.onLine) offLine();
    return () => {
      window.removeEventListener('online', onLine);
      window.removeEventListener('offline', offLine);
    };
  }, []);

  const acceptAttr = useMemo(() => ACCEPTED_EXT.join(','), []);

  function extOf(name = '') {
    const m = /\.[^.]+$/.exec(name.toLowerCase());
    return m ? m[0] : '';
  }

  function validateSelected(f) {
    if (!f) return 'No file selected.';
    const e = extOf(f.name);
    if (!ACCEPTED_EXT.includes(e)) {
      return `Unsupported file type "${e || 'unknown'}". Allowed: ${ACCEPTED_EXT.join(', ')}`;
    }
    if (f.size > MAX_BYTES) {
      return `File is too large (${(f.size / (1024 * 1024)).toFixed(2)} MB). Max ${MAX_MB} MB.`;
    }
    return '';
  }

  function handleChosen(f) {
    const v = validateSelected(f);
    if (v) {
      setErr(v);
      setHint(eHintForExtOrSize(v));
      setFile(null);
      return;
    }
    setErr(''); setHint('');
    setFile(f);
    // auto-title from filename if empty
    if (!title.trim()) {
      const base = (f.name || '').replace(/\.[^.]+$/, '').trim();
      if (base) setTitle(base);
    }
  }

  function eHintForExtOrSize(msg) {
    if (msg.includes('Unsupported')) return 'Try exporting your document as PDF or plain text and re-upload.';
    if (msg.includes('too large')) return 'Compress the PDF or split it into smaller parts before uploading.';
    return '';
  }

  function onDrop(e) {
    e.preventDefault();
    if (busy) return;
    const f = e.dataTransfer?.files?.[0];
    if (f) handleChosen(f);
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function clearFile() {
    setFile(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(''); setHint(''); setResult(null); setInfo('');
    if (!navigator.onLine) {
      setErr('No internet connection.');
      return;
    }
    if (!file) {
      setErr('Pick a file first.');
      return;
    }
    if (!title.trim()) {
      setErr('Title is required.');
      return;
    }
    if (!sessionId) {
      setErr('No session. Try navigating to Chat once or re-login.');
      return;
    }

    setBusy(true);
    controllerRef.current = new AbortController();
    try {
      const res = await ingestUpload({ file, title: title.trim(), author: author.trim() || undefined, genre: genre.trim() });
      setResult(res);
      setInfo('Upload complete.');
    } catch (e) {
      let details = e?.message || 'Upload failed';
      // try to read FastAPI error detail when ky throws
      if (e?.response) {
        try {
          const data = await e.response.json();
          if (data?.detail) details = data.detail;
        } catch { /* ignore */ }
      }
      setErr(details);
      if (/Error processing document: .*No such file or directory/i.test(details)) {
        setHint('If you are on Windows and the server uses a hardcoded "/tmp" path, switch backend to use tempfile.NamedTemporaryFile().');
      }
    } finally {
      setBusy(false);
      controllerRef.current = null;
    }
  }

  function onCancel() {
    if (controllerRef.current) {
      controllerRef.current.abort();
      setBusy(false);
      setInfo('Upload cancelled.');
    }
  }

  function onReset() {
    setErr(''); setHint(''); setInfo('');
    setResult(null);
    setFile(null);
    setAuthor('');
    // keep title/genre to make quick repeat uploads easier
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ingest</h1>
        <div className="text-xs text-gray-500">
          Allowed: {ACCEPTED_EXT.join(', ')} • Max {MAX_MB} MB
        </div>
      </div>

      {err && <Banner kind="error">{err}</Banner>}
      {hint && !err && <Banner kind="warn">{hint}</Banner>}
      {info && !err && <Banner>{info}</Banner>}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Drag & drop zone */}
        <label
          onDrop={onDrop}
          onDragOver={onDragOver}
          className={`block border-2 border-dashed rounded p-5 cursor-pointer bg-white ${
            busy ? 'opacity-60 pointer-events-none' : 'hover:bg-gray-50'
          }`}
        >
          <input
            type="file"
            accept={acceptAttr}
            className="hidden"
            onChange={(e) => handleChosen(e.target.files?.[0] || null)}
          />
          <div className="text-center text-sm text-gray-600">
            <div className="font-medium text-gray-800">Drop your file here</div>
            <div>or click to browse</div>
          </div>
        </label>

        <FileBadge file={file} onClear={clearFile} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="border rounded px-3 py-2 md:col-span-2"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Author (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <select
            className="border rounded px-3 py-2"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            {genres.length ? (
              genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))
            ) : (
              <>
                <option value="history">history</option>
                <option value="science">science</option>
                <option value="literature">literature</option>
              </>
            )}
          </select>
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Or type a custom genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={busy}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
          <button
            type="button"
            disabled={!busy}
            onClick={onCancel}
            className="px-3 py-2 rounded border disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 rounded border"
          >
            Reset
          </button>
        </div>
      </form>

      {result && (
        <div className="space-y-3">
          <div className="bg-white border rounded p-3">
            <div className="font-semibold mb-1">Uploaded</div>
            <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>

          {/* quick actions if backend returns book data */}
          {result.book && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(result.book.id || '')}
                className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
              >
                Copy Book ID
              </button>
              <Link
                to="/chat"
                className="text-sm px-3 py-1.5 rounded bg-black text-white"
              >
                Chat with it
              </Link>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setAuthor('');
                  setTitle('');
                  setResult(null);
                  setInfo('');
                }}
                className="text-sm px-3 py-1.5 rounded border"
              >
                Upload another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
