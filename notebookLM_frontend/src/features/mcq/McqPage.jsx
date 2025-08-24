import { useState } from 'react';
import { mcqGenerate, mcqEvaluate } from '../../api/endpoints';

export default function McqPage() {
  const [genre, setGenre] = useState('history');
  const [context, setContext] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  async function onGenerate() {
    setErr(''); setResult(null); setBusy(true);
    try {
      const res = await mcqGenerate({ genre, context });
      setQuiz(res);
      setAnswers({});
    } catch (e) {
      setErr(e.message || 'Generate failed');
    } finally { setBusy(false); }
  }

  async function onEvaluate() {
    setErr(''); setBusy(true);
    try {
      const quizId = quiz?.quiz_id || quiz?.quiz?.id;
      const qs = quiz?.questions || quiz?.quiz?.questions || [];
      const arr = qs.map((q, i) => answers[i] ?? q.options?.[0] ?? '');
      const res = await mcqEvaluate({ quiz_id: quizId, answers: arr });
      setResult(res);
    } catch (e) {
      setErr(e.message || 'Evaluate failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">MCQ</h1>
      {err && <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">{err}</div>}

      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 w-40" value={genre} onChange={e=>setGenre(e.target.value)} placeholder="Genre" />
        <input className="border rounded px-3 py-2 flex-1" value={context} onChange={e=>setContext(e.target.value)} placeholder="Context (optional)" />
        <button onClick={onGenerate} disabled={busy} className="px-4 py-2 rounded bg-black text-white">
          {busy ? 'Working…' : 'Generate'}
        </button>
      </div>

      {quiz && (
        <div className="space-y-3">
          <h2 className="font-semibold">Questions</h2>
          {(quiz.questions || quiz.quiz?.questions || []).map((q, i) => (
            <div key={i} className="bg-white border rounded p-3">
              <div className="font-medium mb-2">{q.question}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options?.map((opt, j) => (
                  <label key={j} className="flex items-center gap-2 border rounded px-3 py-2">
                    <input
                      type="radio"
                      name={`q${i}`}
                      checked={answers[i] === opt}
                      onChange={() => setAnswers(a => ({ ...a, [i]: opt }))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={onEvaluate} disabled={busy} className="px-4 py-2 rounded bg-black text-white">
            {busy ? 'Scoring…' : 'Submit'}
          </button>
        </div>
      )}

      {result && (
        <pre className="bg-white border rounded p-3 text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
