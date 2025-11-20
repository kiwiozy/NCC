# Funding Sources Loading Optimization - Implementation Plan

**Branch:** feature/loading-optimisation  
**Priority:** HIGH  
**Estimated Time:** 2-3 hours  
**Impact:** 60-75% faster page load on `/patients`

---

## 🎯 Goal

Optimize the patient list page loading by:
1. Eliminating duplicate API calls
2. Loading data in parallel instead of sequentially
3. Consolidating dual funding source systems

---

## 📊 Current State Analysis

### **Page Load Sequence (SLOW):**

```
[User navigates to /patients]
  ↓
[useEffect #1] Load Funding Sources (Settings)
  ↓ ~300ms
[useEffect #2] Load Custom Funding Sources (Invoices)
  ↓ ~300ms
[useEffect #3] Load Clinics
  ↓ ~300ms
[useEffect #4] Load Patients
  ↓ ~800ms
[useEffect #5] Load Archived Count
  ↓ ~200ms
────────────────────────────────
Total: ~1900ms (2 seconds) ❌
```

### **After Optimization (FAST):**

```
[User navigates to /patients]
  ↓
[Promise.all()] Load ALL in parallel:
  - Funding Sources
  - Clinics  
  - Patients
  - Archived Count
  ↓ ~800ms (slowest request)
────────────────────────────────
Total: ~800ms (0.8 seconds) ✅
60% improvement!
```

---

## 🔧 Implementation Steps

### **Step 1: Parallel Data Loading (30 min)**

**File:** `frontend/app/patients/page.tsx`

**Current code** (lines 563-898):
```typescript
// Separate useEffects loading sequentially
useEffect(() => { loadCustomFundingSources(); }, [activeType]);
useEffect(() => { loadPatients(); }, [activeType]);
useEffect(() => { loadFundingSources(); }, []);
useEffect(() => { loadClinics(); }, []);
```

**New code:**
```typescript
// Combined parallel loading
useEffect(() => {
  const loadAllData = async () => {
    if (typeof window === 'undefined' || activeType !== 'patients') return;
    
    setLoading(true);
    
    try {
      // Load ALL data in parallel (4 requests at once)
      const [fundingRes, clinicsRes, patientsRes, archivedRes] = await Promise.all([
        fetch('https://localhost:8000/api/settings/funding-sources/?active=true', {
          credentials: 'include',
        }),
        fetch('https://localhost:8000/api/clinicians/clinics/', {
          credentials: 'include',
        }),
        fetch('https://localhost:8000/api/patients/?archived=false', {
          credentials: 'include',
        }),
        fetch('https://localhost:8000/api/patients/?archived=true', {
          credentials: 'include',
        }),
      ]);
      
      // Process all responses in parallel
      const [fundingData, clinicsData, patientsData, archivedData] = await Promise.all([
        fundingRes.json(),
        clinicsRes.json(),
        patientsRes.json(),
        archivedRes.json(),
      ]);
      
      // Update all state at once
      const fundingSources = fundingData.results || fundingData;
      const clinics = clinicsData.results || clinicsData;
      const patients = patientsData.results || patientsData;
      const archived = archivedData.results || archivedData;
      
      setFundingSources(fundingSources.map((f: any) => f.name));
      setClinics(clinics.map((c: any) => c.name));
      setArchivedCount(archived.length);
      
      // Transform and set patients
      const transformed = patients.map((p: any) => transformPatientToContact(p));
      setAllContacts(transformed);
      applyFilters(transformed, searchQuery, activeFilters);
      
      // Select first patient if navigating from elsewhere
      const patientId = searchParams?.get('id');
      if (patientId) {
        const targetPatient = transformed.find((p: Contact) => p.id === patientId);
        if (targetPatient) {
          setSelectedContact(targetPatient);
        }
      } else if (transformed.length > 0) {
        setSelectedContact(transformed[0]);
      }
      
    } catch (error) {
      console.error('Failed to load patient data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load patient data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  
  loadAllData();
}, [activeType, searchParams]);
```

**Benefits:**
- ✅ 4 requests in parallel instead of 5 sequential
- ✅ Single loading state
- ✅ Cleaner error handling
- ✅ 60% faster perceived load time

---

### **Step 2: Remove CustomFundingSource Call (10 min)**

**Current issue:**
- Line 570: Fetches `/api/invoices/custom-funding-sources/`
- Line 643: Calls `loadCustomFundingSources()`
- Lines 1580-1584: Uses `customFundingSources` for dropdown

**Solution:**
1. Delete `loadCustomFundingSources()` function (lines 568-586)
2. Remove call on line 643
3. Update patient detail dropdown to use `fundingSources` instead

**Change dropdown** (lines 1575-1625):
```typescript
// BEFORE:
data={
  customFundingSources.length > 0
    ? customFundingSources.map((source: any) => ({
        value: source.name,
        label: source.name,
      }))
    : [/* hardcoded fallback */]
}

// AFTER:
data={fundingSources.map((name: string) => ({
  value: name,
  label: name,
}))}
```

**Benefits:**
- ✅ One less API call
- ✅ Single source of truth
- ✅ No more duplicate systems

---

### **Step 3: Remove Duplicate Funding Dropdown (15 min)**

**Current issue:**
- Two dropdowns updating the same backend field!
- Lines 1454-1558: First "Funding Source" dropdown
- Lines 1575-1625: Second "Funding" dropdown

