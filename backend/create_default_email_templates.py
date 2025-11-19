"""
Create Default Email Templates
Run this script to populate the database with default templates for each category
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from invoices.models import EmailTemplate, EmailGlobalSettings


def create_default_templates():
    """Create default templates for all categories"""
    
    templates = [
        # INVOICES
        {
            'name': 'Standard Invoice',
            'category': 'invoice',
            'description': 'Standard invoice email for all appointments and services',
            'subject': 'Invoice {invoice_number} from {clinic_name}',
            'body_html': '''<p>Dear {contact_name},</p>

<p>Thank you for visiting {clinic_name}. Please find attached your invoice {invoice_number}.</p>

<p><strong>Invoice Details:</strong></p>
<ul>
<li>Invoice Number: {invoice_number}</li>
<li>Date: {invoice_date}</li>
<li>Amount Due: ${amount_due}</li>
<li>Due Date: {due_date}</li>
</ul>

<p>Payment can be made via bank transfer to the account details shown on the invoice.</p>

<p>If you have any questions, please don't hesitate to contact us.</p>

<p>Best regards,<br>{clinic_name}</p>''',
            'header_color': '#5b95cf',  # WalkEasy Blue
            'is_default': True,
        },
        {
            'name': 'Overdue Notice (7 Days)',
            'category': 'invoice',
            'description': 'Friendly reminder for invoices 7 days overdue',
            'subject': 'Payment Reminder: Invoice {invoice_number}',
            'body_html': '''<p>Dear {contact_name},</p>

<p>This is a friendly reminder that invoice {invoice_number} is now overdue.</p>

<p><strong>Invoice Details:</strong></p>
<ul>
<li>Invoice Number: {invoice_number}</li>
<li>Original Due Date: {due_date}</li>
<li>Amount Outstanding: ${amount_due}</li>
</ul>

<p>If you have already made payment, please disregard this email. If not, we would appreciate payment at your earliest convenience.</p>

<p>If you are experiencing financial difficulty or would like to discuss payment options, please contact us.</p>

<p>Kind regards,<br>{clinic_name}</p>''',
            'header_color': '#f59e0b',
            'is_default': False,
        },
        {
            'name': 'Payment Plan Invoice',
            'category': 'invoice',
            'description': 'Invoice for patients on a payment plan',
            'subject': 'Payment Plan - Invoice {invoice_number}',
            'body_html': '''<p>Dear {contact_name},</p>

<p>As per your payment plan arrangement, please find attached invoice {invoice_number}.</p>

<p><strong>Payment Plan Details:</strong></p>
<ul>
<li>Invoice Number: {invoice_number}</li>
<li>Payment Due: ${amount_due}</li>
<li>Due Date: {due_date}</li>
</ul>

<p>Thank you for your continued commitment to your payment plan.</p>

<p>If you have any questions or concerns, please contact us.</p>

<p>Best regards,<br>{clinic_name}</p>''',
            'header_color': '#5b95cf',  # WalkEasy Blue
            'is_default': False,
        },
        
        # RECEIPTS
        {
            'name': 'Standard Receipt',
            'category': 'receipt',
            'description': 'Receipt email for paid invoices',
            'subject': 'Receipt - Invoice {invoice_number} - PAID',
            'body_html': '''<p>Dear {contact_name},</p>

<p>Thank you for your payment. Please find attached your receipt for invoice {invoice_number}.</p>

<p><strong>Payment Details:</strong></p>
<ul>
<li>Invoice Number: {invoice_number}</li>
<li>Amount Paid: ${amount_paid}</li>
<li>Payment Date: {payment_date}</li>
<li>Payment Method: {payment_method}</li>
</ul>

<p>This invoice is now marked as PAID in our system.</p>

<p>Thank you for your business!</p>

<p>Best regards,<br>{clinic_name}</p>''',
            'header_color': '#5b95cf',  # WalkEasy Blue
            'is_default': True,
        },
        
        # QUOTES
        {
            'name': 'Standard Quote',
            'category': 'quote',
            'description': 'Standard quote email',
            'subject': 'Quote {quote_number} from {clinic_name}',
            'body_html': '''<p>Dear {contact_name},</p>

<p>Thank you for your enquiry. Please find attached quote {quote_number} for the requested services.</p>

<p><strong>Quote Details:</strong></p>
<ul>
<li>Quote Number: {quote_number}</li>
<li>Date: {quote_date}</li>
<li>Total Amount: ${quote_total}</li>
<li>Valid Until: {expiry_date}</li>
</ul>

<p>This quote is valid for 30 days from the date shown above.</p>

<p>If you would like to proceed or have any questions, please contact us.</p>

<p>Best regards,<br>{clinic_name}</p>''',
            'header_color': '#667eea',
            'is_default': True,
        },
        {
            'name': 'NDIS Quote',
            'category': 'quote',
            'description': 'Quote for NDIS participants',
            'subject': 'NDIS Quote {quote_number}',
            'body_html': '''<p>Dear {contact_name},</p>

<p>Please find attached quote {quote_number} for NDIS services/equipment.</p>

<p><strong>NDIS Quote Details:</strong></p>
<ul>
<li>Quote Number: {quote_number}</li>
<li>NDIS Participant: {contact_name}</li>
<li>Total Amount: ${quote_total}</li>
<li>Valid Until: {expiry_date}</li>
</ul>

<p>This quote can be submitted to the NDIS for approval. All line items are priced according to NDIS guidelines.</p>

<p>Please contact us if you need any assistance with your NDIS plan or have questions about this quote.</p>

<p>Best regards,<br>{clinic_name}</p>''',
            'header_color': '#667eea',
            'is_default': False,
        },
        
        # AT REPORTS
        {
            'name': 'Standard AT Report',
            'category': 'at_report',
            'description': 'Standard AT Assessment Report email',
            'subject': 'NDIS AT Assessment Report - {participant_name}',
            'body_html': '''<p>Hello,</p>

<p>Please find attached the completed NDIS Assistive Technology Assessment Report for {participant_name}.</p>

<p><strong>Report Details:</strong></p>
<ul>
<li>Participant: {participant_name}</li>
<li>Assessment Date: {assessment_date}</li>
<li>Assessor: {assessor_name}</li>
</ul>

<p>This report has been prepared in accordance with NDIS guidelines and includes detailed recommendations for assistive technology.</p>

<p>If you require any clarification or have questions regarding this assessment, please don't hesitate to contact us.</p>

<p>Best regards,<br>{clinic_name}</p>''',
            'header_color': '#667eea',
            'is_default': True,
        },
        {
            'name': 'Urgent AT Report',
            'category': 'at_report',
            'description': 'Urgent AT report requiring immediate attention',
            'subject': 'URGENT: AT Assessment Report - {participant_name}',
            'body_html': '''<p>Hello,</p>

<p><strong>URGENT:</strong> Please find attached the completed NDIS Assistive Technology Assessment Report for {participant_name}.</p>

<p>This assessment has been flagged as urgent due to the participant's immediate needs.</p>

<p><strong>Report Details:</strong></p>
<ul>
<li>Participant: {participant_name}</li>
<li>Assessment Date: {assessment_date}</li>
<li>Assessor: {assessor_name}</li>
<li>Priority: URGENT</li>
</ul>

<p>Immediate review and approval is recommended to ensure timely support for the participant.</p>

<p>Please contact us if you require any additional information.</p>

<p>Best regards,<br>{clinic_name}</p>''',
            'header_color': '#ef4444',
            'is_default': False,
        },
        
        # LETTERS
        {
            'name': 'Referral Letter',
            'category': 'letter',
            'description': 'Letter referring patient to specialist or other provider',
            'subject': 'Referral Letter - {patient_name}',
            'body_html': '''<p>Dear Dr. {recipient_name},</p>

<p>RE: {patient_name} (DOB: {patient_dob})</p>

<p>I am writing to refer the above patient for your assessment and management.</p>

<p><strong>Reason for Referral:</strong></p>
<p>{referral_reason}</p>

<p><strong>Relevant History:</strong></p>
<p>{patient_history}</p>

<p>I would appreciate your expert opinion and management recommendations.</p>

<p>Please feel free to contact me if you require any further information.</p>

<p>Yours sincerely,<br>{clinician_name}<br>{clinician_title}<br>{clinic_name}</p>''',
            'header_color': '#3b82f6',
            'is_default': True,
        },
        {
            'name': 'Discharge Summary',
            'category': 'letter',
            'description': 'Discharge summary to GP or referring provider',
            'subject': 'Discharge Summary - {patient_name}',
            'body_html': '''<p>Dear Dr. {recipient_name},</p>

<p>RE: {patient_name} (DOB: {patient_dob})</p>

<p>Thank you for referring the above patient to our service.</p>

<p><strong>Treatment Summary:</strong></p>
<p>{treatment_summary}</p>

<p><strong>Outcome:</strong></p>
<p>{outcome_summary}</p>

<p><strong>Recommendations:</strong></p>
<p>{recommendations}</p>

<p>The patient has been discharged from our service. Please contact us if you require any further information or if the patient requires additional support.</p>

<p>Yours sincerely,<br>{clinician_name}<br>{clinician_title}<br>{clinic_name}</p>''',
            'header_color': '#3b82f6',
            'is_default': False,
        },
        {
            'name': 'General Correspondence',
            'category': 'letter',
            'description': 'General letter template',
            'subject': 'Letter regarding {patient_name}',
            'body_html': '''<p>Dear {recipient_name},</p>

<p>RE: {patient_name} (DOB: {patient_dob})</p>

<p>{letter_body}</p>

<p>Please contact us if you require any further information.</p>

<p>Yours sincerely,<br>{clinician_name}<br>{clinician_title}<br>{clinic_name}</p>''',
            'header_color': '#3b82f6',
            'is_default': False,
        },
    ]
    
    print("\n🚀 Creating default email templates...\n")
    
    created_count = 0
    skipped_count = 0
    
    for template_data in templates:
        # Check if template already exists
        existing = EmailTemplate.objects.filter(
            category=template_data['category'],
            name=template_data['name']
        ).first()
        
        if existing:
            print(f"⏭️  Skipped: {template_data['category']}/{template_data['name']} (already exists)")
            skipped_count += 1
        else:
            EmailTemplate.objects.create(**template_data)
            default_marker = ' [DEFAULT]' if template_data.get('is_default') else ''
            print(f"✅ Created: {template_data['category']}/{template_data['name']}{default_marker}")
            created_count += 1
    
    print(f"\n📊 Summary:")
    print(f"   Created: {created_count} templates")
    print(f"   Skipped: {skipped_count} templates (already existed)")
    print(f"\n✅ Default templates setup complete!\n")


def create_global_settings():
    """Create default global settings"""
    print("🔧 Setting up email global settings...\n")
    
    settings = EmailGlobalSettings.get_settings()
    print(f"✅ Email global settings initialized (ID: {settings.pk})\n")


if __name__ == '__main__':
    create_default_templates()
    create_global_settings()
    print("🎉 All done! Email template system is ready to use.\n")

