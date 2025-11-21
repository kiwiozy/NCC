# Caching Deep Dive - Patients Page

**Date:** November 20, 2025  
**Page:** `https://localhost:3000/patients?type=patients`  
**Status:** ⚠️ Needs Optimization

---

## 📊 Current Architecture

### Cache Implementation: `PatientCacheIDB`

**Storage:** IndexedDB (250MB+ capacity)  
**TTL:** 5 minutes  
**Key:** Single entry `patient_data`  
**Structure:**
```typescript
interface CacheEntry {
  version: string;        // "1.0"
  timestamp: number;      // Unix timestamp
  data: any[];            // ALL 2,842 patients
  filters: {
    archived: boolean;
    search?: string;
  };
}
```

---

## 🔄 Current Flow

### Initial Page Load (Cache Miss)

```
User opens /patients?type=patients
         ↓
Check cache: PatientCache.get({ archived: false })
         ↓
Cache MISS (no data)
         ↓
Fetch ALL patients from API (paginated)
  - Page 1: 100 patients
  - Page 2: 100 patients
  - ... (29 pages total)
  - Takes 30 seconds
         ↓
Cache raw API data: PatientCache.set(2842 patients)
         ↓
Transform ALL patients to Contact objects
         ↓
Apply filters (search, clinic, funding)
         ↓
Display patient list (left sidebar)
         ↓
Select first patient → Load details
```

**Time:** ~30 seconds ❌  
**Network:** 29 API requests  
**Memory:** ~3.6MB cached

---

### Subsequent Page Load (Cache Hit)

```
User refreshes or returns to page
         ↓
Check cache: PatientCache.get({ archived: false })
         ↓
Cache HIT! (valid, < 5 minutes old)
         ↓
Load 2,842 patients from IndexedDB (instant)
         ↓
Transform ALL patients to Contact objects
         ↓
Apply filters
         ↓
Display list
         ↓
Background refresh starts (non-blocking)
  - Fetches fresh data in background
  - Updates cache when complete
  - UI updates with fresh data
```

**Time:** <1 second ✅  
**Network:** 0 requests (initially), 29 in background  
**Memory:** Reads from IndexedDB

---

## ⚠️ CRITICAL ISSUE: Aggressive Cache Invalidation

### The Problem

**When user changes funding source:**

```typescript
// Line 1795 in patients/page.tsx
await PatientCache.clear();  // ❌ CLEARS ENTIRE CACHE!
```

**Impact:**
1. User changes funding for ONE patient
2. System clears cache containing ALL 2,842 patients
3. Next page load: Cache miss → 30-second reload
4. **TERRIBLE user experience!**

---

### Where Cache is Cleared

```typescript
// ❌ BAD: Full cache clear on single field update
onChange={async (value) => {
  // Save funding source
  await fetch('/api/patients/${id}/', {
    method: 'PATCH',
    body: JSON.stringify({ funding_source: value }),
  });
  
  // 🗑️ PROBLEM: Clears ENTIRE cache!
  await PatientCache.clear();
  
  // Then reloads just this patient
  const freshPatient = await fetch(`/api/patients/${id}/`);
  setSelectedContact(freshPatient);
}}
```

**Analysis:**
- ✅ Saves correctly to backend
- ✅ Reloads single patient to show change
- ❌ **Destroys entire cache unnecessarily!**

---

## 📈 Performance Metrics

### Current Performance

| Scenario | Time | Network | Cache State |
|----------|------|---------|-------------|
| First load | 30s | 29 requests | Empty → Full |
| Cached load | <1s | 0 requests | Full |
| After funding change | 30s | 29 requests | **Cleared!** |
| Background refresh | 10-15s | 29 requests | Full |

---

## 🎯 What Data Changes Affect

### Fields Displayed in Patient List (Left Sidebar)

```typescript
// These fields are visible in the list
- Title (Mrs., Mr., etc.)
- First Name
- Last Name  
- Clinic (Narrabri, etc.)
- Funding Source (NDIS, etc.)
- Age/DOB
- Health Number (for search)
```

