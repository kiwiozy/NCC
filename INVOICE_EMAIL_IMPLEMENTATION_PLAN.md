# 📧 Invoice/Receipt Email Implementation Plan

**Deep Dive Analysis of AT Report Email System**

---

## 🔍 **DEEP DIVE COMPLETE - AT Report Email System Analysis**

I've completed a comprehensive analysis of the existing AT Report email functionality. Here's what I found:

---

## 📚 **How AT Report Email Works (Reference Implementation)**

### **1. Frontend Components (`ATReport.tsx`)**

**State Management:**
```typescript
const [emailModalOpen, setEmailModalOpen] = useState(false);
const [sendingEmail, setSendingEmail] = useState(false);
const [emailTo, setEmailTo] = useState('');
const [emailCc, setEmailCc] = useState('');
const [emailMessage, setEmailMessage] = useState('');
const [emailConnectionEmail, setEmailConnectionEmail] = useState('');
const [connectedAccounts, setConnectedAccounts] = useState<Array<...>>([]);
```

**Key Features:**
- ✅ Fetches connected Gmail accounts on mount
- ✅ Auto-selects primary/default account
- ✅ Multi-recipient support (comma/semicolon separated)
- ✅ CC field (optional)
- ✅ Custom message field (optional)
- ✅ Account selector (for multiple Gmail accounts)
- ✅ PDF attachment preview
- ✅ Validation (recipient required, account required if connected)
- ✅ Loading states during send
- ✅ Success/error notifications

**Email Modal UI:**
```typescript
<Modal opened={emailModalOpen} onClose={...} title="Email AT Report" size="lg">
  <Stack gap="md">
    {/* Info alert */}
    <Alert icon={<IconMail />} color="blue">
      Send the completed AT Report PDF to recipients via email...
    </Alert>
    
    {/* Gmail account selector */}
    <Select
      label="Send Using Account"
      description="Select which Gmail account to send from"
      data={connectedAccounts.map(account => ({...}))}
      value={emailConnectionEmail}
      onChange={(value) => setEmailConnectionEmail(value)}
      required
    />
    
    {/* To field */}
    <TextInput
      label="To (Recipients)"
      placeholder="recipient@example.com, another@example.com"
      description="Enter one or more email addresses (comma or semicolon separated)"
      required
      value={emailTo}
      onChange={(e) => setEmailTo(e.currentTarget.value)}
    />
    
    {/* CC field */}
    <TextInput
      label="CC (Optional)"
      placeholder="cc@example.com"
      value={emailCc}
      onChange={(e) => setEmailCc(e.currentTarget.value)}
    />
    
    {/* Custom message */}
    <Textarea
      label="Custom Message (Optional)"
      placeholder="Add a personal message..."
      rows={4}
      value={emailMessage}
      onChange={(e) => setEmailMessage(e.currentTarget.value)}
    />
    
    {/* Attachment preview */}
    <Alert color="gray" icon={<IconFileTypePdf />}>
      <Text>Attachment: Report_Name.pdf</Text>
    </Alert>
    
    {/* Actions */}
    <Group justify="flex-end">
      <Button variant="subtle" onClick={handleCancel}>Cancel</Button>
      <Button leftSection={<IconMail />} onClick={handleEmailReport} loading={sendingEmail}>
        Send Email
      </Button>
    </Group>
  </Stack>
</Modal>
```

