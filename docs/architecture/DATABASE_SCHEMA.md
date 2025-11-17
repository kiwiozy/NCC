# Database Schema Documentation

**Purpose:** Centralized documentation of all database tables, fields, and relationships as we build features.

**Approach:** Document as we go - update this file whenever we add/modify tables, fields, or relationships.

> ⚠️ **IMPORTANT:** If this database schema documentation is updated, you **MUST** also update the "Database Schema Documentation" section in `.cursor/rules/projectrules.mdc` to keep them synchronized. The project rules file is used by Cursor AI to provide context-aware assistance, so both files must stay in sync.

**Last Updated:** 2025-11-17 (Added User Profiles feature: professional credentials and signatures for clinicians)

---

## 📊 **Current Database Tables**

### ✅ **1. `patients` Table**

**Model:** `patients.models.Patient`  
**Status:** ✅ Exists (updated with new fields)

**Fields:**

#### Primary & Identifiers
- `id` - UUID (primary key)
- `mrn` - CharField(50) - Medical Record Number (optional, unique)
- `health_number` - CharField(50) - Health number (optional, different from MRN)

#### Name Fields
- `title` - CharField(10) - Choices: Mr, Mrs, Ms, Miss, Dr, Prof
- `first_name` - CharField(100)
- `middle_names` - CharField(100) (optional)
- `last_name` - CharField(100)

#### Demographics
- `dob` - DateField - Date of Birth
- `sex` - CharField(20) - Choices: M, F, O, U
- `age` - Property (calculated from DOB)

#### Relationships
- `funding_type` - **ForeignKey** → `settings.FundingSource` (nullable)
  - Related name: `patients`
  - On delete: SET_NULL
- `clinic` - **ForeignKey** → `clinicians.Clinic` (nullable)
  - Related name: `patients`
  - On delete: SET_NULL

#### NDIS/Plan Information
- `coordinator_name` - CharField(200) - Coordinator name (e.g., "Warda - Ability Connect")
- `coordinator_date` - DateField - Date when coordinator was assigned
- `plan_start_date` - DateField - ⚠️ **LEGACY** NDIS plan start date (use `plan_dates_json` instead)
- `plan_end_date` - DateField - ⚠️ **LEGACY** NDIS plan end date (use `plan_dates_json` instead)

**⚠️ Note:** Frontend supports multiple coordinators with dates (array format), but backend currently only has single coordinator fields. Backend decision needed for multiple coordinators support.

#### JSON Fields
- `contact_json` - JSONField - Contact details (phones, emails, mobile)
  - **Structure:**
    ```json
    {
      "phone": {
        "home": { "value": "0412345678", "default": true },
        "work": { "value": "0298765432", "default": false }
      },
      "mobile": {
        "home": { "value": "0412345678", "default": false }
      },
      "email": {
        "home": { "value": "patient@example.com", "default": true },
        "work": { "value": "patient@work.com", "default": false }
      }
    }
    ```
    - **Legacy format also supported:** `{ "phone": "0412345678", "email": "patient@example.com" }`

- `plan_dates_json` - JSONField - Array of NDIS plan dates (replaces legacy `plan_start_date` and `plan_end_date`)
  - **Structure:**
    ```json
    [
      {
        "start_date": "2024-07-02",
        "end_date": "2025-10-31",
        "type": "1 Year Plan"
      },
      {
        "start_date": "2023-01-01",
        "end_date": "2024-06-30",
        "type": "2 Year Plan"
      }
    ]
    ```
  - **Fields:**
    - `start_date` - String (YYYY-MM-DD format) - Plan start date
    - `end_date` - String (YYYY-MM-DD format) - Plan end date
    - `type` - String (optional) - Plan type (e.g., "1 Year Plan", "2 Year Plan")
  - **Display:** Frontend shows most recent plan date (sorted by start_date descending)
  - **Usage:** Only displayed when patient's funding type is NDIS
  - **Frontend Features:** Add, edit, delete plan dates with hover actions

- `address_json` - JSONField - Address details
  - **Structure:**
    ```json
    {
      "street": "123 Main St",
      "street2": "Unit 4",
      "suburb": "Sydney",
      "postcode": "2000",
      "state": "NSW",
      "type": "home",
      "default": true
    }
    ```

- `emergency_json` - JSONField - Emergency contact details
- `flags_json` - JSONField - Risk flags, alerts, notes

#### Notes & Archive
- `notes` - TextField - General notes about patient
- `archived` - BooleanField - Soft delete flag
- `archived_at` - DateTimeField - When archived
- `archived_by` - CharField(100) - Who archived (optional)

#### Audit Fields
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Indexes:**
- `['last_name', 'first_name']`
- `['mrn']`
- `['created_at']`
- `['archived']`

---

### ✅ **2. `funding_sources` Table**

**Model:** `settings.models.FundingSource`  
**Status:** ✅ Exists

**Fields:**
- `id` - UUID (primary key)
- `name` - CharField(100) - Funding source name (e.g., "NDIS", "Private", "DVA")
- `code` - CharField(20) - Optional short code (e.g., "NDIS", "PRV", "DVA")
- `active` - BooleanField - Whether this funding source is active
- `order` - IntegerField - Order for sorting in dropdowns
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Relationships:**
- **One-to-Many:** `patients` ← Patient.funding_type

