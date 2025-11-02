'use client';

import { useState, useEffect } from 'react';
import { Button, Group, Stack, Modal, Text, Box, Title, rem, useMantineColorScheme } from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { IconFileTypePdf, IconPageBreak } from '@tabler/icons-react';
import Navigation from '../components/Navigation';
import '../styles/letterhead.css';

// Single page component
function LetterPage({ 
  pageNumber, 
  totalPages,
  initialContent,
  onContentChange 
}: { 
  pageNumber: number;
  totalPages: number;
  initialContent?: string;
  onContentChange: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: pageNumber === 1 
          ? 'Start typing your letter here...'
          : `Page ${pageNumber} content...`,
      }),
    ],
    content: initialContent || `<p></p>`,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="we-page">
      <div className="letterhead-overlay" />
      <div className="we-page-content">
        <EditorContent editor={editor} />
      </div>
      <div style={{
        position: 'absolute',
        bottom: '20mm',
        right: '20mm',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
      }}>
        Page {pageNumber} of {totalPages}
      </div>
    </div>
  );
}

export default function LettersPage() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [pages, setPages] = useState<string[]>([
    `<p>Dear [Name],</p><p></p><p>Write your letter here...</p><p></p><p>Sincerely,</p><p>Walk Easy Pedorthics</p>`
  ]);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(userAgent);
    setIsSafari(isSafariBrowser);
  }, []);

  const handlePageContentChange = (pageIndex: number, content: string) => {
    setPages(prev => {
      const updated = [...prev];
      updated[pageIndex] = content;
      return updated;
    });
  };

  const handleAddPage = () => {
    setPages(prev => [...prev, '<p></p>']);
  };

  const handlePreviewPDF = async () => {
    setPdfLoading(true);
    const combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
    
    try {
      const response = await fetch('/api/letters/pdf-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      if (response.ok) {
        const { pdfId, pdfUrl } = await response.json();
        const cacheBustedUrl = `${pdfUrl}?t=${Date.now()}&r=${Math.random()}`;
        
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

  return (
    <Navigation>
      {/* Inner scroll container */}
      <div
        style={{
          height: 'calc(100vh - 80px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Sticky Letters Title */}
        <Box
          style={{
            position: 'sticky',
            position: '-webkit-sticky',
            top: 0,
            zIndex: 150,
            backgroundColor: isDark ? '#25262b' : '#ffffff',
            borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
            padding: `${rem(8)} 0`,
            margin: 0,
          }}
        >
          <Title 
            order={2} 
            style={{ 
              textAlign: 'center',
              fontSize: rem(24),
              fontWeight: 500,
              margin: 0,
            }}
          >
            Letters
          </Title>
        </Box>

        {/* Sticky Toolbar */}
        <Box
          style={{
            position: 'sticky',
            position: '-webkit-sticky',
            top: 41,
            zIndex: 140,
            backgroundColor: isDark ? '#25262b' : '#ffffff',
            borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
            padding: '1rem',
            margin: 0,
          }}
        >
          <Group gap="xs" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Button
              leftSection={<IconPageBreak size={18} />}
              onClick={handleAddPage}
              variant="light"
              size="compact-sm"
            >
              New Page
            </Button>

            <Button
              leftSection={<IconFileTypePdf size={18} />}
              onClick={handlePreviewPDF}
              loading={pdfLoading}
              ml="auto"
            >
              Preview PDF
            </Button>
          </Group>
        </Box>

        {/* Editor Content */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div className="letter-editor-shell">
            <Stack gap="xl">
              {pages.map((pageContent, index) => (
                <LetterPage
                  key={`page-${index}`}
                  pageNumber={index + 1}
                  totalPages={pages.length}
                  initialContent={pageContent}
                  onContentChange={(content) => handlePageContentChange(index, content)}
                />
              ))}
            </Stack>
          </div>
        </div>
      </div>

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
          },
        }}
      >
        {pdfUrl ? (
          isSafari ? (
            <Stack gap="md">
              <Button
                component="a"
                href={pdfUrl}
                download={`letter-${Date.now()}.pdf`}
                leftSection={<IconFileTypePdf size={18} />}
                style={{ alignSelf: 'flex-end' }}
              >
                Download PDF
              </Button>
              <object
                key={pdfUrl}
                data={pdfUrl}
                type="application/pdf"
                style={{
                  width: '100%',
                  minHeight: '80vh',
                  height: 'auto',
                  border: 'none',
                  backgroundColor: '#525659',
                }}
              >
                <Stack align="center" justify="center" style={{ height: '80vh', padding: '40px' }}>
                  <Text c="white" size="lg" mb="md">
                    Unable to display PDF preview.
                  </Text>
                  <Button
                    component="a"
                    href={pdfUrl}
                    download={`letter-${Date.now()}.pdf`}
                    size="lg"
                    leftSection={<IconFileTypePdf size={20} />}
                  >
                    Download PDF
                  </Button>
                </Stack>
              </object>
            </Stack>
          ) : (
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              style={{
                width: '100%',
                minHeight: '80vh',
                height: 'auto',
                border: 'none',
              }}
              title="PDF Preview"
            />
          )
        ) : (
          <div style={{ 
            height: '80vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '16px',
            color: '#666'
          }}>
            Generating preview…
          </div>
        )}
      </Modal>
    </Navigation>
  );
}
