# FileMaker Contact Details Table - Analysis

**Discovered:** 2025-11-08  
**Table:** `@Contact Details Export`  
**Status:** ✅ Analyzed - Ready for Import

---

## 📊 **Table Structure**

### **Relationship:**
```
Patient (2,845 records)
   ↓ ONE-TO-MANY
Contact Details (10,688 records)
   ↓ Average: 3.8 contact records per patient
```

### **Key Fields:**
- **`id`** - UUID (Primary Key) - Contact detail record ID
- **`id.key`** - UUID (Foreign Key) → Links to `Patient.id`
- **`type`** - Type of contact (Address, Phone, Email, Mobile)
- **`Name`** - Label for this contact (Work, Home, Mobile, Personal, etc.)

---

## 📋 **Field Mapping**

| FileMaker Field | Purpose | Nexus Destination | Notes |
|-----------------|---------|-------------------|-------|
| **KEYS** |
| `id` | Contact detail ID | - | (internal, not needed) |
| `id.key` | Patient ID (FK) | Link to patient | Join key |
| **TYPE & LABEL** |
| `type` | Contact type | Determines JSON structure | Address, Phone, Email |
| `Name` | Contact label | JSON key | Work, Home, Mobile |
| **PHONE FIELDS** |
| `ph` | Phone number | `contact_json.phone[Name]` | When type=Phone |
| `SMS Phone` | SMS-capable phone | `contact_json.mobile[Name]` | When type=Mobile |
| `PhoneMobileIntFormat` | International format | - | (calculated field) |
| **EMAIL FIELDS** |
| `Email default` | Email address | `contact_json.email[Name]` | When type=Email |
| **ADDRESS FIELDS** |
| `address 1` | Street address line 1 | `address_json.street` | When type=Address |
| `address 2` | Street address line 2 | `address_json.street2` | When type=Address |
| `suburb` | Suburb/City | `address_json.suburb` | When type=Address |
| `state` | State/Province | `address_json.state` | When type=Address |
| `post code` | Postal code | `address_json.postcode` | When type=Address |
| `country` | Country | - | (usually empty) |
| `location` | Full address | - | (calculated field) |
| `Xero address` | Xero-formatted | - | (not needed) |

---

## 🔄 **Data Transformation Strategy**

### **Step 1: Group by Patient**
Query FileMaker to get all contact details for each patient:
```sql
SELECT * FROM ContactDetails WHERE id.key = {patient_id}
```

### **Step 2: Separate by Type**
For each patient, separate records by `type`:
- `type = "Phone"` → Add to `contact_json.phone`
- `type = "Mobile"` → Add to `contact_json.mobile`
- `type = "Email"` → Add to `contact_json.email`
- `type = "Address"` → Build `address_json`

### **Step 3: Build JSON Structures**

#### **Phone Numbers** (type = "Phone"):
```json
{
  "contact_json": {
    "phone": {
      "Work": {
        "value": "+61 2 6765 1234",
        "default": true
      },
      "Home": {
        "value": "+61 2 6765 5678",
        "default": false
      }
    }
  }
}
```

#### **Mobile Numbers** (type = "Mobile"):
```json
{
  "contact_json": {
    "mobile": {
      "Personal": {
        "value": "+61 412 345 678",
        "default": true
      }
    }
  }
}
```

#### **Email Addresses** (type = "Email"):
```json
{
  "contact_json": {
    "email": {
      "Work": {
        "value": "patient@work.com",
        "default": true
      },
      "Home": {
        "value": "patient@home.com",
        "default": false
      }
    }
  }
}
```

#### **Addresses** (type = "Address"):
```json
{
  "address_json": {
    "street": "14 Dean Street",
    "street2": "",
    "suburb": "Tamworth",
    "postcode": "2340",
    "state": "NSW",
    "type": "Work",
    "default": true
  }
}
```

**Note:** Nexus currently only supports **ONE address** per patient. If FileMaker has multiple addresses:
- Use the **first "Home" address** if available
- Otherwise, use the **first address** (sorted by creation date)
- Log a warning for patients with multiple addresses

---

## 📊 **Sample Data Analysis**

### **Record Distribution:**
- **10,688 total contact records**
- **2,845 patients**
- **Average: 3.8 records per patient**

This means most patients have:
- 1-2 addresses
- 1-2 phone numbers
- 1-2 email addresses

### **Sample Record (Address):**
```json
{
  "id": "7D59D53B-EBD2-4EAA-B882-F6B2758A5E9A",
  "id.key": "2C0B3F42-D8AB-4C61-96FA-8E2AE2B1E21E",
  "type": "Address",
  "Name": "Work",
  "address 1": "14 Dean Street",
  "address 2": "",
  "suburb": "Tamworth",
  "state": "NSW",
  "post code": "2340"
}
```

