'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Group,
  Button,
  TextInput,
  Textarea,
  Select,
  Switch,
  Text,
  Loader,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { getCsrfToken } from '../../utils/csrf';
import { IconMail, IconInfoCircle } from '@tabler/icons-react';

interface EmailTemplate {
  id: number;
  name: string;
  category: string;
  subject: string;
  body_html: string;
  is_default: boolean;
}

interface EmailInvoiceModalProps {
  opened: boolean;
  onClose: () => void;
  invoice: any; // Invoice or Quote data
  type: 'invoice' | 'receipt' | 'quote';
}

export default function EmailInvoiceModal({ opened, onClose, invoice, type }: EmailInvoiceModalProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000';
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [useGenerator, setUseGenerator] = useState(true);  // NEW: Toggle for generator
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [reconnectEmail, setReconnectEmail] = useState('');
  
  const [emailForm, setEmailForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachPdf: true,
    fromEmail: 'info@walkeasy.com.au',
  });

  // Check if user just came back from OAuth reconnection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthStatus = urlParams.get('status');
    
    if (oauthStatus === 'connected') {
      // Check if there's a pending email to resume
      const pendingEmail = sessionStorage.getItem('pending_email_invoice');
      if (pendingEmail) {
        try {
          const data = JSON.parse(pendingEmail);
          notifications.show({
            title: 'Gmail Reconnected!',
            message: 'Your Gmail account is now connected. You can send your email.',
            color: 'green',
          });
          sessionStorage.removeItem('pending_email_invoice');
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        } catch (e) {
          console.error('Failed to parse pending email data:', e);
        }
      }
    }
  }, []);

  // Fetch templates for this category
  useEffect(() => {
    if (opened) {
      fetchTemplates();
      
      // Set default recipient email
      if (invoice?.contact_email) {
        setEmailForm(prev => ({ ...prev, to: invoice.contact_email }));
      }
    }
  }, [opened, type]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/invoices/email-templates/?category=${type}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const templateList = data.results || data;
        setTemplates(templateList);
        
        // Auto-select default template
        const defaultTemplate = templateList.find((t: EmailTemplate) => t.is_default);
        if (defaultTemplate) {
          handleTemplateSelect(defaultTemplate.id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load email templates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string | null) => {
    if (!templateId) {
      setSelectedTemplate(null);
      return;
    }

    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      setSelectedTemplate(template);
      
      // Replace tokens in subject and body
      const replacedSubject = replaceTokens(template.subject);
      const replacedBody = replaceTokens(template.body_html);
      
      setEmailForm(prev => ({
        ...prev,
        subject: replacedSubject,
        body: replacedBody,
      }));
    }
  };

  const replaceTokens = (text: string): string => {
    if (!invoice) return text;

    const tokens: Record<string, string> = {
      '{invoice_number}': invoice.invoice_number || invoice.quote_number || '',
      '{quote_number}': invoice.quote_number || '',
      '{contact_name}': invoice.contact_name || '',
      '{patient_name}': invoice.patient_name || invoice.contact_name || '',
      '{clinic_name}': 'WalkEasy Nexus',
      '{invoice_date}': invoice.date || '',
      '{due_date}': invoice.due_date || '',
      '{amount_due}': invoice.amount_due || invoice.total || '',
      '{quote_total}': invoice.total || '',
      '{quote_date}': invoice.date || '',
    };

    let replaced = text;
    Object.entries(tokens).forEach(([token, value]) => {
      replaced = replaced.replace(new RegExp(token, 'g'), value);
    });

    return replaced;
  };

  const handleSend = async () => {
    // Validation
    if (!emailForm.to) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a recipient email address',
        color: 'red',
      });
      return;
    }

    // Only validate subject/body in legacy mode
    if (!useGenerator && (!emailForm.subject || !emailForm.body)) {
      notifications.show({
        title: 'Error',
        message: 'Please select a template or enter subject and body',
        color: 'red',
      });
      return;
    }

    setSending(true);
    try {
      console.log('Sending email:', {
        invoice_id: invoice.id,
        to: emailForm.to,
        subject: emailForm.subject,
        document_type: type,
        use_generator: useGenerator,
      });
      
      const payload: any = {
        invoice_id: invoice.id,
        to: emailForm.to,
        cc: emailForm.cc,
        bcc: emailForm.bcc,
        attach_pdf: emailForm.attachPdf,
        from_email: emailForm.fromEmail,
        document_type: type,
        use_generator: useGenerator,
        template_id: selectedTemplate?.id || null,
      };
      
      // Only include subject/body in legacy mode
      if (!useGenerator) {
        payload.subject = emailForm.subject;
        payload.body_html = emailForm.body;
      } else if (emailForm.subject) {
        // Allow custom subject even in generator mode
        payload.subject = emailForm.subject;
      }
      
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${API_URL}/api/invoices/send-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Email response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Email sent successfully:', data);
        notifications.show({
          title: 'Success',
          message: 'Email sent successfully!',
          color: 'green',
        });
        onClose();
      } else {
        const errorText = await response.text();
        console.error('Email send failed:', response.status, errorText);
        
        let errorMessage = 'Failed to send email';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.detail || errorMessage;
          
          // Check if it's a token error
          if (errorMessage.includes('No refresh token') || errorMessage.includes('reconnect')) {
            setReconnectEmail(emailForm.fromEmail);
            setShowReconnectModal(true);
            return; // Don't show the error notification
          }
        } catch (e) {
          errorMessage = errorText.substring(0, 200);
        }
        
        notifications.show({
          title: 'Error',
          message: errorMessage,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to send email: ' + error,
        color: 'red',
      });
    } finally {
      setSending(false);
    }
  };

  const handleReconnectGmail = () => {
    // Store the current invoice data so we can resume after OAuth
    sessionStorage.setItem('pending_email_invoice', JSON.stringify({
      invoice_id: invoice.id,
      type: type,
      to: emailForm.to,
      cc: emailForm.cc,
      bcc: emailForm.bcc,
      from: emailForm.fromEmail,
    }));
    
    // Get current page URL to return to
    const returnUrl = encodeURIComponent(window.location.href);
    
    // Redirect to Gmail OAuth flow with return URL
    window.location.href = `https://localhost:8000/gmail/oauth/connect/?return_url=${returnUrl}`;
  };

  return (
    <>
      {/* Reconnect Gmail Modal - Higher z-index to appear above email modal */}
      <Modal
        opened={showReconnectModal}
        onClose={() => setShowReconnectModal(false)}
        title="Gmail Connection Required"
        size="md"
        zIndex={300}
      >
        <Stack gap="md">
          <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
            The Gmail connection for <strong>{reconnectEmail}</strong> needs to be reconnected.
          </Alert>
          
          <Text size="sm">
            The OAuth token has expired or is invalid. Click below to reconnect this Gmail account.
          </Text>
          
          <Text size="xs" c="dimmed">
            You'll be redirected to Google to authorize access, then brought back here to complete sending your email.
          </Text>
          
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setShowReconnectModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReconnectGmail}
              leftSection={<IconMail size={16} />}
            >
              Connect Gmail Account
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Main Email Modal */}
      <Modal
      opened={opened}
      onClose={onClose}
      title={`Email ${type.charAt(0).toUpperCase() + type.slice(1)}`}
      size="xl"
    >
      {loading ? (
        <Stack align="center" py="xl">
          <Loader />
          <Text size="sm" c="dimmed">Loading templates...</Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {/* Generator Toggle */}
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            <Stack gap="xs">
              <Switch
                label="Use Professional Email Generator (Recommended)"
                description="Generate beautifully formatted emails automatically from invoice/quote data"
                checked={useGenerator}
                onChange={(e) => setUseGenerator(e.currentTarget.checked)}
                styles={{
                  label: { fontWeight: 600 },
                  description: { marginTop: 4 },
                }}
              />
              {!useGenerator && (
                <Text size="xs" c="dimmed" mt={4}>
                  Legacy mode: You can manually edit the email subject and body using templates.
                </Text>
              )}
            </Stack>
          </Alert>

          {/* Template Selection (affects header color in both modes) */}
          <Select
            label="Email Template"
            description={useGenerator ? "Template sets the header color and branding" : "Template fills in subject and body"}
            placeholder="Choose a template..."
            data={[
              { value: '', label: '-- Default --' },
              ...templates.map(t => ({
                value: t.id.toString(),
                label: `${t.name}${t.is_default ? ' (Default)' : ''}`,
              })),
            ]}
            value={selectedTemplate?.id.toString() || ''}
            onChange={handleTemplateSelect}
          />

          <Select
            label="Send From"
            description="Choose which email account to send from"
            data={[
              { value: 'info@walkeasy.com.au', label: 'info@walkeasy.com.au (Company)' },
              { value: 'craig@walkeasy.com.au', label: 'craig@walkeasy.com.au (Personal)' },
            ]}
            value={emailForm.fromEmail}
            onChange={(value) => setEmailForm({ ...emailForm, fromEmail: value || 'info@walkeasy.com.au' })}
          />

          <TextInput
            label="To"
            placeholder="recipient@example.com"
            required
            value={emailForm.to}
            onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
          />

          <Group grow>
            <TextInput
              label="CC"
              placeholder="cc@example.com"
              value={emailForm.cc}
              onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
            />
            <TextInput
              label="BCC"
              placeholder="bcc@example.com"
              value={emailForm.bcc}
              onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })}
            />
          </Group>

          <TextInput
            label="Subject"
            placeholder={useGenerator ? "Auto-generated (or enter custom subject)" : "Email subject"}
            value={emailForm.subject}
            onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            description={useGenerator ? "Leave blank to auto-generate" : undefined}
          />

          {!useGenerator && (
            <Textarea
              label="Message"
              placeholder="Email body..."
              rows={10}
              required
              value={emailForm.body}
              onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
            />
          )}

          {useGenerator && (
            <Alert color="green" icon={<IconInfoCircle size={16} />}>
              <Text size="sm">
                ✨ Email content will be professionally generated from your {type} data with:
              </Text>
              <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                <li>Professional header with custom color</li>
                <li>Formatted invoice/quote details</li>
                <li>Line items table</li>
                <li>Payment methods (for invoices)</li>
                <li>Status badges (PAID, OVERDUE, etc.)</li>
                <li>Responsive design for all devices</li>
              </ul>
            </Alert>
          )}

          <Switch
            label="Attach PDF"
            description="Include the invoice/quote PDF as an attachment"
            checked={emailForm.attachPdf}
            onChange={(e) => setEmailForm({ ...emailForm, attachPdf: e.target.checked })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              leftSection={<IconMail size={16} />}
              onClick={handleSend}
              loading={sending}
            >
              Send Email
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
    </>
  );
}

