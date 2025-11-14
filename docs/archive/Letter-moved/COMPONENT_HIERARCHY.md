# Letter Page - Complete Component Hierarchy

**Date:** 2025-11-03  
**Page Route:** `/letters`  
**File:** `frontend/app/letters/page.tsx`

---

## 📐 Complete Component Tree

```
Navigation (AppShell Wrapper)
│
├── AppShell
│   ├── AppShell.Header (Sticky Navigation Bar - 80px height)
│   │   ├── Group (Container for nav items)
│   │   │   ├── ActionIcon (Back Button - Left)
│   │   │   ├── Group (Navigation Items - Centered)
│   │   │   │   └── NavButton[] (Multiple navigation buttons)
│   │   │   │       ├── Icon (Tabler icon)
│   │   │   │       └── Text (Label)
│   │   │   └── Group (Right Section)
│   │   │       ├── DarkModeToggle
│   │   │       └── ActionIcon (Close/Back)
│   │   └── (Submenu Popovers - Contact/Settings)
│   │
│   └── AppShell.Main (Main Content Area)
│       └── Container (Mantine - size="xl", py="xl")
│           ├── Title (Order 2, mb="xl")
│           │   └── Text: "Letters"
│           │
│           └── div (Light Mode Wrapper)
│               └── LetterEditor (Dynamic Import - SSR: false)
│                   │
│                   ├── Toolbar Section
│                   │   └── Paper (shadow="sm", p="md", mb="md", withBorder)
│                   │       └── Group (gap="xs")
│                   │           ├── Button (New Page)
│                   │           │   ├── IconPageBreak (leftSection)
│                   │           │   └── Text: "New Page"
│                   │           │
│                   │           └── Button (Preview PDF)
│                   │               ├── IconFileTypePdf (leftSection)
│                   │               └── Text: "Preview PDF"
│                   │
│                   └── Editor Section
│                       └── div.letter-editor-shell
│                           └── Stack (gap="xl")
│                               └── LetterPage[] (One per page)
│                                   │
│                                   └── div.we-page
│                                       ├── div.letterhead-overlay
│                                       │   └── (Background Image: Walk-Easy_Letterhead.png)
│                                       │       └── CSS: position: absolute, inset: 0, opacity: 0.25
│                                       │
│                                       ├── div.we-page-content
│                                       │   ├── (CSS Safe Zones: top: 60mm, left: 22mm, right: 18mm, bottom: 45mm)
│                                       │   └── EditorContent (TipTap)
│                                       │       └── .ProseMirror
│                                       │           ├── (TipTap Editor Instance)
│                                       │           ├── Extensions:
│                                       │           │   ├── StarterKit
│                                       │           │   ├── Underline
│                                       │           │   └── Placeholder
│                                       │           └── (Editable HTML Content)
│                                       │
│                                       └── div (Page Number Badge)
│                                           └── Text: "Page X of Y"
│                                           └── CSS: position: absolute, bottom: 20mm, right: 20mm
```

---

## 🏗️ Detailed Component Breakdown

### Level 1: Navigation Component (`frontend/app/components/Navigation.tsx`)

**Type:** Layout Wrapper  
**Purpose:** Provides app-wide navigation structure

#### AppShell (Mantine)
- **Component:** `AppShell`
- **Props:**
  - `header={{ height: 80 }}` - Header height in pixels
  - `padding={0}` - No default padding

