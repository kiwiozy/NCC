'use client';

import { useState } from 'react';
import { 
  Container, 
  Paper, 
  Title, 
  TextInput, 
  Group, 
  Button, 
  Stack,
  rem,
  Divider,
  Modal,
  Text,
  LoadingOverlay,
} from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { 
  IconBold, 
  IconItalic, 
  IconUnderline as IconUnderlineIcon,
  IconStrikethrough,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconList,
  IconListNumbers,
  IconH1,
  IconH2,
  IconH3,
  IconMail,
  IconFileTypePdf,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function LetterComposer() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailModalOpened, setEmailModalOpened] = useState(false);

  const editor = useEditor({
    immediatelyRender: false, // Fix for Next.js SSR
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: `
      <p><strong>Walk Easy Pedorthics</strong></p>
      <p>123 Main Street</p>
      <p>City, State, ZIP</p>
      <p><br></p>
      <p>${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p><br></p>
      <p>Dear [Recipient],</p>
      <p><br></p>
      <p>Start writing your letter here...</p>
      <p><br></p>
      <p>Sincerely,</p>
      <p><br></p>
      <p>Walk Easy Pedorthics</p>
    `,
    editorProps: {
      attributes: {
        style: 'min-height: 500px; padding: 16px; outline: none;',
      },
    },
  });

  const MenuBar = () => {
    if (!editor) {
      return null;
    }

    return (
      <Group gap="xs" p="sm" style={{ borderBottom: '1px solid #dee2e6', flexWrap: 'wrap' }}>
        {/* Text Formatting */}
        <Button
          size="sm"
          variant={editor.isActive('bold') ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <IconBold size={16} />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('italic') ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <IconItalic size={16} />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('underline') ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <IconUnderlineIcon size={16} />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('strike') ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <IconStrikethrough size={16} />
        </Button>

        <Divider orientation="vertical" />

        {/* Headings */}
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 1 }) ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <IconH1 size={16} />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 2 }) ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <IconH2 size={16} />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 3 }) ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <IconH3 size={16} />
        </Button>

        <Divider orientation="vertical" />

        {/* Alignment */}
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'left' }) ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        >
          <IconAlignLeft size={16} />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'center' }) ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        >
          <IconAlignCenter size={16} />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'right' }) ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        >
          <IconAlignRight size={16} />
        </Button>

        <Divider orientation="vertical" />

        {/* Lists */}
        <Button
          size="sm"
          variant={editor.isActive('bulletList') ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <IconList size={16} />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('orderedList') ? 'filled' : 'default'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <IconListNumbers size={16} />
        </Button>

        <Divider orientation="vertical" />

        {/* Text Color */}
        <input
          type="color"
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          style={{
            width: '40px',
            height: '32px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          title="Text Color"
        />
      </Group>
    );
  };

  const handleGeneratePDF = async () => {
    if (!editor) return;

    const html = editor.getHTML();

    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/letters/generate-pdf/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html_content: html,
          subject: subject || 'Letter',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${subject || 'letter'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notifications.show({
        title: 'Success',
        message: 'PDF downloaded successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to generate PDF',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!editor) return;

    if (!recipientEmail || !recipientName || !subject) {
      notifications.show({
        title: 'Missing Information',
        message: 'Please fill in recipient email, name, and subject',
        color: 'orange',
      });
      return;
    }

    const html = editor.getHTML();

    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/letters/email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html_content: html,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: subject,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send email');
      }

      notifications.show({
        title: 'Success',
        message: 'Email sent successfully with PDF attachment',
        color: 'green',
      });

      setEmailModalOpened(false);
      setRecipientEmail('');
      setRecipientName('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to send email',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (editor && confirm('Are you sure you want to clear the letter?')) {
      editor.commands.setContent('');
    }
  };

  return (
    <Container size="xl" px="xl">
      <LoadingOverlay visible={loading} />
      
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={3}>Letter Composer</Title>
          <Group gap="sm">
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button
              variant="light"
              leftSection={<IconFileTypePdf size={16} />}
              onClick={handleGeneratePDF}
            >
              Download PDF
            </Button>
            <Button
              leftSection={<IconMail size={16} />}
              onClick={() => setEmailModalOpened(true)}
            >
              Email Letter
            </Button>
          </Group>
        </Group>

        {/* Subject */}
        <TextInput
          label="Subject / Letter Title"
          placeholder="Enter letter subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          size="md"
        />

        {/* Editor */}
        <Paper shadow="sm" withBorder style={{ overflow: 'hidden' }}>
          <MenuBar />
          <div style={{ 
            backgroundColor: '#fff', 
            minHeight: '500px',
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            lineHeight: '1.6',
          }}>
            <EditorContent editor={editor} />
          </div>
        </Paper>
      </Stack>

      {/* Email Modal */}
      <Modal
        opened={emailModalOpened}
        onClose={() => setEmailModalOpened(false)}
        title="Email Letter with PDF Attachment"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            The letter will be converted to PDF and sent as an email attachment
          </Text>

          <TextInput
            label="Recipient Name"
            placeholder="John Smith"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            required
          />

          <TextInput
            label="Recipient Email"
            placeholder="john.smith@example.com"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
          />

          <TextInput
            label="Email Subject"
            placeholder={subject || 'Letter from Walk Easy Pedorthics'}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="light" onClick={() => setEmailModalOpened(false)}>
              Cancel
            </Button>
            <Button
              leftSection={<IconMail size={16} />}
              onClick={handleSendEmail}
              loading={loading}
            >
              Send Email
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

