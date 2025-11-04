# Coordinator Dialogs

**Purpose:** Document the coordinator selection and list dialogs

**Status:** ✅ Implemented (Frontend)

**Last Updated:** December 2024

---

## 📋 **Overview**

The coordinator functionality allows patients to have multiple coordinators over time, with each assignment tracked with a date. Two dialogs support this functionality:

1. **Coordinator Selection Dialog** - Add new coordinator with date
2. **Coordinator List Dialog** - View all coordinators for a patient

---

## 🎨 **UI Components**

### **1. Coordinator Selection Dialog** ✅ **IMPLEMENTED**

**Purpose:** Add a new coordinator to a patient with an assignment date

**Trigger:** Click the "+" button next to the Coordinator field

**Dialog Features:**
- **Title:** "Add Coordinator"
- **Size:** Medium (md)
- **Layout:** Stack with vertical spacing

**Components:**
1. **Date Picker Input** ✅ **REQUIRED**
   - **Label:** "Assignment Date"
   - **Placeholder:** "Select assignment date"
   - **Default:** Today's date (when dialog opens)
   - **Validation:** Required field
   - **Max Date:** Today (cannot select future dates)
   - **Format:** Date object (converted to YYYY-MM-DD on save)
   - **Behavior:** Coordinator selection is disabled until date is selected

2. **Search Input** ✅
   - **Placeholder:** "Search coordinators..."
   - **Icon:** Search icon (left section)
   - **Behavior:** Debounced search (300ms delay)
   - **Auto-load:** Loads all coordinators when dialog opens (if no search query)
   - **Filtering:** Filters by coordinator name or organization

3. **Coordinator List** ✅
   - **Height:** 300px (scrollable)
   - **Items:** Clickable coordinator cards
   - **Display:**
     - Coordinator name (bold)
     - Organization (dimmed, if available)
   - **State:** Disabled until date is selected
   - **Visual Feedback:** Hover effects, opacity when disabled

4. **Empty States:**
   - **Loading:** Loader spinner
   - **No Results:** "No coordinators found" (when search returns nothing)
   - **Initial State:** "Start typing to search coordinators" (when no search query)

**Data Flow:**
1. User opens dialog → Date picker defaults to today
2. User selects date (required) → Coordinator list becomes enabled
3. User types in search → Debounced search filters coordinators
4. User clicks coordinator → Adds to patient's coordinators array
5. Dialog closes → Clears search and date

**Current Implementation:**
- ✅ Uses mock coordinator data
- ⚠️ **TODO:** Connect to `/api/coordinators/` API endpoint when available
- ⚠️ **TODO:** Add coordinator master list management in Settings

---

### **2. Coordinator List Dialog** ✅ **IMPLEMENTED**

**Purpose:** View all coordinators assigned to a patient

**Trigger:** Click the list icon (IconListCheck) when patient has 2+ coordinators

**Dialog Features:**
- **Title:** "Coordinators"
- **Size:** Medium (md)
- **Layout:** Stack with vertical spacing

**Components:**
1. **Coordinator List** ✅
   - **Height:** 400px (scrollable)
   - **Sorting:** By date (most recent first)
   - **Items:** Coordinator cards displaying:
     - Coordinator name (bold, size sm)
     - Assignment date (blue, size xs)
   - **Visual:** Card-style layout with border and background

2. **Empty State:**
   - **No Coordinators:** "No coordinators assigned" (centered, dimmed)

**Data Flow:**
1. User clicks list icon → Opens dialog
2. Dialog loads coordinators from patient's `coordinators` array
3. Coordinators sorted by date (newest first)
4. Displays all coordinators in scrollable list

---

## 📊 **Data Structure**

### **Frontend Format**

```typescript
interface Contact {
  coordinators?: Array<{
    name: string;      // e.g., "Dawn Allington"
    date: string;       // YYYY-MM-DD format, e.g., "2025-11-04"
  }>;
  // Legacy support
  coordinator?: {
    name: string;
    date: string;
  };
}
```

### **Helper Functions**

**`getCoordinators(contact: Contact | null): Array<{name: string; date: string}>`**
- Returns coordinators array (handles both new array and legacy single coordinator)
- Returns empty array if no coordinators

