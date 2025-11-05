# Safari Sticky Header Issue - Need Help

## Problem Description

We have a letter editor page with a 3-layer header structure that needs to stay fixed at the top while the content scrolls. It works perfectly in Chrome, but **fails in Safari** - the headers scroll away with the content instead of staying fixed.

## Current Structure

### 1. Navigation Header (Working - stays fixed in Safari ✅)
```tsx
<AppShell.Header
  style={{
    backgroundColor: isDark ? '#25262b' : '#ffffff',
    borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    overflow: 'visible',
  }}
>
  {/* Navigation buttons: Dashboard, Contacts, Calendar, etc. */}
</AppShell.Header>
```
- **Height:** 80px
- **Status:** ✅ Works in Safari (stays fixed)

### 2. AppShell.Main (Scrolling Container)
```tsx
<AppShell.Main
  style={{
    backgroundColor: isDark ? '#1A1B1E' : '#f5f5f5',
    padding: 0,
    overflow: 'auto',
    height: '100vh',
    paddingTop: '80px', // Account for fixed header
  }}
>
  {children}
</AppShell.Main>
```

### 3. Letters Title Section (NOT WORKING in Safari ❌)
```tsx
<Box
  style={{
    position: 'sticky',
    top: 0, // Stick to top of scrolling container
    zIndex: 90,
    backgroundColor: isDark ? '#25262b' : '#ffffff',
    borderBottom: `1px solid ${isDark ? '#373A40' : '#dee2e6'}`,
    padding: `${rem(8)} 0`,
    margin: 0,
  }}
>
  <Title order={2} style={{ textAlign: 'center', fontSize: rem(24), fontWeight: 500, margin: 0 }}>
    Letters
  </Title>
</Box>
```
- **Height:** ~41px (8px padding top + 24px title + 8px padding bottom + 1px border)
- **Status:** ❌ Scrolls away in Safari instead of sticking

### 4. Toolbar (NOT WORKING in Safari ❌)
```tsx
<Box
  style={{
    position: 'sticky',
    top: '41px', // Below Letters title
    zIndex: 80,
    backgroundColor: 'var(--mantine-color-body)',
    borderBottom: '1px solid var(--mantine-color-default-border)',
    padding: '1rem',
    margin: 0,
  }}
>
  <Group gap="xs" style={{ maxWidth: '1200px', margin: '0 auto' }}>
    <Button>New Page</Button>
    <Button>Preview PDF</Button>
  </Group>
</Box>
```
- **Status:** ❌ Scrolls away in Safari instead of sticking

### 5. Letter Editor Content (Should scroll)
```tsx
<div className="letter-editor-shell">
  <Stack gap="xl">
    {/* Letter pages with TipTap editors */}
  </Stack>
</div>
```
- **Status:** ✅ Scrolls correctly

## Expected Behavior

When scrolling down the page:
1. ✅ **Navigation** stays fixed at viewport top (working in Safari)
2. ❌ **Letters title** should stick at top of content area (NOT working in Safari)
3. ❌ **Toolbar** should stick below Letters title (NOT working in Safari)
4. ✅ **Editor pages** should scroll (working in Safari)

## Current Behavior in Safari

When scrolling down:
- Navigation stays fixed ✅
- **Letters title scrolls away** ❌ (should stick)
- **Toolbar scrolls away** ❌ (should stick)
- Editor pages scroll ✅

## What We've Tried

### Attempt 1: `position: sticky` with `top: 80px`
```tsx
// Letters title
position: 'sticky',
top: 80, // Below navigation
```
❌ **Result:** Scrolled away in Safari

### Attempt 2: `position: sticky` with `top: 0` relative to scrolling container
```tsx
// AppShell.Main
overflow: 'auto',
height: 'calc(100vh - 80px)',

// Letters title
position: 'sticky',
top: 0,
```
❌ **Result:** Still scrolled away in Safari

### Attempt 3: Full viewport height with padding
```tsx
// AppShell.Main
overflow: 'auto',
height: '100vh',
paddingTop: '80px',

// Letters title
position: 'sticky',
top: 0,
```
❌ **Result:** Still scrolling away in Safari

## Technical Details

- **Framework:** Next.js 15.5.6, React, Mantine UI v7
- **AppShell:** Mantine's `AppShell` component
- **Safari Version:** Latest macOS Safari (WebKit)
- **Chrome:** Works perfectly ✅
- **Layout Engine:** CSS `position: sticky`

## Screenshots

### Image 1: Initial State (Safari)
- Navigation visible at top ✅
- Letters title visible below navigation ✅
- Toolbar visible below title ✅
- Letter editor visible ✅

### Image 2: After Scrolling (Safari)
- Navigation STILL visible at top ✅
- **Letters title GONE** (scrolled away) ❌
- **Toolbar GONE** (scrolled away) ❌
- Letter editor moved up ✅

## Questions for ChatGPT

1. **Why does `position: sticky` work for the Navigation header but not for the Letters title and Toolbar in Safari?**

2. **Is there a known Safari WebKit issue with sticky positioning inside Mantine's `AppShell.Main` component?**

3. **What's the correct way to create a multi-layer sticky header in Safari where:**
   - Layer 1 (Navigation): Fixed at viewport top
   - Layer 2 (Letters title): Sticky at top of scrolling content
   - Layer 3 (Toolbar): Sticky below Letters title
   - Content: Scrolls normally

4. **Should we use `position: fixed` instead of `position: sticky`? If so, how do we stack them correctly?**

5. **Is there a CSS workaround or JavaScript solution that works reliably in Safari?**

6. **Could the issue be related to:**
   - Mantine's AppShell z-index stacking?
   - The `overflow: auto` on AppShell.Main?
   - Safari's interpretation of sticky positioning in flex/grid containers?
   - The `paddingTop: 80px` interfering with sticky behavior?

## Desired Solution

We need a **Safari-compatible solution** that:
- ✅ Works in both Safari and Chrome
- ✅ Keeps Letters title and Toolbar visible at top while scrolling
- ✅ Maintains proper z-index stacking
- ✅ Has no gaps between sections
- ✅ Doesn't require complex JavaScript scroll listeners (prefer pure CSS)

## Additional Context

- The Navigation header uses Mantine's `AppShell.Header` component
- The Letters title and Toolbar are custom `Box` components
- We're using `position: 'sticky'` in React inline styles
- The scrolling container is `AppShell.Main`
- We need the solution to work with Mantine's component structure

---

**Please provide a Safari-compatible solution for this sticky header issue!** 🙏

