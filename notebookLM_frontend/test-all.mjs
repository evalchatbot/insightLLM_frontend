// test-all.mjs
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const {
  TEST_EMAIL,
  TEST_PASSWORD,
  BACKEND_BASE = 'http://127.0.0.1:8000',
  TEST_PDF_PATH = './sample.pdf',
  TEST_IMAGE_PATH = './sample.png',
} = process.env;

if (!SUPABASE_URL) throw new Error('Set SUPABASE_URL or VITE_SUPABASE_URL in .env');
if (!SUPABASE_ANON_KEY) throw new Error('Set SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY in .env');
if (!TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error('Set TEST_EMAIL and TEST_PASSWORD in .env');
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function reqFactory(token) {
  return async (method, p, body, isForm = false) => {
    const res = await fetch(`${BACKEND_BASE}${p}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(isForm ? {} : body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: isForm ? body : (body ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    if (!res.ok) {
      throw new Error(`${method} ${p} → ${res.status}: ${text}`);
    }
    return json;
  };
}

function log(title, data) {
  console.log(`\n=== ${title} ===`);
  console.dir(data, { depth: 5 });
}

(async () => {
  // 0) Sign in to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signIn, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`Sign-in failed: ${error.message}`);
  const token = signIn.session?.access_token;
  if (!token) throw new Error('No access token from Supabase');
  const userId = signIn.user?.id;
  const req = reqFactory(token);
  console.log('✓ Signed in. user:', userId);

  // 👇 Add this
console.log("\n=== Supabase Access Token (Bearer) ===");
console.log("Bearer " + token); // full token, or slice(0, 40) + "..." if you want truncation

  // 1) Books: genres
  const genres = await req('GET', '/books/genres');
  log('Books/genres', genres);

  // 2) Ingest: upload (optional, only if test PDF exists)
  let ingested = null;
  try {
    const abs = path.resolve(TEST_PDF_PATH);
    if (await fileExists(abs)) {
      const buf = await fs.readFile(abs);
      const fd = new FormData();
      fd.append('file', new Blob([buf]), path.basename(abs));
      fd.append('title', 'Sample PDF');
      fd.append('author', 'Test Author');
      fd.append('genre', 'history'); // adjust as needed
      ingested = await req('POST', '/ingest/upload', fd, true);
      log('Ingest/upload', ingested);
    } else {
      console.warn('(!) Skipping ingest: TEST_PDF_PATH not found:', abs);
    }
  } catch (e) {
    console.warn('(!) Ingest/upload failed:', e.message);
  }

  // 3) Books: by genre (use first genre or fallback)
  const chosenGenre =
    Array.isArray(genres?.genres) && genres.genres.length
      ? genres.genres[0]
      : 'history';
  try {
    const byGenre = await req('GET', `/books/${encodeURIComponent(chosenGenre)}`);
    log(`Books/${chosenGenre}`, byGenre);
  } catch (e) {
    console.warn(`(!) Books/${chosenGenre} failed:`, e.message);
  }

    const session = await req('POST', '/user/session/create', {
      user_id: userId,              // from Supabase sign-in above
      // you can add more fields later if you extend your model, e.g. device info
      // device: "win10-edge-139",
    });
    log('User/session/create', session);

  // 5) Chatbot: ask
  try {
    const chat = await req('POST', '/chatbot/ask', {
      session_id: session.session_id,

        question: 'Give me a one-line fun fact.',
      genre: chosenGenre,
    });
    log('Chatbot/ask', chat);
  } catch (e) {
    console.error('Chatbot/ask failed:', e.message);
  }

  // 6) MCQ: generate (first try without user_id; if 422, retry with it)
  let mcqGen;
  try {
    mcqGen = await req('POST', '/mcq/generate', {
      genre: chosenGenre,
      context: '',
    });
    log('MCQ/generate (no user_id)', mcqGen);
  } catch (e) {
    if (e.message.includes('422')) {
      console.warn('MCQ/generate needs user_id; retrying with user_id…');
      mcqGen = await req('POST', '/mcq/generate', {
        user_id: userId,
        genre: chosenGenre,
        context: '',
      });
      log('MCQ/generate (with user_id)', mcqGen);
    } else {
      throw e;
    }
  }

  // 7) MCQ: evaluate (answer all with first option if available)
  try {
    const quizId = mcqGen?.quiz_id || mcqGen?.quiz?.id || 'quiz_1';
    const questions = mcqGen?.questions || mcqGen?.quiz?.questions || [];
    const answers = questions.map((q) =>
      Array.isArray(q.options) ? q.options[0] : 'A'
    );

    let evalBody = { quiz_id: quizId, answers };

    try {
      const evaluated = await req('POST', '/mcq/evaluate', evalBody);
      log('MCQ/evaluate (no user_id)', evaluated);
    } catch (e2) {
      if (e2.message.includes('422')) {
        console.warn('MCQ/evaluate needs user_id; retrying with user_id…');
        const evaluated = await req('POST', '/mcq/evaluate', {
          user_id: userId,
          ...evalBody,
        });
        log('MCQ/evaluate (with user_id)', evaluated);
      } else {
        throw e2;
      }
    }
  } catch (e) {
    console.warn('(!) Skipping MCQ evaluate:', e.message);
  }

  // 8) OCR: parse (optional)
  try {
    const imgAbs = path.resolve(TEST_IMAGE_PATH);
    if (await fileExists(imgAbs)) {
      const buf = await fs.readFile(imgAbs);
      const b64 = Buffer.from(buf).toString('base64');
      const ocrRes = await req('POST', '/ocr/parse', { image: b64 });
      log('OCR/parse', ocrRes);
    } else {
      console.warn('(!) Skipping OCR: TEST_IMAGE_PATH not found:', imgAbs);
    }
  } catch (e) {
    console.warn('(!) OCR/parse failed:', e.message);
  }

  console.log('\n✓ All tests attempted.');
})().catch((err) => {
  console.error('\nTest run failed:', err.message);
  process.exit(1);
});
