'use client';

import { useState } from 'react';
import api from '../lib/api';

export default function QuestionBuilder({ sessionId, onAdded }) {
  const [form, setForm] = useState({
    question: '',
    A: '',
    B: '',
    C: '',
    D: '',
    answer: 'A',
    image: '',
    customTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    if (!sessionId) {
      setMessage('Create the session first before adding questions.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await api.post(`/api/assessments/${sessionId}/questions`, {
        question: form.question,
        options: { A: form.A, B: form.B, C: form.C, D: form.D },
        answer: form.answer,
        image: form.image,
        customTime: Number(form.customTime || 0)
      });
      setForm({ question: '', A: '', B: '', C: '', D: '', answer: 'A', image: '', customTime: '' });
      setMessage('Question added to the canvas.');
      onAdded();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to add question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Question</label>
        <textarea className="textarea" placeholder="Write the full question prompt" value={form.question} onChange={handleChange('question')} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <input className="input" placeholder="Option A" value={form.A} onChange={handleChange('A')} />
        <input className="input" placeholder="Option B" value={form.B} onChange={handleChange('B')} />
        <input className="input" placeholder="Option C" value={form.C} onChange={handleChange('C')} />
        <input className="input" placeholder="Option D" value={form.D} onChange={handleChange('D')} />
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <select className="input" value={form.answer} onChange={handleChange('answer')}>
          <option value="A">Answer A</option>
          <option value="B">Answer B</option>
          <option value="C">Answer C</option>
          <option value="D">Answer D</option>
        </select>
        <input className="input" placeholder="Image URL (optional)" value={form.image} onChange={handleChange('image')} />
        <input className="input" placeholder="Dedicated time in seconds" type="number" min="0" value={form.customTime} onChange={handleChange('customTime')} />
      </div>
      {message && <p className="text-sm text-slate-500">{message}</p>}
      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Adding...' : 'Add Question'}
      </button>
    </div>
  );
}