**Send Email Handler:**
```typescript
const handleEmailReport = async () => {
  // 1. Validate recipient
  if (!emailTo || !emailTo.trim()) {
    notifications.show({ title: 'Error', message: 'Please enter recipient email', color: 'red' });
    return;
  }
  
  // 2. Validate account selection (if connected accounts exist)
  if (connectedAccounts.length > 0 && !emailConnectionEmail) {
    notifications.show({ title: 'Error', message: 'Please select a Gmail account', color: 'red' });
    return;
  }
  
  setSendingEmail(true);
  
  try {
    // 3. Parse email addresses (comma/semicolon separated)
    const toEmails = emailTo.split(/[,;]/).map(e => e.trim()).filter(e => e);
    const ccEmails = emailCc ? emailCc.split(/[,;]/).map(e => e.trim()).filter(e => e) : [];
    
    // 4. Send to backend API
    const response = await fetch('https://localhost:8000/api/ai/email-at-report/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: formData,                              // Full form data
        to_emails: toEmails,                         // Parsed recipients
        cc_emails: ccEmails,                         // Parsed CC
        custom_message: emailMessage || undefined,   // Optional message
        connection_email: emailConnectionEmail || undefined  // Gmail account to use
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }
    
    const result = await response.json();
    
    // 5. Success notification
    const accountName = connectedAccounts.find(a => a.email === emailConnectionEmail)?.display_name;
    notifications.show({
      title: 'Email Sent!',
      message: `AT Report emailed successfully to ${result.recipients} recipient(s) from ${accountName}`,
      color: 'green',
      icon: <IconCheck />,
    });
    
    // 6. Reset form and close modal
    setEmailModalOpen(false);
    setEmailTo('');
    setEmailCc('');
    setEmailMessage('');
    
    // 7. Refresh connected accounts (to update last_used_at)
    fetch('https://localhost:8000/gmail/connected-accounts/')
      .then(res => res.json())
      .then(data => setConnectedAccounts(data.accounts || []))
      .catch(err => console.error('Error refreshing:', err));
      
  } catch (error: any) {
    notifications.show({
      title: 'Email Failed',
      message: error.message || 'Failed to send email',
      color: 'red',
      icon: <IconAlertCircle />,
    });
  } finally {
    setSendingEmail(false);
  }
};
```

---

### **2. Backend API Endpoint (`ai_services/views.py`)**

**Endpoint:** `POST /api/ai/email-at-report/`

**Request Body:**
```json
{
  "data": {...form data...},
  "to_emails": ["recipient@example.com"],
  "cc_emails": ["cc@example.com"],
  "custom_message": "Custom message text",
  "connection_email": "sender@gmail.com"
}
```

**View Logic:**
```python
class EmailATReportView(APIView):
    def post(self, request):
        # 1. Extract parameters
        form_data = request.data.get('data')
        to_emails = request.data.get('to_emails', [])
        cc_emails = request.data.get('cc_emails', [])
        custom_message = request.data.get('custom_message', '')
        connection_email = request.data.get('connection_email', None)
        
        # 2. Validate
        if not form_data:
            return Response({'error': 'Form data is required'}, status=400)
        if not to_emails or not isinstance(to_emails, list):
            return Response({'error': 'At least one recipient required'}, status=400)
        
        try:
            # 3. Try Gmail integration first
            result = send_at_report_email_via_gmail(
                form_data=form_data,
                to_emails=to_emails,
                cc_emails=cc_emails if cc_emails else None,
                custom_message=custom_message if custom_message else None,
                connection_email=connection_email if connection_email else None
            )
            
            # 4. Return success
            return Response({
                'success': True,
                'message': result['message'],
                'recipients': result['recipients'],
                'method': 'gmail_api'
            })
            
        except Exception as gmail_error:
            # 5. Fallback to SMTP if Gmail API fails
            # (includes full fallback logic)
            ...
```

---

### **3. Email Service (`ai_services/at_report_email.py`)**

