import { Paper, Button, Group, ActionIcon, Modal } from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { 
  IconBold, 
  IconItalic, 
  IconUnderline,
  IconFileTypePdf
} from '@tabler/icons-react';
import { useState } from 'react';
import '../styles/letterhead.css';

export default function LetterEditor() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: `
      <p>Dear [Name],</p>
      <p></p>
      <p>Write your letter here...</p>
      <p></p>
      <p>Sincerely,</p>
      <p>Walk Easy Pedorthics</p>
    `,
    immediatelyRender: false, // Required to avoid SSR hydration issues
  });

  const handlePreviewPDF = async () => {
    if (!editor) return;
    
    setPdfLoading(true);
    const html = editor.getHTML();
    
    try {
      const response = await fetch('/api/letters/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setModalOpen(true);
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

  const handleCloseModal = () => {
    setModalOpen(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <>
      {/* Toolbar */}
      <Paper shadow="sm" p="md" mb="md" withBorder>
        <Group gap="xs">
          <ActionIcon
            variant={editor.isActive('bold') ? 'filled' : 'default'}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <IconBold size={18} />
          </ActionIcon>
          
          <ActionIcon
            variant={editor.isActive('italic') ? 'filled' : 'default'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <IconItalic size={18} />
          </ActionIcon>
          
          <ActionIcon
            variant={editor.isActive('underline') ? 'filled' : 'default'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <IconUnderline size={18} />
          </ActionIcon>

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

      {/* Editor */}
      <div className="letter-editor-shell">
        <div className="a4-page">
          <div className="letterhead-overlay" />
          <div className="editor-content">
            <EditorContent editor={editor} />
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
      >
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '80vh',
              border: 'none',
            }}
            title="PDF Preview"
          />
        )}
      </Modal>
    </>
  );
}

