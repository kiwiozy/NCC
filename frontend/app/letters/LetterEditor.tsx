import { Paper, Button, Group, ActionIcon } from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { 
  IconBold, 
  IconItalic, 
  IconUnderline,
  IconFileTypePdf
} from '@tabler/icons-react';
import '../styles/letterhead.css';

export default function LetterEditor() {
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
    
    const html = editor.getHTML();
    const response = await fetch('/api/letters/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
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
    </>
  );
}

