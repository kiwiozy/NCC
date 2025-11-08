# Contact Relationships Architecture

**Date:** 2025-11-09  
**Status:** ✅ Architecture Decided  
**Decision:** Separate Tables + Generic Relationships

---

## 🎯 **The Problem**

**User Requirements:**
1. Track carers (mother, father) for patients
2. Handle "edge case" where person is patient AND referrer AND coordinator
3. Link family members who are also patients
4. Store emergency contacts
5. Keep separate workflows (patient UI ≠ referrer UI)

**Question:** How do we store all these different contact types?

---

## ✅ **The Solution: Separate Tables + Generic Relationships**

### **Architecture:**

```
patients (2,845 existing - keep as-is)
referrers (new - 98 from FileMaker)
coordinators (new - ~50 from FileMaker)
general_contacts (new - carers, family, emergency contacts)
companies (new - 44 from FileMaker)
contact_relationships (new - links ANY contact to ANY contact)
```

### **Why This Works:**

✅ **No refactoring** - Keep existing 2,845 patients as-is  
✅ **Separate workflows** - Each contact type keeps its own UI/logic  
✅ **Link anyone to anyone** - Patient → Carer, Patient → Referrer, etc.  
✅ **Track relationship types** - Mother, Father, Carer, Emergency Contact  
✅ **Flexible** - Add new relationship types anytime  
✅ **Multiple relationships** - Patient can have multiple carers, emergency contacts  
✅ **Handles edge cases** - Person can be patient AND referrer AND coordinator

---

## 📊 **Database Tables**

### **1. Separate Tables for Each Contact Type**

**`patients`** (existing)
- Patient-specific fields: DOB, health number, funding type, etc.
- Workflow: Appointments, letters, reminders, etc.

**`referrers`** (new)
- Referrer-specific fields: Specialty, practice name, company link
- Workflow: Referral management, report sending

**`coordinators`** (new)
- Coordinator-specific fields: Organization, coordinator type
- Workflow: NDIS plan tracking, service agreement management

**`general_contacts`** (new)
- General contact fields: Contact type (carer, family, supplier)
- Workflow: Simple contact management

**`companies`** (new)
- Company-specific fields: ABN, company type
- Workflow: Practice management

---

### **2. Generic Relationships Table**

**`contact_relationships`** ⭐ (new)

Links ANY contact to ANY other contact using Django's `GenericForeignKey`.

