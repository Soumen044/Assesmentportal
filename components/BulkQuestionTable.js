'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import MathText from './MathText';

function mapQuestionToRow(question) {
  return {
    id: question.id,
    question: question.question || '',
    A: question.options?.A || '',
    B: question.options?.B || '',
    C: question.options?.C || '',
    D: question.options?.D || '',
    answer: question.answer || 'A',
    customTime: question.customTime ? String(question.customTime) : '',
    image: question.image || ''
  };
}

export default function BulkQuestionTable({
  sessionId,
  questions,
  onSaved,
  onDelete,
  onDuplicate,
  onEdit
}) {
  const [rows, setRows] = useState([]);
  const [savingId, setSavingId] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setRows((questions || []).map(mapQuestionToRow));
  }, [questions]);

  const dirtyCount = useMemo(() => rows.length, [rows]);

  const updateRow = (questionId, updates) => {
    setRows((current) => current.map((row) => (row.id === questionId ? { ...row, ...updates } : row)));
  };

  const saveRow = async (row) => {
    setSavingId(row.id);
    setMessage('');
    try {
      await api.put(`/api/assessments/${sessionId}/questions/${row.id}`, {
        question: row.question,
        options: { A: row.A, B: row.B, C: row.C, D: row.D },
        answer: row.answer,
        customTime: Number(row.customTime || 0),
        image: row.image || ''
      });
      setMessage(`Saved Q${rows.findIndex((item) => item.id === row.id) + 1}.`);
      onSaved?.();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to save question');
    } finally {
      setSavingId('');
    }
  };

  const saveAll = async () => {
    setSavingAll(true);
    setMessage('');
    try {
      for (const row of rows) {
        // eslint-disable-next-line no-await-in-loop
        await api.put(`/api/assessments/${sessionId}/questions/${row.id}`, {
          question: row.question,
          options: { A: row.A, B: row.B, C: row.C, D: row.D },
          answer: row.answer,
          customTime: Number(row.customTime || 0),
          image: row.image || ''
        });
      }
      setMessage('Bulk question updates saved.');
      onSaved?.();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to save all questions');
    } finally {
      setSavingAll(false);
    }
  };

  const uploadRowImage = async (rowId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await api.post('/api/assessments/question-image/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateRow(rowId, { image: response.data.imageUrl || '' });
      setMessage('Question image uploaded.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Unable to upload image');
    }
  };

  return (
    <div className="card-strong">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="badge-blue">Bulk Edit Grid</div>
          <h3 className="section-title mt-3 text-2xl">Organization-scale question editing</h3>
          <p className="mt-2 text-sm text-slate-600">
            Update every question in a single table, upload images, or hand off a row into the detailed editor.
          </p>
        </div>
        <button className="btn-primary" onClick={saveAll} disabled={savingAll || !dirtyCount}>
          {savingAll ? 'Saving All...' : 'Save All Rows'}
        </button>
      </div>

      {message && <div className="glass-banner mt-4 text-sm text-slate-700">{message}</div>}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[1200px] w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(17,33,61,0.08)] text-left text-slate-500">
              <th className="px-3 py-3 font-medium">Q</th>
              <th className="px-3 py-3 font-medium">Question</th>
              <th className="px-3 py-3 font-medium">Options</th>
              <th className="px-3 py-3 font-medium">Answer</th>
              <th className="px-3 py-3 font-medium">Time</th>
              <th className="px-3 py-3 font-medium">Image</th>
              <th className="px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-[rgba(17,33,61,0.06)] align-top">
                <td className="px-3 py-4 font-semibold text-slate-900">{index + 1}</td>
                <td className="px-3 py-4 min-w-[280px]">
                  <textarea
                    className="textarea min-h-[120px]"
                    value={row.question}
                    onChange={(event) => updateRow(row.id, { question: event.target.value })}
                  />
                  <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                    <MathText text={row.question || 'Question preview'} />
                  </div>
                </td>
                <td className="px-3 py-4 min-w-[260px]">
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map((key) => (
                      <div key={key}>
                        <input
                          className="input"
                          value={row[key]}
                          placeholder={`Option ${key}`}
                          onChange={(event) => updateRow(row.id, { [key]: event.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-4">
                  <select className="input min-w-[90px]" value={row.answer} onChange={(event) => updateRow(row.id, { answer: event.target.value })}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </td>
                <td className="px-3 py-4">
                  <input
                    className="input min-w-[120px]"
                    type="number"
                    min="0"
                    value={row.customTime}
                    onChange={(event) => updateRow(row.id, { customTime: event.target.value })}
                  />
                </td>
                <td className="px-3 py-4 min-w-[220px]">
                  <div className="space-y-2">
                    <input className="input" value={row.image} placeholder="Image URL or uploaded data" onChange={(event) => updateRow(row.id, { image: event.target.value })} />
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          uploadRowImage(row.id, file);
                        }
                        event.target.value = '';
                      }}
                    />
                    {row.image && <img src={row.image} alt="Question" className="max-h-24 rounded-2xl object-contain" />}
                  </div>
                </td>
                <td className="px-3 py-4 min-w-[220px]">
                  <div className="flex flex-col gap-2">
                    <button className="btn-primary" onClick={() => saveRow(row)} disabled={savingId === row.id}>
                      {savingId === row.id ? 'Saving...' : 'Save Row'}
                    </button>
                    <button className="btn-outline" onClick={() => onEdit?.(questions.find((item) => item.id === row.id) || null)}>
                      Open Detailed Edit
                    </button>
                    <button className="btn-outline" onClick={() => onDuplicate?.(row.id)}>Duplicate</button>
                    <button className="btn-accent" onClick={() => onDelete?.(row.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={7}>No questions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
