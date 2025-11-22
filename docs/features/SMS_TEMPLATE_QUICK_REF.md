# SMS Template Manager - Quick Reference

**Status:** 📋 Ready to Build  
**Time Estimate:** 4-6 hours  
**Priority:** High

---

## 🎯 What We're Building

A comprehensive SMS template management system in **Settings → SMS Templates** that allows users to create, edit, and manage reusable SMS templates with dynamic variables.

---

## 📋 Quick Summary

### **Features:**
✅ Full CRUD operations (Create, Read, Update, Delete)  
✅ Dynamic variables (patient, appointment, clinic, clinician, company)  
✅ Live preview with sample data  
✅ Character counter + SMS segment calculation  
✅ Template categories with colored badges  
✅ Variable picker dropdown  
✅ Integration with existing SMS dialog

### **What Already Exists:**
- ✅ `SMSTemplate` model (needs category field)
- ✅ REST API endpoints (`/api/sms/templates/`)
- ✅ Template rendering method (`template.render(context)`)
- ✅ Demo templates (3 samples)

### **What We Need to Build:**
- 🆕 Add `category`, `character_count`, `sms_segment_count` fields to model
- 🆕 Frontend UI component (`SMSTemplateManager.tsx`)
- 🆕 Variable picker menu
- 🆕 Live preview feature
- 🆕 Navigation integration

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Settings Navigation                                     │
│  [General] [Funding] [Clinics] [SMS Templates]...       │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  SMSTemplateManager.tsx                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Templates Table                                     │ │
│  │  - Name, Category, Preview, Status, Actions        │ │
│  │  - [Edit] [Delete] buttons                         │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Add/Edit Modal                                      │ │
│  │  - Template Name                                    │ │
│  │  - Description                                      │ │
│  │  - Category (dropdown)                              │ │
│  │  - Message (textarea + variable picker)            │ │
│  │  - Live Preview                                     │ │
│  │  - Active toggle                                    │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  API: /api/sms/templates/                                │
│  - GET    (list templates)                               │
│  - POST   (create template)                              │
│  - PUT    (update template)                              │
│  - DELETE (delete template)                              │
│  - POST   /preview/ (render with sample data)            │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  Database: sms_templates table                           │
│  - id, name, description, category                       │
│  - message_template, is_active                           │
│  - character_count, sms_segment_count                    │
│  - created_at, updated_at                                │
└──────────────────────────────────────────────────────────┘
```

---

## 📊 Available Variables

### **👤 Patient**
```
{patient_name}          → John Smith
{patient_first_name}    → John
{patient_last_name}     → Smith
{patient_title}         → Mr
{patient_full_name}     → Mr John Smith
{patient_mobile}        → 0412 345 678
{patient_health_number} → ABC123456
```

### **📅 Appointment**
```
{appointment_date}       → Monday, November 20
{appointment_time}       → 10:00 AM
{appointment_date_short} → 20 Nov 2025
{appointment_duration}   → 30 minutes
{appointment_type}       → Initial Assessment
```

### **🏥 Clinic**
```
{clinic_name}    → Tamworth
{clinic_phone}   → 02 6766 3153
{clinic_address} → 43 Harrison St, Cardiff
```

### **👨‍⚕️ Clinician**
```
{clinician_name}       → Dr. Sarah Smith
{clinician_first_name} → Sarah
{clinician_title}      → Podiatrist
```

### **🏢 Company**
```
{company_name}  → WalkEasy Pedorthics
{company_phone} → 02 6766 3153
{company_email} → info@walkeasy.com.au
```

---

## 🗂 Template Categories

| Category | Badge Color | Use Case |
|----------|-------------|----------|
| Appointment Reminder | Blue | Pre-appointment reminders |
| Appointment Confirmation | Green | Confirm scheduled appointments |
| Follow-up Reminder | Orange | Post-appointment follow-ups |
| Cancellation Notice | Red | Appointment cancellations |
| Rescheduling | Yellow | Appointment changes |
| General Communication | Gray | Custom messages |
| Birthday/Special | Pink | Birthday wishes, holidays |

---

## 🎨 Example Templates

### **Appointment Reminder**
```
Hi {patient_name}, this is a reminder that you have an appointment on 
{appointment_date} at {appointment_time} with {clinician_name} at 
{clinic_name}. Please reply CONFIRM or CANCEL.