---

## ⚠️ **Challenges & Solutions**

### **Challenge 1: Multiple Addresses**
**Problem:** Nexus only supports 1 address per patient, but FileMaker has multiple.

**Solutions:**
- **Option A:** Import only the first address (recommended for Phase 1)
- **Option B:** Add multiple address support to Nexus (future enhancement)
- **Option C:** Store additional addresses in a notes field

**Decision:** **Option A** - Import first "Home" address, or first address if no "Home"

---

### **Challenge 2: Default Contact**
**Problem:** How do we determine which phone/email is the "default"?

**Solutions:**
- **Option A:** First record is default
- **Option B:** Record with `Name = "Home"` or `Name = "Mobile"` is default
- **Option C:** Most recently created is default

**Decision:** **Option B** - `Home`/`Personal`/`Mobile` (for mobile) is default, otherwise first record

---

### **Challenge 3: Phone Number Format**
**Problem:** FileMaker might have various formats (with spaces, dashes, country codes).

**Solution:** Normalize all phone numbers to E.164 format with spaces:
- Strip all non-digits
- Add +61 country code if missing
- Format as: `+61 4 1234 5678` (mobile) or `+61 2 6765 1234` (landline)

---

### **Challenge 4: Empty Fields**
**Problem:** Some contact records might have empty phone/email/address fields.

**Solution:** Skip records where the main field is empty:
- If `type = "Phone"` and `ph` is empty → Skip
- If `type = "Email"` and `Email default` is empty → Skip
- If `type = "Address"` and all address fields are empty → Skip

---

## 🔧 **Import Algorithm (Pseudo-code)**

```python
def import_patient_with_contacts(patient_id):
    # 1. Get patient base record
    patient = get_patient_from_filemaker(patient_id)
    
    # 2. Get all contact details for this patient
    contact_details = get_contact_details(patient_id)
    
    # 3. Initialize JSON structures
    contact_json = {"phone": {}, "mobile": {}, "email": {}}
    address_json = None
    
    # 4. Process each contact detail
    for detail in contact_details:
        if detail['type'] == 'Phone' and detail['ph']:
            # Add to contact_json.phone
            contact_json['phone'][detail['Name']] = {
                "value": normalize_phone(detail['ph']),
                "default": is_default_phone(detail['Name'])
            }
        
        elif detail['type'] == 'Mobile' and detail['SMS Phone']:
            # Add to contact_json.mobile
            contact_json['mobile'][detail['Name']] = {
                "value": normalize_phone(detail['SMS Phone']),
                "default": is_default_mobile(detail['Name'])
            }
        
        elif detail['type'] == 'Email' and detail['Email default']:
            # Add to contact_json.email
            contact_json['email'][detail['Name']] = {
                "value": detail['Email default'],
                "default": is_default_email(detail['Name'])
            }
        
        elif detail['type'] == 'Address' and detail['address 1']:
            # Use first Home address, or first address
            if address_json is None or detail['Name'] == 'Home':
                address_json = {
                    "street": detail['address 1'],
                    "street2": detail['address 2'] or "",
                    "suburb": detail['suburb'],
                    "postcode": detail['post code'],
                    "state": detail['state'],
                    "type": detail['Name'],
                    "default": True
                }
    
    # 5. Ensure at least one default per type
    ensure_one_default(contact_json['phone'])
    ensure_one_default(contact_json['mobile'])
    ensure_one_default(contact_json['email'])
    
    # 6. Create patient in Nexus
    create_patient(
        id=patient['id'],
        first_name=patient['nameFirst'],
        last_name=patient['nameLast'],
        # ... other fields ...
        contact_json=contact_json,
        address_json=address_json
    )
```

---

## 📝 **Next Steps**

1. ✅ **Table structure analyzed** - Complete!
2. ⚠️ **Export sample data** - Get 10-20 patients with their contact details
3. ⚠️ **Build transformation functions** - Normalize phone, group by type
4. ⚠️ **Test with sample data** - Verify JSON structure
5. ⚠️ **Build import script** - Phase 1: Patients + Communication

---

## 🎯 **Files to Create**

1. **`scripts/filemaker/02_export_sample_patients_with_contacts.py`**
   - Export 10-20 patients
   - Export their contact details
   - Save to JSON for analysis

2. **`scripts/filemaker/utils/contact_transformer.py`**
   - `group_contacts_by_patient(contact_details)`
   - `build_contact_json(contact_details)`
   - `build_address_json(contact_details)`
   - `normalize_phone(phone_number)`
   - `determine_default(contacts, type)`

3. **`scripts/filemaker/03_import_patients_with_contacts.py`**
   - Full import script for Phase 1
   - Dry run mode for testing
   - Progress reporting

---

**Status:** ✅ **Structure understood - Ready to build export script!**