### Fields NOT in Patient List

```typescript
// These are only in detail view (right side)
- Middle Name
- Date of Birth picker
- Communication (phone, email, address)
- Notes
- Coordinators
- Plan dates
- etc.
```

---

## 💡 Optimization Strategy

### Tier 1: Immediate Wins (No Architecture Change)

#### **1. Remove Aggressive Cache Clear**

**Current (BAD):**
```typescript
// Funding source onChange
await PatientCache.clear();  // ❌ Clears all 2,842 patients!
```

**Fix (GOOD):**
```typescript
// Funding source onChange
// Option A: Update patient in cache (if we add this method)
await PatientCache.updatePatient(patientId, { funding_source: value });

// Option B: Skip cache clear entirely
// Just reload this one patient
const fresh = await fetch(`/api/patients/${patientId}/`);
setSelectedContact(fresh);
// Cache will refresh in background within 5 minutes anyway!
```

**Impact:** Prevents 30-second reload after every funding change ✅

---

#### **2. Add `updatePatient` Method to Cache**

```typescript
// Add to PatientCacheIDB class
static async updatePatient(
  patientId: string,
  updates: Partial<any>
): Promise<boolean> {
  try {
    // Get current cache
    const cached = await this.get({ archived: false });
    if (!cached) return false;
    
    // Find and update patient
    const index = cached.findIndex(p => p.id === patientId);
    if (index === -1) return false;
    
    cached[index] = { ...cached[index], ...updates };
    
    // Save back to cache
    return await this.set(cached, { archived: false });
  } catch (error) {
    console.error('Failed to update patient in cache:', error);
    return false;
  }
}
```

**Usage:**
```typescript
// After saving funding source
await PatientCache.updatePatient(patientId, {
  funding_source: value
});
// ✅ Cache stays valid, list updates immediately!
```

---

### Tier 2: Architectural Improvements

#### **Two-Tier Caching** (Future Enhancement)

**Concept:** Separate cache for list vs. details

```typescript
// Tier 1: Lightweight list cache
interface PatientListItem {
  id: string;
  title: string;
  first_name: string;
  last_name: string;
  clinic: string;
  funding_source: string;
  age: number;
  health_number: string;
}

// Tier 2: Full patient details (loaded on demand)
interface PatientDetail {
  ...PatientListItem;
  communication: any;
  address_json: any;
  notes: string;
  // ... all other fields
}
```

**Benefits:**
- List loads MUCH faster (smaller data)
- Details load on demand (when patient clicked)
- Can cache list longer (changes less frequently)

**Implementation Cost:** Medium (requires refactor)

---

### Tier 3: Smart Cache Invalidation

#### **Field-Level Strategy**

```typescript
const CACHE_STRATEGY = {
  // List fields: Update cache immediately
  listFields: ['title', 'first_name', 'last_name', 'clinic', 'funding_source', 'dob', 'health_number'],
  
  // Detail fields: Mark as stale, refresh on view
  detailFields: ['middle_names', 'notes', 'communication', 'address_json'],
  
  // Handle updates
  onFieldUpdate: async (patientId, field, value) => {
    if (CACHE_STRATEGY.listFields.includes(field)) {
      // Update cache - affects list display
      await PatientCache.updatePatient(patientId, { [field]: value });
    } else {
      // Mark patient as stale - will refresh on next view
      await PatientCache.markPatientStale(patientId);
    }
  }
};
```

---

## 🔧 Recommended Implementation Plan

### Phase 1: Quick Wins (1-2 hours)

1. **Add `updatePatient` method** to `PatientCacheIDB`
2. **Remove `PatientCache.clear()`** from funding source onChange
3. **Test:** Change funding, verify list updates, refresh page, verify change persists

**Expected Impact:**
- ✅ No more 30-second reload after funding changes
- ✅ Cache stays valid across field updates
- ✅ Background refresh keeps data fresh

---

### Phase 2: Smart Updates (2-3 hours)

