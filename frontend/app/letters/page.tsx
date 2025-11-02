'use client';

import { useState } from 'react';
import { Button, Stack, Modal, Container, Title } from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { IconFileTypePdf } from '@tabler/icons-react';
import Navigation from '../components/Navigation';
import '../styles/letterhead.css';

export default function LettersPage() {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Start typing your letter here...',
      }),
    ],
    content: '<p></p>',
  });

  const handlePreviewPDF = async () => {
    if (!editor) return;
    
    setPdfLoading(true);
    const html = editor.getHTML();
    
    try {
      const response = await fetch('/api/letters/pdf-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });

      if (response.ok) {
        const { pdfUrl: url } = await response.json();
        const cacheBustedUrl = `${url}?t=${Date.now()}&r=${Math.random()}`;
        setModalOpen(true);
        requestAnimationFrame(() => {
          setPdfUrl(cacheBustedUrl);
          setPdfLoading(false);
        });
      } else {
        const errorData = await response.json();
        alert(`PDF generation failed: ${errorData.details || errorData.error}`);
        setPdfLoading(false);
      }
    } catch (error) {
      console.error('Error calling PDF API:', error);
      alert('Error generating PDF. Check console for details.');
      setPdfLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPdfUrl(null);
  };

  if (!editor) {
    return <Navigation><div>Loading editor...</div></Navigation>;
  }

  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Title order={2} mb="md">Letters</Title>
        
        <Stack gap="md">
          <Button
            leftSection={<IconFileTypePdf size={18} />}
            onClick={handlePreviewPDF}
            loading={pdfLoading}
          >
            Preview PDF
          </Button>

          <div style={{ 
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '1rem',
            minHeight: '400px',
            backgroundColor: '#fff',
          }}>
            <EditorContent editor={editor} />
          </div>
        </Stack>
      </Container>

      {/* PDF Preview Modal */}
      <Modal
        opened={modalOpen}
        onClose={handleCloseModal}
        title="Letter Preview"
        size="xl"
        padding="md"
        styles={{
          body: {
            maxHeight: '85vh',
            overflow: 'auto',
            padding: 0,
          },
        }}
      >
        {pdfUrl && (
          <div style={{ width: '100%', height: '80vh' }}>
            {typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ? (
              // Safari: Use object tag with download fallback
              <>
                <object
                  data={pdfUrl}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  style={{ minHeight: '600px' }}
                >
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>PDF preview not available in Safari.</p>
                    <Button
                      component="a"
                      href={pdfUrl}
                      download
                      leftSection={<IconFileTypePdf size={18} />}
                    >
                      Download PDF
                    </Button>
                  </div>
                </object>
              </>
            ) : (
              // Chrome/Other browsers: Use iframe
              <iframe
                src={pdfUrl}
                width="100%"
                height="100%"
                style={{ minHeight: '600px', border: 'none' }}
                key={pdfUrl}
              />
            )}
          </div>
        )}
      </Modal>
    </Navigation>
  );
}
