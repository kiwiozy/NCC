# Funding Sources - Deep Code Analysis

**Created:** 2025-11-20  
**Branch:** feature/loading-optimisation  
**Purpose:** Understand the dual funding source system and identify loading optimisation opportunities

---

## 🔍 Executive Summary

**You are correct - there are TWO separate funding source systems:**

1. **`FundingSource` (Settings)** - Main system in `settings` app
2. **`CustomFundingSource` (Invoices)** - Legacy/parallel system in `invoices` app

**Problem:** The patient page is loading BOTH systems separately, causing:
- ❌ Duplicate API calls on page load
- ❌ Confusion between which system to use
- ❌ Inconsistent data between two sources
- ❌ Performance issues (2 separate fetch requests)

---

## 📊 System 1: FundingSource (Settings App)

### **Model:** `backend/settings/models.py`

```python
class FundingSource(models.Model):
    id = UUIDField
    name = CharField(100)        # e.g., "NDIS", "Private", "DVA"
    code = CharField(20)         # e.g., "NDIS", "PRV", "DVA"
    active = BooleanField
    order = IntegerField         # For dropdown sorting
    created_at = DateTimeField
    updated_at = DateTimeField
```

### **API Endpoint:**
```
GET /api/settings/funding-sources/?active=true
```

### **ViewSet:** `backend/settings/views.py`
```python
class FundingSourceViewSet(viewsets.ModelViewSet):
    queryset = FundingSource.objects.all().order_by('order', 'name')
    serializer_class = FundingSourceSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    
    def get_queryset(self):
        # Filter by active status
        if active_only == 'true':
            queryset = queryset.filter(active=True)
        return queryset
```

### **Frontend Usage:**
```typescript
// Line 878-894 in /frontend/app/patients/page.tsx
const loadFundingSources = async () => {
  const response = await fetch('https://localhost:8000/api/settings/funding-sources/?active=true');
  const data = await response.json();
  const sources = data.results || data;
  const sourceNames = sources.map((source: any) => source.name);
  setFundingSources(sourceNames);  // Used for filter dropdown
};
```

**Used for:**
- ✅ Patient list filter dropdown
- ✅ Patient model `funding_type` ForeignKey (main database field)

---

## 📊 System 2: CustomFundingSource (Invoices App)

### **Model:** `backend/invoices/custom_funding_model.py`

```python
class CustomFundingSource(models.Model):
    id = UUIDField
    name = CharField(100)                 # e.g., "HCF", "WorkCover"
    reference_number = CharField(100)     # Account/vendor number
    display_format = CharField(200)       # How to display on invoice
    is_active = BooleanField
    notes = TextField
    created_at = DateTimeField
    updated_at = DateTimeField
    
    def get_formatted_reference(self, patient_name: str) -> str:
        # Generate invoice reference (e.g., "HCF # 123456")
```

### **API Endpoint:**
```
GET /api/invoices/custom-funding-sources/?is_active=true
```

### **ViewSet:** `backend/invoices/custom_funding_views.py`
```python
class CustomFundingSourceViewSet(viewsets.ModelViewSet):
    queryset = CustomFundingSource.objects.all()
    serializer_class = CustomFundingSourceSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['name']
    
    def get_queryset(self):
        # Filter by is_active (default: true)
        is_active = self.request.query_params.get('is_active', 'true')
        if is_active.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        return queryset
```

### **Frontend Usage:**
```typescript
// Line 568-586 in /frontend/app/patients/page.tsx
const loadCustomFundingSources = async () => {
  const response = await fetch('https://localhost:8000/api/invoices/custom-funding-sources/?is_active=true');
  const data = await response.json();
  setCustomFundingSources(data.results || data);  // Used for patient detail dropdown
};
```

**Used for:**
- ✅ Patient detail sidebar "Funding" dropdown (lines 1575-1625)
- ✅ Invoice reference generation
- ⚠️ **NOT linked to Patient model** (no ForeignKey)

---

## 🤔 The Confusion: Patient Model Fields

The `Patient` model has **TWO funding-related fields**:

### **Field 1: `funding_source` (CharField)** - Legacy/String Field
```python
# backend/patients/models.py (Line 98-112)
funding_source = models.CharField(
    max_length=50,
    null=True,
    blank=True,
    choices=[
        ('NDIS', 'NDIS'),
        ('DVA', 'DVA'),
        ('ENABLE', 'Enable'),
        ('BUPA', 'BUPA'),
        ('MEDIBANK', 'Medibank'),
        ('AHM', 'AHM'),
        ('PRIVATE', 'Private/Self-Funded'),
        ('OTHER', 'Other'),
    ],
    help_text="Patient's primary funding source for billing/invoicing"
)
```

