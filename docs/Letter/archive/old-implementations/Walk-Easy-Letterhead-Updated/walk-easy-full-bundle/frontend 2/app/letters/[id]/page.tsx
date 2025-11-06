// frontend/app/letters/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import '@/styles/letterhead.css';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import PageBreak from '@/components/tiptap/PageBreak';

export default function LetterEditorPage({ params }: { params: { id: string } }) {
  const [initialContent, setInitialContent] = useState<string>('<p>Dear …</p>');

  useEffect(() => {
    fetch(`http://localhost:8000/api/letters/${params.id}/`)
      .then(res => res.json())
      .then(data => {
        setInitialContent(data.html || '<p>Dear …</p>');
      });
  }, [params.id]);

  const editor = useEditor({
    extensions: [StarterKit, PageBreak],
    content: initialContent,
  });

  const handleSave = async () => {
    const html = editor?.getHTML() ?? '';
    await fetch(`http://localhost:8000/api/letters/${params.id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
  };

  const handleGeneratePdf = async () => {
    const html = editor?.getHTML() ?? '';
    const res = await fetch(`/api/letters/${params.id}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="letter-editor-shell">
      <div className="a4-page">
        <div className="letterhead-overlay" style={{ backgroundImage: "url('/letterhead.png')" }} />
        <div className="editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <button onClick={handleSave}>Save</button>
        <button onClick={handleGeneratePdf}>Generate PDF</button>
      </div>
    </div>
  );
}
