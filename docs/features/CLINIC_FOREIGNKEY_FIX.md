# Clinic Dropdown Fix - ForeignKey Bug

**Date:** November 20, 2025  
**Branch:** `loading-optimisation`  
**Status:** ✅ Fixed

---

## 🐛 The Bug

User reported: **"Failed to save clinic"** error when changing clinic dropdown.

---

## 🔍 Root Cause Analysis

### The Problem:
The clinic field in the Django backend is a **ForeignKey**, not a CharField!

```python
# backend/patients/models.py
clinic = models.ForeignKey(
    'clinicians.Clinic',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='patients',
    help_text="Clinic location for this patient"
)
```

### What Was Happening:

1. **Frontend reads:** `patient.clinic.name` → `"Gunnedah"` (string)
2. **Frontend stores:** `clinic: "Gunnedah"` (string)
3. **Frontend tries to save:** `{ clinic: "Gunnedah" }` (string) ❌
4. **Backend expects:** `{ clinic: "uuid-here" }` (ForeignKey ID) ✅

**Result:** Django validation error - can't assign string to ForeignKey!

---

## ✅ The Fix

### 1. **Added `clinicId` to Contact Interface**

```typescript
interface Contact {
  id: string;
  name: string;
  clinic: string;          // Display name (for UI)
  clinicId?: string;       // NEW: Clinic UUID (for saving)
  clinicColor?: string;
  // ... other fields
}
```

### 2. **Updated Transform Function**

```typescript
// Extract clinic ID and name
const clinicName = patient.clinic?.name || '';
const clinicId = patient.clinic?.id || undefined;  // NEW
const clinicColor = patient.clinic?.color || undefined;

return {
  // ... other fields
  clinic: clinicName,      // For display
  clinicId: clinicId,      // NEW: For saving
  clinicColor: clinicColor,
};
```

### 3. **Load Clinics from API**

```typescript
// NEW: Load clinics from API (with IDs)
const [clinics, setClinics] = useState<any[]>([]);

const loadClinics = async () => {
  try {
    const response = await fetch('https://localhost:8000/api/clinics/', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      setClinics(data.results || data);
      console.log('✅ Loaded clinics from API:', data.results || data);
    }
  } catch (error) {
    console.error('Failed to load clinics:', error);
    setClinics([]);
  }
};

// Call on mount
useEffect(() => {
  loadClinics();
}, [activeType]);
```

### 4. **Fixed Clinic Dropdown**

```typescript
<Select
  value={selectedContact.clinic}  // Display name (what user sees)
  data={clinics.map((clinic: any) => ({
    value: clinic.name,  // Value = name (for display)
    label: clinic.name,  // Label = name (what user sees)
    id: clinic.id,       // Store ID for reference
  }))}
  onChange={async (value) => {
    // Find the clinic ID from the selected name
    const selectedClinic = clinics.find((c: any) => c.name === value);
    const clinicId = selectedClinic?.id;
    
    if (!clinicId) {
      console.error('Could not find clinic ID for:', value);
      return;
    }
    
    // Update UI with name (for display)
    setSelectedContact({ 
      ...selectedContact, 
      clinic: value,       // Name for display
      clinicId: clinicId   // ID for saving
    });
    
    // Save to backend with ID (not name!)
    const requestBody = {
      clinic: clinicId,  // ✅ Send UUID, not name!
    };
    
    await fetch(`/api/patients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });
    
    // Update caches intelligently
    await updatePatientCaches(id, 'clinic', value, archived);
  }}
/>
```

---

## 🎯 Key Insight

**ForeignKey fields require the ID (UUID), not the display name!**

| Field Type | What to Send | Example |
|------------|-------------|---------|
| CharField | String value | `{ funding_source: "NDIS" }` |
| ForeignKey | Object ID (UUID) | `{ clinic: "uuid-here" }` |

---

## 🧪 Testing

**Test the clinic dropdown:**

1. Open patient details
2. Change clinic from "Narrabri" → "Gunnedah"
3. Watch console logs:
   ```
   🔄 CLINIC DROPDOWN CHANGED
     New clinic name: "Gunnedah"
     Selected clinic object: { id: "uuid-here", name: "Gunnedah", color: "#..." }
     Clinic ID: "uuid-here"
     📤 Sending PATCH request to backend...
     Request body: {"clinic":"uuid-here"}
     📥 Response status: 200 OK
     ✅ Save successful
   ```
4. Refresh browser
5. Verify clinic persists as "Gunnedah"

---

## 📚 Lessons Learned

1. **Always check backend field types** before implementing auto-save
2. **CharField** = send string value
3. **ForeignKey** = send object ID (UUID)
4. **ManyToMany** = send array of IDs
5. **Don't assume** - verify what the API expects!

---

## 🔧 Files Modified

1. **`frontend/app/patients/page.tsx`**
   - Added `clinicId` to `Contact` interface
   - Added `loadClinics()` function
   - Updated `transformPatientToContact()` to extract `clinicId`
   - Fixed clinic dropdown to send UUID instead of name
   - Added clinic lookup logic

---

## ✅ Status

- [x] Bug diagnosed (ForeignKey vs String)
- [x] `clinicId` added to interface
- [x] `loadClinics()` implemented
- [x] Clinic dropdown fixed to send UUID
- [x] Smart cache update integrated
- [ ] Browser testing (pending user approval)

---

**Next:** User tests clinic dropdown and confirms it saves correctly! 🚀