**`getCurrentCoordinator(contact: Contact | null): {name: string; date: string} | null`**
- Returns most recent coordinator (sorted by date, descending)
- Returns null if no coordinators

---

## 🔌 **API Requirements**

### **Current Status:**
- ⚠️ **Using Mock Data** - Coordinator selection uses hardcoded coordinator list
- ⚠️ **Backend TODO:** Coordinator API endpoint needed

### **Required Endpoints:**

#### **GET /api/coordinators/** ✅ **NEEDS IMPLEMENTATION**
- **Purpose:** Get list of available coordinators
- **Query Params:**
  - `?search=<query>` - Search by name or organization
  - `?active=true` - Filter active coordinators only
- **Response:**
  ```json
  {
    "results": [
      {
        "id": "uuid",
        "name": "Dawn Allington",
        "organization": "Ability Connect",
        "phone": "02 1234 5678",
        "email": "dawn@abilityconnect.com.au",
        "active": true
      }
    ]
  }
  ```

#### **POST /api/patients/:id/coordinators/** ⚠️ **NEEDS IMPLEMENTATION**
- **Purpose:** Add coordinator to patient
- **Payload:**
  ```json
  {
    "coordinator_name": "Dawn Allington",
    "assignment_date": "2025-11-04"
  }
  ```
- **Response:** Updated patient object

#### **DELETE /api/patients/:id/coordinators/:coordinator_id/** ⚠️ **NEEDS IMPLEMENTATION**
- **Purpose:** Remove coordinator from patient
- **Response:** Updated patient object

---

## 🗄️ **Database Requirements**

### **Option A: JSONField** (Recommended for now)

**Patient Model:**
```python
coordinators_json = JSONField(
    default=list,
    help_text="List of coordinators with assignment dates"
)
# Example value:
# [
#   {"name": "Dawn Allington", "date": "2025-11-04"},
#   {"name": "Sarah Johnson", "date": "2024-10-15"}
# ]
```

**Pros:**
- Simple to implement
- Flexible structure
- Easy to query by patient

**Cons:**
- Harder to query by coordinator name
- Less structured

### **Option B: Separate Table** (Better long-term)

**PatientCoordinator Model:**
```python
class PatientCoordinator(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='coordinators')
    coordinator_name = models.CharField(max_length=255)
    assignment_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-assignment_date']  # Most recent first
```

**Pros:**
- Better queries (can filter by coordinator name)
- Can link to coordinator master table later
- More structured

**Cons:**
- More complex
- Requires joins

---

## ✅ **Status Checklist**

- [x] **Frontend UI** - Coordinator selection dialog built ✅
- [x] **Frontend UI** - Coordinator list dialog built ✅
- [x] **Frontend Logic** - Multiple coordinators support ✅
- [x] **Frontend Logic** - Date picker integration ✅
- [x] **Frontend Logic** - Search functionality ✅
- [x] **Frontend Logic** - List icon conditional display ✅
- [x] **Frontend Logic** - Current coordinator display ✅
- [x] **Frontend Logic** - Helper functions implemented ✅
- [ ] **Backend API** - Coordinator master list endpoint ⚠️ TODO
- [ ] **Backend API** - Patient coordinator assignment endpoint ⚠️ TODO
- [ ] **Backend Model** - Coordinator storage (JSONField or table) ⚠️ TODO
- [ ] **Backend Integration** - Connect frontend to API ⚠️ TODO
- [x] **Documentation** - Dialog functionality documented ✅

---

## 🚀 **Next Steps**

1. **Backend:** Implement coordinator storage (JSONField or separate table)
2. **Backend:** Create coordinator master list API endpoint
3. **Backend:** Create patient coordinator assignment API endpoint
4. **Frontend:** Connect coordinator selection to API (replace mock data)
5. **Settings:** Add coordinator management to Settings page (optional)
6. **Testing:** Test coordinator assignment and list functionality

---

## 📝 **Notes**

- **Current Implementation:** Uses mock coordinator data for selection
- **Date Format:** Assignment dates stored as YYYY-MM-DD, displayed as "DD MMM YYYY"
- **Backwards Compatibility:** Maintains support for single `coordinator` field
- **Future Enhancement:** Link to coordinator master table for better data consistency

---

**Last Updated:** December 2024  
**Status:** ✅ Frontend Complete, ⚠️ Backend Pending

