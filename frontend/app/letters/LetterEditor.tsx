import { Paper, Button, Group, ActionIcon, Stack, Modal, Text } from '@mantine/core';
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
    
    // Combine all pages into a single HTML string with page markers
    const combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
    
    try {
      // Generate PDF and get URL
      const response = await fetch('/api/letters/pdf-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      if (response.ok) {
        const { pdfId, pdfUrl } = await response.json();
        
        // Open modal FIRST (ChatGPT recommendation to avoid Safari hidden iframe bug)
        setModalOpen(true);
        
        // Then set the PDF URL after next animation frame
        requestAnimationFrame(() => {
          setPdfUrl(pdfUrl);
          setPdfLoading(false);
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
    setPdfUrl(null);
  };

  return (
    <>
      {/* Toolbar */}
      <Paper shadow="sm" p="md" mb="md" withBorder>
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
        opened={modalOpen}
        onClose={handleCloseModal}
        title="Letter Preview"
        size="xl"
        padding="md"
      >
        {pdfUrl ? (
          isSafari ? (
            // Safari: Use object tag + download button
            <Stack gap="md" style={{ height: '80vh' }}>
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
                data={pdfUrl}
                type="application/pdf"
                style={{
                  width: '100%',
                  flex: 1,
                  border: 'none',
                  backgroundColor: '#525659',
                }}
              >
                <Stack align="center" justify="center" style={{ height: '100%', padding: '40px' }}>
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
            // Chrome/Edge: Use native iframe viewer
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              style={{
                width: '100%',
                height: '80vh',
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

