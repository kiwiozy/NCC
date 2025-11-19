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
  
  const [emailForm, setEmailForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachPdf: true,
    fromEmail: 'info@walkeasy.com.au',
  });

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

    if (!emailForm.subject || !emailForm.body) {
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
      });
      
      const response = await fetch(`${API_URL}/api/invoices/send-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          invoice_id: invoice.id,
          to: emailForm.to,
          cc: emailForm.cc,
          bcc: emailForm.bcc,
          subject: emailForm.subject,
          body_html: emailForm.body,
          attach_pdf: emailForm.attachPdf,
          from_email: emailForm.fromEmail,
          document_type: type,
        }),
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

  return (
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
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            <Text size="sm">
              Select a template to auto-fill the email, or write your own message.
            </Text>
          </Alert>

          <Select
            label="Email Template"
            placeholder="Choose a template..."
            data={[
              { value: '', label: '-- No Template --' },
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
            placeholder="Email subject"
            required
            value={emailForm.subject}
            onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
          />

          <Textarea
            label="Message"
            placeholder="Email body..."
            rows={10}
            required
            value={emailForm.body}
            onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
          />

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
  );
}