**Schema:**
```python
class ContactRelationship(models.Model):
    # Generic Foreign Keys (can link to ANY model)
    from_content_type = models.ForeignKey(ContentType)
    from_object_id = models.UUIDField()
    from_contact = GenericForeignKey('from_content_type', 'from_object_id')
    
    to_content_type = models.ForeignKey(ContentType)
    to_object_id = models.UUIDField()
    to_contact = GenericForeignKey('to_content_type', 'to_object_id')
    
    relationship_type = models.CharField(
        choices=[
            ('carer', 'Carer'),
            ('parent', 'Parent'),
            ('spouse', 'Spouse'),
            ('child', 'Child'),
            ('sibling', 'Sibling'),
            ('emergency_contact', 'Emergency Contact'),
            ('also_patient', 'Also Patient'),
            ('also_referrer', 'Also Referrer'),
            ('also_coordinator', 'Also Coordinator'),
        ]
    )
    
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 🎬 **Use Case Examples**

### **Example 1: Patient with Carer (Mother)**

**Scenario:** John Smith is a patient. His mother, Mary Smith, is his primary carer.

**Database:**
1. John exists in `patients` table
2. Mary created in `general_contacts` table (contact_type='Carer')
3. Relationship created in `contact_relationships`:
   - `from_contact` = John (Patient)
   - `to_contact` = Mary (GeneralContact)
   - `relationship_type` = 'carer'
   - `notes` = 'Primary carer, mother'

**Result:** Can query "Show me all carers for John" → returns Mary

---

### **Example 2: Doctor Who is Also a Patient**

**Scenario:** Dr. Jane Brown is a podiatrist who refers patients to you. She's also your patient.

**Database:**
1. Dr. Jane exists in `referrers` table (specialty='Podiatrist')
2. Dr. Jane also exists in `patients` table (as a patient)
3. Relationship created in `contact_relationships`:
   - `from_contact` = Dr. Jane (Referrer)
   - `to_contact` = Dr. Jane (Patient)
   - `relationship_type` = 'also_patient'
   - `notes` = 'Podiatrist who is also our patient'

**Result:** Can query "Show me all referrers who are also patients" → returns Dr. Jane

---

### **Example 3: Emergency Contact**

**Scenario:** Sarah Jones is a patient. Her husband David is her emergency contact.

**Database:**
1. Sarah exists in `patients` table
2. David created in `general_contacts` table (contact_type='Emergency Contact')
3. Relationship created in `contact_relationships`:
   - `from_contact` = Sarah (Patient)
   - `to_contact` = David (GeneralContact)
   - `relationship_type` = 'emergency_contact'
   - `notes` = 'Husband, call first'

**Result:** Can query "Show me emergency contacts for Sarah" → returns David

---

### **Example 4: Patient is Also Coordinator**

**Scenario:** Sam Taylor works as an NDIS coordinator. He's also your patient.

**Database:**
1. Sam exists in `coordinators` table (organization='Ability Connect')
2. Sam also exists in `patients` table (as a patient)
3. Relationship created in `contact_relationships`:
   - `from_contact` = Sam (Coordinator)
   - `to_contact` = Sam (Patient)
   - `relationship_type` = 'also_patient'
   - `notes` = 'Coordinator who is also our patient'

**Result:** Can query "Show me coordinators who are also patients" → returns Sam

---

## 🔍 **Querying Examples**

### **Find all carers for a patient:**
```python
patient = Patient.objects.get(id=patient_id)
carer_relationships = ContactRelationship.objects.filter(
    from_content_type=ContentType.objects.get_for_model(Patient),
    from_object_id=patient.id,
    relationship_type='carer',
    is_active=True
)
carers = [rel.to_contact for rel in carer_relationships]
```

### **Find all patients who are also referrers:**
```python
dual_role_relationships = ContactRelationship.objects.filter(
    from_content_type=ContentType.objects.get_for_model(Referrer),
    relationship_type='also_patient',
    is_active=True
)
patients_who_are_referrers = [rel.from_contact for rel in dual_role_relationships]
```

### **Find emergency contacts for a patient:**
```python
patient = Patient.objects.get(id=patient_id)
emergency_relationships = ContactRelationship.objects.filter(
    from_content_type=ContentType.objects.get_for_model(Patient),
    from_object_id=patient.id,
    relationship_type='emergency_contact',
    is_active=True
)
emergency_contacts = [rel.to_contact for rel in emergency_relationships]
```

---

## 📈 **Benefits Over Other Approaches**

### **vs. Single Polymorphic Table:**

| Polymorphic (Single Table) | Separate Tables + Relationships |
|----------------------------|--------------------------------|
| ❌ Complex workflows (patient vs referrer features mixed) | ✅ Clear separation of workflows |
| ❌ Hard to enforce business rules per type | ✅ Type-specific validations easy |
| ✅ Easy to link/search across types | ✅ Easy to link via relationships table |
| ❌ All contacts in one big table | ✅ Each type in logical table |

### **vs. Cross-Reference Fields:**

| Cross-Reference Fields | Generic Relationships |
|------------------------|----------------------|
| ❌ `Patient.also_referrer` FK limited to 1-to-1 | ✅ Many-to-many via relationships |
| ❌ Need FK for every type combination | ✅ One table handles all combinations |
| ❌ Can't track carer relationships | ✅ Can track any relationship |
| ❌ Hard to add new types | ✅ Easy to add new types |

---

## 🚀 **Implementation Phases**

### **Phase 1: Create Tables**
1. Create `referrers` model
2. Create `coordinators` model
3. Create `companies` model
4. Create `general_contacts` model
5. Create `specialties` model (lookup)

### **Phase 2: Create Join Tables**
1. Create `patient_referrers` join table
2. Create `patient_coordinators` join table (historical)
3. Create `referrer_companies` join table

### **Phase 3: Create Generic Relationships**
1. Create `contact_relationships` model with GenericForeignKeys
2. Add helper methods for common queries

### **Phase 4: Import FileMaker Data**
1. Import 98 referrers
2. Import ~50 coordinators (deduplicate from patients.coordinator_name)
3. Import 44 companies
4. Import 255 patient-referrer links
5. Import 73 referrer-company links

### **Phase 5: Add UI for Relationships**
1. Patient detail page: Show carers, emergency contacts
2. Referrer detail page: Show if also a patient
3. Add "Add Relationship" dialog

---

## 📚 **Documentation Updated**

✅ `docs/FileMaker/MIGRATION_ANALYSIS_PLAN.md` - Step 4 updated with 9 new tables  
✅ `docs/integrations/FILEMAKER.md` - Added Contact Relationships section  
✅ `docs/architecture/DATABASE_SCHEMA.md` - Added all 9 new tables to Pending section  
✅ `docs/FileMaker/CONTACT_RELATIONSHIPS_ARCHITECTURE.md` - This file

---

**Summary:** Separate tables for each contact type + generic relationships table = best of both worlds! 🎉

