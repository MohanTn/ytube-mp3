import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

export default function UrlInputForm() {
  const { addUrls } = useAppState();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const urls = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (urls.length === 0) return;

    setSubmitting(true);
    try {
      await addUrls(urls);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="url-form" onSubmit={handleSubmit}>
      <textarea
        className="url-form__textarea"
        placeholder="Paste one or more YouTube URLs, one per line…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
      />
      <button type="submit" className="button button--primary" disabled={submitting || !text.trim()}>
        {submitting ? 'Adding…' : 'Add to Queue'}
      </button>
    </form>
  );
}
