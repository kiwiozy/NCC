# 👤 User Profiles Feature - Complete Guide

**Status:** ✅ Implemented  
**Branch:** `feature/user-profiles`  
**Date:** November 17, 2025  
**Commit:** `9267364`

---

## 🎯 **Overview**

Complete user profile management system with professional credentials and signatures for clinicians. Supports linking to Google OAuth accounts, image signatures for letters, and HTML signatures for emails.

---

## ✨ **Features**

### **1. Professional Credentials**
- Full name with credentials (e.g., "Craig Laird, CPed CM au")
- Registration number (e.g., "Pedorthic Registration # 3454")
- Professional body URL (e.g., "www.pedorthics.org.au")
- Role assignment (Pedorthist, Admin, Reception, Manager, Other)

### **2. Dual Signature System**
- **Image Signature:** Upload PNG/JPG for use in patient letters and PDFs
  - Stored in S3 for reliability
  - Automatic presigned URL generation
  - Preview before saving
  
- **HTML Signature:** Rich text editor for email signatures
  - Full TipTap WYSIWYG editor
  - Formatting: bold, italic, colors, links, etc.
  - Automatic appending to outgoing emails

### **3. User Account Linking**
- Link clinician profiles to Django User accounts
- Supports Google OAuth login accounts
- Dual login support (individual + shared accounts)
- Dropdown search for easy linking

---

## 📍 **Location**

**Access:** Settings → User Profiles

**Navigation Path:**
```
Dashboard → Settings (⚙️) → User Profiles
```

Or direct URL: `https://localhost:3000/settings?tab=users`

---

## 🎨 **User Interface**

### **Main Screen**
- **Table View:**
  - Name (with credentials)
  - Role badge
  - Registration details
  - Linked login account
  - Signature badges (Image/HTML)
  - Active status
  - Edit/Delete actions

- **Add User Button:** Top right corner

### **Add/Edit Modal (3 Tabs)**

#### **Tab 1: Details**
- Full Name *
- Professional Credentials
- Registration Number
- Professional Body URL
- Email
- Phone
- Role (dropdown)
- Link to User Account (searchable dropdown)

#### **Tab 2: Image Signature**
- File upload button (PNG/JPG)
- Preview of uploaded image
- Remove button
- Recommended: PNG with transparent background

#### **Tab 3: Email Signature**
- Rich text editor (TipTap)
- Formatting toolbar
- Live preview below editor
- HTML output for emails

---

## 🔧 **Technical Implementation**

### **Backend Changes**

#### **1. Extended Clinician Model** (`backend/clinicians/models.py`)
```python
# New fields added:
user = OneToOneField(User)  # Link to Django user account
registration_number = CharField(100)
professional_body_url = URLField(200)
signature_image = CharField(500)  # S3 key
signature_html = TextField()
```

#### **2. New Methods**
- `get_signature_url()` - Returns presigned S3 URL
- `get_full_credentials_display()` - Multi-line credential string

#### **3. Updated Serializer** (`backend/clinicians/serializers.py`)
- Added all new fields
- Includes `signature_url` (computed)
- Includes `username` and `user_email` (from User)

#### **4. New API Endpoint**
- `GET /api/auth/users/` - List all users for linking

#### **5. Database Migration**
- `0005_clinician_professional_body_url_and_more.py`
- ✅ Already applied to database

### **Frontend Changes**

#### **1. New Component**
- `frontend/app/components/settings/UserProfiles.tsx`
- 800+ lines with full CRUD operations
- Integrated S3 upload
- Rich text editor (TipTap)

#### **2. Updated Navigation**
- Added "User Profiles" to Settings submenu
- Icon: User icon

#### **3. Updated Settings Page**
- Added `users` tab handling
- Routes to UserProfiles component

---

## 📊 **Database Schema**

### **New Fields in `clinicians` Table:**

| Field | Type | Description |
|-------|------|-------------|
| `user` | OneToOne → User | Link to Django user account |
| `registration_number` | VARCHAR(100) | Professional registration |
| `professional_body_url` | VARCHAR(200) | Professional body website |
| `signature_image` | VARCHAR(500) | S3 key for signature image |
| `signature_html` | TEXT | HTML signature for emails |

**Indexes:**
- `user` (unique) - One clinician per user account

---

## 🚀 **How to Use**

### **Creating a User Profile**

1. **Navigate to Settings → User Profiles**
2. **Click "Add User"**
3. **Fill in Details Tab:**
   - Enter full name (e.g., "Craig Laird")
   - Add credentials (e.g., "CPed CM au")
   - Enter registration (e.g., "Pedorthic Registration # 3454")
   - Add website (e.g., "www.pedorthics.org.au")
   - Select role (e.g., "Pedorthist")
   - Optionally link to user account
4. **Go to Image Signature Tab:**
   - Click "Upload Signature Image"
   - Choose PNG/JPG file
   - Preview appears
5. **Go to Email Signature Tab:**
   - Use rich text editor to create signature
   - Format as needed
   - Preview shows below
6. **Click "Create"**

### **Editing a User Profile**

1. **Click pencil icon** next to user
2. **Edit fields** in any tab
3. **Upload new signature** if needed
4. **Click "Update"**

### **Linking to User Account**

1. **Edit user profile**
2. **In "Link to User Account" dropdown:**
   - Search by username or email
   - Select matching user
3. **Save**

**Result:** Clinician profile now linked to Google OAuth login

### **Using Signatures**

#### **Image Signature (Letters/PDFs):**
- Automatically available via `clinician.get_signature_url()`
- Use in letter templates
- Returns presigned S3 URL (valid for 1 hour)

#### **HTML Signature (Emails):**
- Stored in `clinician.signature_html`
- Append to email body before sending
- Full HTML formatting preserved