1. **Identify all field onChange handlers**
2. **Add smart cache updates** for list fields
3. **Skip cache update** for detail fields
4. **Test each field** (title, name, clinic, funding, health number, DOB)

**Expected Impact:**
- ✅ List updates immediately when list fields change
- ✅ No unnecessary cache operations for detail fields
- ✅ Consistent UX across all fields

---

### Phase 3: Two-Tier (Future)

1. **Create `PatientListCache`** (lightweight)
2. **Create `PatientDetailCache`** (full data, on-demand)
3. **Refactor loading** to use both caches
4. **Migrate existing cache data**

**Expected Impact:**
- ✅ List loads 5-10x faster
- ✅ Lower memory footprint
- ✅ Better mobile performance

---

## 🐛 Current Bugs to Fix

### 1. Funding Source: Clears Entire Cache ❌

**File:** `frontend/app/patients/page.tsx:1795`  
**Fix:** Remove `PatientCache.clear()` or replace with `updatePatient()`

### 2. Clinic Dropdown: Not Saving ❌

**Status:** User reported "clinic not working"  
**Issue:** Needs investigation - might be ForeignKey issue  
**Fix:** Ensure clinic ID (UUID) is sent, not name

### 3. Background Refresh Timing ⚠️

**Current:** Starts immediately on cache hit  
**Issue:** Causes 29 API requests even when cache is fresh (10s old)  
**Fix:** Add minimum age check before background refresh

```typescript
// Only refresh if cache is > 2 minutes old
const cacheAge = Date.now() - cachedTimestamp;
if (cacheAge > 2 * 60 * 1000) {
  PatientCache.backgroundRefresh(filters, onUpdate);
}
```

---

## 📝 Code Locations

### Cache Implementation
- **File:** `frontend/app/utils/patientCacheIDB.ts`
- **Class:** `PatientCacheIDB`
- **Methods:**
  - `get()` - Read from cache
  - `set()` - Write to cache
  - `clear()` - Delete cache
  - `backgroundRefresh()` - Non-blocking refresh
  - ❌ **Missing:** `updatePatient()` - Update single patient

### Cache Usage
- **File:** `frontend/app/patients/page.tsx`
- **Lines:**
  - 677: `PatientCache.get()` - Load on mount
  - 711: `PatientCache.get()` - Load without patientId
  - 727: `PatientCache.backgroundRefresh()` - Background update
  - 783: `PatientCache.set()` - Save after API load
  - 1795: `PatientCache.clear()` ⚠️ **PROBLEM!**

---

## 🎯 Success Metrics

### Before Optimization
- First load: 30s
- After funding change: 30s ❌
- Cache hit rate: ~60%
- User frustration: High 😡

### After Phase 1 (Quick Wins)
- First load: 30s (unchanged)
- After funding change: <1s ✅
- Cache hit rate: ~90%
- User frustration: Low 😊

### After Phase 2 (Smart Updates)
- First load: 30s (unchanged)
- All field updates: <1s ✅
- Cache hit rate: ~95%
- Consistency: Perfect ✅

### After Phase 3 (Two-Tier)
- First load: 5-8s ✅
- Field updates: <1s ✅
- Cache hit rate: ~98%
- Memory usage: 50% reduction ✅

---

## 🚀 Next Steps

1. **Review this analysis** with user
2. **Get approval** for Phase 1 implementation
3. **Implement `updatePatient()`** method
4. **Remove aggressive cache clears**
5. **Test thoroughly** in browser
6. **Commit changes** (with user approval!)
7. **Move to Phase 2** when ready

---

## 💬 Questions for User

1. **Priority:** Is fixing the aggressive cache clear the top priority?
2. **Scope:** Should we fix ALL fields at once, or focus on funding/clinic first?
3. **Testing:** Can you test after each change, or prefer to test everything at once?
4. **Clinic Issue:** Can you describe exactly what's not working with the clinic dropdown?

---

**Ready to proceed with Phase 1 implementation?** 🚀

