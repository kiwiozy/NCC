import { Paper, Button, Group, ActionIcon, Stack, Modal } from '@mantine/core';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  IconBold, 
  IconItalic, 
  IconUnderline,
  IconFileTypePdf,
  IconPageBreak,
} from '@tabler/icons-react';
import { useState } from 'react';
import '../styles/letterhead.css';

// Single page component with its own editor
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
    editorProps: {
      attributes: {
        style: 'color: #000000 !important;',
        'data-force-light-mode': 'true',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
  });

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="we-page" data-force-light-mode="true">
      <div className="letterhead-overlay" />
      <div 
        className="we-page-content" 
        data-force-light-mode="true" 
        style={{ 
          color: '#000000',
          '--mantine-color-text': '#000000',
        } as React.CSSProperties}
      >
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

export default function LetterEditor() {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([
    `<p>Dear [Name],</p><p></p><p>Write your letter here...</p><p></p><p>Sincerely,</p><p>Walk Easy Pedorthics</p>`
  ]);

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
    
    // CRITICAL: Get content directly from DOM (TipTap's ProseMirror structure)
    // This ensures we ALWAYS have the latest content, even if React state hasn't updated yet
    // The DOM is the source of truth, not React state
    const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
    let combinedHTML: string;
    
    if (editorElements.length > 0) {
      // Get HTML directly from DOM - this is the most reliable method
      const domContent = Array.from(editorElements).map(el => {
        const html = (el as HTMLElement).innerHTML || '';
        console.log('Got HTML from DOM:', html.substring(0, 50) + '...');
        return html;
      });
      combinedHTML = domContent.join('<hr class="page-break">');
      console.log('✅ Using DOM content directly, length:', combinedHTML.length);
    } else {
      // Fallback to state if DOM query fails
      await new Promise(resolve => setTimeout(resolve, 100));
      combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
      console.warn('⚠️ DOM query failed, using state (may be stale)');
    }
    
    try {
      const response = await fetch('/api/letters/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Set PDF URL and open modal for preview
        setPdfUrl(url);
        setPreviewModalOpen(true);
      } else {
        const errorData = await response.json();
        console.error('PDF generation failed:', errorData);
        alert(`PDF generation failed: ${errorData.details || errorData.error}`);
      }
    } catch (error) {
      console.error('Error calling PDF API:', error);
      alert('Error generating PDF. Check console for details.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      {/* Toolbar (now sticky) - hide when preview modal is open */}
      <div 
        className="letters-toolbar-sticky"
        style={{ 
          display: previewModalOpen ? 'none' : 'block',
        }}
      >
        <Paper shadow="sm" p="md" withBorder>
          <Group gap="xs">
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
        </Paper>
      </div>

      {/* Multi-page editor */}
      <div className="letter-editor-shell">
        <Stack gap="xl">
          {pages.map((pageContent, index) => (
            <LetterPage
              key={index}
              pageNumber={index + 1}
              totalPages={pages.length}
              initialContent={pageContent}
              onContentChange={(content) => handlePageContentChange(index, content)}
            />
          ))}
        </Stack>
      </div>

      {/* PDF Preview Modal */}
      <Modal
        opened={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          // Clean up blob URL when modal closes
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }
        }}
        title="PDF Preview"
        size="xl"
        zIndex={300}
        styles={{
          body: {
            padding: 0,
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              flex: 1,
            }}
            title="PDF Preview"
          />
        )}
      </Modal>
    </>
  );
}

