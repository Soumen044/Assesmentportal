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
  image: ''
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
    image: initialValues.image || ''
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
  const [imageUploading, setImageUploading] = useState(false);

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

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImageUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await api.post('/api/assessments/question-image/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm((prev) => ({ ...prev, image: response.data.imageUrl || '' }));
      setMessage('Question image uploaded.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to upload image');
    } finally {
      setImageUploading(false);
      event.target.value = '';
    }
  };

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
      image: form.image
    };

    try {
      if (mode === 'edit' && initialValues?.id) {
        const response = await api.put(`/api/assessments/${sessionId}/questions/${initialValues.id}`, payload);
        setMessage('Question updated.');
        onAdded?.(response.data.questions || []);
      } else {
        const response = await api.post(`/api/assessments/${sessionId}/questions`, payload);
        setForm(emptyForm);
        setMessage('Question added to the canvas.');
        onAdded?.(response.data.questions || []);
      }
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
    <div className="space-y-2">
      <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-[rgba(29,114,255,0.12)] bg-[rgba(255,255,255,0.96)] px-3 py-2 shadow-[0_12px_30px_rgba(17,33,61,0.06)] backdrop-blur">
        <div className="min-w-0">
          <p className="section-kicker">{mode === 'edit' ? 'Editing Question' : 'Manual Builder'}</p>
          <p className="mt-1 text-compact text-slate-500">Keep the main actions pinned while you write, preview, and save.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (mode === 'edit' ? 'Saving...' : 'Adding...') : actionLabel}
          </button>
          {mode === 'edit' && onCancel && (
            <button className="btn-outline" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="rounded-[16px] border border-[rgba(29,114,255,0.1)] bg-[rgba(29,114,255,0.04)] px-3 py-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-900">Math formula support</p>
        <p className="mt-1.5">
          Use LaTeX-style syntax inside <code>$...$</code> for inline math or <code>$$...$$</code> for block formulas.
          Example: <code>{'$x^2 + y^2 = z^2$'}</code> or <code>{'$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'}</code>
        </p>
      </div>

      <div>
        <label className="label">Question</label>
        <textarea className="textarea" placeholder="Write the full question prompt" value={form.question} onChange={handleChange('question')} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <input className="input" placeholder="Option A" value={form.A} onChange={handleChange('A')} />
        <input className="input" placeholder="Option B" value={form.B} onChange={handleChange('B')} />
        <input className="input" placeholder="Option C" value={form.C} onChange={handleChange('C')} />
        <input className="input" placeholder="Option D" value={form.D} onChange={handleChange('D')} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <select className="input" value={form.answer} onChange={handleChange('answer')}>
          <option value="A">Answer A</option>
          <option value="B">Answer B</option>
          <option value="C">Answer C</option>
          <option value="D">Answer D</option>
        </select>
        <input className="input" placeholder="Image URL (optional)" value={form.image} onChange={handleChange('image')} />
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input className="input" type="file" accept="image/*" onChange={handleImageUpload} disabled={imageUploading} />
        <button className="btn-outline" type="button" onClick={() => setForm((prev) => ({ ...prev, image: '' }))} disabled={!form.image}>
          Clear Image
        </button>
      </div>
      {imageUploading && <p className="text-sm text-slate-500">Uploading image...</p>}
      {form.image && (
        <div className="rounded-[16px] border border-[rgba(17,33,61,0.08)] bg-slate-50 p-3">
          <p className="section-kicker">Image Preview</p>
          <img src={form.image} alt="Question preview" className="mt-2 max-h-40 rounded-[14px] object-contain" />
        </div>
      )}

      <div className="rounded-[16px] border border-[rgba(255,138,42,0.12)] bg-white/90 p-3">
        <p className="section-kicker">Live Preview</p>
        <div className="mt-3 space-y-2.5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Question</p>
            <div className="mt-1.5 text-sm text-slate-800">
              <MathText text={form.question || 'Question preview will appear here.'} />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(previewOptions).map(([key, value]) => (
              <div key={key} className={`rounded-[14px] border px-3 py-2 text-xs ${form.answer === key ? 'border-[rgba(29,114,255,0.2)] bg-[rgba(29,114,255,0.08)]' : 'border-[rgba(17,33,61,0.08)] bg-slate-50'}`}>
                <div className="font-semibold text-slate-900">{key}.</div>
                <div className="mt-1 text-slate-700">
                  <MathText text={value || `Option ${key} preview`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {message && <p className="text-xs text-slate-500">{message}</p>}
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
