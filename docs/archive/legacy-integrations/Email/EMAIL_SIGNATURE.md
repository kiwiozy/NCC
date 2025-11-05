# 📧 Email Signature Documentation

## Overview

All emails sent from the WalkEasy Nexus application automatically include the Walk Easy Pedorthics professional email signature.

---

## 🎨 Signature Design

The email signature includes:

- **Walk Easy Logo** (119x100px)
- **Company Name**: Walk Easy Pedorthics
- **Contact Information**:
  - Phone: 02 6766 3153
  - Email: info@walkeasy.com.au
  - Website: www.walkeasy.com.au
  - Facebook page link
- **Locations**:
  - 43 Harrison St, Cardiff, NSW 2285
  - 21 Dowe St, Tamworth, NSW 2340
- **PAA Member Logo** (Pedorthics Association of Australia)
- **Confidentiality Notice**
- **Environmental Notice** ("Please consider your environmental responsibility before printing this email")

---

## 📁 File Location

```
backend/gmail_integration/email_signature.html
```

---

## 🔧 Implementation

### Automatic Signature Appending

The signature is automatically appended to all emails sent via the Gmail API integration.

**Implementation in `gmail_integration/services.py`:**

```python
def _load_email_signature(self) -> str:
    """Load the email signature HTML template"""
    signature_path = os.path.join(
        os.path.dirname(__file__),
        'email_signature.html'
    )
    with open(signature_path, 'r', encoding='utf-8') as f:
        return f.read()

def _append_signature_to_body(self, body_html: str) -> str:
    """Append email signature to HTML body"""
    signature = self._load_email_signature()
    
    # If body is a complete HTML document, insert before </body>
    if '</body>' in body_html.lower():
        return body_html.replace('</body>', f'{signature}</body>')
    
    # Otherwise, just append
    return f"{body_html}\n\n{signature}"

def send_email(self, ...):
    """Send email with automatic signature appending"""
    body_html_with_signature = self._append_signature_to_body(body_html)
    # ... rest of email sending logic
```

### Where It's Applied

The signature is automatically added to:

1. ✅ **AT Report Emails** - When emailing NDIS AT assessment reports
2. ✅ **Custom Emails** - Emails sent via the Compose feature
3. ✅ **Template Emails** - Emails using email templates
4. ✅ **Test Emails** - Test emails sent via the connection test feature

---

## 🎨 Styling

The signature uses:

- **Font**: Verdana, sans-serif
- **Primary Color**: #2057A8 (Blue)
- **Text Color**: #355D68 (Dark teal)
- **Secondary Text**: #777 (Gray)
- **Width**: 750px (responsive table layout)
- **Images**: Hosted on walkeasy.com.au CDN

### Color Palette

```css
Brand Blue:       #2057A8
Dark Teal:        #355D68
Gray Text:        #777
Green (eco):      green
White Background: #ffffff
```

---

## 📝 Customization

### Updating the Signature

To update the email signature:

1. Edit: `backend/gmail_integration/email_signature.html`
2. Restart Django server (changes take effect immediately)
3. Test by sending a test email

### Fallback Signature

If the signature file cannot be loaded, a simple text-based fallback is used:

```html
<br><br>
<div style="font-family: Verdana, sans-serif; font-size: 12px; color: #777;">
    <strong>Walk Easy Pedorthics</strong><br>
    Phone: 02 6766 3153<br>
    Email: info@walkeasy.com.au<br>
    Web: <a href="http://www.walkeasy.com.au">www.walkeasy.com.au</a>
</div>
```

---

## 🖼️ Images Used

All images are hosted on walkeasy.com.au:

| Image | URL | Size |
|-------|-----|------|
| Walk Easy Logo | `https://walkeasy.com.au/wp-content/uploads/2023/10/Logo_600.png` | 119x100 |
| Separator | `https://walkeasy.com.au/wp-content/uploads/2023/10/Footer-Speperator.png` | 40px wide |
| Phone Icon | `https://walkeasy.com.au/wp-content/uploads/2023/10/Phone.png` | 24x24 |
| Email Icon | `https://walkeasy.com.au/wp-content/uploads/2023/10/Mail.png` | 24x24 |
| Facebook Icon | `https://walkeasy.com.au/wp-content/uploads/2023/10/Facebook.png` | 24x24 |
| Web Icon | `https://walkeasy.com.au/wp-content/uploads/2023/10/Web.png` | 24x24 |
| Pin Icon | `https://walkeasy.com.au/wp-content/uploads/2023/10/Pin.png` | 24x24 |
| PAA Logo | `https://walkeasy.com.au/wp-content/uploads/2023/10/PAA-Member-Logo-PNG.png` | 40px height |
| Eco Icon | `https://walkeasy.com.au/wp-content/uploads/2023/10/Think-berfore-printing-Small.png` | 50px height |

---

## ✅ Email Compatibility

The signature is designed for maximum email client compatibility:

- ✅ Gmail (Web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Outlook (Desktop, Web)
- ✅ Thunderbird
- ✅ Yahoo Mail
- ✅ Other modern email clients

### Compatibility Features

- Uses HTML tables (most compatible layout method)
- Inline CSS styling
- No external stylesheets
- Absolute image URLs (CDN hosted)
- No JavaScript
- No fancy HTML5/CSS3 features that might not render

---

## 🔐 Legal & Compliance

### Confidentiality Notice

The signature includes a standard confidentiality notice:

> "IMPORTANT: The contents of this email and any attachments are confidential. They are intended for the named recipient(s) only. If you have received this email by mistake, please notify the sender immediately and do not disclose the contents to anyone or make copies thereof."

### Environmental Notice

Includes an eco-friendly message:

> "Please consider your environmental responsibility before printing this email."

---

## 🧪 Testing

### Test the Signature

1. **Send Test Email:**
   - Go to Settings → Gmail → Compose
   - Send email to your own address
   - Verify signature appears correctly

2. **Test AT Report Email:**
   - Complete an AT Report
   - Click "Email Report"
   - Send to your test address
   - Verify signature appears after report content

3. **Check Different Email Clients:**
   - View in Gmail web
   - View on mobile devices
   - View in Outlook (if available)

---

## 📊 Signature Metrics

- **Total Width**: 750px
- **Logo Height**: 100px
- **Total Signature Height**: ~350px (varies with content)
- **File Size**: ~6KB (HTML only, images loaded from CDN)
- **Load Time**: Instant (HTML) + CDN image load

---

## 🔮 Future Enhancements

Potential future improvements:

- [ ] Dynamic signature based on sender (if multiple staff)
- [ ] Clinic-specific signatures (Cardiff vs. Tamworth)
- [ ] Signature management UI in Settings
- [ ] Multiple signature templates
- [ ] Signature analytics (tracking which emails are opened)
- [ ] Personalized signatures per user
- [ ] Signature A/B testing

---

## 📝 Notes

- **Images are externally hosted** on walkeasy.com.au CDN for reliability and to reduce email size
- **No tracking pixels** - the signature doesn't include any analytics tracking
- **Signature is required** - cannot be disabled (by design for brand consistency)
- **Mobile responsive** - signature displays well on all screen sizes
- **Professional branding** - maintains Walk Easy Pedorthics brand identity

---

**Last Updated**: November 1, 2025  
**Status**: ✅ Active & Working  
**Version**: 1.0.0