**Core Function:**
```python
def send_at_report_email_via_gmail(
    form_data: dict,
    to_emails: list,
    cc_emails: list = None,
    custom_message: str = None,
    connection_email: str = None
) -> dict:
    # 1. Generate PDF
    pdf_buffer = generate_at_report_pdf(form_data)
    pdf_bytes = pdf_buffer.getvalue()
    
    # 2. Generate filename
    participant_name = form_data.get('participant', {}).get('name', 'Report')
    ndis_number = form_data.get('participant', {}).get('ndisNumber', '')
    safe_name = ''.join(c for c in participant_name if c.isalnum() or c in (' ', '-', '_'))
    safe_name = safe_name.replace(' ', '_')
    filename = f'{safe_name}_{ndis_number}.pdf' if ndis_number else f'{safe_name}.pdf'
    
    # 3. Build email subject
    subject = f'NDIS AT Assessment Report - {participant_name}'
    
    # 4. Build HTML email body (professional template)
    body_html = f"""
    <html>
        <head>
            <style>
                /* Professional CSS styles */
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; }}
                .header {{ 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .content {{ background: #f9fafb; padding: 30px; }}
                .info-box {{ background: white; border-left: 4px solid #667eea; padding: 15px; }}
                /* ... more styles ... */
            </style>
        </head>
        <body>
            <div class="header">
                <h1>NDIS AT Assessment Report</h1>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                <p>Please find attached the completed NDIS Assistive Technology Assessment Report.</p>
                
                <div class="info-box">
                    <strong>Participant:</strong> {participant_name}<br>
                    <strong>NDIS Number:</strong> {ndis_number}<br>
                    <strong>Report Type:</strong> AT Assessment<br>
                    <strong>Prepared by:</strong> {assessor_name}
                </div>
                
                {f'<div class="custom-message">{custom_message}</div>' if custom_message else ''}
                
                <div class="checklist">
                    <h3>📋 Report Contents</h3>
                    <ul>
                        <li>Participant and plan management details</li>
                        <li>Comprehensive assessment of needs and goals</li>
                        <li>AT recommendations with evidence and rationale</li>
                        <li>Implementation and monitoring plan</li>
                        <li>Risk assessment and mitigation strategies</li>
                        <li>Declarations and consent documentation</li>
                    </ul>
                </div>
                
                <p><strong>📎 Attached:</strong> {filename}</p>
            </div>
            
            <div class="footer">
                <p><strong>WalkEasy Nexus</strong></p>
                <p style="font-size: 12px;">
                    This email and any attachments may contain confidential information.
                </p>
            </div>
        </body>
    </html>
    """
    
    # 5. Build plain text version
    body_text = f"""
    NDIS AT Assessment Report
    
    Participant: {participant_name}
    NDIS Number: {ndis_number}
    Report Type: AT Assessment
    
    {custom_message if custom_message else ''}
    
    Report Contents:
    - Participant and plan management details
    - Comprehensive assessment of needs and goals
    - AT recommendations with evidence and rationale
    - Implementation and monitoring plan
    - Risk assessment and mitigation strategies
    - Declarations and consent documentation
    
    Attached: {filename}
    
    ---
    WalkEasy Nexus
    """
    
    # 6. Prepare attachment
    attachments = [{
        'filename': filename,
        'content': pdf_bytes
    }]
    
    # 7. Send via Gmail API
    sent_email = gmail_service.send_email(
        to_emails=to_emails,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        cc_emails=cc_emails or [],
        attachments=attachments,
        metadata={'report_type': 'AT Report', ...},
        connection_email=connection_email
    )
    
    # 8. Return result
    return {
        'success': True,
        'message': f'Email sent successfully to {len(to_emails)} recipient(s)',
        'recipients': len(to_emails) + len(cc_emails or []),
        'email_id': str(sent_email.id),
        'gmail_message_id': sent_email.gmail_message_id,
        'filename': filename
    }
```

---

### **4. Gmail Service (`gmail_integration/services.py`)**

**Core Method:**
```python
class GmailService:
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body_html: str,
        body_text: str = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None,
        attachments: List[Dict[str, Any]] = None,
        connection_email: str = None,
        metadata: Dict[str, Any] = None
    ) -> SentEmail:
        # 1. Get Gmail connection (uses connection_email or primary)
        # 2. Build MIME message with all parts
        # 3. Attach PDF files
        # 4. Send via Gmail API
        # 5. Log to database (SentEmail model)
        # 6. Return SentEmail instance
```