**Solution:**
Remove one dropdown completely (recommend removing first one).

**Keep only lines 1575-1625** and update to:
```typescript
<Box style={{ width: '100%' }}>
  <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Funding Source</Text>
  <Select
    value={selectedContact.funding_source}
    data={fundingSources.map((name: string) => ({
      value: name,
      label: name,
    }))}
    onChange={async (value) => {
      if (selectedContact) {
        // Update local state
        setSelectedContact({ 
          ...selectedContact, 
          funding_source: value || '',
          funding: value || '' 
        });
        
        // Auto-save to backend
        try {
          const csrfToken = await getCsrfToken();
          const response = await fetch(`https://localhost:8000/api/patients/${selectedContact.id}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,
            },
            credentials: 'include',
            body: JSON.stringify({
              funding_source: value || '',
            }),
          });
          
          if (!response.ok) throw new Error('Failed to save');
          
          // Clear cache and reload
          await PatientCache.clear();
          
          notifications.show({
            title: 'Success',
            message: 'Funding source updated',
            color: 'green',
          });
        } catch (error) {
          console.error('Error saving funding source:', error);
          notifications.show({
            title: 'Error',
            message: 'Failed to save funding source',
            color: 'red',
          });
        }
      }
    }}
    clearable
    searchable
    styles={{ input: { fontWeight: 700, fontSize: rem(18), height: 'auto', minHeight: rem(36) } }}
  />
</Box>
```

**Benefits:**
- ✅ Less UI clutter
- ✅ No confusion about which field to use
- ✅ Simpler code

---

### **Step 4: Update Backend Patient Serializer (15 min)**

**File:** `backend/patients/serializers.py`

**Goal:** Auto-sync `funding_source` CharField from `funding_type` ForeignKey

**Add method:**
```python
def to_representation(self, instance):
    representation = super().to_representation(instance)
    
    # Auto-sync funding_source from funding_type
    if instance.funding_type:
        representation['funding_source'] = instance.funding_type.name
        representation['funding'] = instance.funding_type.name  # For backwards compatibility
    elif instance.funding_source:
        # Fallback: if only CharField is set, use that
        representation['funding'] = instance.funding_source
    
    return representation
```

**Benefits:**
- ✅ Single source of truth (funding_type ForeignKey)
- ✅ Backwards compatible (keeps funding_source in sync)
- ✅ Easier to query/filter

---

### **Step 5: Add Loading State Improvements (20 min)**

**Current issue:**
- No loading skeleton
- User sees blank page during load
- No progress indication

**Solution:**
Add skeleton loader during initial load.

**Add to patient list section:**
```typescript
{loading && (
  <Stack gap="xs" p="md">
    <Skeleton height={60} radius="sm" />
    <Skeleton height={60} radius="sm" />
    <Skeleton height={60} radius="sm" />
    <Skeleton height={60} radius="sm" />
    <Skeleton height={60} radius="sm" />
  </Stack>
)}

{!loading && contacts.map((contact) => (
  // existing contact row
))}
```

**Benefits:**
- ✅ Better perceived performance
- ✅ Users know something is happening
- ✅ Modern UX pattern

---

## 📋 Testing Checklist

### **Before Changes:**
- [ ] Note current page load time (open Network tab, refresh)
- [ ] Count API requests made (should be 5)
- [ ] Test both funding dropdowns work
- [ ] Take screenshot of current UI

### **After Changes:**
- [ ] Verify page load time improved (should be ~60% faster)
- [ ] Count API requests (should be 4)
- [ ] Test single funding dropdown works
- [ ] Verify funding source saves correctly
- [ ] Test with cached data (refresh page twice)
- [ ] Test filtering by funding source
- [ ] Test archived patients toggle
- [ ] Test patient selection from URL (?id=xxx)

---

## 🎯 Success Metrics

**Load Time:**
- Current: ~2000ms
- Target: <800ms
- Improvement: 60%

**API Calls:**
- Current: 5 sequential
- Target: 4 parallel
- Improvement: 20% fewer calls, 60% faster

**User Experience:**
- Current: Blank screen for 2 seconds
- Target: Skeleton loader, data in 0.8 seconds
- Improvement: Much better perceived performance

---

## 🚨 Rollback Plan

If something breaks:

1. **Revert frontend changes:**
   ```bash
   git checkout main -- frontend/app/patients/page.tsx
   ```

2. **Revert backend changes:**
   ```bash
   git checkout main -- backend/patients/serializers.py
   ```

3. **Clear browser cache and reload**

---

## 📝 Follow-up Tasks (Future)

1. **Migrate CustomFundingSource to FundingSource**
   - Consolidate backend tables
   - Remove invoices/custom_funding_model.py

2. **Deprecate funding_source CharField**
   - Keep only funding_type ForeignKey
   - Remove in future migration

3. **Add IndexedDB caching for funding sources**
   - Similar to PatientCache
   - TTL: 1 hour
   - Further reduce API calls

4. **Add loading progress indicator**
   - Show "Loading patients... 80%"
   - Better UX during initial load

---

## 🔗 Related Documentation

- [FUNDING_SOURCES_ANALYSIS.md](./FUNDING_SOURCES_ANALYSIS.md) - Detailed analysis
- [DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md) - Database schema
- [TROUBLESHOOTING.md](../architecture/TROUBLESHOOTING.md) - Common issues

---

**Ready to implement?** Let's start with Step 1 (parallel loading) for immediate wins! 🚀

