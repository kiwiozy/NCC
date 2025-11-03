import { Paper, Button, Group, ActionIcon, Stack, Modal, Text, Select, Divider, ColorPicker, Popover, Menu } from '@mantine/core';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
// TextStyle import - handle both default and named exports
// @ts-ignore - TextStyle may have different export formats
import * as TextStyleModule from '@tiptap/extension-text-style';
const TextStyle = TextStyleModule.default || TextStyleModule.TextStyle || TextStyleModule;
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { FontSize } from './FontSizeExtension';
import { 
  IconBold, 
  IconItalic, 
  IconUnderline,
  IconFileTypePdf,
  IconPageBreak,
  IconFileDownload,
  IconColorPicker,
  IconHighlight,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
  IconLink,
  IconLinkOff,
  IconList,
  IconListNumbers,
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import '../styles/letterhead.css';

// Single page component with its own editor
function LetterPage({ 
  pageNumber, 
  totalPages,
  initialContent,
  onContentChange,
  onEditorReady,
}: { 
  pageNumber: number;
  totalPages: number;
  initialContent?: string;
  onContentChange: (content: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Exclude underline and link from StarterKit to use our custom configurations
        underline: false,
        link: false, // Exclude link since StarterKit v3.0+ includes it by default
      }),
      TextStyle, // Must come before FontFamily and FontSize
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize, // Uses textStyle
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-link',
        },
      }),
      Subscript,
      Superscript,
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
        style: 'color: #000000 !important; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif !important;',
        'data-force-light-mode': 'true',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    onFocus: ({ editor }) => {
      if (onEditorReady) {
        onEditorReady(editor);
      }
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Ensure list items have position:relative and inject bullet styles
  useEffect(() => {
    if (!editor) return;
    
    // Inject style tag on mount to ensure bullets and numbers display
    if (!document.getElementById('list-style-injection')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'list-style-injection';
      styleTag.textContent = `
        /* Bullet lists */
        .we-page-content ul li::before,
        .we-page-content .ProseMirror ul li::before {
          content: "•" !important;
          color: #000000 !important;
          position: absolute !important;
          left: 0px !important;
          display: inline-block !important;
          width: 12px !important;
          font-weight: bold !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
          z-index: 10 !important;
        }
        
        /* Ordered lists - use CSS counters for automatic numbering */
        .we-page-content ol {
          counter-reset: list-item !important;
          padding-left: 0 !important;
        }
        .we-page-content ol li {
          counter-increment: list-item !important;
          position: relative !important;
          padding-left: 24px !important;
        }
        .we-page-content ol li::before,
        .we-page-content .ProseMirror ol li::before {
          content: counter(list-item) "." !important;
          color: #000000 !important;
          position: absolute !important;
          left: 0px !important;
          display: inline-block !important;
          width: 20px !important;
          font-weight: normal !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
          z-index: 10 !important;
          text-align: right !important;
        }
      `;
      document.head.appendChild(styleTag);
    }
    
    const handleUpdate = () => {
      const html = editor.getHTML();
      if (html.includes('<ul') || html.includes('<ol')) {
        setTimeout(() => {
          const listItems = document.querySelectorAll('.we-page-content ul li, .we-page-content ol li');
          listItems.forEach((li) => {
            if (!li.style.position || li.style.position === 'static') {
              li.style.position = 'relative';
            }
          });
        }, 10);
      }
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

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
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [colorPickerOpened, setColorPickerOpened] = useState(false);
  const [highlightPickerOpened, setHighlightPickerOpened] = useState(false);
  
  // Font families available for selection
  const fontFamilies = [
    { value: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif', label: 'SF Pro (Default)' },
    { value: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif', label: 'SF Pro Display' },
    { value: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif', label: 'SF Pro Text' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  ];

  // Font sizes available for selection
  const fontSizes = [
    { value: '', label: 'Default (14px)' },
    { value: '10', label: '10px' },
    { value: '12', label: '12px' },
    { value: '14', label: '14px' },
    { value: '16', label: '16px' },
    { value: '18', label: '18px' },
    { value: '20', label: '20px' },
    { value: '24', label: '24px' },
    { value: '28', label: '28px' },
    { value: '32', label: '32px' },
    { value: '36', label: '36px' },
  ];

  // Get current font family from active editor
  const getCurrentFontFamily = (): string => {
    if (!activeEditor) return '';
    const attrs = activeEditor.getAttributes('textStyle');
    return attrs.fontFamily || '';
  };

  // Get current font size from active editor
  const getCurrentFontSize = (): string => {
    if (!activeEditor) return '';
    const attrs = activeEditor.getAttributes('textStyle');
    return attrs.fontSize || '';
  };

  // Get current text color
  const getCurrentColor = (): string => {
    if (!activeEditor) return '#000000';
    const attrs = activeEditor.getAttributes('textStyle');
    return attrs.color || '#000000';
  };

  // Get current highlight color
  const getCurrentHighlight = (): string => {
    if (!activeEditor) return '';
    const attrs = activeEditor.getAttributes('highlight');
    return attrs.color || '';
  };

  // Get current text align
  const getCurrentTextAlign = (): string => {
    if (!activeEditor) return 'left';
    if (activeEditor.isActive({ textAlign: 'center' })) return 'center';
    if (activeEditor.isActive({ textAlign: 'right' })) return 'right';
    if (activeEditor.isActive({ textAlign: 'justify' })) return 'justify';
    return 'left';
  };

  // Check if link is active
  const isLinkActive = (): boolean => {
    if (!activeEditor) return false;
    return activeEditor.isActive('link');
  };

  // Handle font family change
  const handleFontFamilyChange = (value: string | null) => {
    if (!activeEditor) return;
    
    // Check if textStyle extension is available
    const hasTextStyle = activeEditor.extensionManager.extensions.find(e => e.name === 'textStyle');
    if (!hasTextStyle) {
      console.error('textStyle extension not found! Available extensions:', 
        activeEditor.extensionManager.extensions.map(e => e.name));
      return;
    }
    
    if (!value || value === '') {
      activeEditor.chain().focus().unsetFontFamily().run();
    } else {
      // Set font family
      const result = activeEditor.chain().focus().setFontFamily(value).run();
      console.log('setFontFamily called with:', value);
      console.log('Command result:', result);
      
      // Verify it was applied
      setTimeout(() => {
        const attrs = activeEditor.getAttributes('textStyle');
        const html = activeEditor.getHTML();
        console.log('Font family value:', value);
        console.log('Current textStyle attributes:', attrs);
        console.log('HTML snippet (first 400 chars):', html.substring(0, 400));
        
        // Check if font-family is in the HTML
        if (html.includes('font-family')) {
          console.log('✅ Font-family found in HTML!');
        } else {
          console.warn('⚠️ Font-family NOT found in HTML. Current HTML:', html);
        }
      }, 100);
    }
  };

  // Handle font size change
  const handleFontSizeChange = (value: string | null) => {
    if (!activeEditor) return;
    if (!value || value === '') {
      activeEditor.chain().focus().unsetFontSize().run();
    } else {
      activeEditor.chain().focus().setFontSize(value).run();
    }
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    if (!activeEditor) return;
    if (color === '#000000' || color === '') {
      activeEditor.chain().focus().unsetColor().run();
    } else {
      activeEditor.chain().focus().setColor(color).run();
    }
  };

  // Handle highlight change
  const handleHighlightChange = (color: string) => {
    if (!activeEditor) return;
    if (color === '' || !color) {
      activeEditor.chain().focus().unsetHighlight().run();
    } else {
      activeEditor.chain().focus().setHighlight({ color }).run();
    }
  };

  // Handle text align change
  const handleTextAlignChange = (align: string) => {
    if (!activeEditor) return;
    activeEditor.chain().focus().setTextAlign(align).run();
  };

  // Handle link creation/editing
  const handleLinkToggle = () => {
    if (!activeEditor) return;
    
    if (activeEditor.isActive('link')) {
      // Remove link
      activeEditor.chain().focus().unsetLink().run();
    } else {
      // Create link - prompt for URL
      const url = window.prompt('Enter URL:');
      if (url) {
        activeEditor.chain().focus().setLink({ href: url }).run();
      }
    }
  };

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

  const handleDownloadPDF = () => {
    if (!pdfUrl) return;
    
    // Create download link
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `letter-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

            <Divider orientation="vertical" />

            {/* Font Family Select */}
            <Select
              placeholder="Font"
              value={getCurrentFontFamily()}
              onChange={handleFontFamilyChange}
              data={fontFamilies}
              size="compact-sm"
              disabled={!activeEditor}
              w={150}
              styles={{
                input: {
                  fontSize: '13px',
                },
              }}
            />

            {/* Font Size Select */}
            <Select
              placeholder="Size"
              value={getCurrentFontSize()}
              onChange={handleFontSizeChange}
              data={fontSizes}
              size="compact-sm"
              disabled={!activeEditor}
              w={90}
              styles={{
                input: {
                  fontSize: '13px',
                },
              }}
            />

            <Divider orientation="vertical" />

            {/* Bold Button */}
            <ActionIcon
              variant={activeEditor?.isActive('bold') ? 'filled' : 'default'}
              onClick={() => activeEditor?.chain().focus().toggleBold().run()}
              disabled={!activeEditor}
              size="lg"
            >
              <IconBold size={18} />
            </ActionIcon>

            {/* Italic Button */}
            <ActionIcon
              variant={activeEditor?.isActive('italic') ? 'filled' : 'default'}
              onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
              disabled={!activeEditor}
              size="lg"
            >
              <IconItalic size={18} />
            </ActionIcon>

            {/* Underline Button */}
            <ActionIcon
              variant={activeEditor?.isActive('underline') ? 'filled' : 'default'}
              onClick={() => activeEditor?.chain().focus().toggleUnderline().run()}
              disabled={!activeEditor}
              size="lg"
            >
              <IconUnderline size={18} />
            </ActionIcon>

            <Divider orientation="vertical" />

            {/* Bullet List */}
            <ActionIcon
              variant={activeEditor?.isActive('bulletList') ? 'filled' : 'default'}
              onClick={() => {
                if (!activeEditor) return;
                activeEditor.chain().focus().toggleBulletList().run();
                
                // Ensure list items have position:relative and inject bullet style
                setTimeout(() => {
                  // Inject style tag if not already present (handles both ul and ol)
                  if (!document.getElementById('list-style-injection')) {
                    const styleTag = document.createElement('style');
                    styleTag.id = 'list-style-injection';
                    styleTag.textContent = `
                      .we-page-content ul li::before,
                      .we-page-content .ProseMirror ul li::before {
                        content: "•" !important;
                        color: #000000 !important;
                        position: absolute !important;
                        left: 0px !important;
                        display: inline-block !important;
                        width: 12px !important;
                        font-weight: bold !important;
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                        z-index: 10 !important;
                      }
                      .we-page-content ol {
                        counter-reset: list-item !important;
                        padding-left: 0 !important;
                      }
                      .we-page-content ol li {
                        counter-increment: list-item !important;
                        position: relative !important;
                        padding-left: 24px !important;
                      }
                      .we-page-content ol li::before,
                      .we-page-content .ProseMirror ol li::before {
                        content: counter(list-item) "." !important;
                        color: #000000 !important;
                        position: absolute !important;
                        left: 0px !important;
                        display: inline-block !important;
                        width: 20px !important;
                        font-weight: normal !important;
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                        z-index: 10 !important;
                        text-align: right !important;
                      }
                    `;
                    document.head.appendChild(styleTag);
                  }
                  
                  // Ensure position relative on list items (both ul and ol)
                  const listItems = document.querySelectorAll('.we-page-content ul li, .we-page-content ol li');
                  listItems.forEach((li) => {
                    if (!li.style.position || li.style.position === 'static') {
                      li.style.position = 'relative';
                    }
                  });
                }, 50);
              }}
              disabled={!activeEditor}
              size="lg"
            >
              <IconList size={18} />
            </ActionIcon>

            {/* Ordered List */}
            <ActionIcon
              variant={activeEditor?.isActive('orderedList') ? 'filled' : 'default'}
              onClick={() => {
                if (!activeEditor) return;
                activeEditor.chain().focus().toggleOrderedList().run();
                
                // Ensure list items have position:relative and inject list style
                setTimeout(() => {
                  // Inject style tag if not already present (handles both ul and ol)
                  if (!document.getElementById('list-style-injection')) {
                    const styleTag = document.createElement('style');
                    styleTag.id = 'list-style-injection';
                    styleTag.textContent = `
                      .we-page-content ul li::before,
                      .we-page-content .ProseMirror ul li::before {
                        content: "•" !important;
                        color: #000000 !important;
                        position: absolute !important;
                        left: 0px !important;
                        display: inline-block !important;
                        width: 12px !important;
                        font-weight: bold !important;
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                        z-index: 10 !important;
                      }
                      .we-page-content ol {
                        counter-reset: list-item !important;
                        padding-left: 0 !important;
                      }
                      .we-page-content ol li {
                        counter-increment: list-item !important;
                        position: relative !important;
                        padding-left: 24px !important;
                      }
                      .we-page-content ol li::before,
                      .we-page-content .ProseMirror ol li::before {
                        content: counter(list-item) "." !important;
                        color: #000000 !important;
                        position: absolute !important;
                        left: 0px !important;
                        display: inline-block !important;
                        width: 20px !important;
                        font-weight: normal !important;
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                        z-index: 10 !important;
                        text-align: right !important;
                      }
                    `;
                    document.head.appendChild(styleTag);
                  }
                  
                  // Ensure position relative on list items (both ul and ol)
                  const listItems = document.querySelectorAll('.we-page-content ul li, .we-page-content ol li');
                  listItems.forEach((li) => {
                    if (!li.style.position || li.style.position === 'static') {
                      li.style.position = 'relative';
                    }
                  });
                }, 50);
              }}
              disabled={!activeEditor}
              size="lg"
            >
              <IconListNumbers size={18} />
            </ActionIcon>

            <Divider orientation="vertical" />

            {/* Text Color Picker */}
            <Popover
              opened={colorPickerOpened}
              onChange={setColorPickerOpened}
              position="bottom"
              withArrow
            >
              <Popover.Target>
                <ActionIcon
                  variant={activeEditor?.isActive('textStyle') && getCurrentColor() !== '#000000' ? 'filled' : 'default'}
                  onClick={() => setColorPickerOpened(!colorPickerOpened)}
                  disabled={!activeEditor}
                  size="lg"
                  style={{
                    backgroundColor: getCurrentColor() !== '#000000' ? getCurrentColor() : undefined,
                  }}
                >
                  <IconColorPicker size={18} style={{ color: getCurrentColor() === '#000000' ? undefined : '#fff' }} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <ColorPicker
                  value={getCurrentColor()}
                  onChange={(color) => {
                    handleColorChange(color);
                    setColorPickerOpened(false);
                  }}
                  format="hex"
                  swatches={['#000000', '#373737', '#808080', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']}
                />
              </Popover.Dropdown>
            </Popover>

            {/* Highlight Color Picker */}
            <Popover
              opened={highlightPickerOpened}
              onChange={setHighlightPickerOpened}
              position="bottom"
              withArrow
            >
              <Popover.Target>
                <ActionIcon
                  variant={activeEditor?.isActive('highlight') ? 'filled' : 'default'}
                  onClick={() => setHighlightPickerOpened(!highlightPickerOpened)}
                  disabled={!activeEditor}
                  size="lg"
                >
                  <IconHighlight size={18} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <ColorPicker
                  value={getCurrentHighlight() || '#ffff00'}
                  onChange={(color) => {
                    handleHighlightChange(color);
                    setHighlightPickerOpened(false);
                  }}
                  format="hex"
                  swatches={['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff']}
                />
              </Popover.Dropdown>
            </Popover>

            <Divider orientation="vertical" />

            {/* Text Align Menu */}
            <Menu shadow="md" position="bottom">
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  disabled={!activeEditor}
                  size="lg"
                >
                  {getCurrentTextAlign() === 'left' && <IconAlignLeft size={18} />}
                  {getCurrentTextAlign() === 'center' && <IconAlignCenter size={18} />}
                  {getCurrentTextAlign() === 'right' && <IconAlignRight size={18} />}
                  {getCurrentTextAlign() === 'justify' && <IconAlignJustified size={18} />}
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconAlignLeft size={16} />}
                  onClick={() => handleTextAlignChange('left')}
                >
                  Left
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconAlignCenter size={16} />}
                  onClick={() => handleTextAlignChange('center')}
                >
                  Center
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconAlignRight size={16} />}
                  onClick={() => handleTextAlignChange('right')}
                >
                  Right
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconAlignJustified size={16} />}
                  onClick={() => handleTextAlignChange('justify')}
                >
                  Justify
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            {/* Link Toggle */}
            <ActionIcon
              variant={isLinkActive() ? 'filled' : 'default'}
              onClick={handleLinkToggle}
              disabled={!activeEditor}
              size="lg"
            >
              {isLinkActive() ? <IconLinkOff size={18} /> : <IconLink size={18} />}
            </ActionIcon>

            <Divider orientation="vertical" ml="auto" />

            <Button
              leftSection={<IconFileTypePdf size={18} />}
              onClick={handlePreviewPDF}
              loading={pdfLoading}
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
              onEditorReady={(editor) => {
                // Track the most recently focused editor
                if (editor) {
                  setActiveEditor(editor);
                }
              }}
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
        title={
          <Group justify="space-between" style={{ width: '100%' }}>
            <Text fw={600}>PDF Preview</Text>
            {pdfUrl && (
              <Button
                leftSection={<IconFileDownload size={18} />}
                onClick={handleDownloadPDF}
                size="sm"
                variant="filled"
              >
                Download PDF
              </Button>
            )}
          </Group>
        }
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