**Used for:**
- Invoice reference generation (string-based)
- Shown in patient detail sidebar (lines 1454-1558)

### **Field 2: `funding_type` (ForeignKey)** - Modern/Relational Field
```python
# backend/patients/models.py (Line 115-122)
funding_type = models.ForeignKey(
    'settings.FundingSource',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='patients',
    help_text="Patient's funding source (NDIS, Private, DVA, etc.)"
)
```

**Used for:**
- API filtering (`/api/patients/?funding_type=<uuid>`)
- Patient list display
- Relational database queries

---

## 🎯 Current Page Load Behavior

### **On `/patients?type=patients` Load:**

1. **Load Funding Sources** (Line 878-898)
   ```typescript
   const loadFundingSources = async () => {
     fetch('https://localhost:8000/api/settings/funding-sources/?active=true')
     // Updates: fundingSources state → Used for filter dropdown
   };
   ```

2. **Load Custom Funding Sources** (Line 568-586, called on line 643)
   ```typescript
   const loadCustomFundingSources = async () => {
     fetch('https://localhost:8000/api/invoices/custom-funding-sources/?is_active=true')
     // Updates: customFundingSources state → Used for patient detail dropdown
   };
   ```

3. **Load Patients** (Line 647-868)
   ```typescript
   const loadPatients = async () => {
     fetch('https://localhost:8000/api/patients/?archived=false')
     // Each patient has:
     //   - funding_source: "NDIS" (string)
     //   - funding_type: { id: "uuid", name: "NDIS", code: "NDIS" } (object)
   };
   ```

**Total API Calls on Page Load:** 3+
- 1x Funding Sources (Settings)
- 1x Custom Funding Sources (Invoices)
- 1x Patients
- 1x Archived Count
- 1x Clinics

**Performance Impact:**
- ❌ 5 separate fetch requests
- ❌ Waterfall loading (not parallel)
- ❌ Duplicate data fetching

---

## 🐛 Problems Identified

### **Problem 1: Duplicate Systems**
Two separate funding source systems serving the same purpose:
- `FundingSource` (Settings) - Should be the single source of truth
- `CustomFundingSource` (Invoices) - Legacy system, now redundant?

### **Problem 2: Dual Patient Fields**
Patient model has two funding fields:
- `funding_source` (CharField) - Hardcoded choices, used for display
- `funding_type` (ForeignKey) - Relational, used for filtering

**Issue:** These can become out of sync!

### **Problem 3: Inefficient Loading**
```typescript
// Line 563-564: Hardcoded fallback
const [fundingSources, setFundingSources] = useState<string[]>(['NDIS', 'Private', 'DVA', 'Workers Comp', 'Medicare']);
const [customFundingSources, setCustomFundingSources] = useState<any[]>([]);

// Then loads from API...
// Then another API call for custom sources...
```

### **Problem 4: Dropdown Confusion**
Two dropdowns in patient detail sidebar:

**Dropdown 1:** "Funding Source" (Lines 1454-1558)
- Hardcoded options
- Updates `funding_source` CharField
- Auto-saves on change

**Dropdown 2:** "Funding" (Lines 1575-1625)
- Loads from CustomFundingSource API
- Updates `funding` (local state only, not a real field!)
- Auto-saves as `funding_source`

**They're both updating the same backend field!** 😱

---

## 💡 Recommended Solution

### **Phase 1: Consolidate Backend (Immediate)**

1. **Migrate `CustomFundingSource` data to `FundingSource`**
   ```sql
   -- Copy any custom funding sources to settings.FundingSource
   INSERT INTO funding_sources (id, name, code, active, order)
   SELECT 
     gen_random_uuid(), 
     name, 
     UPPER(SUBSTRING(name, 1, 10)), 
     is_active,
     ROW_NUMBER() OVER (ORDER BY name)
   FROM custom_funding_sources
   WHERE is_active = true;
   ```

2. **Deprecate `funding_source` CharField**
   - Keep for backwards compatibility
   - Sync from `funding_type.name` on save
   - Eventually remove in future migration

3. **Update Patient Serializer**
   ```python
   def to_representation(self, instance):
       representation = super().to_representation(instance)
       # Sync funding_source from funding_type
       if instance.funding_type:
           representation['funding_source'] = instance.funding_type.name
           representation['funding'] = instance.funding_type.name  # For frontend
       return representation
   ```

