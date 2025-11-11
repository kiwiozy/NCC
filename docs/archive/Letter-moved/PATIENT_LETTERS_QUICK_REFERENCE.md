# Patient Letters - Quick Reference

## Quick Access

**Location:** Patient Menu → Letters (hamburger icon)

**Badge:** Red circle shows letter count

## Common Actions

### Create Letter
```
1. Click "+ New Letter"
2. Edit Type, Recipient, Name
3. Write content
4. Click "Save"
```

### Edit Letter
```
1. Click letter from list
2. Make changes
3. Click "Save"
```

### Download PDF
```
1. Click "Download"
2. File: PatientName_LetterName.pdf
```

### Print Letter

**Safari:**
```
1. Click "Print"
2. New tab opens
3. Press ⌘+P
```

**Chrome/Firefox/Edge:**
```
1. Click "Print"
2. Print dialog auto-appears
```

### Delete Letter
```
1. Click "..." menu
2. Click "Delete"
3. Confirm
```

## Editor Toolbar

**Formatting:**
- B, I, U - Bold, Italic, Underline
- Font selector - 11 fonts
- Size selector - 8pt to 72pt
- Color pickers - Text & highlight

**Structure:**
- Lists (bullet, numbered)
- Headings (H1-H6)
- Alignment
- Links

**Pages:**
- "+ Add Page" - Add new page
- "Remove Page" - Delete last page

## Unsaved Changes

**Dialog prompts when:**
- Switching letters
- Creating new letter
- Closing dialog

**Options:**
- Save & Continue (blue)
- Discard Changes (red)

## Keyboard Shortcuts

**Editor:**
- `⌘/Ctrl + B` - Bold
- `⌘/Ctrl + I` - Italic
- `⌘/Ctrl + U` - Underline
- `⌘/Ctrl + Z` - Undo
- `⌘/Ctrl + Shift + Z` - Redo

**Safari Print:**
- `⌘/Ctrl + P` - Print from new tab

## Badge Count

**Location:** Patient Menu → Letters [#]

**Updates:**
- On create/delete (immediate)
- Every 2 seconds (polling)

## Metadata Fields

**Letter Type:**
- Predefined or custom text
- Examples: "Support Letter", "Follow-up Letter"

**Recipient:**
- Who the letter is addressed to
- Example: "Dr. John Smith"

**Name:**
- Used for PDF filename
- Example: "NDIS Support Letter"

## PDF Filename Format

```
PatientName_LetterName.pdf

Examples:
- Robert_Miller_NDIS_Support_Letter.pdf
- Jane_Doe_Follow_up_Letter.pdf
```

## Browser Compatibility

| Browser | Print Method |
|---------|-------------|
| Safari | New tab → ⌘+P |
| Chrome | Auto print dialog |
| Firefox | Auto print dialog |
| Edge | Auto print dialog |

## Troubleshooting

**Badge not showing:**
- Refresh page
- Check patient is selected

**Print not working (Safari):**
- Allow pop-ups for localhost
- Use ⌘+P in new tab

**Changes not saving:**
- Wait for "Saved at HH:MM:SS"
- Check internet connection

**PDF generation failed:**
- Retry
- Check server is running

## Tips

1. **Name field important** - Used for PDF filename
2. **Save before print** - Ensure latest changes
3. **Multi-page** - Add pages for longer letters
4. **⌘+S does nothing** - Click "Save" button instead
5. **Safari print** - New tab is normal behavior

## Support

**Documentation:**
- `/docs/features/PATIENT_LETTERS_FEATURE.md` - Full docs
- `/docs/features/SAFARI_PRINT_IMPLEMENTATION.md` - Print details

**Code Location:**
- `frontend/app/components/dialogs/PatientLettersDialog.tsx`
- `backend/letters/`

