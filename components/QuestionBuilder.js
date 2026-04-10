'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import MathText from './MathText';

const emptyForm = {
  question: '',
  A: '',
  B: '',
  C: '',
  D: '',
  answer: 'A',
  image: '',
  customTime: ''
};

function createFormState(initialValues) {
  if (!initialValues) {
    return emptyForm;
  }

  return {
    question: initialValues.question || '',
    A: initialValues.options?.A || '',
    B: initialValues.options?.B || '',
    C: initialValues.options?.C || '',
    D: initialValues.options?.D || '',
    answer: initialValues.answer || 'A',
    image: initialValues.image || '',
    customTime: initialValues.customTime ? String(initialValues.customTime) : ''
  };
}

export default function QuestionBuilder({
  sessionId,
  onAdded,
  mode = 'create',
  initialValues = null,
  onCancel = null,
  submitLabel = ''
}) {
  const [form, setForm] = useState(() => createFormState(initialValues));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(createFormState(initialValues));
    setMessage('');
  }, [initialValues]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const previewOptions = useMemo(() => ({
    A: form.A,
    B: form.B,
    C: form.C,
    D: form.D
  }), [form.A, form.B, form.C, form.D]);

  const handleSubmit = async () => {
    if (!sessionId) {
      setMessage('Create the session first before adding questions.');
      return;
    }

    setLoading(true);
    setMessage('');
    const payload = {
      question: form.question,
      options: previewOptions,
      answer: form.answer,
      image: form.image,
      customTime: Number(form.customTime || 0)
    };

    try {
      if (mode === 'edit' && initialValues?.id) {
        await api.put(`/api/assessments/${sessionId}/questions/${initialValues.id}`, payload);
        setMessage('Question updated.');
      } else {
        await api.post(`/api/assessments/${sessionId}/questions`, payload);
        setForm(emptyForm);
        setMessage('Question added to the canvas.');
      }
      onAdded?.();
      if (mode === 'edit') {
        onCancel?.();
      }
    } catch (err) {
      setMessage(err.response?.data?.error || `Unable to ${mode === 'edit' ? 'update' : 'add'} question`);
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = submitLabel || (mode === 'edit' ? 'Save Question' : 'Add Question');

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-[rgba(29,114,255,0.1)] bg-[rgba(29,114,255,0.04)] px-4 py-3 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Math formula support</p>
        <p className="mt-2">
          Use LaTeX-style syntax inside <code>$...$</code> for inline math or <code>$$...$$</code> for block formulas.
          Example: <code>{'$x^2 + y^2 = z^2$'}</code> or <code>{'$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'}</code>
        </p>
      </div>

      <div>
        <label className="label">Question</label>
        <textarea className="textarea" placeholder="Write the full question prompt" value={form.question} onChange={handleChange('question')} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="input" placeholder="Option A" value={form.A} onChange={handleChange('A')} />
        <input className="input" placeholder="Option B" value={form.B} onChange={handleChange('B')} />
        <input className="input" placeholder="Option C" value={form.C} onChange={handleChange('C')} />
        <input className="input" placeholder="Option D" value={form.D} onChange={handleChange('D')} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <select className="input" value={form.answer} onChange={handleChange('answer')}>
          <option value="A">Answer A</option>
          <option value="B">Answer B</option>
          <option value="C">Answer C</option>
          <option value="D">Answer D</option>
        </select>
        <input className="input" placeholder="Image URL (optional)" value={form.image} onChange={handleChange('image')} />
        <input className="input" placeholder="Dedicated time in seconds" type="number" min="0" value={form.customTime} onChange={handleChange('customTime')} />
      </div>

      <div className="rounded-[26px] border border-[rgba(255,138,42,0.12)] bg-white/90 p-5">
        <p className="section-kicker">Live Preview</p>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Question</p>
            <div className="mt-2 text-base text-slate-800">
              <MathText text={form.question || 'Question preview will appear here.'} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(previewOptions).map(([key, value]) => (
              <div key={key} className={`rounded-[20px] border px-4 py-3 text-sm ${form.answer === key ? 'border-[rgba(29,114,255,0.2)] bg-[rgba(29,114,255,0.08)]' : 'border-[rgba(17,33,61,0.08)] bg-slate-50'}`}>
                <div className="font-semibold text-slate-900">{key}.</div>
                <div className="mt-1 text-slate-700">
                  <MathText text={value || `Option ${key} preview`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-slate-500">{message}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? (mode === 'edit' ? 'Saving...' : 'Adding...') : actionLabel}
        </button>
        {mode === 'edit' && onCancel && (
          <button className="btn-outline" onClick={onCancel} disabled={loading}>
            Cancel Edit
          </button>
        )}
      </div>
    </div>
  );
}