---

## 🧪 **Testing Checklist**

### **Backend Testing**

```bash
# Start backend
cd backend
venv/bin/python manage.py runserver 8000
```

**API Endpoints:**
- [ ] `GET /api/clinicians/` - Lists all clinicians with new fields
- [ ] `POST /api/clinicians/` - Create new clinician
- [ ] `PUT /api/clinicians/{id}/` - Update clinician
- [ ] `DELETE /api/clinicians/{id}/` - Delete clinician
- [ ] `GET /api/auth/users/` - Lists all users

**Test Data:**
```json
{
  "full_name": "Craig Laird",
  "credential": "CPed CM au",
  "registration_number": "Pedorthic Registration # 3454",
  "professional_body_url": "www.pedorthics.org.au",
  "email": "craig@walkeasy.com.au",
  "role": "PEDORTHIST",
  "active": true
}
```

### **Frontend Testing**

```bash
# Start frontend
cd frontend
npm run dev
```

**Manual Tests:**
- [ ] Navigate to Settings → User Profiles
- [ ] Verify table loads existing clinicians
- [ ] Click "Add User" - modal opens
- [ ] Fill in all fields - save successful
- [ ] Verify new user appears in table
- [ ] Click edit icon - modal opens with data
- [ ] Upload signature image - preview appears
- [ ] Create HTML signature - preview shows
- [ ] Link to user account - dropdown works
- [ ] Update user - changes saved
- [ ] Delete user - confirmation modal → deleted

### **Integration Testing**

**Signature Upload (S3):**
- [ ] Upload PNG signature
- [ ] Verify file stored in S3
- [ ] Verify `signature_image` field has S3 key
- [ ] Verify `get_signature_url()` returns valid URL

**User Linking:**
- [ ] Create clinician profile
- [ ] Link to Google OAuth user
- [ ] Verify `user` field set
- [ ] Verify `username` and `user_email` show in serializer

**Display Format:**
- [ ] Verify `display_name` shows: "Craig Laird, CPed CM au"
- [ ] Verify `full_credentials_display` shows:
  ```
  Craig Laird, CPed CM au
  Pedorthic Registration # 3454
  www.pedorthics.org.au
  ```

---

## 📝 **Example Data**

### **User Profile Example:**

**Name:** Craig Laird  
**Credentials:** CPed CM au  
**Registration:** Pedorthic Registration # 3454  
**Website:** www.pedorthics.org.au  
**Email:** craig@walkeasy.com.au  
**Role:** Pedorthist  
**Login:** craig@walkeasy.com.au (Google OAuth)

**Image Signature:**  
`s3://walkeasy-nexus-documents/signatures/craig-laird-signature.png`

**HTML Signature:**
```html
<p><strong>Craig Laird, CPed CM au</strong></p>
<p>Pedorthist | Walk Easy Clinics</p>
<p>📧 craig@walkeasy.com.au | 📱 0412 345 678</p>
<p>🌐 <a href="https://www.pedorthics.org.au">www.pedorthics.org.au</a></p>
```

---

## 🔄 **Next Steps**

### **Immediate:**
1. ✅ Feature implemented and committed
2. ⏳ **Manual testing** (see checklist above)
3. ⏳ **Create user profiles** for all clinicians
4. ⏳ **Upload signatures** for each user

### **Integration Work:**

#### **Letters System:**
```python
# In letter generation code:
clinician = get_current_user_clinician()
signature_url = clinician.get_signature_url()
# Add signature image to letter template
```

#### **Email System:**
```python
# In email sending code:
clinician = get_current_user_clinician()
html_signature = clinician.signature_html or ""
email_body = f"{email_content}\n\n{html_signature}"
# Send email with signature
```

#### **Future Enhancements:**
- Auto-insert signature in letter editor
- Signature positioning options (left/right/center)
- Multiple signature versions per user
- Signature approval workflow
- Signature audit trail

---

## 🐛 **Known Issues**

**None at this time** - Feature is new and hasn't been tested yet

---

## 📚 **Documentation Updated**

- ✅ `docs/architecture/DATABASE_SCHEMA.md` - Added clinicians table documentation
- ✅ `.cursor/rules/projectrules.mdc` - (Needs manual update if required)
- ✅ Git commit with comprehensive message

---

## 💡 **Usage Examples**

### **In Python (Backend):**

```python
from clinicians.models import Clinician

# Get clinician by user
clinician = request.user.clinician_profile

# Get signature URL
signature_url = clinician.get_signature_url()  # Presigned S3 URL

# Get full credentials display
credentials = clinician.get_full_credentials_display()
"""
Craig Laird, CPed CM au
Pedorthic Registration # 3454
www.pedorthics.org.au
"""

# Get HTML signature
html_sig = clinician.signature_html
```

### **In TypeScript (Frontend):**

```typescript
// Fetch user's clinician profile
const response = await fetch('https://localhost:8000/api/clinicians/');
const clinicians = await response.json();

// Display in UI
<Text>{clinician.full_credentials_display}</Text>

// Show signature image
<Image src={clinician.signature_url} alt="Signature" />

// Insert HTML signature
<div dangerouslySetInnerHTML={{ __html: clinician.signature_html }} />
```

---

## 🎉 **Summary**

✅ **Complete user profile system implemented**  
✅ **Professional credentials tracking**  
✅ **Dual signature system (image + HTML)**  
✅ **S3 integration for image storage**  
✅ **User account linking**  
✅ **Full CRUD interface**  
✅ **Database migrated**  
✅ **Documentation updated**  
✅ **Committed to Git**

**Ready for:** Manual testing and user adoption

---

**Questions or issues?** Check the troubleshooting guide or reach out to Craig.

