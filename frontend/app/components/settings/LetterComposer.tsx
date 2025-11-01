'use client';

import { useState, useEffect } from 'react';
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
  Box,
  LoadingOverlay,
  Select,
  NumberInput,
} from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import FontFamily from '@tiptap/extension-font-family';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Extension } from '@tiptap/core';

// Custom Font Size Extension
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});
import { 
  IconBold, 
  IconItalic, 
  IconUnderline as IconUnderlineIcon,
  IconStrikethrough,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
  IconList,
  IconListNumbers,
  IconH1,
  IconH2,
  IconH3,
  IconMail,
  IconFileTypePdf,
  IconTrash,
  IconLink,
  IconUnlink,
  IconPhoto,
  IconTable,
  IconHighlight,
  IconClearFormatting,
  IconSubscript,
  IconSuperscript,
  IconQuote,
  IconSeparator,
  IconCode,
  IconCodeDots,
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
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: `
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;">${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;"><br></span></p>
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;">Dear [Recipient],</span></p>
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;"><br></span></p>
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;">Start writing your letter here...</span></p>
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;"><br></span></p>
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;">Sincerely,</span></p>
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;"><br></span></p>
      <p><span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, Verdana, sans-serif;">Walk Easy Pedorthics</span></p>
    `,
    editorProps: {
      attributes: {
        style: 'min-height: 500px; outline: none;',
      },
    },
  });

  const MenuBar = () => {
    if (!editor) {
      return null;
    }

    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleMouseEnter = (section: string) => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        setCloseTimeout(null);
      }
      setExpandedSection(section);
    };

    const handleMouseLeave = () => {
      const timeout = setTimeout(() => {
        setExpandedSection(null);
      }, 300); // 300ms delay before closing
      setCloseTimeout(timeout);
    };

    const addLink = () => {
      const url = prompt('Enter URL');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    };

    const addImage = () => {
      const url = prompt('Enter image URL');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    };

    return (
      <Group gap="xs" p="sm">
        {/* Format Section */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => handleMouseEnter('format')}
          onMouseLeave={handleMouseLeave}
        >
          <Button
            size="sm"
            variant="light"
            leftSection={<IconBold size={16} />}
            style={{ minWidth: '90px' }}
          >
            Format
          </Button>
          {expandedSection === 'format' && (
            <Paper
              shadow="md"
              p="xs"
              onMouseEnter={() => handleMouseEnter('format')}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                zIndex: 100000,
                minWidth: '400px',
              }}
            >
              <Group gap="xs">
                <Button size="sm" variant={editor.isActive('bold') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><IconBold size={16} /></Button>
                <Button size="sm" variant={editor.isActive('italic') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><IconItalic size={16} /></Button>
                <Button size="sm" variant={editor.isActive('underline') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><IconUnderlineIcon size={16} /></Button>
                <Button size="sm" variant={editor.isActive('strike') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strike"><IconStrikethrough size={16} /></Button>
                <Button size="sm" variant={editor.isActive('subscript') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscript"><IconSubscript size={16} /></Button>
                <Button size="sm" variant={editor.isActive('superscript') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript"><IconSuperscript size={16} /></Button>
                <Button size="sm" variant={editor.isActive('highlight') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight"><IconHighlight size={16} /></Button>
                <Button size="sm" variant="default" onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Clear"><IconClearFormatting size={16} /></Button>
              </Group>
            </Paper>
          )}
        </div>

        {/* Font Section */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => handleMouseEnter('font')}
          onMouseLeave={handleMouseLeave}
        >
          <Button
            size="sm"
            variant="light"
            style={{ minWidth: '80px' }}
          >
            Font
          </Button>
          {expandedSection === 'font' && (
            <Paper
              shadow="md"
              p="xs"
              onMouseEnter={() => handleMouseEnter('font')}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                zIndex: 100000,
                minWidth: '400px',
              }}
            >
              <Group gap="xs">
                <Select
                  size="xs"
                  placeholder="Font Family"
                  value={editor.getAttributes('textStyle').fontFamily || ''}
                  onChange={(value) => {
                    if (value) {
                      editor.chain().focus().setMark('textStyle', { fontFamily: value }).run();
                    } else {
                      editor.chain().focus().unsetMark('textStyle').run();
                    }
                  }}
                  data={[
                    { value: '', label: 'Default (SF Pro)' },
                    { value: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif', label: 'SF Pro (System)' },
                    { value: 'ui-rounded, "SF Compact Rounded", system-ui, sans-serif', label: 'SF Compact Rounded' },
                    { value: 'ui-monospace, "SF Mono", Menlo, Monaco, monospace', label: 'SF Mono' },
                    { value: 'Arial', label: 'Arial' },
                    { value: 'Helvetica', label: 'Helvetica' },
                    { value: 'Times New Roman', label: 'Times New Roman' },
                    { value: 'Georgia', label: 'Georgia' },
                    { value: 'Courier New', label: 'Courier New' },
                    { value: 'Verdana', label: 'Verdana' },
                  ]}
                  style={{ width: '180px' }}
                  clearable
                  comboboxProps={{ zIndex: 999999 }}
                />
                <Select
                  size="xs"
                  placeholder="Size"
                  value={editor.getAttributes('textStyle').fontSize || ''}
                  onChange={(value) => {
                    if (value) {
                      editor.chain().focus().setMark('textStyle', { fontSize: value }).run();
                    } else {
                      editor.chain().focus().unsetMark('textStyle').run();
                    }
                  }}
                  data={[
                    { value: '', label: 'Default' },
                    { value: '10px', label: '10px' },
                    { value: '12px', label: '12px' },
                    { value: '14px', label: '14px' },
                    { value: '16px', label: '16px' },
                    { value: '18px', label: '18px' },
                    { value: '20px', label: '20px' },
                    { value: '24px', label: '24px' },
                  ]}
                  style={{ width: '120px' }}
                  clearable
                  comboboxProps={{ zIndex: 999999 }}
                />
                <Divider orientation="vertical" />
                <input type="color" onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || '#000000'} style={{ width: '40px', height: '32px', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }} title="Text Color" />
                <input type="color" onInput={(e) => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()} value="#ffff00" style={{ width: '40px', height: '32px', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }} title="Highlight" />
              </Group>
            </Paper>
          )}
        </div>

        {/* Style Section */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => handleMouseEnter('style')}
          onMouseLeave={handleMouseLeave}
        >
          <Button
            size="sm"
            variant="light"
            leftSection={<IconH1 size={16} />}
            style={{ minWidth: '80px' }}
          >
            Style
          </Button>
          {expandedSection === 'style' && (
            <Paper
              shadow="md"
              p="xs"
              onMouseEnter={() => handleMouseEnter('style')}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                zIndex: 100000,
                minWidth: '350px',
              }}
            >
              <Group gap="xs">
                <Button size="sm" variant={editor.isActive('heading', { level: 1 }) ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><IconH1 size={16} /></Button>
                <Button size="sm" variant={editor.isActive('heading', { level: 2 }) ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><IconH2 size={16} /></Button>
                <Button size="sm" variant={editor.isActive('heading', { level: 3 }) ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><IconH3 size={16} /></Button>
                <Button size="sm" variant={editor.isActive('blockquote') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><IconQuote size={16} /></Button>
                <Button size="sm" variant={editor.isActive('code') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleCode().run()} title="Code"><IconCode size={16} /></Button>
                <Button size="sm" variant={editor.isActive('codeBlock') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block"><IconCodeDots size={16} /></Button>
              </Group>
            </Paper>
          )}
        </div>

        {/* Align Section */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => handleMouseEnter('align')}
          onMouseLeave={handleMouseLeave}
        >
          <Button
            size="sm"
            variant="light"
            leftSection={<IconAlignLeft size={16} />}
            style={{ minWidth: '80px' }}
          >
            Align
          </Button>
          {expandedSection === 'align' && (
            <Paper
              shadow="md"
              p="xs"
              onMouseEnter={() => handleMouseEnter('align')}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                zIndex: 100000,
                minWidth: '350px',
              }}
            >
              <Group gap="xs">
                <Button size="sm" variant={editor.isActive({ textAlign: 'left' }) ? 'filled' : 'default'} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Left"><IconAlignLeft size={16} /></Button>
                <Button size="sm" variant={editor.isActive({ textAlign: 'center' }) ? 'filled' : 'default'} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Center"><IconAlignCenter size={16} /></Button>
                <Button size="sm" variant={editor.isActive({ textAlign: 'right' }) ? 'filled' : 'default'} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Right"><IconAlignRight size={16} /></Button>
                <Button size="sm" variant={editor.isActive({ textAlign: 'justify' }) ? 'filled' : 'default'} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify"><IconAlignJustified size={16} /></Button>
                <Divider orientation="vertical" />
                <Button size="sm" variant={editor.isActive('bulletList') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullets"><IconList size={16} /></Button>
                <Button size="sm" variant={editor.isActive('orderedList') ? 'filled' : 'default'} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbers"><IconListNumbers size={16} /></Button>
              </Group>
            </Paper>
          )}
        </div>

        {/* Insert Section */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => handleMouseEnter('insert')}
          onMouseLeave={handleMouseLeave}
        >
          <Button
            size="sm"
            variant="light"
            leftSection={<IconLink size={16} />}
            style={{ minWidth: '80px' }}
          >
            Insert
          </Button>
          {expandedSection === 'insert' && (
            <Paper
              shadow="md"
              p="xs"
              onMouseEnter={() => handleMouseEnter('insert')}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                zIndex: 100000,
                minWidth: '400px',
              }}
            >
              <Group gap="xs">
                <Button size="sm" variant={editor.isActive('link') ? 'filled' : 'default'} onClick={addLink} title="Link"><IconLink size={16} /></Button>
                <Button size="sm" variant="default" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} title="Unlink"><IconUnlink size={16} /></Button>
                <Button size="sm" variant="default" onClick={addImage} title="Image"><IconPhoto size={16} /></Button>
                <Button size="sm" variant="default" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table"><IconTable size={16} /></Button>
                <Button size="sm" variant="default" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="HR"><IconSeparator size={16} /></Button>
              </Group>
            </Paper>
          )}
        </div>
      </Group>
    );
  };

  const handleGeneratePDF = async () => {
    if (!editor) return;

    const html = editor.getHTML();
    
    // Debug: Log the HTML being sent
    console.log('='.repeat(80));
    console.log('HTML being sent to PDF generator:');
    console.log(html);
    console.log('='.repeat(80));

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
          <Box style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            <MenuBar />
          </Box>
          <div style={{ 
            backgroundColor: '#fff',
            minHeight: '500px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, Verdana, sans-serif',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#000',
            padding: '190px 105px 140px 105px', // Top, Right, Bottom, Left - matching letterhead beige frame
            position: 'relative',
          }}>
            <style dangerouslySetInnerHTML={{__html: `
              .ProseMirror {
                outline: none;
                position: relative;
              }
              .ProseMirror ul,
              .ProseMirror ol {
                padding-left: 30px;
                margin: 1em 0;
              }
              .ProseMirror ul {
                list-style-type: disc;
              }
              .ProseMirror ol {
                list-style-type: decimal;
              }
              .ProseMirror li {
                margin: 0.25em 0;
              }
              .ProseMirror li > p {
                margin: 0;
              }
              .ProseMirror table {
                border-collapse: collapse;
                margin: 1em 0;
                width: 100%;
              }
              .ProseMirror table td,
              .ProseMirror table th {
                border: 1px solid #ddd;
                padding: 8px;
                min-width: 50px;
              }
              .ProseMirror table th {
                background-color: #f5f5f5;
                font-weight: bold;
                text-align: left;
              }
              .ProseMirror a {
                color: #1c7ed6;
                text-decoration: underline;
                cursor: pointer;
              }
              .ProseMirror mark {
                background-color: #ffeb3b;
                padding: 0.1em 0.2em;
              }
              .ProseMirror blockquote {
                border-left: 3px solid #ddd;
                padding-left: 1em;
                margin-left: 0;
                font-style: italic;
                color: #666;
              }
              .ProseMirror code {
                background-color: #f5f5f5;
                padding: 0.2em 0.4em;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
              }
              .ProseMirror pre {
                background-color: #f5f5f5;
                padding: 1em;
                border-radius: 5px;
                overflow-x: auto;
              }
              .ProseMirror pre code {
                background: none;
                padding: 0;
              }
              .ProseMirror img {
                max-width: 100%;
                height: auto;
              }
              .ProseMirror hr {
                border: none;
                border-top: 2px solid #ddd;
                margin: 2em 0;
              }
            `}} />
            
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