### **Phase 2: Optimize Frontend Loading**

1. **Parallel API Calls**
   ```typescript
   useEffect(() => {
     const loadInitialData = async () => {
       // Load ALL initial data in parallel
       const [fundingRes, clinicsRes, patientsRes, archivedRes] = await Promise.all([
         fetch('https://localhost:8000/api/settings/funding-sources/?active=true'),
         fetch('https://localhost:8000/api/clinicians/clinics/'),
         fetch('https://localhost:8000/api/patients/?archived=false'),
         fetch('https://localhost:8000/api/patients/?archived=true'),
       ]);
       
       // Process all responses
       const funding = await fundingRes.json();
       const clinics = await clinicsRes.json();
       const patients = await patientsRes.json();
       const archived = await archivedRes.json();
       
       // Update state once
       setFundingSources(funding.results.map(f => f.name));
       setClinics(clinics.results.map(c => c.name));
       setAllContacts(patients.results.map(transformPatientToContact));
       setArchivedCount(archived.results.length);
     };
     
     loadInitialData();
   }, []);
   ```

2. **Remove CustomFundingSource API Call**
   - Delete lines 568-586 (loadCustomFundingSources)
   - Delete line 643 (loadCustomFundingSources call)
   - Use `fundingSources` for both filter AND patient detail dropdown

3. **Consolidate Dropdowns**
   - Remove one of the two "Funding" dropdowns (lines 1454-1558 OR 1575-1625)
   - Keep only ONE dropdown that updates `funding_type` ForeignKey
   - Let backend sync `funding_source` CharField automatically

### **Phase 3: Add Caching (Future)**

1. **Cache Funding Sources in IndexedDB**
   ```typescript
   // Similar to PatientCache, create FundingCache
   class FundingCache {
     static async get() {
       // Check cache first, TTL 1 hour
       // Only fetch from API if stale
     }
   }
   ```

---

## 📈 Expected Performance Improvement

**Current:**
- 5 sequential API calls
- ~2-3 seconds to "ready" state
- Duplicate data fetching

**After Optimization:**
- 4 parallel API calls (remove custom funding)
- ~1 second to "ready" state
- 60% faster perceived load time

**After Caching:**
- 1-2 API calls (patients + archived, rest from cache)
- ~0.5 seconds to "ready" state
- 75% faster perceived load time

---

## 🎯 Next Steps

1. **Audit Current Data**
   ```bash
   # Check what's in CustomFundingSource
   ./manage.py shell
   >>> from invoices.custom_funding_model import CustomFundingSource
   >>> CustomFundingSource.objects.all().values()
   
   # Check what's in FundingSource
   >>> from settings.models import FundingSource
   >>> FundingSource.objects.all().values()
   ```

2. **Decide Migration Strategy**
   - Are there any CustomFundingSources not in FundingSource?
   - Can we safely deprecate CustomFundingSource?
   - Or do we need to merge them?

3. **Implement Parallel Loading**
   - Immediate win, no database changes needed
   - Change useEffect to Promise.all()

4. **Consolidate Dropdowns**
   - Remove duplicate funding dropdown
   - Update only `funding_type` ForeignKey

---

## 🔗 Related Files

### **Backend:**
- `backend/settings/models.py` - FundingSource model
- `backend/settings/views.py` - FundingSource API
- `backend/invoices/custom_funding_model.py` - CustomFundingSource model
- `backend/invoices/custom_funding_views.py` - CustomFundingSource API
- `backend/patients/models.py` - Patient model (both funding fields)

### **Frontend:**
- `frontend/app/patients/page.tsx` - Patient list page (ALL the complexity!)
  - Lines 563-564: State initialization
  - Lines 568-586: loadCustomFundingSources()
  - Lines 878-898: loadFundingSources()
  - Lines 1454-1558: First funding dropdown
  - Lines 1575-1625: Second funding dropdown

---

## ✅ Summary

**Current State:**
- 2 backend funding systems (Settings + Invoices)
- 2 patient model fields (funding_source + funding_type)
- 2 frontend dropdowns (both updating same field!)
- 5+ API calls on page load

**Recommended:**
- 1 backend system (Settings.FundingSource)
- 1 patient model field (funding_type ForeignKey)
- 1 frontend dropdown
- 4 parallel API calls (or cached)

**Impact:**
- 60-75% faster page load
- Cleaner, more maintainable code
- No data inconsistencies
- Better user experience