**Usage:**
- Managed through Settings page
- Used in patient forms/dropdowns
- Linked to patients via `funding_type` FK

---

### ✅ **3. `clinics` Table**

**Model:** `clinicians.models.Clinic`  
**Status:** ✅ Exists

**Fields:**
- `id` - UUID (primary key)
- `name` - CharField(200) - Clinic name
- `abn` - CharField(20) - Australian Business Number (nullable)
- `phone` - CharField(20) - Main clinic phone (nullable)
- `email` - EmailField - Main clinic email (nullable)
- `address_json` - JSONField - Clinic address (nullable)
- `color` - CharField(7) - Hex color for calendar (#3B82F6 default)
- `sms_reminder_template` - TextField - SMS template (nullable)
- `sms_reminders_enabled` - BooleanField - Default: True
- `filemaker_id` - UUIDField - Original FileMaker ID (nullable, unique)
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Relationships:**
- **One-to-Many:** `patients` ← Patient.clinic
- **One-to-Many:** `appointments` ← Appointment.clinic
- **One-to-Many:** `clinicians` ← Clinician.clinic

**Usage:**
- Managed through Settings → Clinics
- Used in calendar for scheduling
- Linked to patients, appointments, and clinicians

---

### ✅ **3b. `clinicians` Table** *(User Profiles)*

**Model:** `clinicians.models.Clinician`  
**Status:** ✅ Exists (Updated November 2025 with user profile fields)

**Fields:**

#### Primary & Relationships
- `id` - UUID (primary key)
- `clinic` - **ForeignKey** → `clinicians.Clinic` (SET_NULL, nullable)
  - Related name: `clinicians`
  - Primary clinic location
- `user` - **OneToOneField** → `auth.User` (SET_NULL, nullable) ✨ **NEW**
  - Related name: `clinician_profile`
  - Links clinician to Django user account for Google OAuth login

#### Basic Information
- `full_name` - CharField(200) - Clinician's full name
- `credential` - CharField(100) - Professional credentials (e.g., "CPed CM au") (nullable)
- `email` - EmailField - Clinician's email (nullable)
- `phone` - CharField(20) - Clinician's phone (nullable)
- `role` - CharField(50) - Choices: PEDORTHIST, ADMIN, RECEPTION, MANAGER, OTHER (nullable)
- `active` - BooleanField - Is clinician active? (default: True)

#### Professional Credentials ✨ **NEW** (November 2025)
- `registration_number` - CharField(100) - Professional registration (e.g., "Pedorthic Registration # 3454") (nullable)
- `professional_body_url` - URLField(200) - Professional body website (e.g., "www.pedorthics.org.au") (nullable)

#### Signatures ✨ **NEW** (November 2025)
- `signature_image` - CharField(500) - S3 key for signature image used in letters/PDFs (nullable)
- `signature_html` - TextField - HTML signature for emails (nullable)

#### Audit
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Methods:**
- `get_display_name()` - Returns name with credentials (e.g., "Craig Laird, CPed CM au")
- `get_signature_url()` - Returns presigned S3 URL for signature image
- `get_full_credentials_display()` - Returns multi-line string with name, credentials, registration, and URL

**Relationships:**
- **One-to-One:** `user` → Django User (optional link to login account)
- **Many-to-One:** `clinic` → Clinic (primary location)
- **One-to-Many:** `appointments` ← Appointment.clinician

**Usage:**
- **Settings → User Profiles:** Manage user profiles with professional credentials and signatures
- **Calendar:** Assigned to appointments as resources
- **Letters:** Signature images automatically added to patient letters
- **Emails:** HTML signatures appended to outgoing emails
- **Authentication:** Linked to Google OAuth user accounts

**Display Format:**
```
Craig Laird, CPed CM au
Pedorthic Registration # 3454
www.pedorthics.org.au
```

---

### ✅ **4. `appointments` Table**

**Model:** `appointments.models.Appointment`  
**Status:** ✅ Exists

**Fields:**
- `id` - UUID (primary key)
- `start_time` - DateTimeField - Appointment start (UTC, display in Australia/Sydney)
- `end_time` - DateTimeField - Appointment end (optional)
- `status` - CharField(20) - Choices: scheduled, checked_in, completed, cancelled, no_show
- `reason` - TextField - Reason for appointment/chief complaint
- `notes` - TextField - Additional appointment notes
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Relationships:**
- `patient` - **ForeignKey** → `patients.Patient`
  - Related name: `appointments`
  - On delete: PROTECT
- `clinician` - **ForeignKey** → `clinicians.Clinician` (nullable)
  - Related name: `appointments`
  - On delete: SET_NULL
- `clinic` - **ForeignKey** → `clinicians.Clinic`
  - Related name: `appointments`
  - On delete: PROTECT

---

### ✅ **5. `documents` Table**

**Model:** `documents.models.Document`  
**Status:** ✅ Exists

**Fields:**
- `id` - UUID (primary key)
- `object_id` - UUIDField - Generic Foreign Key target ID
- `content_type` - **ForeignKey** → `contenttypes.ContentType` (Generic FK)
- `file_name` - CharField(255)
- `original_name` - CharField(255)
- `file_size` - IntegerField - File size in bytes
- `mime_type` - CharField(100)
- `s3_bucket` - CharField(255)
- `s3_key` - CharField(512) - S3 object key/path
- `s3_url` - URLField(1024) - Pre-signed or public URL
- `category` - CharField(50) - Choices: medical, prescription, referral, xray, invoice, quote, consent, insurance, other
- `description` - TextField
- `tags` - JSONField - Array of tags
- `uploaded_by` - CharField(100)
- `uploaded_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)
- `is_active` - BooleanField

**Relationships:**
- **Generic Foreign Key:** Can link to any model (Patient, Appointment, etc.)
  - Uses `content_type` and `object_id` pattern

---

### ✅ **6. `reminders` Table**

**Model:** `reminders.models.Reminder`  
**Status:** ✅ Exists (Built)

**Fields:**

#### Primary & Relationships
- `id` - UUID (primary key)
- `patient` - **ForeignKey** → `patients.Patient` (CASCADE)
  - Related name: `reminders`
- `clinic` - **ForeignKey** → `clinicians.Clinic` (SET_NULL, nullable)
  - Related name: `reminders`

#### Reminder Details
- `note` - TextField - Reminder note/description
- `reminder_date` - DateField (optional) - Specific date for reminder
- `status` - CharField(20) - Choices: pending, scheduled, completed, cancelled
  - Default: 'pending'

#### Appointment Link
- `appointment_id` - UUIDField (nullable) - Link to appointment if converted
- `scheduled_at` - DateTimeField (nullable) - When converted to appointment

#### Audit Fields
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)
- `created_by` - CharField(100) (nullable) - User who created reminder

**Indexes:**
- `['status']`
- `['clinic', 'status']`
- `['patient']`
- `['reminder_date']`

**Usage:**
- Created from patient profile via ReminderDialog
- Appears in calendar "waiting list" section (pending status)
- Can be converted to appointment when scheduling
- API endpoints: See `docs/architecture/dialogs/ReminderDialog.md`

---

### ✅ **7. `socialaccount_socialapp` Table** (django-allauth)

**Model:** `allauth.socialaccount.models.SocialApp`  
**Status:** ✅ Exists (Created by django-allauth migrations)

**Fields:**
- `id` - AutoField (primary key)
- `provider` - CharField(30) - OAuth provider name (e.g., "google")
- `name` - CharField(40) - Application name
- `client_id` - CharField(191) - OAuth client ID
- `secret` - CharField(191) - OAuth client secret
- `key` - CharField(191) - Optional API key
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Relationships:**
- **Many-to-Many:** `sites` → `django.contrib.sites.Site` (links app to sites)

**Usage:**
- Stores OAuth provider credentials (Google, Microsoft, etc.)
- Linked to Django Sites framework
- Created via Django admin or management command
- Used by `google_login_direct` view to initiate OAuth flow

---

### ✅ **8. `socialaccount_socialaccount` Table** (django-allauth)

**Model:** `allauth.socialaccount.models.SocialAccount`  
**Status:** ✅ Exists (Created by django-allauth migrations)

**Fields:**
- `id` - AutoField (primary key)
- `user` - **ForeignKey** → `auth.User` (CASCADE)
  - Related name: `socialaccount_set`
- `provider` - CharField(30) - OAuth provider name (e.g., "google")
- `uid` - CharField(191) - Provider-specific user ID
- `last_login` - DateTimeField - Last login via this provider
- `date_joined` - DateTimeField - When account was linked
- `extra_data` - JSONField - Additional provider-specific data

**Relationships:**
- `user` - **ForeignKey** → `auth.User` (CASCADE)
- `socialtoken_set` - **One-to-Many** ← `socialaccount_socialtoken`

**Indexes:**
- `['provider', 'uid']` (unique together)

**Usage:**
- Links Django User accounts to OAuth provider accounts
- Stores provider-specific user information
- Created automatically when user logs in with OAuth provider

---

### ✅ **9. `socialaccount_socialtoken` Table** (django-allauth)

**Model:** `allauth.socialaccount.models.SocialToken`  
**Status:** ✅ Exists (Created by django-allauth migrations)

**Fields:**
- `id` - AutoField (primary key)
- `app` - **ForeignKey** → `socialaccount_socialapp` (CASCADE)
- `account` - **ForeignKey** → `socialaccount_socialaccount` (CASCADE)
  - Related name: `socialtoken_set`
- `token` - TextField - OAuth access token
- `token_secret` - TextField - OAuth refresh token (for OAuth1) or stored here for OAuth2
- `expires_at` - DateTimeField (nullable) - Token expiration time

**Relationships:**
- `app` - **ForeignKey** → `socialaccount_socialapp` (CASCADE)
- `account` - **ForeignKey** → `socialaccount_socialaccount` (CASCADE)

**Indexes:**
- `['app', 'account']` (unique together)

**Usage:**
- Stores OAuth access and refresh tokens
- Used by `GmailSocialAccountAdapter` to create/update `GmailConnection`
- Tokens are encrypted before storing in `GmailConnection` model

---

### ✅ **10. `account_emailaddress` Table** (django-allauth)

**Model:** `allauth.account.models.EmailAddress`  
**Status:** ✅ Exists (Created by django-allauth migrations)

**Fields:**
- `id` - AutoField (primary key)
- `user` - **ForeignKey** → `auth.User` (CASCADE)
- `email` - EmailField - Email address
- `verified` - BooleanField - Whether email is verified
- `primary` - BooleanField - Whether this is the primary email

**Relationships:**
- `user` - **ForeignKey** → `auth.User` (CASCADE)
- `emailconfirmation_set` - **One-to-Many** ← `account_emailconfirmation`

**Indexes:**
- `['email']` (unique)

**Usage:**
- Stores user email addresses
- Tracks email verification status
- Used for account management (not currently used for verification in this app)

---

### ✅ **11. `account_emailconfirmation` Table** (django-allauth)

**Model:** `allauth.account.models.EmailConfirmation`  
**Status:** ✅ Exists (Created by django-allauth migrations)

**Fields:**
- `id` - AutoField (primary key)
- `email_address` - **ForeignKey** → `account_emailaddress` (CASCADE)
- `created` - DateTimeField (auto_now_add)
- `sent` - DateTimeField (nullable)
- `key` - CharField(64) - Confirmation key (unique)

**Relationships:**
- `email_address` - **ForeignKey** → `account_emailaddress` (CASCADE)

**Indexes:**
- `['key']` (unique)

**Usage:**
- Stores email confirmation tokens
- Not currently used (email verification disabled: `ACCOUNT_EMAIL_VERIFICATION = 'none'`)

---

### ✅ **12. `sms_integration_smsmessage` Table**

**Model:** `sms_integration.models.SMSMessage`  
**Status:** ✅ Exists (Production Ready)

**Fields:**

#### Primary & Identifiers
- `id` - UUID (primary key)
- `external_message_id` - CharField(100) - SMS Broadcast message ID

#### Message Content
- `message` - TextField - SMS message content
- `phone_number` - CharField(20) - Recipient phone number (normalized: +61XXXXXXXXX)

#### Status & Delivery
- `status` - CharField(20) - Choices: sent, delivered, failed, pending
  - Default: 'sent'
- `sent_at` - DateTimeField (auto_now_add) - When message was sent
- `delivered_at` - DateTimeField (nullable) - When delivery was confirmed

#### Relationships
- `patient` - **ForeignKey** → `patients.Patient` (nullable, CASCADE)
  - Related name: `sms_messages`
- `user` - **ForeignKey** → `auth.User` (nullable, SET_NULL)
  - Related name: `sent_sms_messages`
  - Tracks who sent the message

#### Additional Fields
- `error_message` - TextField (blank) - Error details if delivery failed
- `cost` - DecimalField(10, 4) (nullable) - Cost in credits

**Indexes:**
- `['patient']`
- `['status']`
- `['sent_at']`
- `['external_message_id']`

**Usage:**
- Tracks all outbound SMS messages sent via SMSService
- Updated by delivery status webhook when status changes
- Displayed in patient SMS dialog (blue bubbles on right)

---

### ✅ **13. `sms_integration_smsinbound` Table**

**Model:** `sms_integration.models.SMSInbound`  
**Status:** ✅ Exists (Production Ready)

**Fields:**

#### Primary & Identifiers
- `id` - UUID (primary key)
- `external_message_id` - CharField(100) - SMS Broadcast message ID

#### Message Content
- `from_number` - CharField(20) - Sender phone number (normalized: +61XXXXXXXXX)
- `to_number` - CharField(20) - Our number that received the message
- `message` - TextField - SMS message content

#### Status & Processing
- `is_processed` - BooleanField - **Unread/Read status** (False = Unread, True = Read)
  - Default: False (unread)
  - Set to True when user opens SMS dialog
  - Used for unread SMS badge count in patient menu
- `received_at` - DateTimeField - When message was received
- `notes` - TextField (blank) - Auto-detected notes (e.g., "Auto-detected: Confirmation")

#### Relationships
- `patient` - **ForeignKey** → `patients.Patient` (nullable, SET_NULL)
  - Related name: `sms_inbound`
  - Auto-matched by phone number via webhook

**Indexes:**
- `['patient']`
- `['from_number']`
- `['received_at']`
- `['is_processed']`

**Usage:**
- Tracks all inbound SMS messages (replies from patients)
- Created by inbound webhook when SMS Broadcast receives a reply
- Auto-matches patient by phone number (searches contact_json and emergency_json)
- Phone numbers normalized: strips +, spaces, leading 0, adds country code (61)
- Displayed in patient SMS dialog (gray bubbles on left)
- **Unread Badge Feature:**
  - Red badge on "SMS" menu item shows count of unread messages (is_processed=False)
  - Auto-marks as read when user opens SMS dialog
  - Badge updates in real-time via 'smsRead' event
  - API endpoint: `/api/sms/patient/{patient_id}/unread-count/`
  - Mark as read endpoint: `/api/sms/patient/{patient_id}/mark-read/`

---

### ✅ **14. `sms_integration_smstemplate` Table**

**Model:** `sms_integration.models.SMSTemplate`  
**Status:** ✅ Exists

**Fields:**
- `id` - UUID (primary key)
- `name` - CharField(100) - Template name
- `content` - TextField - Template message content
- `is_active` - BooleanField - Whether template is active
- `created_at` - DateTimeField (auto_now_add)
- `updated_at` - DateTimeField (auto_now)

**Usage:**
- Stores reusable SMS message templates
- Managed through Settings page
- Used in patient SMS dialog for quick message selection

---

## 🔗 **Relationship Diagram**

```
patients
  ├── funding_type → funding_sources (FK, nullable)
  ├── clinic → clinics (FK, nullable)
  ├── appointments ← appointments (One-to-Many)
  ├── reminders ← reminders (One-to-Many)
  └── patient_notes ← notes (One-to-Many)

funding_sources
  └── patients ← patients.funding_type (One-to-Many)

clinics
  ├── patients ← patients.clinic (One-to-Many)
  ├── appointments ← appointments.clinic (One-to-Many)
  └── clinicians ← clinicians.clinic (One-to-Many, if exists)

appointments
  ├── patient → patients (FK, PROTECT)
  ├── clinician → clinicians (FK, nullable, SET_NULL)
  └── clinic → clinics (FK, PROTECT)

reminders ✅
  ├── patient → patients (FK, CASCADE)
  └── clinic → clinics (FK, nullable, SET_NULL)

documents
  └── Generic FK → Any model (content_type + object_id)

socialaccount_socialapp ✅
  └── sites → django.contrib.sites.Site (Many-to-Many)

socialaccount_socialaccount ✅
  ├── user → auth.User (FK, CASCADE)
  └── socialtoken_set ← socialaccount_socialtoken (One-to-Many)

socialaccount_socialtoken ✅
  ├── app → socialaccount_socialapp (FK, CASCADE)
  └── account → socialaccount_socialaccount (FK, CASCADE)

account_emailaddress ✅
  ├── user → auth.User (FK, CASCADE)
  └── emailconfirmation_set ← account_emailconfirmation (One-to-Many)

account_emailconfirmation ✅
  └── email_address → account_emailaddress (FK, CASCADE)
```

---

### ✅ **10. `letters_patientletter` Table**

**Model:** `letters.models.PatientLetter`  
**Status:** ✅ Exists

**Purpose:** Patient correspondence/letters system for creating, storing, and managing letters written for patients

**Fields:**

#### Primary & Identifiers
- `id` - UUID (primary key)
- `patient` - **ForeignKey** → `patients.Patient` (CASCADE)
  - Related name: `letters`
  - On delete: CASCADE

#### Letter Metadata
- `letter_type` - CharField(255) - Type of letter (user-entered text field)
  - Examples: "Support Letter", "Follow-up Letter", "Referral Letter", "NDIS Letter", etc.
  - Not restricted to predefined choices - users can enter any custom type
- `recipient_name` - CharField(255) - Recipient's name (optional, blank allowed)
- `subject` - CharField(255) - Letter subject/title (optional, blank allowed)

#### Letter Content
- `pages` - JSONField - Array of HTML pages from TipTap editor
  - **Structure:**
    ```json
    [
      "<p>Dear Dr. Smith,</p><p>...</p>",
      "<p>Page 2 content...</p>"
    ]
    ```
  - Each element is the HTML content of one page from the multi-page TipTap editor
  - Preserves all formatting (bold, italic, fonts, colors, lists, etc.)
  - Used for both editor display and PDF generation

#### Audit Fields
- `created_at` - DateTimeField (auto_now_add) - When letter was created
- `updated_at` - DateTimeField (auto_now) - When letter was last modified

**Methods:**
- `get_preview_text(max_length=100)` - Returns plain text preview of first page (strips HTML tags)

**Relationships:**
- **Many-to-One:** `patient` → Patient (each letter belongs to one patient)
- **Related Name:** `patient.letters.all()` - Get all letters for a patient

**Indexes:**
- `['patient', '-updated_at']` - For efficient patient letter listing (most recent first)
- `['letter_type']` - For filtering by letter type

**Ordering:** `-updated_at` (most recent first)

**Usage:**
- **Patient Letters Dialog:** 20/80 split - letter list on left (20%), editor on right (80%)
- **Auto-save Removed:** Manual save only with unsaved changes detection via MutationObserver
- **Unsaved Changes Detection:** Tracks both metadata changes and content changes across all pages
- **Actions:** Create, Edit, Save, Delete, Duplicate, Preview PDF, Download PDF, Email PDF (future), Print
- **Search/Filter:** By letter type, recipient name, or subject
- **Editor:** Full TipTap WYSIWYG editor with Walk Easy letterhead at 25% opacity
- **Multi-Page Support:** Add/remove pages, all pages monitored for changes
- **PDF Generation:** Uses Puppeteer with letterhead on all pages
- **PDF Download:** Filename format: `PatientName_LetterName.pdf`
- **Print (Safari):** Opens PDF in new tab (⌘+P to print)
- **Print (Chrome/Firefox/Edge):** Auto-print dialog via hidden iframe
- **Badge Count:** Red badge on "Letters" menu item shows count, updates via event + polling

**API Endpoints:**
- `GET /api/letters/?patient_id={uuid}` - List all letters for a patient (lightweight serializer, no full pages)
- `POST /api/letters/` - Create new letter
- `GET /api/letters/{uuid}/` - Get letter detail (includes full pages)
- `PUT /api/letters/{uuid}/` - Update letter (auto-save)
- `DELETE /api/letters/{uuid}/` - Delete letter
- `POST /api/letters/{uuid}/duplicate/` - Duplicate existing letter

**Frontend Integration:**
- Accessed from patient hamburger menu → "Letters"
- Red badge shows letter count (max 99+)
- Badge updates on create/delete (event-driven) + polling (every 2s)
- Reuses existing `LetterEditor.tsx` component (full TipTap editor with all formatting tools)
- Modal dialog with same width as Images dialog (95vw)
- Sticky toolbar scrolls with content, metadata scrolls away
- Unsaved changes prompt on close/switch letters
- Safari-compatible printing (new tab + ⌘+P)

**Performance Optimizations:**
- `getCurrentColor` memoized with state + useEffect (100+ calls → 0)
- Multi-page MutationObserver watches all pages
- Badge count uses polling + event-driven updates

**Documentation:**
- Full feature docs: `docs/features/PATIENT_LETTERS_FEATURE.md`
- Quick reference: `docs/features/PATIENT_LETTERS_QUICK_REFERENCE.md`
- Safari print guide: `docs/features/SAFARI_PRINT_IMPLEMENTATION.md`

---

## 📝 **Pending/Planned Tables**

### ❌ **Orders Table** (Not Yet Built)
- Needed for: Orders pages, Patient Detail, Dashboard
- Will link to: `patients`, `invoices`

### ❌ **Invoices Table** (Not Yet Built)
- Needed for: Invoice pages, Patient Detail, Order Detail
- Will link to: `patients`, `orders`

---

## 🔄 **FileMaker Migration - New Tables (Built ✅)**

**Status:** ✅ **All 9 tables created and migrated successfully!**  
**Date Built:** November 9, 2025  
**Source:** `docs/integrations/FILEMAKER.md`

### 1. **`referrers` Table** ✅

**Model:** `referrers.models.Referrer`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** 98 from FileMaker `API_Referrer`

**Purpose:** Medical professionals who refer patients (GPs, specialists, podiatrists, etc.)

**Fields:**
- `id` - UUID (primary key)
- `title` - CharField(10) - Mr, Mrs, Dr, Prof, etc.
- `first_name` - CharField(100)
- `last_name` - CharField(100)
- `specialty` - ForeignKey → `specialties` (nullable)
- `contact_json` - JSONField - Phone, email, mobile (same structure as patients)
- `address_json` - JSONField - Address details
- `practice_name` - CharField(200) - Name of medical practice
- `company` - ForeignKey → `companies` (nullable) - Links to practice
- `filemaker_id` - UUIDField (unique, nullable) - Original FileMaker ID
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**Relationships:**
- Many-to-One with `companies` (referrer → practice)
- Many-to-Many with `patients` via `patient_referrers` join table

---

### 2. **`coordinators` Table** ✅

**Model:** `coordinators.models.Coordinator`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** ~50 (extracted from `patients.coordinator_name`)

**Purpose:** NDIS Support Coordinators and LAC (Local Area Coordinators)

**Fields:**
- `id` - UUID (primary key)
- `first_name` - CharField(100)
- `last_name` - CharField(100)
- `organization` - CharField(200) - e.g., "Ability Connect", "Afford"
- `coordinator_type` - CharField(50) - Choices: "Support Coordinator", "LAC", "Plan Manager"
- `contact_json` - JSONField - Phone, email, mobile
- `address_json` - JSONField - Address details
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**Relationships:**
- Many-to-Many with `patients` via `patient_coordinators` join table (historical tracking)

**Migration Notes:**
- Parse from `patients.coordinator_name` field (e.g., "Warda - Ability Connect")
- Deduplicate by name to create unique coordinator records

---

### 3. **`companies` Table** ✅

**Model:** `companies.models.Company`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** 44 from FileMaker `API_Company`

**Purpose:** Medical practices, NDIS providers, organizations

**Fields:**
- `id` - UUID (primary key)
- `name` - CharField(200)
- `abn` - CharField(20) - Australian Business Number (nullable)
- `contact_json` - JSONField - Phone, email, fax
- `address_json` - JSONField - Address details
- `company_type` - CharField(50) - **Choices:** Medical Practice, NDIS Provider, Other ⚠️ **Implementation Note:** Using Django choices instead of FK to lookup table
- `filemaker_id` - UUIDField (unique, nullable) - Original FileMaker ID
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**⚠️ Implementation Difference:**
- Original design had separate `company_types` lookup table
- **Built with:** Django CharField with choices (simpler, fewer queries)
- **Missing:** Archive support (archived, archived_at, archived_by) - can add later if needed

**Relationships:**
- One-to-Many with `referrers` (practice → referrers)

---

### 4. **`general_contacts` Table** ✅

**Model:** `contacts.models.GeneralContact`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** 0 initially (new feature)

**Purpose:** Non-medical contacts (carers, family, emergency contacts, plumbers, accountants, etc.)

**Fields:**
- `id` - UUID (primary key)
- `first_name` - CharField(100)
- `last_name` - CharField(100)
- `contact_type` - CharField(50) - Choices: "Carer", "Family", "Emergency Contact", "Supplier", "Other"
- `contact_json` - JSONField - Phone, email, mobile
- `address_json` - JSONField - Address details
- `notes` - TextField (nullable)
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**Relationships:**
- Many-to-Many with `patients` via `contact_relationships` (generic relationships)

---

### 5. **`specialties` Table (Lookup)** ✅

**Model:** `referrers.models.Specialty`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** ~20 unique values from FileMaker `API_Referrer.Specialty`

**Purpose:** Medical specialties lookup table

**Fields:**
- `id` - UUID (primary key)
- `name` - CharField(100) - e.g., "GP", "Physiotherapist", "Occupational Therapist", "Psychologist"
- `created_at` - DateTimeField

**Relationships:**
- One-to-Many with `referrers` (specialty → referrers)

---

### 6. **`patient_referrers` Table (Join)** ✅

**Model:** `referrers.models.PatientReferrer`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** 255 from FileMaker `API_ContactToReferrer`

**Purpose:** Links patients to referrers with referral metadata

**Fields:**
- `id` - UUID (primary key)
- `patient` - ForeignKey → `patients` (on_delete=CASCADE)
- `referrer` - ForeignKey → `referrers` (on_delete=CASCADE)
- `referral_date` - DateField (nullable)
- `referral_reason` - TextField (nullable)
- `status` - CharField(20) - Choices: "Active", "Inactive", "Pending"
- `filemaker_id` - UUIDField (unique, nullable) - Original FileMaker ID
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**Unique Constraint:** `unique_together = [('patient', 'referrer')]`

---

### 7. **`patient_coordinators` Table (Join - Historical)** ✅

**Model:** `coordinators.models.PatientCoordinator`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** 2,845 (one per patient with coordinator_name)

**Purpose:** Tracks patient-coordinator relationships over time (historical tracking)

**Fields:**
- `id` - UUID (primary key)
- `patient` - ForeignKey → `patients` (on_delete=CASCADE)
- `coordinator` - ForeignKey → `coordinators` (on_delete=PROTECT)
- `assignment_date` - DateField - When coordinator was assigned
- `end_date` - DateField (nullable) - When assignment ended
- `is_current` - BooleanField - Is this the current coordinator?
- `ndis_plan_start` - DateField (nullable) - NDIS plan start date
- `ndis_plan_end` - DateField (nullable) - NDIS plan end date
- `ndis_notes` - TextField (nullable) - Notes specific to this coordinator assignment
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**Why Historical Tracking:**
- Coordinators change frequently
- Need to track: "Patient had 3 coordinators over 2 years"
- Each assignment has its own NDIS plan dates and notes

---

### 8. **`referrer_companies` Table (Join)** ✅

**Model:** `referrers.models.ReferrerCompany`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** 73 from FileMaker `API_ReferrerToCompany_Join`

**Purpose:** Links referrers to companies (many-to-many - a doctor can work at multiple practices)

**Fields:**
- `id` - UUID (primary key)
- `referrer` - ForeignKey → `referrers` (on_delete=CASCADE)
- `company` - ForeignKey → `companies` (on_delete=CASCADE)
- `position` - CharField(100) (nullable) - e.g., "Senior Podiatrist", "GP Partner"
- `is_primary` - BooleanField - Is this their primary practice?
- `filemaker_id` - UUIDField (unique, nullable) - Original FileMaker ID
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**Unique Constraint:** `unique_together = [('referrer', 'company')]`

---

### 9. **`contact_relationships` Table (Generic Relationships)** ⭐ ✅

**Model:** `contacts.models.ContactRelationship`  
**Status:** ✅ **Built and migrated**  
**Records to Import:** 0 initially (new feature)

**Purpose:** Link ANY contact to ANY other contact to track relationships (carers, family, emergency contacts, dual roles)

**Fields:**
- `id` - UUID (primary key)
- `from_content_type` - ForeignKey → `ContentType` - Type of source contact
- `from_object_id` - UUIDField - ID of source contact
- `from_contact` - GenericForeignKey - Actual source contact object
- `to_content_type` - ForeignKey → `ContentType` - Type of target contact
- `to_object_id` - UUIDField - ID of target contact
- `to_contact` - GenericForeignKey - Actual target contact object
- `relationship_type` - CharField(50) - Choices:
  - "carer" - Carer
  - "parent" - Parent
  - "spouse" - Spouse
  - "child" - Child
  - "sibling" - Sibling
  - "emergency_contact" - Emergency Contact
  - "also_patient" - Also a Patient
  - "also_referrer" - Also a Referrer
  - "also_coordinator" - Also a Coordinator
- `notes` - TextField (nullable) - Additional relationship notes
- `is_active` - BooleanField - Is this relationship current?
- `created_at` - DateTimeField
- `updated_at` - DateTimeField

**Why Generic Foreign Keys:**
- Can link any contact type to any other contact type
- Examples:
  - Patient → GeneralContact (carer)
  - Patient → GeneralContact (emergency contact)
  - Referrer → Patient (same person, dual role)
  - Patient → Patient (family member who is also a patient)

**Use Cases:**
1. Track carers (mother, father) for patients
2. Handle "edge case" where person is patient AND referrer AND coordinator
3. Link family members who are also patients
4. Store emergency contacts
5. Track any relationship between any two contacts

---

### ✅ **Implementation Summary (November 9, 2025)**

**All 9 FileMaker migration tables successfully built and migrated!**

**Tables Created:**
1. ✅ `specialties` - Lookup table for medical specialties
2. ✅ `referrers` - Medical professionals (GPs, specialists, etc.)
3. ✅ `coordinators` - NDIS Support Coordinators and LAC
4. ✅ `companies` - Medical practices, NDIS providers
5. ✅ `general_contacts` - Non-medical contacts (carers, family, etc.)
6. ✅ `patient_referrers` - Join table (patient ↔ referrer)
7. ✅ `patient_coordinators` - Join table with historical tracking
8. ✅ `referrer_companies` - Join table (referrer ↔ company)
9. ✅ `contact_relationships` - GenericForeignKey for ANY-to-ANY relationships

**Implementation Notes:**
- **Companies.company_type:** Used Django CharField with choices instead of separate lookup table (simpler, fewer queries)
- **Archive support:** Not implemented on `companies` table yet (can add: archived, archived_at, archived_by if needed)
- **Next Step:** Import data from FileMaker into these tables

---

### ❌ **Patient Coordinators Decision** (RESOLVED ✅)

**Decision:** Use separate `coordinators` + `patient_coordinators` tables (Option B)

**Reason:**
- Historical tracking required (coordinators change frequently)
- Each assignment has its own NDIS plan dates and notes
- Better data integrity and querying

**Migration Path:**
1. Create `coordinators` table
2. Parse `patients.coordinator_name` field (e.g., "Warda - Ability Connect")
3. Create unique coordinator records (deduplicate)
4. Create `patient_coordinators` join table records
5. Use `patients.coordinator_date` as `assignment_date`
6. Mark all as `is_current=True` initially

---

## 🔄 **Data Flow Notes**

### Communication Data
- **Phone/Mobile/Email:** Stored in `patients.contact_json`
  - New format: `{ phone: { home: { value: "...", default: true } } }`
  - Legacy format: `{ phone: "..." }` (still supported)
- **Address:** Stored in `patients.address_json`
  - Format: `{ street, suburb, postcode, state, type, default }`

### Plan Dates Data
- **Plan Dates:** Stored in `patients.plan_dates_json`
  - Array format: `[{ start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD", type: "1 Year Plan" }, ...]`
  - Frontend displays most recent plan date (sorted by start_date descending)
  - Only shown when funding type is NDIS
  - Supports add, edit, delete operations with hover actions

### Archive/Soft Delete
- All patient records use soft delete (`archived` flag)
- Never actually delete records
- Archive filter in frontend shows/hides archived records

---

## 🚧 **Migration Notes**

### Completed Migrations
- ✅ Patient model with all basic fields
- ✅ Added `title`, `health_number`, `funding_type`, `clinic` FKs
- ✅ Added `coordinator_name`, `coordinator_date`
- ✅ Added `plan_start_date`, `plan_end_date` (legacy fields)
- ✅ Added `plan_dates_json` JSONField for multiple plan dates support
- ✅ Added `notes` field (TextField on Patient model - legacy)
- ✅ Added archive fields (`archived`, `archived_at`, `archived_by`)
- ✅ Created `reminders` table with all fields and relationships
- ✅ Created `notes` table for patient-specific notes (replaces localStorage)
- ✅ Created django-allauth tables for OAuth authentication:
  - `socialaccount_socialapp` - OAuth provider credentials
  - `socialaccount_socialaccount` - Links users to OAuth providers
  - `socialaccount_socialtoken` - OAuth access/refresh tokens
  - `account_emailaddress` - User email addresses
  - `account_emailconfirmation` - Email confirmation tokens (not used)

### Pending Migrations
- ⚠️ **Multiple Coordinators:** Need to decide on JSONField vs separate table
- ⚠️ **Orders/Invoices:** Tables not yet created
- ⚠️ **Any new fields:** Document here as we add them

---

## 📚 **Related Documentation**

- **Page Documentation:** `docs/architecture/pages/PatientsPage.md` - Patient page requirements
- **Dialog Documentation:** 
  - `docs/architecture/dialogs/CommunicationDialog.md` - Communication data structure
  - `docs/architecture/dialogs/ReminderDialog.md` - Reminder functionality
  - Notes Dialog - Patient-specific notes with database persistence
- **Settings:** `docs/architecture/settings/SETTINGS_REQUIREMENTS.md` - Settings tables

---

**Update Strategy:**
1. Update this file whenever we:
   - Add a new table/model
   - Add/modify fields in existing tables
   - Add/modify relationships (FKs)
   - Change JSON field structures
2. Keep it synchronized with actual Django models
3. Document decisions and alternatives considered
4. Note any pending decisions or TODO items

