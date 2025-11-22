# SMS Template Manager - Implementation Plan

**Status:** 📋 **READY TO BUILD**  
**Date:** November 21, 2025  
**Priority:** High  
**Estimated Time:** 4-6 hours

---

## 📋 **Overview**

Build a comprehensive SMS template management system in Settings, following the proven patterns from **Funding Sources Settings** and **Email Template Manager**. This will allow users to create, edit, and manage custom SMS templates with dynamic variables (patient name, clinic info, appointment details, etc.).

---

## 🎯 **Goals**

1. **Create SMS Templates UI** - Full CRUD interface in Settings → SMS Templates
2. **Support Dynamic Variables** - Patient, clinic, appointment, clinician data
3. **Live Preview** - Real-time preview with sample data substitution
4. **Character Counter** - SMS segment calculation (160/153 chars)
5. **Template Categories** - Appointment reminders, confirmations, follow-ups, custom
6. **Integration** - Seamless integration with existing SMS dialog

---

## 🏗 **Architecture**

### **Existing Infrastructure** ✅

We already have:
- ✅ **Backend Models**: `SMSTemplate` model exists (`backend/sms_integration/models.py`)
- ✅ **Backend API**: REST endpoints exist (`/api/sms/templates/`)
- ✅ **Template Rendering**: `SMSTemplate.render(context)` method works
- ✅ **Demo Templates**: Management command creates 3 sample templates

### **What We're Building** 🆕

- 🆕 **Frontend UI**: Settings page for template management
- 🆕 **Variable Picker**: UI for inserting variables into templates
- 🆕 **Live Preview**: Real-time preview with sample data
- 🆕 **Character Counter**: SMS segment calculation display
- 🆕 **Template Categories**: Organize templates by type

---

## 📊 **Available Variables** (From Existing APIs)

Based on the existing codebase, we have access to these variables:

### **Patient Data** (From `Patient` model)
```python
{patient_name}          # Full name (e.g., "John Smith")
{patient_first_name}    # First name only
{patient_last_name}     # Last name only
{patient_title}         # Title (Mr., Mrs., Ms., Dr.)
{patient_full_name}     # Title + Full name (e.g., "Mr. John Smith")
{patient_mobile}        # Mobile phone number
{patient_email}         # Email address
{patient_health_number} # Health number
{patient_mrn}           # Medical record number
```

### **Appointment Data** (From `Appointment` model)
```python
{appointment_date}      # Date (e.g., "Monday, November 20")
{appointment_time}      # Time (e.g., "10:00 AM")
{appointment_date_short}# Short date (e.g., "20 Nov 2025")
{appointment_duration}  # Duration (e.g., "30 minutes")
{appointment_type}      # Type (e.g., "Initial Assessment")
{appointment_reason}    # Reason for visit
```

### **Clinic Data** (From `Clinic` model)
```python
{clinic_name}          # Clinic name (e.g., "Tamworth")
{clinic_phone}         # Clinic phone number
{clinic_address}       # Clinic address
{clinic_email}         # Clinic email
```

### **Clinician Data** (From `Clinician` model)
```python
{clinician_name}       # Clinician name (e.g., "Dr. Sarah Smith")
{clinician_first_name} # Clinician first name
{clinician_title}      # Professional title (e.g., "Podiatrist")
```

### **Company Data** (From `EmailGlobalSettings`)
```python
{company_name}         # Company name (e.g., "WalkEasy Pedorthics")
{company_phone}        # Company phone number
{company_email}        # Company email
{company_address}      # Company address
```

### **Meta Variables**
```python
{today_date}           # Today's date
{current_time}         # Current time
```

---

## 🎨 **UI Design** (Following Funding Sources Pattern)

### **Main Layout**