#### AppShell.Header (Sticky Navigation Bar)
- **Component:** `AppShell.Header`
- **Height:** 80px
- **Position:** `position: sticky` (Safari: `-webkit-sticky`)
- **Z-Index:** 200
- **Background:** Theme-aware (#25262b dark / #ffffff light)
- **Border:** Bottom border (theme-aware color)

**Contains:**
1. **Back Button** (Left)
   - Component: `ActionIcon`
   - Icon: `IconArrowLeft`
   - Action: `router.back()`

2. **Navigation Items** (Center)
   - Component: `Group`
   - Layout: Centered flex with gap
   - Items: Dashboard, Contacts, Calendar, Accounts, Orders, Inventory, Settings
   - Each item: `NavButton` component

3. **Right Section**
   - Component: `Group`
   - Items:
     - `DarkModeToggle` - Theme switcher
     - `ActionIcon` - Close/Back button

4. **Submenu Popovers** (On Hover)
   - Contact Submenu (Patients, Practitioners, Clinics, Organizations)
   - Settings Submenu (General, Gmail, Letters, Xero, SMS, S3, Notes, AT Report)

---

### Level 2: Page Container (`frontend/app/letters/page.tsx`)

**Type:** Next.js Page Component  
**Route:** `/letters`  
**File:** `frontend/app/letters/page.tsx`

#### Container (Mantine)
- **Component:** `Container`
- **Props:**
  - `size="xl"` - Max width constraint
  - `py="xl"` - Vertical padding

**Contains:**

1. **Title**
   - Component: `Title` (Mantine)
   - Props: `order={2}`, `mb="xl"`
   - Text: "Letters"

2. **Light Mode Wrapper**
   - Type: `div`
   - Purpose: Force light mode for letter canvas
   - Props:
     - `style`: `colorScheme: 'light'`, `color: '#000000'`, `--mantine-color-text: '#000000'`
     - `data-mantine-color-scheme="light"`
     - `data-force-light-mode="true"`

**Contains:**
- `LetterEditor` (Dynamic import with `ssr: false`)

---

### Level 3: Letter Editor (`frontend/app/letters/LetterEditor.tsx`)

**Type:** Main Editor Component  
**Purpose:** Manages multi-page letter editing

#### State Management
- `pdfLoading` (boolean) - PDF generation status
- `pages` (string[]) - Array of HTML content for each page

#### Toolbar Section
- **Component:** `Paper` (Mantine)
- **Props:**
  - `shadow="sm"`
  - `p="md"` (padding)
  - `mb="md"` (margin-bottom)
  - `withBorder`

**Contains:**
- **Group** (Mantine)
  - **Props:** `gap="xs"`
  
  **Buttons:**
  1. **New Page Button**
     - Component: `Button`
     - Props: `variant="light"`, `size="compact-sm"`
     - Left Section: `IconPageBreak` (size 18)
     - Text: "New Page"
     - Action: `handleAddPage()` - Adds new empty page
  
  2. **Preview PDF Button**
     - Component: `Button`
     - Props: `ml="auto"`, `loading={pdfLoading}`
     - Left Section: `IconFileTypePdf` (size 18)
     - Text: "Preview PDF"
     - Action: `handlePreviewPDF()` - Calls `/api/letters/pdf`

#### Editor Section
- **Container:** `div.letter-editor-shell`
- **CSS Class:** `.letter-editor-shell`
- **Styling:**
  - Background: `#f3f3f3`
  - Padding: `1.5rem`
  - `color-scheme: light !important`

**Contains:**
- **Stack** (Mantine)
  - **Props:** `gap="xl"`
  - **Children:** `LetterPage[]` (One per page in `pages` array)

---

### Level 4: LetterPage Component (Nested in LetterEditor)

**Type:** Per-Page Editor Component  
**Purpose:** Individual page with its own TipTap editor instance

#### Props
- `pageNumber` (number) - Current page number (1-based)
- `totalPages` (number) - Total number of pages
- `initialContent` (string, optional) - Initial HTML content
- `onContentChange` (function) - Callback when content changes

#### Page Container
- **Component:** `div.we-page`
- **CSS Class:** `.we-page`
- **Dimensions:** 210mm × 297mm (A4)
- **Styling:**
  - `position: relative`
  - `background: #fff !important`
  - `color: #000 !important`
  - `box-shadow: 0 0 8px rgba(0,0,0,.1)`
  - `page-break-after: always`
  - `color-scheme: light !important`
  - `margin: 0 auto 20px auto`

**Contains:**

1. **Letterhead Overlay**
   - Component: `div.letterhead-overlay`
   - **CSS:**
     - `position: absolute`
     - `inset: 0`
     - `background: url('/Walk-Easy_Letterhead.png')`
     - `background-size: 210mm 297mm`
     - `opacity: 0.25`
     - `pointer-events: none`
     - `z-index: 0`

2. **Content Area**
   - Component: `div.we-page-content`
   - **CSS Class:** `.we-page-content`
   - **Safe Zones (Absolute Positioning):**
     - Top: `60mm` (letterhead area)
     - Left: `22mm`
     - Right: `18mm`
     - Bottom: `45mm` (footer area)
   - **Styling:**
     - `position: absolute`
     - `overflow: hidden`
     - `font-family: 'Helvetica Neue', Arial, sans-serif`
     - `font-size: 14px`
     - `line-height: 1.6`
     - `color: #000000 !important`
     - `z-index: 1`
   
   **Contains:**
   - **EditorContent** (TipTap)
     - Component: `EditorContent` from `@tiptap/react`
     - Props: `editor={editor}`
     - **TipTap Editor Instance:**
       - Created via `useEditor()` hook
       - **Extensions:**
         - `StarterKit` - Bold, italic, lists, headings, etc.
         - `Underline` - Underline formatting
         - `Placeholder` - Placeholder text
       - **Editor Props:**
         - `content`: Initial HTML content
         - `immediatelyRender: false`
         - `editorProps.attributes.style: 'color: #000000 !important'`
         - `editorProps.attributes['data-force-light-mode']: 'true'`
         - `onUpdate`: Syncs content to parent state
     - **Renders as:** `.ProseMirror` div

3. **Page Number Badge**
   - Component: `div` (inline style)
   - **CSS:**
     - `position: absolute`
     - `bottom: 20mm`
     - `right: 20mm`
     - `background: rgba(0,0,0,0.7)`
     - `color: white`
     - `padding: 4px 12px`
     - `borderRadius: 4px`
     - `fontSize: 12px`
     - `fontWeight: 600`
   - **Content:** `Page {pageNumber} of {totalPages}`

---

## 🎨 CSS Class Hierarchy

### `.letter-editor-shell`
- **Parent:** `div` (in LetterEditor)
- **Purpose:** Gray background container for all pages
- **Styling:**
  - Background: `#f3f3f3`
  - Padding: `1.5rem`
  - `color-scheme: light !important`

### `.we-page`
- **Parent:** `LetterPage` component
- **Purpose:** Individual A4 page container
- **Dimensions:** 210mm × 297mm
- **Styling:**
  - `position: relative`
  - White background
  - Box shadow
  - Page break after (print)

### `.letterhead-overlay`
- **Parent:** `.we-page`
- **Purpose:** Letterhead background image
- **Styling:**
  - `position: absolute`
  - `inset: 0`
  - Background image
  - `opacity: 0.25`
  - `z-index: 0`

### `.we-page-content`
- **Parent:** `.we-page`
- **Purpose:** Editable content area with safe zones
- **Styling:**
  - `position: absolute`
  - Safe zone positioning (60mm/22mm/18mm/45mm)
  - `overflow: hidden`
  - `z-index: 1`

### `.ProseMirror`
- **Parent:** `.we-page-content`
- **Purpose:** TipTap editor root element
- **Styling:**
  - `height: 100%`
  - `overflow: auto`
  - `color: #000000 !important` (forced)

---

## 📦 Component Dependencies

### Mantine Components
- `AppShell` - Main layout structure
- `Container` - Page width constraint
- `Title` - Page heading
- `Paper` - Toolbar container
- `Group` - Horizontal button group
- `Button` - Action buttons
- `Stack` - Vertical page stack
- `ActionIcon` - Icon buttons

### TipTap Components
- `EditorContent` - Editor render component
- `useEditor` - Editor instance hook
- `StarterKit` - Core editor features
- `Underline` - Underline extension
- `Placeholder` - Placeholder extension

### Tabler Icons
- `IconPageBreak` - New page icon
- `IconFileTypePdf` - PDF preview icon

### React Hooks
- `useState` - Component state
- `useEditor` - TipTap editor instance

---

## 🔄 Data Flow

1. **Initial Load:**
   - `LetterEditor` initializes with default content in `pages` state
   - Creates `LetterPage` components for each page
   - Each `LetterPage` creates its own TipTap editor instance

2. **Content Editing:**
   - User types in TipTap editor
   - `onUpdate` callback fires
   - `onContentChange` updates parent `pages` state
   - State update triggers re-render

3. **Add Page:**
   - User clicks "New Page" button
   - `handleAddPage()` adds new empty page HTML to `pages` array
   - New `LetterPage` component rendered

4. **PDF Generation:**
   - User clicks "Preview PDF" button
   - `handlePreviewPDF()` combines all pages with `<hr class="page-break">`
   - POST request to `/api/letters/pdf` with combined HTML
   - PDF blob returned and opened in new window

---

## 🎯 Key Features

### Multi-Page Support
- Each page is a separate `LetterPage` component
- Each page has its own TipTap editor instance
- Pages are managed in `pages` state array
- Pages combined with `<hr class="page-break">` for PDF

### Light Mode Enforcement
- CSS overrides with `!important`
- CSS variable overrides (`--mantine-color-text`)
- Inline styles on React components
- Data attributes for identification
- Dark mode specific selectors

### Safe Zones
- Top: 60mm (letterhead area)
- Left: 22mm
- Right: 18mm
- Bottom: 45mm (footer area)
- Enforced via absolute positioning
- `overflow: hidden` prevents content outside safe zone

### Letterhead Display
- Background image: `/Walk-Easy_Letterhead.png`
- Editor: 25% opacity for visibility
- PDF: Full opacity (via CSS in PDF route)
- Fixed positioning ensures letterhead on all pages

---

## 📝 File Structure

```
frontend/app/letters/
├── page.tsx                    # Main page route
├── LetterEditor.tsx            # Main editor component
├── PageBreakExtension.ts       # (Unused - for reference)
└── PageBreakExtension 2.ts     # (Unused - for reference)

frontend/app/styles/
└── letterhead.css              # Letter-specific CSS

frontend/app/components/
└── Navigation.tsx              # App-wide navigation wrapper

frontend/app/api/letters/
└── pdf/
    └── route.ts                # PDF generation API endpoint
```

---

## 🎨 Styling Architecture

### CSS Variables (in `:root`)
- `--we-page-width: 210mm`
- `--we-page-height: 297mm`
- `--we-pad-top: 60mm`
- `--we-pad-right: 18mm`
- `--we-pad-bottom: 45mm`
- `--we-pad-left: 22mm`
- `--we-content-height: 192mm` (calculated)

### CSS Classes
- `.letter-editor-shell` - Editor container
- `.we-page` - Page container
- `.letterhead-overlay` - Letterhead background
- `.we-page-content` - Content area with safe zones
- `.ProseMirror` - TipTap editor root (auto-generated)

### CSS Selectors
- Base styles for light mode
- `[data-mantine-color-scheme="dark"]` - Dark mode overrides
- `[data-force-light-mode="true"]` - Force light mode
- `html[data-mantine-color-scheme="dark"]` - HTML-level overrides

---

## 🔧 Component Props Summary

### LetterEditor Props
- None (main component)

### LetterPage Props
- `pageNumber: number` - Current page number (1-based)
- `totalPages: number` - Total pages
- `initialContent?: string` - Initial HTML content
- `onContentChange: (content: string) => void` - Content change callback

---

**Document Generated:** 2025-11-03  
**Last Updated:** After light mode enforcement fixes

---

## 📄 Full Source Code

### `frontend/app/letters/page.tsx`

```typescript
'use client';

import { Container, Title } from '@mantine/core';
import Navigation from '../components/Navigation';
import dynamic from 'next/dynamic';
import '../styles/letterhead.css';

// Dynamically import the editor to avoid SSR issues
const LetterEditor = dynamic(() => import('./LetterEditor'), { ssr: false });

export default function LettersPage() {
  return (
    <Navigation>
      <Container size="xl" py="xl">
        <Title order={2} mb="xl">Letters</Title>
        {/* Force light mode for letter canvas - not affected by app theme */}
        <div 
          style={{ 
            colorScheme: 'light',
            color: '#000000',
            '--mantine-color-text': '#000000',
          } as React.CSSProperties} 
          data-mantine-color-scheme="light"
          data-force-light-mode="true"
        >
          <LetterEditor />
        </div>
      </Container>
    </Navigation>
  );
}
```

---

### `frontend/app/letters/LetterEditor.tsx`

```typescript
import { Paper, Button, Group, ActionIcon, Stack } from '@mantine/core';
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
    
    // Combine all pages into a single HTML string with page markers
    const combinedHTML = pages.map(pageHTML => pageHTML).join('<hr class="page-break">');
    
    try {
      const response = await fetch('/api/letters/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: combinedHTML }),
      });

      if (response.ok) {
        const blob = await response.blob();
        
        // For Safari compatibility, use object URL with type
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        
        // Open in new window for consistent cross-browser experience
        window.open(url, '_blank');
        
        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
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
    </>
  );
}
```

---

### `frontend/app/styles/letterhead.css`

```css
/* Walk Easy Letterhead - Safe Zone CSS
   Based on ChatGPT's recommendations
*/

:root {
  --we-page-width: 210mm;
  --we-page-height: 297mm;
  
  /* Safe zones from Illustrator letterhead */
  --we-pad-top: 60mm;
  --we-pad-right: 18mm;
  --we-pad-bottom: 45mm;
  --we-pad-left: 22mm;
  
  /* Content area height */
  --we-content-height: calc(var(--we-page-height) - var(--we-pad-top) - var(--we-pad-bottom)); /* 192mm */
}

/* Editor shell - gray background - FORCE LIGHT MODE */
.letter-editor-shell {
  background: #f3f3f3;
  padding: 1.5rem;
  color-scheme: light !important;
  /* Force light mode for canvas area */
  --mantine-color-scheme: light;
}

/* A4 page container (for multi-page support) - FORCE LIGHT MODE */
.we-page {
  position: relative;
  width: var(--we-page-width);
  height: var(--we-page-height);
  margin: 0 auto 20px auto;
  background: #fff !important;
  color: #000 !important;
  box-shadow: 0 0 8px rgba(0,0,0,.1);
  page-break-after: always;
  color-scheme: light !important;
}

.we-page:last-child {
  margin-bottom: 0;
}

/* Letterhead overlay (25% opacity for editing, full opacity in PDF) */
.letterhead-overlay {
  position: absolute;
  inset: 0;
  background: url('/Walk-Easy_Letterhead.png') no-repeat 0 0 / 210mm 297mm;
  opacity: 0.25;
  pointer-events: none;
  z-index: 0;
}

/* Content area with safe zones (absolute positioning per ChatGPT recommendation) - FORCE LIGHT MODE */
.we-page-content {
  position: absolute;
  top: var(--we-pad-top);
  left: var(--we-pad-left);
  right: var(--we-pad-right);
  bottom: var(--we-pad-bottom);
  overflow: hidden; /* Hide content that exceeds safe zone */
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  z-index: 1;
  cursor: text; /* Show text cursor to indicate editable area */
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  color: #000000 !important;
  background: transparent !important;
  color-scheme: light !important;
}

/* Override Mantine dark mode for content area */
[data-mantine-color-scheme="dark"] .we-page-content {
  color: #000000 !important;
  background: transparent !important;
}

/* Hover state - show subtle background */
.we-page-content:hover {
  background-color: rgba(59, 130, 246, 0.02); /* Very subtle blue tint */
}

/* When editor is focused - highlight the editable area */
.we-page-content:has(.ProseMirror:focus) {
  background-color: rgba(59, 130, 246, 0.04); /* Slightly stronger blue tint */
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.15); /* Subtle blue border */
}

/* Page break indicator (only in editor, not in PDF) */
.we-page-content::after {
  content: "— Page Break (192mm) —";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-top: 2px dashed rgba(210, 40, 40, 0.45);
  font-size: 10px;
  text-align: center;
  color: rgba(210, 40, 40, 0.7);
  pointer-events: none;
  padding-top: 4px;
}

/* TipTap editor styling within page content - FORCE LIGHT MODE */
.we-page-content .ProseMirror,
.we-page-content .ProseMirror[data-force-light-mode="true"] {
  height: 100%;
  overflow: auto;
  min-height: 100%;
  color: #000000 !important;
  background: transparent !important;
  color-scheme: light !important;
}

/* Override any dark mode styles for ProseMirror */
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror[data-force-light-mode="true"] {
  color: #000000 !important;
  background: transparent !important;
}

/* Force light mode text color for all content - AGGRESSIVE OVERRIDES */
.we-page-content .ProseMirror,
.we-page-content .ProseMirror *,
.we-page-content .ProseMirror p,
.we-page-content .ProseMirror li,
.we-page-content .ProseMirror h1,
.we-page-content .ProseMirror h2,
.we-page-content .ProseMirror h3,
.we-page-content .ProseMirror h4,
.we-page-content .ProseMirror h5,
.we-page-content .ProseMirror h6,
.we-page-content .ProseMirror span,
.we-page-content .ProseMirror div,
.we-page-content .ProseMirror strong,
.we-page-content .ProseMirror em,
.we-page-content .ProseMirror u,
.we-page-content .ProseMirror b,
.we-page-content .ProseMirror i,
.we-page-content .ProseMirror a,
.we-page-content .ProseMirror blockquote,
.we-page-content .ProseMirror code,
.we-page-content .ProseMirror pre {
  color: #000000 !important;
}

/* Override any Mantine theme colors - ULTRA AGGRESSIVE */
[data-mantine-color-scheme="dark"] .we-page-content,
[data-mantine-color-scheme="dark"] .we-page-content *,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror *,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror p,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror li,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror h1,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror h2,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror h3,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror h4,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror h5,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror h6,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror span,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror div,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror strong,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror em,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror u,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror b,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror i,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror a,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror blockquote,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror code,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror pre,
html[data-mantine-color-scheme="dark"] .we-page-content,
html[data-mantine-color-scheme="dark"] .we-page-content *,
html[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror,
html[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror * {
  color: #000000 !important;
  --mantine-color-text: #000000 !important;
}

/* Override CSS variables that might affect text color */
.we-page-content,
.we-page-content .ProseMirror {
  --mantine-color-text: #000000 !important;
  --mantine-color-dimmed: #000000 !important;
}

[data-mantine-color-scheme="dark"] .we-page-content,
[data-mantine-color-scheme="dark"] .we-page-content .ProseMirror {
  --mantine-color-text: #000000 !important;
  --mantine-color-dimmed: #000000 !important;
}

/* Empty editor placeholder */
.we-page-content .ProseMirror p.is-editor-empty:first-child::before {
  content: "Click here to start typing...";
  color: rgba(0, 0, 0, 0.3);
  pointer-events: none;
  height: 0;
  float: left;
}

.we-page-content .ProseMirror p,
.we-page-content p {
  margin: 0 0 8px 0;
}

.we-page-content .ProseMirror ul,
.we-page-content .ProseMirror ol,
.we-page-content ul,
.we-page-content ol {
  padding-left: 24px;
  margin: 8px 0;
}

.we-page-content .ProseMirror li,
.we-page-content li {
  margin: 4px 0;
}

.we-page-content .ProseMirror h1,
.we-page-content .ProseMirror h2,
.we-page-content .ProseMirror h3,
.we-page-content h1,
.we-page-content h2,
.we-page-content h3 {
  margin: 16px 0 8px 0;
  font-weight: bold;
}

/* Focus styles for TipTap */
.we-page-content .ProseMirror:focus {
  outline: none;
}

.we-page-content .ProseMirror {
  height: 100%;
  overflow: auto;
}

/* Page break styling in editor (visible) */
.we-page-content hr.page-break {
  display: block;
  margin: 20px 0;
  border: none;
  border-top: 2px dashed #d32f2f;
  position: relative;
  height: 2px;
}

.we-page-content hr.page-break::before {
  content: "━━━ Page Break ━━━";
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  padding: 0 10px;
  font-size: 11px;
  color: #d32f2f;
  font-weight: 600;
  letter-spacing: 0.5px;
}
```

---

### `frontend/app/api/letters/pdf/route.ts`

```typescript
// PDF Generation API Route - Walk Easy Letterhead System
// Based on ChatGPT's recommendations
import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Split HTML content into multiple pages based on manual page break markers
 * User inserts <hr class="page-break" /> elements in the editor
 */
function splitContentIntoPages(html: string): string[] {
  // Split content by page break markers
  // The page break marker is: <hr class="page-break">
  const pageBreakRegex = /<hr\s+class="page-break"[^>]*>/gi;
  
  // Split the HTML by page breaks
  const pages = html.split(pageBreakRegex).map(page => page.trim()).filter(page => page.length > 0);
  
  // If no page breaks found, return the original HTML as a single page
  return pages.length > 0 ? pages : [html];
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  
  try {
    const { html } = await request.json();

    if (!html) {
      return NextResponse.json({ error: 'No HTML content provided' }, { status: 400 });
    }

    // Read the clean letterhead (without red box) base64 string
    const letterheadPath = path.join(process.cwd(), 'public', 'Walk-Easy_Letterhead-base64.txt');
    const letterheadBase64 = fs.readFileSync(letterheadPath, 'utf-8').trim();

    // Launch Puppeteer with recommended settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=medium',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    
    // Split content into pages based on manual page break markers
    console.log('Splitting content into pages...');
    const pages = splitContentIntoPages(html);
    console.log(`Content split into ${pages.length} page(s)`);
    
    // Build page HTML for each page
    const pageElements = pages.map((pageHTML, index) => `
    <div class="we-page">
      <div class="we-page-content">
        ${pageHTML}
      </div>
    </div>`).join('\n');

    // Build complete HTML with embedded letterhead (multi-page support per ChatGPT Approach A)
    const fullHTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      html, body {
        margin: 0;
        padding: 0;
      }
      
      /* Page container (multi-page support per ChatGPT Approach A) */
      .we-page {
        position: relative;
        width: 210mm;
        height: 297mm;
        background: #fff;
        page-break-after: always;
      }
      
      .we-page:last-child {
        page-break-after: auto;
      }
      
      /* Fixed letterhead background (appears on ALL pages per ChatGPT) */
      .letterhead-bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 210mm;
        height: 297mm;
        background-image: url('data:image/png;base64,${letterheadBase64}');
        background-size: 210mm 297mm;
        background-repeat: no-repeat;
        z-index: 0;
        pointer-events: none;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      /* Content area with safe zones (absolute positioning per ChatGPT) */
      .we-page-content {
        position: absolute;
        top: 60mm;
        left: 22mm;
        right: 18mm;
        bottom: 45mm;
        overflow: hidden;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #000;
        z-index: 1;
      }
      
      /* Remove borders/outlines */
      * {
        border: none !important;
        outline: none !important;
      }
      
      /* Typography */
      .we-page-content p {
        margin: 0 0 8px 0;
      }
      
      .we-page-content ul,
      .we-page-content ol {
        padding-left: 24px;
        margin: 8px 0;
      }
      
      .we-page-content li {
        margin: 4px 0;
      }
      
      .we-page-content h1,
      .we-page-content h2,
      .we-page-content h3 {
        margin: 16px 0 8px 0;
        font-weight: bold;
      }
      
      .we-page-content h1 { font-size: 18px; }
      .we-page-content h2 { font-size: 16px; }
      .we-page-content h3 { font-size: 14px; }
      
      /* Prevent orphans and widows */
      .we-page-content p,
      .we-page-content ul,
      .we-page-content ol,
      .we-page-content h1,
      .we-page-content h2,
      .we-page-content h3 {
        break-inside: avoid;
        orphans: 3;
        widows: 3;
      }
    </style>
  </head>
  <body>
    <div class="letterhead-bg"></div>
    ${pageElements}
  </body>
</html>
    `;

    // Set content and wait for network idle
    await page.setContent(fullHTML, { 
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    // Small delay for font rendering
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="letter-${Date.now()}.pdf"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Make sure browser is closed on error
    if (browser) {
      await browser.close();
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
```

---

**End of Source Code Documentation**

