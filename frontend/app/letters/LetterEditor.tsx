import { Paper, Button, Group, ActionIcon, Stack, Modal, Text, Select, Divider, ColorPicker, Popover, Menu, Textarea, Code, Loader, Alert, Box, TextInput } from '@mantine/core';
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
  IconSparkles,
  IconCheck,
  IconRefresh,
  IconAlertCircle,
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
        style: 'font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif !important;',
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

  // Update editor content when initialContent prop changes
  useEffect(() => {
    if (editor && initialContent) {
      const currentContent = editor.getHTML();
      // Only update if content is actually different to avoid cursor jumps
      if (currentContent !== initialContent) {
        console.log('🔄 Updating editor content');
        console.log('   Current:', currentContent.substring(0, 100));
        console.log('   New:', initialContent.substring(0, 100));
        editor.commands.setContent(initialContent, false);
        console.log('   After setContent:', editor.getHTML().substring(0, 100));
      }
    }
  }, [editor, initialContent]);

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

export default function LetterEditor({ initialPages, isDialog }: { initialPages?: string[]; isDialog?: boolean } = {}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [urlPromptOpened, setUrlPromptOpened] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [errorModalOpened, setErrorModalOpened] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>(
    initialPages && initialPages.length > 0
      ? initialPages
      : [`<p>Dear [Name],</p><p></p><p>Write your letter here...</p><p></p><p>Sincerely,</p><p>Walk Easy Pedorthics</p>`]
  );
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [colorPickerOpened, setColorPickerOpened] = useState(false);
  const [highlightPickerOpened, setHighlightPickerOpened] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiProcessingAllPages, setAiProcessingAllPages] = useState(false);
  const [originalContentForAI, setOriginalContentForAI] = useState<string>('');
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');
  
  // Update pages when initialPages prop changes (e.g., when selecting a different letter)
  useEffect(() => {
    if (initialPages && initialPages.length > 0) {
      setPages(initialPages);
    }
  }, [initialPages]);
  
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

  // Update current color when active editor or selection changes
  useEffect(() => {
    if (!activeEditor) {
      setCurrentColor('#000000');
      return;
    }
    
    // Update color when selection changes
    const updateColor = () => {
      const attrs = activeEditor.getAttributes('textStyle');
      const newColor = attrs.color || '#000000';
      // Only update if color actually changed
      setCurrentColor(prevColor => prevColor !== newColor ? newColor : prevColor);
    };
    
    // Initial update
    updateColor();
    
    // Listen for selection updates only (more efficient than transaction)
    activeEditor.on('selectionUpdate', updateColor);
    
    return () => {
      activeEditor.off('selectionUpdate', updateColor);
    };
  }, [activeEditor]);

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
    console.log('🎨 handleColorChange called with:', color);
    console.log('   activeEditor:', activeEditor ? 'exists' : 'null');
    if (!activeEditor) {
      console.error('❌ No active editor!');
      return;
    }
    if (color === '#000000' || color === '') {
      console.log('   Unsetting color (black/empty)');
      activeEditor.chain().focus().unsetColor().run();
    } else {
      console.log('   Setting color to:', color);
      const result = activeEditor.chain().focus().setColor(color).run();
      console.log('   Command result:', result);
      console.log('   HTML after:', activeEditor.getHTML().substring(0, 200));
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
      // Create link - open URL input modal
      setUrlInput('');
      setUrlPromptOpened(true);
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

  // Handle OpenAI processing
  const handleOpenAI = () => {
    console.log('🔵 OpenAI button clicked');
    console.log('📄 Total pages:', pages.length);
    console.log('✏️ Active editor:', activeEditor ? 'Yes' : 'No');
    
    if (pages.length === 0) {
      console.warn('⚠️ No pages available');
      setAiError('Please add content to the editor first');
      setAiModalOpen(true);
      return;
    }
    
    // Get selected text from active editor if available
    let selectedText = '';
    if (activeEditor) {
      const { from, to } = activeEditor.state.selection;
      selectedText = activeEditor.state.doc.textBetween(from, to);
      console.log('📋 Selection:', {
        from,
        to,
        hasSelection: from !== to,
        selectedLength: selectedText.length,
      });
    }
    
    // If text is selected, show modal with prompt option
    if (selectedText.trim()) {
      console.log('✅ Text selected - opening modal for selected text');
      setOriginalContentForAI(selectedText.trim());
      setAiProcessingAllPages(false);
      setAiModalOpen(true);
      setAiError(null);
      setAiResult('');
      setAiPrompt('');
      setAiInitialPrompt('');
      // Don't auto-process - let user add instructions first
      return;
    }
    
    // If multiple pages exist, show options
    if (pages.length > 1) {
      console.log('📚 Multiple pages detected - showing page selection options');
      setAiModalOpen(true);
      setAiError(null);
      setAiResult('');
      setAiPrompt('');
      setAiProcessingAllPages(false);
      setOriginalContentForAI('');
      setAiInitialPrompt('');
      // User will choose in modal
      return;
    }
    
    // Single page - show modal with prompt option
    if (activeEditor) {
      const currentPageText = activeEditor.state.doc.textContent.trim();
      console.log('📄 Single page - current page text length:', currentPageText.length);
      if (!currentPageText) {
        console.warn('⚠️ Current page has no content');
        setAiError('Please add content to the editor first');
        setAiModalOpen(true);
        return;
      }
      console.log('✅ Opening modal for single page');
      setOriginalContentForAI(currentPageText);
      setAiProcessingAllPages(false);
      setAiModalOpen(true);
      setAiError(null);
      setAiResult('');
      setAiPrompt('');
      setAiInitialPrompt('');
      // Don't auto-process - let user add instructions first
    } else {
      console.warn('⚠️ No active editor - user needs to select a page');
      setAiError('Please click on a page to select it first');
      setAiModalOpen(true);
    }
  };

  const callOpenAI = async (content: string, customPrompt?: string) => {
    setAiProcessing(true);
    setAiError(null);

    // Log OpenAI request
    console.log('🤖 OpenAI Request Started');
    console.log('📝 Content length:', content.length, 'characters');
    console.log('📝 Content preview (first 200 chars):', content.substring(0, 200));
    console.log('💬 Custom prompt:', customPrompt || '(none)');
    console.log('🌐 Endpoint: https://localhost:8000/api/ai/rewrite-clinical-notes/');
    console.log('📊 Processing mode:', aiProcessingAllPages ? `All ${pages.length} pages` : 'Current page');

    const requestPayload = {
      content: content,
      custom_prompt: customPrompt || null,
    };
    console.log('📤 Request payload:', {
      contentLength: content.length,
      hasCustomPrompt: !!customPrompt,
      customPromptLength: customPrompt?.length || 0,
    });

    const startTime = Date.now();

    try {
      const response = await fetch('https://localhost:8000/api/ai/rewrite-clinical-notes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const requestDuration = Date.now() - startTime;
      console.log('⏱️ Request duration:', requestDuration, 'ms');
      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ OpenAI Error Response:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to process with OpenAI');
      }

      const data = await response.json();
      console.log('✅ OpenAI Success Response');
      console.log('📊 Response data:', {
        hasResult: !!data.result,
        resultLength: data.result?.length || 0,
        model: data.model || 'unknown',
      });
      console.log('📝 Result preview (first 200 chars):', data.result?.substring(0, 200) || 'No result');
      
      setAiResult(data.result);
      
      const totalDuration = Date.now() - startTime;
      console.log('✨ Total processing time:', totalDuration, 'ms');
      
    } catch (err: any) {
      const errorDuration = Date.now() - startTime;
      console.error('❌ OpenAI Request Failed');
      console.error('⏱️ Error occurred after:', errorDuration, 'ms');
      console.error('🚨 Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      setAiError('Failed to process with OpenAI: ' + err.message);
    } finally {
      setAiProcessing(false);
      console.log('🏁 OpenAI request completed');
    }
  };

  const acceptAIResult = () => {
    if (!aiResult) return;
    
    if (aiProcessingAllPages && pages.length > 1) {
      // For multi-page results, we need to split and apply to each page
      // For now, just apply to the active editor or first page
      // TODO: Could implement smarter page splitting based on page markers
      if (activeEditor) {
        activeEditor.chain()
          .focus()
          .setContent(aiResult)
          .run();
      } else if (pages.length > 0) {
        // Update first page
        handlePageContentChange(0, `<p>${aiResult.replace(/\n/g, '</p><p>')}</p>`);
      }
    } else if (activeEditor) {
      // Single page or selection - replace content
      const { from, to } = activeEditor.state.selection;
      
      if (from !== to) {
        // Has selection - replace selection
        activeEditor.chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(aiResult)
          .run();
      } else {
        // No selection - replace all content
        activeEditor.chain()
          .focus()
          .setContent(aiResult)
          .run();
      }
    }
    
    setAiModalOpen(false);
    setAiResult('');
    setAiProcessingAllPages(false);
    setOriginalContentForAI('');
  };

  const requestAIRefinement = () => {
    if (!aiPrompt.trim()) {
      setAiError('Please enter refinement instructions');
      return;
    }
    
    // Use the original content that was processed, not current editor state
    if (originalContentForAI) {
      callOpenAI(originalContentForAI, aiPrompt);
    } else if (activeEditor) {
      // Fallback to current editor content
      const content = activeEditor.state.doc.textContent;
      callOpenAI(content, aiPrompt);
    }
  };
  
  // Get text from all pages
  const getAllPagesText = (): string => {
    const editorElements = document.querySelectorAll('.we-page-content .ProseMirror');
    const allTexts = Array.from(editorElements).map((el, index) => {
      const text = (el as HTMLElement).textContent || '';
      // Only include page separator if there's content
      return text.trim() ? `[Page ${index + 1}]\n${text.trim()}` : '';
    }).filter(text => text.length > 0);
    
    return allTexts.join('\n\n---\n\n');
  };
  
  // Process all pages
  const handleProcessAllPages = () => {
    console.log('📚 Process All Pages button clicked');
    const allPagesText = getAllPagesText();
    
    console.log('📄 All pages text:', {
      length: allPagesText.length,
      pagesProcessed: pages.length,
    });
    
    if (!allPagesText) {
      console.error('❌ No content found in any pages');
      setAiError('No content found in any pages');
      return;
    }
    
    console.log('✅ All pages text prepared, opening prompt input');
    setOriginalContentForAI(allPagesText);
    setAiProcessingAllPages(true);
    setAiError(null);
    setAiResult('');
    setAiPrompt('');
    // Don't auto-process - let user add instructions first
  };
  
  // Process current page only
  const handleProcessCurrentPage = () => {
    console.log('📄 Process Current Page button clicked');
    
    if (!activeEditor) {
      console.warn('⚠️ No active editor');
      setAiError('No active page selected');
      return;
    }
    
    const text = activeEditor.state.doc.textContent.trim();
    console.log('📝 Current page text:', {
      length: text.length,
      preview: text.substring(0, 100),
    });
    
    if (!text) {
      console.warn('⚠️ Current page has no content');
      setAiError('Current page has no content');
      return;
    }
    
    console.log('✅ Current page text prepared, opening prompt input');
    setOriginalContentForAI(text);
    setAiProcessingAllPages(false);
    setAiError(null);
    setAiResult('');
    setAiPrompt('');
    // Don't auto-process - let user add instructions first
  };
  
  // Process with initial prompt
  const handleProcessWithPrompt = () => {
    console.log('🚀 Process with AI button clicked');
    
    if (!originalContentForAI) {
      console.error('❌ No content to process');
      setAiError('No content to process');
      return;
    }
    
    const prompt = aiInitialPrompt.trim();
    console.log('💬 Initial prompt provided:', prompt || '(none - will use default)');
    console.log('📝 Content to process:', {
      length: originalContentForAI.length,
      pages: aiProcessingAllPages ? pages.length : 1,
    });
    
    // Process with initial prompt if provided
    callOpenAI(originalContentForAI, prompt || undefined);
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
        setErrorMessage(`PDF generation failed: ${errorData.details || errorData.error}`);
        setErrorModalOpened(true);
      }
    } catch (error) {
      console.error('Error calling PDF API:', error);
      setErrorMessage('Error generating PDF. Check console for details.');
      setErrorModalOpened(true);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      {/* Toolbar (now sticky) - hide when preview modal is open */}
      <div 
        className={isDialog ? "letters-toolbar-sticky-dialog" : "letters-toolbar-sticky"}
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
              size="xs"
              disabled={!activeEditor}
              w={150}
              styles={{
                input: {
                  fontSize: '13px',
                  backgroundColor: 'var(--mantine-color-dark-6)',
                  color: 'var(--mantine-color-gray-0)',
                  borderColor: 'var(--mantine-color-dark-4)',
                  height: '36px',
                  minHeight: '36px',
                },
              }}
            />

            {/* Font Size Select */}
            <Select
              placeholder="Size"
              value={getCurrentFontSize()}
              onChange={handleFontSizeChange}
              data={fontSizes}
              size="xs"
              disabled={!activeEditor}
              w={90}
              styles={{
                input: {
                  fontSize: '13px',
                  backgroundColor: 'var(--mantine-color-dark-6)',
                  color: 'var(--mantine-color-gray-0)',
                  borderColor: 'var(--mantine-color-dark-4)',
                  height: '36px',
                  minHeight: '36px',
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

            {/* OpenAI Button */}
            <ActionIcon
              variant="default"
              onClick={handleOpenAI}
              disabled={!activeEditor}
              size="lg"
              title="Send to OpenAI for rewriting"
            >
              <IconSparkles size={18} />
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
                  variant={activeEditor?.isActive('textStyle') && currentColor !== '#000000' ? 'filled' : 'default'}
                  onClick={() => setColorPickerOpened(!colorPickerOpened)}
                  disabled={!activeEditor}
                  size="lg"
                  style={{
                    backgroundColor: currentColor !== '#000000' ? currentColor : undefined,
                  }}
                >
                  <IconColorPicker size={18} style={{ color: currentColor === '#000000' ? undefined : '#fff' }} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <ColorPicker
                  value={currentColor}
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

            {!isDialog && (
              <>
                <Divider orientation="vertical" ml="auto" />

                <Button
                  leftSection={<IconFileTypePdf size={18} />}
                  onClick={handlePreviewPDF}
                  loading={pdfLoading}
                >
                  Preview PDF
                </Button>
              </>
            )}
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

      {/* OpenAI Modal */}
      <Modal
        opened={aiModalOpen}
        onClose={() => {
          setAiModalOpen(false);
          setAiResult('');
          setAiError(null);
          setAiPrompt('');
          setAiProcessingAllPages(false);
          setOriginalContentForAI('');
          setAiInitialPrompt('');
        }}
        title={<Text fw={600} size="lg">AI Rewrite - Letter Content</Text>}
        size="xl"
        zIndex={400}
        overlayProps={{ zIndex: 400 }}
        styles={{
          root: {
            zIndex: 400,
          },
          overlay: {
            zIndex: 399,
          },
        }}
      >
        <Stack gap="md">
          {aiError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
              {aiError}
            </Alert>
          )}

          {/* Show page selection options if multiple pages and no result yet */}
          {!aiProcessing && !aiResult && pages.length > 1 && !originalContentForAI && (
            <Alert icon={<IconSparkles size={16} />} color="blue">
              <Text size="sm" mb="xs" fw={500}>Select what to process:</Text>
              <Stack gap="xs" mt="xs">
                <Button
                  variant="light"
                  onClick={handleProcessCurrentPage}
                  disabled={!activeEditor}
                >
                  Process Current Page Only
                </Button>
                <Button
                  variant="light"
                  onClick={handleProcessAllPages}
                >
                  Process All {pages.length} Pages
                </Button>
              </Stack>
            </Alert>
          )}

          {/* Show content and prompt input before processing */}
          {originalContentForAI && !aiResult && !aiProcessing && (
            <>
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  Content to process: {aiProcessingAllPages ? `All ${pages.length} pages` : 'Current page'}
                </Text>
                <Code block style={{ maxHeight: '150px', overflow: 'auto', fontSize: '12px' }}>
                  {originalContentForAI.substring(0, 500)}
                  {originalContentForAI.length > 500 ? '...' : ''}
                </Code>
              </Box>

              <Divider label="Instructions for AI" labelPosition="center" />

              <Textarea
                label="How would you like OpenAI to process this text? (Optional)"
                placeholder='e.g., "make it more professional", "expand with more detail", "make it shorter and concise", "rewrite as a formal letter", "add medical terminology"'
                value={aiInitialPrompt}
                onChange={(e) => setAiInitialPrompt(e.target.value)}
                rows={3}
                autosize
                minRows={3}
              />

              <Group justify="flex-end">
                <Button variant="outline" onClick={() => {
                  setAiModalOpen(false);
                  setAiResult('');
                  setAiError(null);
                  setAiPrompt('');
                  setAiProcessingAllPages(false);
                  setOriginalContentForAI('');
                  setAiInitialPrompt('');
                }}>
                  Cancel
                </Button>
                <Button
                  leftSection={<IconSparkles size={18} />}
                  onClick={handleProcessWithPrompt}
                  variant="filled"
                >
                  Process with AI
                </Button>
              </Group>
            </>
          )}

          {aiProcessing ? (
            <Box py="xl">
              <Group justify="center">
                <Loader size="md" />
                <Text>Processing with OpenAI...</Text>
              </Group>
            </Box>
          ) : aiResult ? (
            <>
              <Box>
                <Text size="sm" fw={500} mb="xs">AI-Generated Result:</Text>
                <Paper p="md" withBorder>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{aiResult}</Text>
                </Paper>
              </Box>

              <Divider label="Request Refinement" labelPosition="center" />

              <Textarea
                label="Refinement Instructions"
                placeholder='e.g., "make it more professional", "add more detail", "make it shorter"'
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
              />

              <Group justify="space-between">
                <Group>
                  <Button
                    leftSection={<IconRefresh size={18} />}
                    onClick={requestAIRefinement}
                    variant="outline"
                    disabled={!aiPrompt.trim()}
                  >
                    Refine with AI
                  </Button>
                </Group>
                <Group>
                  <Button variant="outline" onClick={() => {
                    setAiModalOpen(false);
                    setAiResult('');
                    setAiPrompt('');
                  }}>
                    Cancel
                  </Button>
                  <Button
                    leftSection={<IconCheck size={18} />}
                    onClick={acceptAIResult}
                    color="green"
                  >
                    Accept & Use This
                  </Button>
                </Group>
              </Group>
            </>
          ) : null}
        </Stack>
      </Modal>
    </>
  );
}

