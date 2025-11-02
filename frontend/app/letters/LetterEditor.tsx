import { Paper, Button, Group, ActionIcon, Stack, Modal, Text, Box } from '@mantine/core';
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
import { useState, useEffect } from 'react';
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
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
  });

  // CRITICAL: Sync editor content with initialContent prop changes
  // This ensures the editor always reflects the latest state
  // emitUpdate: false prevents infinite loops
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

export default function LetterEditor() {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfKey, setPdfKey] = useState<string>(''); // Unique key to force iframe/object remount
  const [modalOpen, setModalOpen] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [pages, setPages] = useState<string[]>([
    `<p>Dear [Name],</p><p></p><p>Write your letter here...</p><p></p><p>Sincerely,</p><p>Walk Easy Pedorthics</p>`
  ]);

  // Detect Safari browser
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
    
    // CRITICAL: Clear PDF URL and key FIRST to force unmount
    setPdfUrl(null);
    setPdfKey('');
    
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
    
    console.log('Generating PDF with final content:', combinedHTML.substring(0, 200) + '...');
    console.log('Content length:', combinedHTML.length);
    
    try {
      // Generate PDF and get URL
      const response = await fetch('/api/letters/pdf-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      if (response.ok) {
        const { pdfId, pdfUrl } = await response.json();
        
        // CRITICAL: Add timestamp AND random string to URL to prevent aggressive caching
        // This ensures each preview gets a fresh PDF, even if content appears similar
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const cacheBustedUrl = `${pdfUrl}?t=${timestamp}&r=${random}`;
        
        // Generate unique key that includes timestamp and random to force remount
        const uniqueKey = `pdf-${timestamp}-${random}`;
        
        console.log('New PDF URL with cache-busting:', cacheBustedUrl);
        console.log('Unique key:', uniqueKey);
        
        // Open modal FIRST (ChatGPT recommendation to avoid Safari hidden iframe bug)
        setModalOpen(true);
        
        // Then set the PDF URL and key after next animation frame to force fresh load
        requestAnimationFrame(() => {
          setPdfKey(uniqueKey);
          requestAnimationFrame(() => {
            setPdfUrl(cacheBustedUrl);
            setPdfLoading(false);
          });
        });
      } else {
        const errorData = await response.json();
        console.error('PDF generation failed:', errorData);
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
    // Clear PDF URL and key to force fresh load on next preview
    setPdfUrl(null);
    setPdfKey('');
  };

  return (
    <>
      {/* Fixed Toolbar - Safari compatible */}
      <Box
        style={{
          position: 'sticky',
          position: '-webkit-sticky', // Safari support
          top: 41, // Below Letters title (41px fixed)
          zIndex: 140,
          backgroundColor: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
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

      {/* Scrollable Multi-page editor */}
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
        {pdfUrl && pdfKey ? (
          isSafari ? (
            // Safari: Use object tag + download button
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
                key={pdfKey}
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
            // Chrome/Edge: Use native iframe viewer with scrollable content
            <iframe
              key={pdfKey}
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
    </>
  );
}