```
┌─────────────────────────────────────────────────────────────┐
│  Settings Navigation (SettingsHeader)                       │
│  [General] [Funding] [Clinics] [SMS Templates] [Email]...  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SMS Templates                                   [+ Add]    │
│  ───────────────────────────────────────────────────────    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Category                    Active  Actions          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📅 appointment_reminder      ✓     [Edit] [Delete]  │   │
│  │    Appointment reminder...                           │   │
│  │    160 chars (1 SMS)                                 │   │
│  │                                                       │   │
│  │ ✅ appointment_confirmation  ✓     [Edit] [Delete]  │   │
│  │    Appointment confirmation...                       │   │
│  │    185 chars (2 SMS)                                 │   │
│  │                                                       │   │
│  │ 🔔 followup_reminder         ✓     [Edit] [Delete]  │   │
│  │    Follow-up reminder...                             │   │
│  │    142 chars (1 SMS)                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### **Add/Edit Modal**

```
┌─────────────────────────────────────────────────────────────┐
│  Add SMS Template                                      [✕]  │
│  ───────────────────────────────────────────────────────    │
│                                                               │
│  Template Name *                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ appointment_reminder                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Description                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Send to patients 24 hours before appointment        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Category                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Appointment Reminder              [▼]               │   │
│  └─────────────────────────────────────────────────────┘   │
│  • Appointment Reminder  • Appointment Confirmation          │
│  • Follow-up Reminder    • Custom Message                    │
│                                                               │
│  Message Template *                  [Insert Variable ▼]    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Hi {patient_name}, this is a reminder that you      │   │
│  │ have an appointment on {appointment_date} at        │   │
│  │ {appointment_time} with {clinician_name} at         │   │
│  │ {clinic_name}. Please reply CONFIRM or CANCEL.      │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  185 characters (2 SMS segments)                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 Live Preview                                      │   │
│  │                                                       │   │
│  │ Hi John Smith, this is a reminder that you have an  │   │
│  │ appointment on Monday, November 20 at 10:00 AM with │   │
│  │ Dr. Sarah Smith at Tamworth. Please reply CONFIRM   │   │
│  │ or CANCEL.                                           │   │
│  │                                                       │   │
│  │ 185 characters (2 SMS segments)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ☑ Active                                                    │
│                                                               │
│  [Cancel]                                      [Save]        │
└─────────────────────────────────────────────────────────────┘
```

### **Variable Picker Menu**

```
┌────────────────────────────────┐
│ Insert Variable                │
├────────────────────────────────┤
│ 👤 Patient                     │
│   {patient_name}               │
│   {patient_first_name}         │
│   {patient_last_name}          │
│   {patient_title}              │
│   {patient_full_name}          │
│                                │
│ 📅 Appointment                 │
│   {appointment_date}           │
│   {appointment_time}           │
│   {appointment_date_short}     │
│   {appointment_duration}       │
│   {appointment_type}           │
│                                │
│ 🏥 Clinic                      │
│   {clinic_name}                │
│   {clinic_phone}               │
│   {clinic_address}             │
│                                │
│ 👨‍⚕️ Clinician                  │
│   {clinician_name}             │
│   {clinician_first_name}       │
│   {clinician_title}            │
│                                │
│ 🏢 Company                     │
│   {company_name}               │
│   {company_phone}              │
│   {company_email}              │
└────────────────────────────────┘
```

---

## 🗂 **Template Categories**

| Category | Description | Variables Used |
|----------|-------------|----------------|
| **Appointment Reminder** | Pre-appointment reminders | Patient, Appointment, Clinic, Clinician |
| **Appointment Confirmation** | Confirm scheduled appointments | Patient, Appointment, Clinic |
| **Follow-up Reminder** | Post-appointment follow-ups | Patient, Clinic, Company |
| **Cancellation Notice** | Appointment cancellations | Patient, Appointment, Clinic |
| **Rescheduling** | Appointment changes | Patient, Appointment (old + new) |
| **General Communication** | Custom messages | Patient, Clinic, Company |
| **Birthday/Special** | Birthday wishes, holidays | Patient, Company |

---

## 📦 **Implementation Steps**

### **Phase 1: Backend Enhancement** (1-2 hours)

#### **1.1 Update SMSTemplate Model**
Add category field to existing model:

```python
# backend/sms_integration/models.py

