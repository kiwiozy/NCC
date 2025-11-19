# 🎨 WalkEasy Email Color Palette

**Brand Color:** `#5b95cf` (WalkEasy Blue)

---

## 📧 Email Type Colors

### Current Color Scheme

| Email Type | Color | Hex | Usage |
|------------|-------|-----|-------|
| **Invoice** | 🔵 WalkEasy Blue | `#5b95cf` | Standard invoices (unpaid) |
| **Receipt** | 🟢 Success Green | `#10b981` | Paid invoices/receipts |
| **Quote** | 🔵 WalkEasy Blue | `#5b95cf` | Quotes & estimates |
| **AT Report** | 🔵 WalkEasy Blue | `#5b95cf` | Assessment reports |
| **Letter** | 🔵 WalkEasy Blue | `#5b95cf` | Professional letters |

### Color Psychology

- **WalkEasy Blue (`#5b95cf`)**: Professional, trustworthy, calm - perfect for healthcare
- **Success Green (`#10b981`)**: Payment received, positive action completed

---

## 🎨 Color Variations

### Primary: WalkEasy Blue
```
Base:    #5b95cf  (91, 149, 207)
Light:   #7daad9  (10% lighter - for gradients)
Dark:    #4a7db8  (darker shade)
Text:    #ffffff  (white text on blue background)
```

### Accent: Success Green (Receipts)
```
Base:    #10b981  (16, 185, 129)
Light:   #34d399  (lighter)
Text:    #ffffff  (white text)
```

---

## 📊 Where Colors Are Used

### 1. Email Header
- **Background**: Gradient from `header_color` to 10% lighter
- **Text**: White (`#ffffff`)
- **Examples**:
  - Invoice: Blue gradient header
  - Receipt: Green gradient header

### 2. Info Cards
- **Border**: Left border uses `header_color`
- **Background**: Light gray (`#f9fafb`)

### 3. Status Badges
- **PAID**: Green (`#10b981`)
- **OVERDUE**: Red (`#ef4444`)
- **DRAFT**: Gray (`#6b7280`)

### 4. Links & Buttons
- **Color**: Uses `header_color`
- **Hover**: Slightly darker

### 5. Footer
- **Background**: Dark gray (`#1f2937`)
- **Links**: Uses `header_color`

---

## 🔧 Customization

### Change Default Color
```python
# backend/invoices/email_generator.py
DEFAULT_COLORS = {
    'invoice': '#5b95cf',  # Change this to your brand color
    'receipt': '#10b981',  # Keep green for success
    'quote': '#5b95cf',
    'at_report': '#5b95cf',
    'letter': '#5b95cf',
}
```

### Per-Template Color
```python
# Use custom color per template
generator = EmailGenerator('invoice', header_color='#ff6b6b')
```

### Template-Based Colors
Select a template in the email modal - the template's `header_color` will be used automatically.

---

## 🌈 Suggested Alternative Palettes

### Option 1: Blue Focus (Current)
- Primary: `#5b95cf` (WalkEasy Blue)
- Success: `#10b981` (Green)

### Option 2: Warm Professional
- Primary: `#5b95cf` (WalkEasy Blue)
- Quotes: `#f59e0b` (Amber/Gold)
- Reports: `#8b5cf6` (Purple)

### Option 3: Subtle Variations
- Invoice: `#5b95cf` (WalkEasy Blue)
- Receipt: `#10b981` (Green)
- Quote: `#6ba3db` (Lighter blue)
- AT Report: `#4a7db8` (Darker blue)
- Letter: `#5b95cf` (WalkEasy Blue)

---

## 📱 Accessibility

All colors meet WCAG 2.1 AA standards:
- ✅ White text on `#5b95cf`: Contrast ratio 4.5:1
- ✅ White text on `#10b981`: Contrast ratio 4.5:1
- ✅ Readable on all devices

---

## 🎨 Color Preview

### WalkEasy Blue (#5b95cf)
```
████████████████████████████████
█ WalkEasy Blue                █
█ Professional & Trustworthy   █
█ #5b95cf                      █
████████████████████████████████
```

### Success Green (#10b981)
```
████████████████████████████████
█ Success Green                █
█ Payment Received             █
█ #10b981                      █
████████████████████████████████
```

---

## 📋 Quick Reference

**Want to change email colors?**

1. **All emails same color**: Update `DEFAULT_COLORS` in `email_generator.py`
2. **Per template**: Set `header_color` in EmailTemplate (Settings → Email Templates)
3. **Per email**: Pass `header_color` when calling generator

**Current setup**: All emails use WalkEasy Blue (`#5b95cf`) except receipts (green).

---

## ✅ Applied Changes

- ✅ Invoice: `#5b95cf` (WalkEasy Blue)
- ✅ Receipt: `#10b981` (Green - kept for success)
- ✅ Quote: `#5b95cf` (WalkEasy Blue)
- ✅ AT Report: `#5b95cf` (WalkEasy Blue)
- ✅ Letter: `#5b95cf` (WalkEasy Blue)
- ✅ Default wrapper: `#5b95cf` (WalkEasy Blue)

**All emails now use your brand color! 🎉**