**Key Features:**
- ✅ Multi-recipient support (To, CC, BCC)
- ✅ HTML + plain text email bodies
- ✅ PDF attachment handling
- ✅ Gmail API integration (appears in Sent folder)
- ✅ Multiple account support
- ✅ Database logging (SentEmail model)
- ✅ Metadata tracking
- ✅ Error handling

---

## 🎯 **Implementation Plan for Invoice/Receipt Email**

### **Phase 1: Backend API (Invoices App)**

**File:** `backend/invoices/views.py`

**New Endpoint:**
```python
@api_view(['POST'])
def email_invoice(request, invoice_link_id):
    """
    POST /api/invoices/xero/<invoice_link_id>/email/
    
    Body:
    {
        "to_emails": ["recipient@example.com"],
        "cc_emails": ["cc@example.com"],
        "custom_message": "Optional message",
        "connection_email": "sender@gmail.com",
        "document_type": "invoice" | "receipt"  // auto-detect from status
    }
    """
```

**New Service File:** `backend/invoices/email_service.py`

```python
def send_invoice_email(
    invoice_link_id: str,
    to_emails: list,
    cc_emails: list = None,
    custom_message: str = None,
    connection_email: str = None,
    is_receipt: bool = False
) -> dict:
    # 1. Fetch invoice from database
    # 2. Generate PDF (invoice or receipt based on is_receipt flag)
    # 3. Build professional email template (similar to AT Report)
    # 4. Send via gmail_service.send_email()
    # 5. Return result
```

**Email Template Structure:**
```html
<div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
    <h1>Tax Invoice</h1>  <!-- or "Receipt" for paid invoices -->
</div>

<div class="content">
    <p>Dear [Patient/Company Name],</p>
    <p>Please find attached your [invoice/receipt] for services rendered.</p>
    
    <div class="info-box">
        <strong>Invoice Number:</strong> ORC1061<br>
        <strong>Date:</strong> 17/11/2025<br>
        <strong>Amount:</strong> $2.00<br>
        <strong>Status:</strong> PAID<br>
    </div>
    
    <!-- Custom message if provided -->
    
    <div class="payment-info">
        <h3>Payment Details</h3>
        <p>Account Name: WalkEasy Nexus<br>
        BSB: 123-456<br>
        Account Number: 12345678<br>
        Reference: ORC1061</p>
    </div>
    
    <p><strong>📎 Attached:</strong> Invoice_ORC1061.pdf</p>
</div>

<div class="footer">
    <p><strong>WalkEasy Nexus</strong></p>
    <p>This email and any attachments may contain confidential information.</p>
</div>
```

---

### **Phase 2: Frontend Components**

**Option A: Add to Invoice Detail Modal**
- Add "Email Invoice" button next to "Download PDF"
- Opens email modal when clicked

**Option B: Add to Action Buttons (Inline)**
- Add email icon button in the invoices/quotes table
- Opens email modal for that specific invoice

**Option C: Both (Recommended)**
- Email button in detail modal (primary location)
- Email icon in table actions (quick access)

**New Component:** `frontend/app/components/xero/EmailInvoiceModal.tsx`

