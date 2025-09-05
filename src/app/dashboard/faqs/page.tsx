// src/app/dashboard/faqs/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Faq {
  id: string;
  question: string;
  answer: string;
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/faqs')
      .then(res => res.json())
      .then(data => {
        setFaqs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/faqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });
    if (!res.ok) {
      setError('Failed to add FAQ');
      return;
    }
    const newFaq = await res.json();
    setFaqs([newFaq, ...faqs]);
    setQuestion('');
    setAnswer('');
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">FAQ Editor</h1>
      <form onSubmit={handleAdd} className="mb-6 flex gap-2 items-end">
        <div>
          <label className="block text-sm">Question</label>
          <input value={question} onChange={e => setQuestion(e.target.value)} required className="input input-bordered w-full" placeholder="FAQ question" title="FAQ question" />
        </div>
        <div>
          <label className="block text-sm">Answer</label>
          <input value={answer} onChange={e => setAnswer(e.target.value)} required className="input input-bordered w-full" placeholder="FAQ answer" title="FAQ answer" />
        </div>
        <Button type="submit">Add</Button>
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : faqs.length === 0 ? (
        <div>No FAQs yet.</div>
      ) : (
        <ul className="space-y-2">
          {faqs.map(faq => (
            <li key={faq.id} className="border rounded p-3">
              <strong>Q:</strong> {faq.question}<br />
              <strong>A:</strong> {faq.answer}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