→ Renders as:
Hi John Smith, this is a reminder that you have an appointment on 
Monday, November 20 at 10:00 AM with Dr. Sarah Smith at Tamworth. 
Please reply CONFIRM or CANCEL.

(185 characters, 2 SMS segments)
```

### **Appointment Confirmation**
```
Hi {patient_name}, your appointment has been confirmed for 
{appointment_date} at {appointment_time} at {clinic_name}. 
We look forward to seeing you!

→ Renders as:
Hi John Smith, your appointment has been confirmed for Monday, 
November 20 at 10:00 AM at Tamworth. We look forward to seeing you!

(132 characters, 1 SMS segment)
```

### **Follow-up Reminder**
```
Hi {patient_name}, it's time for your follow-up appointment with 
{company_name}. Please call us on {company_phone} to schedule.

→ Renders as:
Hi John Smith, it's time for your follow-up appointment with WalkEasy 
Pedorthics. Please call us on 02 6766 3153 to schedule.

(142 characters, 1 SMS segment)
```

---

## 🔧 Implementation Steps

### **Phase 1: Backend (1-2 hours)**
1. Add `category`, `character_count`, `sms_segment_count` fields to `SMSTemplate` model
2. Create migration (`python manage.py makemigrations sms_integration`)
3. Run migration (`python manage.py migrate`)
4. Update serializer to include new fields
5. Add `/preview/` endpoint for template rendering

### **Phase 2: Frontend (3-4 hours)**
1. Create `SMSTemplateManager.tsx` component
2. Build templates table with CRUD operations
3. Create Add/Edit modal with variable picker
4. Add live preview feature
5. Integrate with Settings navigation
6. Test all features

### **Phase 3: Integration (30 minutes)**
1. Update SMS dialog to group templates by category
2. Test template selection in SMS dialog
3. Update documentation

---

## 🧪 Testing Checklist

**Backend:**
- [ ] Migration runs successfully
- [ ] CRUD operations work via API
- [ ] Template rendering works correctly
- [ ] Character counting is accurate
- [ ] SMS segment calculation is correct

**Frontend:**
- [ ] Templates table displays correctly
- [ ] Create/Edit/Delete operations work
- [ ] Variable picker inserts variables
- [ ] Live preview updates in real-time
- [ ] Character counter shows correct values
- [ ] Category badges display with colors
- [ ] Templates appear in SMS dialog

---

## 📁 Files to Create/Modify

### **Backend:**
- ✏️ `backend/sms_integration/models.py` (modify - add fields)
- ✏️ `backend/sms_integration/serializers.py` (modify - update serializer)
- ✏️ `backend/sms_integration/views.py` (modify - add preview endpoint)
- 🆕 Migration file (auto-generated)

### **Frontend:**
- 🆕 `frontend/app/components/settings/SMSTemplateManager.tsx`
- ✏️ `frontend/app/settings/page.tsx` (add SMS Templates tab)
- ✏️ `frontend/app/components/SettingsHeader.tsx` (add navigation item)
- ✏️ `frontend/app/components/dialogs/SMSDialog.tsx` (optional - group by category)

### **Documentation:**
- ✏️ `docs/integrations/SMS.md`
- ✏️ `docs/architecture/DATABASE_SCHEMA.md`
- ✏️ `CHANGELOG.md`

---

## 💡 Key Design Decisions

1. **Pattern Matching**: Follow `FundingSourcesSettings.tsx` for consistency
2. **Variable System**: Simple string replacement (no complex templating engine)
3. **Preview**: Client-side rendering with hardcoded sample data
4. **Categories**: Predefined categories (not user-customizable for now)
5. **Character Counting**: 160 chars = 1 SMS, then 153 chars per segment

---

## 🚀 Future Enhancements

- Template scheduling
- Template analytics (usage tracking)
- Template versioning
- Template testing (send test SMS)
- Template import/export
- Multi-language support
- Custom categories

---

**Ready to build! Full implementation details in `SMS_TEMPLATE_MANAGER_PLAN.md`** 🎉