class SMSTemplate(models.Model):
    """Reusable SMS message templates"""
    
    CATEGORY_CHOICES = [
        ('appointment_reminder', 'Appointment Reminder'),
        ('appointment_confirmation', 'Appointment Confirmation'),
        ('followup_reminder', 'Follow-up Reminder'),
        ('cancellation', 'Cancellation Notice'),
        ('rescheduling', 'Rescheduling'),
        ('general', 'General Communication'),
        ('special', 'Birthday/Special'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='general',
        help_text="Template category for organization"
    )
    message_template = models.TextField(
        help_text="Template text. Variables: {patient_name}, {appointment_date}, {appointment_time}, {clinic_name}, {clinician_name}, etc."
    )
    is_active = models.BooleanField(default=True)
    
    # Metadata
    character_count = models.IntegerField(
        default=0,
        help_text="Approximate character count (calculated on save)"
    )
    sms_segment_count = models.IntegerField(
        default=1,
        help_text="Estimated SMS segments (160 chars = 1, then 153 per segment)"
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'sms_templates'
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name}"
    
    def calculate_character_count(self, sample_context: dict = None) -> int:
        """Calculate approximate character count with sample data"""
        if sample_context:
            rendered = self.render(sample_context)
            return len(rendered)
        # Return template length as approximation
        return len(self.message_template)
    
    def calculate_sms_segments(self) -> int:
        """Calculate number of SMS segments needed"""
        length = self.character_count or len(self.message_template)
        if length <= 160:
            return 1
        return 1 + ((length - 160) // 153) + (1 if (length - 160) % 153 > 0 else 0)
    
    def save(self, *args, **kwargs):
        """Auto-calculate character count and segments on save"""
        self.character_count = len(self.message_template)
        self.sms_segment_count = self.calculate_sms_segments()
        super().save(*args, **kwargs)
    
    def render(self, context: dict) -> str:
        """Render template with provided context variables"""
        message = self.message_template
        for key, value in context.items():
            placeholder = '{' + key + '}'
            message = message.replace(placeholder, str(value))
        return message
    
    def get_variables(self) -> list:
        """Extract variable names from template"""
        import re
        pattern = r'\{(\w+)\}'
        return re.findall(pattern, self.message_template)
```

#### **1.2 Create Migration**

```bash
cd backend
python manage.py makemigrations sms_integration -n add_template_categories
python manage.py migrate
```

#### **1.3 Update Serializer**

```python
# backend/sms_integration/serializers.py

class SMSTemplateSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    variables = serializers.SerializerMethodField()
    
    class Meta:
        model = SMSTemplate
        fields = [
            'id',
            'name',
            'description',
            'category',
            'category_display',
            'message_template',
            'is_active',
            'character_count',
            'sms_segment_count',
            'variables',
            'created_at',
            'updated_at',
            'created_by',
        ]
        read_only_fields = [
            'id',
            'character_count',
            'sms_segment_count',
            'variables',
            'created_at',
            'updated_at'
        ]
    
    def get_variables(self, obj):
        """Get list of variables used in template"""
        return obj.get_variables()
```

#### **1.4 Add Preview Endpoint**

```python
# backend/sms_integration/views.py

from rest_framework.decorators import action

class SMSTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for SMS Templates"""
    queryset = SMSTemplate.objects.all()
    serializer_class = SMSTemplateSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'category']
    
    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """
        Preview template with sample data
        POST /api/sms/templates/{id}/preview/
        Body: {
            "patient_name": "John Smith",
            "appointment_date": "Monday, November 20",
            ...
        }
        """
        template = self.get_object()
        context = request.data
        
        try:
            rendered_message = template.render(context)
            character_count = len(rendered_message)
            sms_segments = template.calculate_sms_segments() if character_count <= 160 else \
                          1 + ((character_count - 160) // 153) + (1 if (character_count - 160) % 153 > 0 else 0)
            
            return Response({
                'rendered_message': rendered_message,
                'character_count': character_count,
                'sms_segment_count': sms_segments,
                'variables_used': template.get_variables(),
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
```

---

### **Phase 2: Frontend UI** (3-4 hours)

#### **2.1 Create SMSTemplateManager Component**

**File:** `frontend/app/components/settings/SMSTemplateManager.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Button,
  Group,
  Table,
  ActionIcon,
  Badge,
  Modal,
  TextInput,
  Textarea,
  Switch,
  Select,
  Menu,
  Alert,
  Loader,
  Box,
  Divider,
  Code,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconAlertCircle,
  IconVariable,
  IconEye,
  IconCopy,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getCsrfToken } from '@/app/utils/csrf';

interface SMSTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  category_display: string;
  message_template: string;
  is_active: boolean;
  character_count: number;
  sms_segment_count: number;
  variables: string[];
  created_at: string;
  updated_at: string;
}

interface TemplateVariable {
  group: string;
  variables: { name: string; description: string }[];
}

// Available variables organized by category
const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    group: '👤 Patient',
    variables: [
      { name: '{patient_name}', description: 'Full name (e.g., "John Smith")' },
      { name: '{patient_first_name}', description: 'First name only' },
      { name: '{patient_last_name}', description: 'Last name only' },
      { name: '{patient_title}', description: 'Title (Mr., Mrs., Ms., Dr.)' },
      { name: '{patient_full_name}', description: 'Title + Full name' },
      { name: '{patient_mobile}', description: 'Mobile phone number' },
      { name: '{patient_health_number}', description: 'Health number' },
    ],
  },
  {
    group: '📅 Appointment',
    variables: [
      { name: '{appointment_date}', description: 'Date (e.g., "Monday, November 20")' },
      { name: '{appointment_time}', description: 'Time (e.g., "10:00 AM")' },
      { name: '{appointment_date_short}', description: 'Short date (e.g., "20 Nov 2025")' },
      { name: '{appointment_duration}', description: 'Duration (e.g., "30 minutes")' },
      { name: '{appointment_type}', description: 'Type (e.g., "Initial Assessment")' },
    ],
  },
  {
    group: '🏥 Clinic',
    variables: [
      { name: '{clinic_name}', description: 'Clinic name (e.g., "Tamworth")' },
      { name: '{clinic_phone}', description: 'Clinic phone number' },
      { name: '{clinic_address}', description: 'Clinic address' },
    ],
  },
  {
    group: '👨‍⚕️ Clinician',
    variables: [
      { name: '{clinician_name}', description: 'Clinician name' },
      { name: '{clinician_first_name}', description: 'Clinician first name' },
      { name: '{clinician_title}', description: 'Professional title' },
    ],
  },
  {
    group: '🏢 Company',
    variables: [
      { name: '{company_name}', description: 'Company name' },
      { name: '{company_phone}', description: 'Company phone' },
      { name: '{company_email}', description: 'Company email' },
    ],
  },
];

// Sample context for live preview
const SAMPLE_CONTEXT = {
  patient_name: 'John Smith',
  patient_first_name: 'John',
  patient_last_name: 'Smith',
  patient_title: 'Mr',
  patient_full_name: 'Mr John Smith',
  patient_mobile: '0412 345 678',
  patient_health_number: 'ABC123456',
  appointment_date: 'Monday, November 20',
  appointment_time: '10:00 AM',
  appointment_date_short: '20 Nov 2025',
  appointment_duration: '30 minutes',
  appointment_type: 'Initial Assessment',
  clinic_name: 'Tamworth',
  clinic_phone: '02 6766 3153',
  clinic_address: '43 Harrison St, Cardiff',
  clinician_name: 'Dr. Sarah Smith',
  clinician_first_name: 'Sarah',
  clinician_title: 'Podiatrist',
  company_name: 'WalkEasy Pedorthics',
  company_phone: '02 6766 3153',
  company_email: 'info@walkeasy.com.au',
};

const CATEGORY_OPTIONS = [
  { value: 'appointment_reminder', label: 'Appointment Reminder' },
  { value: 'appointment_confirmation', label: 'Appointment Confirmation' },
  { value: 'followup_reminder', label: 'Follow-up Reminder' },
  { value: 'cancellation', label: 'Cancellation Notice' },
  { value: 'rescheduling', label: 'Rescheduling' },
  { value: 'general', label: 'General Communication' },
  { value: 'special', label: 'Birthday/Special' },
];

export default function SMSTemplateManager() {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formMessage, setFormMessage] = useState('');
  const [formActive, setFormActive] = useState(true);
  
  // Preview state
  const [previewMessage, setPreviewMessage] = useState('');
  const [previewCharCount, setPreviewCharCount] = useState(0);
  const [previewSegments, setPreviewSegments] = useState(1);

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Update preview when message changes
  useEffect(() => {
    updatePreview();
  }, [formMessage]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://localhost:8000/api/sms/templates/', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }
      const data = await response.json();
      const templateList = data.results || data;
      setTemplates(templateList);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = () => {
    // Simple client-side rendering with sample data
    let rendered = formMessage;
    Object.entries(SAMPLE_CONTEXT).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    const charCount = rendered.length;
    const segments = charCount <= 160 ? 1 : Math.ceil((charCount - 160) / 153) + 1;
    
    setPreviewMessage(rendered);
    setPreviewCharCount(charCount);
    setPreviewSegments(segments);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormDescription('');
    setFormCategory('general');
    setFormMessage('');
    setFormActive(true);
    setPreviewMessage('');
    setPreviewCharCount(0);
    setPreviewSegments(1);
    setModalOpen(true);
  };

  const handleEdit = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description);
    setFormCategory(template.category);
    setFormMessage(template.message_template);
    setFormActive(template.is_active);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Template name is required',
        color: 'red',
      });
      return;
    }

    if (!formMessage.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Message template is required',
        color: 'red',
      });
      return;
    }

    try {
      const csrfToken = await getCsrfToken();
      const url = editingTemplate
        ? `https://localhost:8000/api/sms/templates/${editingTemplate.id}/`
        : 'https://localhost:8000/api/sms/templates/';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory,
        message_template: formMessage.trim(),
        is_active: formActive,
      };

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to save template');
      }

      notifications.show({
        title: 'Success',
        message: editingTemplate ? 'Template updated successfully' : 'Template created successfully',
        color: 'green',
        icon: <IconCheck />,
      });
      
      setModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      console.error('Error saving template:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to save template: ' + err.message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpened(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleteConfirmOpened(false);
    const id = itemToDelete;
    setItemToDelete(null);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`https://localhost:8000/api/sms/templates/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      notifications.show({
        title: 'Success',
        message: 'Template deleted successfully',
        color: 'green',
        icon: <IconCheck />,
      });
      
      fetchTemplates();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete template: ' + err.message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const insertVariable = (variable: string) => {
    // Insert variable at cursor position or end of message
    setFormMessage(prev => prev + variable);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: { [key: string]: string } = {
      appointment_reminder: 'blue',
      appointment_confirmation: 'green',
      followup_reminder: 'orange',
      cancellation: 'red',
      rescheduling: 'yellow',
      general: 'gray',
      special: 'pink',
    };
    return colors[category] || 'gray';
  };

  const rows = templates.map((template) => (
    <Table.Tr key={template.id}>
      <Table.Td>
        <Stack gap={4}>
          <Group gap="xs">
            <Text fw={500}>{template.name}</Text>
            <Badge
              size="sm"
              variant="light"
              color={getCategoryBadgeColor(template.category)}
            >
              {template.category_display}
            </Badge>
          </Group>
          {template.description && (
            <Text size="xs" c="dimmed">
              {template.description}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {template.character_count} chars ({template.sms_segment_count} SMS)
          </Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={2}>
          {template.message_template}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge color={template.is_active ? 'green' : 'gray'} variant="light">
          {template.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => handleEdit(template)}
            title="Edit template"
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => handleDelete(template.id)}
            title="Delete template"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="md">SMS Templates</Title>
          <Text c="dimmed" size="sm">
            Create and manage reusable SMS message templates with dynamic variables
          </Text>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper p="xl" shadow="sm" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>Templates</Title>
            <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>
              Add Template
            </Button>
          </Group>

          {loading ? (
            <Loader />
          ) : templates.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No templates found. Click "Add Template" to create one.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Template</Table.Th>
                  <Table.Th>Message Preview</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* Add/Edit Modal */}
        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingTemplate ? 'Edit SMS Template' : 'Add SMS Template'}
          size="xl"
        >
          <Stack gap="md">
            <TextInput
              label="Template Name"
              placeholder="e.g., appointment_reminder"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            
            <Textarea
              label="Description"
              placeholder="Brief description of what this template is used for"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              minRows={2}
            />
            
            <Select
              label="Category"
              placeholder="Select category"
              data={CATEGORY_OPTIONS}
              value={formCategory}
              onChange={(value) => setFormCategory(value || 'general')}
              required
            />

            <Box>
              <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm">Message Template</Text>
                <Menu shadow="md" width={250}>
                  <Menu.Target>
                    <Button size="xs" variant="light" leftSection={<IconVariable size={14} />}>
                      Insert Variable
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    {TEMPLATE_VARIABLES.map((group) => (
                      <div key={group.group}>
                        <Menu.Label>{group.group}</Menu.Label>
                        {group.variables.map((variable) => (
                          <Menu.Item
                            key={variable.name}
                            onClick={() => insertVariable(variable.name)}
                          >
                            <Stack gap={0}>
                              <Code>{variable.name}</Code>
                              <Text size="xs" c="dimmed">{variable.description}</Text>
                            </Stack>
                          </Menu.Item>
                        ))}
                        <Menu.Divider />
                      </div>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </Group>
              
              <Textarea
                placeholder="Your message here. Use {patient_name}, {appointment_date}, etc."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                minRows={5}
                required
              />
              
              <Text size="xs" c="dimmed" mt="xs">
                {formMessage.length} characters ({Math.ceil(formMessage.length / 160) || 1} SMS segments)
              </Text>
            </Box>

            {/* Live Preview */}
            {previewMessage && (
              <Box>
                <Text fw={500} size="sm" mb="xs">📋 Live Preview</Text>
                <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {previewMessage}
                  </Text>
                  <Divider my="xs" />
                  <Text size="xs" c="dimmed">
                    {previewCharCount} characters ({previewSegments} SMS segment{previewSegments > 1 ? 's' : ''})
                  </Text>
                </Paper>
              </Box>
            )}
            
            <Switch
              label="Active"
              description="Whether this template is active and available for use"
              checked={formActive}
              onChange={(e) => setFormActive(e.currentTarget.checked)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteConfirmOpened}
          onClose={() => setDeleteConfirmOpened(false)}
          title="Delete Template?"
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to delete this template? This action cannot be undone.
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setDeleteConfirmOpened(false)}>
                Cancel
              </Button>
              <Button color="red" onClick={confirmDelete}>
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
```

#### **2.2 Add to Settings Navigation**

**File:** `frontend/app/settings/page.tsx`

```typescript
// Add import
import SMSTemplateManager from '../components/settings/SMSTemplateManager';

// Update type
type SettingsTab = 'general' | 'funding-sources' | 'clinics' | 'appointment-types' | 'sms-templates' | 'email-templates' | 'data-management' | 'users';

// Add case in renderContent()
case 'sms-templates':
  return <SMSTemplateManager />;
```

**File:** `frontend/app/components/SettingsHeader.tsx`

```typescript
const menuItems = [
  { icon: <IconSettingsIcon size={24} />, label: 'General', value: 'general' },
  { icon: <IconCurrencyDollar size={24} />, label: 'Funding Sources', value: 'funding-sources' },
  { icon: <IconBuildingHospital size={24} />, label: 'Clinics', value: 'clinics' },
  { icon: <IconClock size={24} />, label: 'Appointment Types', value: 'appointment-types' },
  { icon: <IconMessage size={24} />, label: 'SMS Templates', value: 'sms-templates' },  // NEW
  { icon: <IconMail size={24} />, label: 'Email Templates', value: 'email-templates' },
  { icon: <IconDatabase size={24} />, label: 'Data Management', value: 'data-management' },
];
```

---

### **Phase 3: Integration with SMS Dialog** (30 minutes)

Update `frontend/app/components/dialogs/SMSDialog.tsx` to use the new template system (already supports templates, but ensure it shows categories):

```typescript
// Add category badge to template select
<Select
  placeholder="Choose a template (optional)"
  data={templates.map(t => ({
    value: t.id,
    label: t.name,
    group: t.category_display,  // Group by category
  }))}
  value={selectedTemplate}
  onChange={handleTemplateChange}
  clearable
/>
```

---

## 🧪 **Testing Checklist**

### **Backend Testing:**
- [ ] Run migration successfully
- [ ] Create template via API
- [ ] Update template via API
- [ ] Delete template via API
- [ ] Filter templates by category
- [ ] Preview endpoint returns rendered message
- [ ] Character count calculates correctly
- [ ] SMS segments calculate correctly

### **Frontend Testing:**
- [ ] Navigate to Settings → SMS Templates
- [ ] Create new template
- [ ] Edit existing template
- [ ] Delete template with confirmation
- [ ] Insert variables via dropdown
- [ ] Live preview updates in real-time
- [ ] Character counter shows correct count
- [ ] SMS segment count displays correctly
- [ ] Template categories display with colored badges
- [ ] Active/inactive toggle works
- [ ] Templates show in SMS dialog dropdown
- [ ] Template selection auto-fills message in SMS dialog

---

## 📚 **Documentation Updates**

Update these files after implementation:

1. **`docs/integrations/SMS.md`**
   - Add section on custom templates
   - Document available variables
   - Show examples of template usage

2. **`DATABASE_SCHEMA.md`**
   - Update `sms_templates` table schema
   - Document new `category`, `character_count`, `sms_segment_count` fields

3. **`CHANGELOG.md`**
   - Add entry for SMS Template Manager feature

---

## 🎯 **Success Criteria**

✅ Users can create/edit/delete SMS templates via Settings UI  
✅ Templates support dynamic variables (patient, appointment, clinic, etc.)  
✅ Live preview shows rendered template with sample data  
✅ Character counter and SMS segment calculation work correctly  
✅ Templates are organized by category with colored badges  
✅ Templates are available in existing SMS dialog  
✅ All CRUD operations work without errors  
✅ UI follows existing design patterns (Funding Sources, Email Templates)

---

## 🚀 **Future Enhancements**

- **Template Scheduling**: Schedule template-based SMS for future dates
- **Template Analytics**: Track which templates are most used
- **Template Versioning**: Keep history of template changes
- **Template Testing**: Send test SMS with sample data
- **Template Import/Export**: Share templates between environments
- **Multi-language Support**: Templates in different languages
- **Template Categories Management**: Allow users to create custom categories

---

## 📝 **Notes**

1. **Protected Files**: The backend `SMSTemplate` model exists but needs the new fields added. The model file is **NOT protected**, so we can safely modify it.

2. **Pattern Matching**: This implementation closely follows the `FundingSourcesSettings.tsx` pattern for consistency.

3. **Variable System**: The variable system is simple string replacement. For more complex logic (conditionals, loops), we'd need a templating engine like Jinja2.

4. **Character Counting**: SMS segments are calculated as:
   - 1 SMS = 160 characters
   - 2+ SMS = 153 characters per segment (7 chars for segmentation headers)

5. **Sample Data**: The live preview uses hardcoded sample data. In the future, we could fetch real patient/appointment data for more accurate previews.

---

**Ready to build! This plan provides everything needed to create a comprehensive SMS template management system that integrates seamlessly with your existing codebase.** 🎉

