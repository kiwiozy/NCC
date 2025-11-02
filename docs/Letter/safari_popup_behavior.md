# Safari Popups & Popovers – Developer Guide

## 1. Overview
Safari does **not** provide a user-facing prompt like “Allow popups/popovers for this session.”
Instead, it has strict rules for when popups (new windows/tabs) or HTML popover elements can appear.
There are two completely different meanings of “popover” in web development:

1. **JavaScript popups / new windows** → controlled by Safari’s popup blocker.
2. **HTML Popover API (`<popover>` elements)** → in-DOM overlays (no permissions needed).

This guide explains how each behaves and how to safely open a new window for a PDF or similar document without Safari blocking it.

---

## 2. JavaScript Popups (`window.open`)

### ✅ Allowed:
Safari allows popups if they are triggered **directly by a user gesture**, such as a click or tap event.

```js
document.getElementById("viewPdfButton").addEventListener("click", () => {
  window.open("/api/letters/pdf/123", "_blank");
});
```

- Works in Safari, Chrome, and Edge.
- The popup opens immediately without being blocked.

### ❌ Blocked:
The following are blocked silently — no prompt, no temporary allow:

```js
// ❌ Triggered automatically without user action
window.open("/api/letters/pdf/123", "_blank");

// ❌ Inside async code or event chain without gesture
setTimeout(() => window.open("/api/letters/pdf/123"), 1000);

// ❌ In response to fetch completion (not direct click)
fetch("/api/letters/pdf/123").then(() => window.open(...));
```

Safari only allows **synchronous popup calls** that originate from a user gesture in the same JavaScript execution stack.

---

## 3. HTML Popover API (`<popover>`)

Safari 17+ supports the new HTML Popover API natively.
It’s unrelated to popup windows — it simply toggles an **in-page overlay**.

```html
<button popovertarget="info">Show Info</button>
<div id="info" popover>Popover content here.</div>
```

- ✅ Always allowed, no permissions or prompts.
- 🚫 Does **not** create new tabs or windows.
- 💡 Useful for tooltips, dialogs, and menus.

---

## 4. Safari Settings (User-Controlled)

Users can manually override popup blocking **globally or per site**:

**Safari → Settings → Websites → Pop-up Windows**
- Options: *Block*, *Block and Notify*, or *Allow*.

There is **no session-level permission prompt** (unlike camera/location).
Once set, the preference persists for that domain.

---

## 5. Safely Opening PDFs in Safari

If you want to open a PDF (e.g., a letter preview) in Safari without being blocked:

### ✅ Correct Pattern

```tsx
<Button
  onClick={() => {
    // Triggered directly by click → allowed in Safari
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }}
>
  Open in new tab
</Button>
```

- Works on all browsers.
- Doesn’t require user settings.
- Opens PDF in a top-level context (Safari’s full native viewer).

### ❌ Incorrect Pattern

```tsx
// Calling window.open after async/await breaks Safari’s gesture chain
const handleOpenPdf = async () => {
  await generatePdf(); // Safari sees this as async context
  window.open(pdfUrl, "_blank"); // Blocked silently
};
```

If your logic must generate the PDF first, you can prompt the user *after* generation:

```tsx
const handleGenerateThenOpen = async () => {
  await generatePdf();
  alert("Your PDF is ready. Click OK to view.");
  window.open(pdfUrl, "_blank"); // now allowed, triggered by user OK click
};
```

---

## 6. Detecting Safari for Conditional Logic

If you need to adjust UI behavior for Safari (for example, show a PDF.js viewer instead):

```js
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
if (isSafari) {
  // use PDF.js or provide a new-tab link
}
```

---

## 7. Summary Table

| Scenario | Works in Safari | Prompt | Notes |
|-----------|----------------|---------|-------|
| `window.open()` from user click | ✅ | ❌ | Allowed popup |
| `window.open()` from async code | ❌ | ❌ | Blocked silently |
| HTML `<popover>` element | ✅ | ❌ | Always allowed (no prompt) |
| Top-level PDF viewer | ✅ | ❌ | Native Safari PDF viewer only works top-level |
| Session-based popup allowance | ❌ | ❌ | Feature doesn’t exist |

---

## 8. Key Takeaways

- Safari never shows an “Allow popups for this session” prompt.
- Only popups triggered by direct user gestures are allowed.
- Async code or background tasks will always be blocked.
- The HTML Popover API is separate and always allowed.
- To safely preview PDFs or letters: open them in a **new tab** or use a **PDF.js in-modal viewer**.