```typescript
interface EmailInvoiceModalProps {
  opened: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  contactEmail?: string;  // Pre-fill if available from contact
  documentType: 'invoice' | 'receipt';
}

export function EmailInvoiceModal({ opened, onClose, invoiceId, invoiceNumber, contactEmail, documentType }: EmailInvoiceModalProps) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTo, setEmailTo] = useState(contactEmail || '');
  const [emailCc, setEmailCc] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailConnectionEmail, setEmailConnectionEmail] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState<...>([]);
  
  // Fetch connected Gmail accounts on mount
  useEffect(() => {
    // ... (same as AT Report)
  }, []);
  
  const handleSendEmail = async () => {
    // Validation
    if (!emailTo || !emailTo.trim()) {
      notifications.show({ title: 'Error', message: 'Please enter recipient email', color: 'red' });
      return;
    }
    
    if (connectedAccounts.length > 0 && !emailConnectionEmail) {
      notifications.show({ title: 'Error', message: 'Please select a Gmail account', color: 'red' });
      return;
    }
    
    setSendingEmail(true);
    
    try {
      // Parse emails
      const toEmails = emailTo.split(/[,;]/).map(e => e.trim()).filter(e => e);
      const ccEmails = emailCc ? emailCc.split(/[,;]/).map(e => e.trim()).filter(e => e) : [];
      
      // Send to backend
      const response = await fetch(`https://localhost:8000/api/invoices/xero/${invoiceId}/email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_emails: toEmails,
          cc_emails: ccEmails,
          custom_message: emailMessage || undefined,
          connection_email: emailConnectionEmail || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      
      const result = await response.json();
      
      // Success notification
      notifications.show({
        title: 'Email Sent!',
        message: `${documentType === 'receipt' ? 'Receipt' : 'Invoice'} emailed successfully to ${result.recipients} recipient(s)`,
        color: 'green',
        icon: <IconCheck />,
      });
      
      // Reset and close
      onClose();
      setEmailTo('');
      setEmailCc('');
      setEmailMessage('');
      
      // Refresh connected accounts
      fetch('https://localhost:8000/gmail/connected-accounts/')
        .then(res => res.json())
        .then(data => setConnectedAccounts(data.accounts || []))
        .catch(err => console.error('Error refreshing:', err));
        
    } catch (error: any) {
      notifications.show({
        title: 'Email Failed',
        message: error.message || 'Failed to send email',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setSendingEmail(false);
    }
  };
  
  return (
    <Modal opened={opened} onClose={onClose} title={`Email ${documentType === 'receipt' ? 'Receipt' : 'Invoice'}`} size="lg">
      <Stack gap="md">
        <Alert icon={<IconMail />} color="blue">
          <Text size="sm">
            Send the {documentType === 'receipt' ? 'receipt' : 'invoice'} PDF to recipients via email.
            {documentType === 'receipt' && ' The PDF will include a "PAID" watermark.'}
          </Text>
        </Alert>
        
        {/* Gmail account selector */}
        {connectedAccounts.length > 0 && (
          <Select
            label="Send Using Account"
            description="Select which Gmail account to send from"
            data={connectedAccounts.map(account => ({
              value: account.email,
              label: `${account.display_name || account.email}${account.is_primary ? ' (Primary)' : ''}`,
            }))}
            value={emailConnectionEmail}
            onChange={(value) => {
              setEmailConnectionEmail(value || '');
              if (value) localStorage.setItem('gmail_default_connection', value);
            }}
            required
            disabled={sendingEmail}
          />
        )}
        
        {/* To field */}
        <TextInput
          label="To (Recipients)"
          placeholder="recipient@example.com, another@example.com"
          description="Enter one or more email addresses (comma or semicolon separated)"
          required
          value={emailTo}
          onChange={(e) => setEmailTo(e.currentTarget.value)}
          leftSection={<IconMail size={16} />}
          disabled={sendingEmail}
        />
        
        {/* CC field */}
        <TextInput
          label="CC (Optional)"
          placeholder="cc@example.com"
          description="Carbon copy recipients (optional)"
          value={emailCc}
          onChange={(e) => setEmailCc(e.currentTarget.value)}
          disabled={sendingEmail}
        />
        
        {/* Custom message */}
        <Textarea
          label="Custom Message (Optional)"
          placeholder="Add a personal message to include in the email..."
          description="This message will be included in the email body"
          rows={4}
          value={emailMessage}
          onChange={(e) => setEmailMessage(e.currentTarget.value)}
          disabled={sendingEmail}
        />
        
        {/* Attachment preview */}
        <Alert color="gray" icon={<IconFileTypePdf />}>
          <Stack gap="xs">
            <Text size="sm" fw={500}>Attachment:</Text>
            <Text size="sm">
              {documentType === 'receipt' ? 'Receipt' : 'Invoice'}_{invoiceNumber}.pdf
            </Text>
          </Stack>
        </Alert>
        
        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            onClick={() => {
              onClose();
              setEmailTo('');
              setEmailCc('');
              setEmailMessage('');
            }}
            disabled={sendingEmail}
          >
            Cancel
          </Button>
          
          <Button
            leftSection={<IconMail size={18} />}
            onClick={handleSendEmail}
            loading={sendingEmail}
            gradient={{ from: 'blue', to: 'indigo' }}
          >
            Send Email
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

---

### **Phase 3: Integration Points**

**1. Invoice Detail Modal** (`InvoiceDetailModal.tsx`)
```typescript
const [emailModalOpened, setEmailModalOpened] = useState(false);

// Add button
<Button
  leftSection={<IconMail size={18} />}
  variant="light"
  color="blue"
  onClick={() => setEmailModalOpened(true)}
>
  Email Invoice
</Button>

// Add modal
<EmailInvoiceModal
  opened={emailModalOpened}
  onClose={() => setEmailModalOpened(false)}
  invoiceId={invoiceId}
  invoiceNumber={invoice.xero_invoice_number}
  contactEmail={invoice.contact_email}  // if available
  documentType={parseFloat(invoice.amount_due) === 0 ? 'receipt' : 'invoice'}
/>
```

**2. Invoices/Quotes Table** (main page & patient accounts)
```typescript
{/* Email button - Only for invoices */}
{item.type === 'invoice' && (
  <Tooltip label="Email Invoice">
    <ActionIcon
      variant="subtle"
      color="blue"
      onClick={() => {
        setSelectedInvoiceId(item.id);
        setEmailModalOpened(true);
      }}
    >
      <IconMail size={16} />
    </ActionIcon>
  </Tooltip>
)}
```

**3. Patient Accounts Component** (`PatientInvoicesQuotes.tsx`)
- Add email button in actions column
- Same logic as main invoices page

---

## 📋 **Implementation Checklist**

### **Backend:**
- [ ] Create `backend/invoices/email_service.py`
  - [ ] `send_invoice_email()` function
  - [ ] Generate PDF (invoice or receipt)
  - [ ] Build HTML email template
  - [ ] Build plain text version
  - [ ] Integrate with `gmail_service.send_email()`
- [ ] Add email endpoint to `backend/invoices/views.py`
  - [ ] `email_invoice()` view
  - [ ] Validation (recipients, invoice exists)
  - [ ] Error handling
- [ ] Add URL route to `backend/invoices/urls.py`
  - [ ] `POST /api/invoices/xero/<id>/email/`
- [ ] Test with Postman/curl

### **Frontend:**
- [ ] Create `EmailInvoiceModal.tsx` component
  - [ ] Gmail account selector
  - [ ] To/CC fields
  - [ ] Custom message textarea
  - [ ] Attachment preview
  - [ ] Send handler with validation
  - [ ] Loading states
  - [ ] Success/error notifications
- [ ] Update `InvoiceDetailModal.tsx`
  - [ ] Add "Email Invoice" button
  - [ ] Integrate EmailInvoiceModal
- [ ] Update main invoices/quotes page
  - [ ] Add email icon button in actions
  - [ ] Integrate EmailInvoiceModal
- [ ] Update `PatientInvoicesQuotes.tsx`
  - [ ] Add email icon button in actions
  - [ ] Integrate EmailInvoiceModal
- [ ] Update patient accounts page
  - [ ] Add email button
  - [ ] Integrate EmailInvoiceModal

### **Testing:**
- [ ] Test with single recipient
- [ ] Test with multiple recipients (comma-separated)
- [ ] Test with CC recipients
- [ ] Test with custom message
- [ ] Test with different Gmail accounts
- [ ] Test invoice email (unpaid)
- [ ] Test receipt email (paid, with watermark)
- [ ] Test error handling (no recipients, invalid email, etc.)
- [ ] Test from all locations (detail modal, table, patient accounts)

### **Documentation:**
- [ ] Update `XERO_PAYMENT_PROCESSING.md` with email feature
- [ ] Add screenshots of email modal
- [ ] Document email template customization
- [ ] Add troubleshooting section

---

## 🎨 **Email Template Design Notes**

**For Invoices (Unpaid):**
- Green gradient header (matches invoice branding)
- "Tax Invoice" title
- Invoice details (number, date, amount, status)
- Payment instructions (bank details, reference)
- Custom message section (if provided)
- PDF attachment notice
- Professional footer with confidentiality notice

**For Receipts (Paid):**
- Same as invoice template
- "Receipt" title instead of "Tax Invoice"
- "PAID" status highlighted in green
- PDF will have "PAID" watermark
- Payment received acknowledgement
- Thank you message

**For Quotes:**
- Purple/violet gradient header (matches quote branding)
- "Quote" title
- Quote details (number, date, amount, expiry)
- Acceptance instructions
- Valid until date highlighted
- PDF attachment notice

---

## 🔑 **Key Differences from AT Report**

| Feature | AT Report | Invoice/Receipt |
|---------|-----------|-----------------|
| **Data Source** | Form data (`formData`) | Database (`XeroInvoiceLink`) |
| **PDF Generation** | Generate fresh from data | Use existing PDF endpoint with params |
| **Subject Line** | "NDIS AT Assessment Report - [Name]" | "Invoice ORC1061 - [Contact Name]" |
| **Header Color** | Purple gradient (NDIS) | Green (invoice) / Violet (quote) |
| **Filename** | `Name_NDIS123.pdf` | `Invoice_ORC1061.pdf` |
| **Attachment Info** | Report contents checklist | Invoice/payment details |
| **Recipient** | Can be anyone | Usually patient/company email |

---

## 💡 **Smart Features to Add**

1. **Auto-fill recipient email** from patient/company contact details
2. **Email history** - Track which invoices were emailed to whom
3. **Quick templates** - Pre-fill custom messages (e.g., "Payment reminder", "Thank you", "Receipt")
4. **BCC option** - Copy clinic admin on all emails
5. **Send reminder** - Button to resend to same recipients
6. **Email preview** - Show email before sending
7. **Schedule send** - Send invoice at specific date/time
8. **Batch email** - Email multiple invoices at once

---

## 📊 **Database Logging**

The `gmail_service.send_email()` already logs emails to the `SentEmail` model:
- ✅ Tracks sender account
- ✅ Tracks recipients (to, cc, bcc)
- ✅ Tracks subject, message ID
- ✅ Tracks status (sent, failed)
- ✅ Tracks timestamp
- ✅ Stores metadata (can include invoice_id, patient_id, etc.)

**Additional Tracking (Optional):**
- Add `last_emailed_at` field to `XeroInvoiceLink` model
- Add `last_emailed_to` field to store recipient
- Create `InvoiceEmailLog` model for detailed history

---

## ⏱️ **Estimated Implementation Time**

- **Backend (email service + endpoint):** 2-3 hours
- **Frontend (modal component):** 2-3 hours
- **Integration (all pages):** 1-2 hours
- **Testing:** 1-2 hours
- **Documentation:** 1 hour

**Total:** ~8-12 hours

---

## 🚀 **Ready to Implement?**

I've completed the deep dive analysis. The AT Report email system is robust and well-implemented. We can follow the exact same pattern for invoices/receipts with minimal changes.

**Next Steps:**
1. ✅ Review this implementation plan
2. ⏸️ Decide on integration points (where to add email buttons)
3. ⏸️ Choose email template design/colors
4. ⏸️ Start implementation (backend first, then frontend)

**Let me know when you're ready to start building!** 🎯

