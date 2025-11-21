# Patient List Sorting & Filtering - Design Document

**Date:** November 21, 2025  
**Feature:** Enhanced sorting and filtering for patient list  
**Status:** 🎨 Design Phase

---

## 📊 Current State

### **Existing Filters:**
- ✅ **Archive toggle** - Show archived vs active patients
- ✅ **Search box** - Free text search (name, health number)
- ✅ **Clinic filter** - Dropdown to filter by clinic
- ✅ **Funding filter** - Dropdown to filter by funding source

### **Current Limitations:**
- ❌ No sorting (list is in database order)
- ❌ Filters open in popover (not always visible)
- ❌ Can't sort by name, clinic, or date
- ❌ Can't combine multiple criteria easily
- ❌ No saved filter preferences

---

## 🎯 Goals

### **Primary Goals:**
1. **Sort patient list** by common criteria (name, clinic, funding, date)
2. **Quick filtering** without opening popovers
3. **Maintain fast performance** with cached data
4. **Intuitive UX** - users should understand immediately
5. **Persistent preferences** - remember user's choices

### **Secondary Goals:**
1. **Advanced filters** (age range, plan dates, etc.)
2. **Saved filter sets** ("My Newcastle NDIS patients")
3. **Export filtered list** to CSV/Excel
4. **Bulk actions** on filtered patients

---

## 🏗️ Architecture Options

### **Option A: Client-Side Sorting/Filtering (Recommended)**

**How it works:**
- Load ALL patients into cache (already doing this - 2,842 patients, 500KB)
- Sort/filter in JavaScript on the frontend
- No API calls when sorting/filtering

**Pros:**
- ✅ **Instant** - No network delay (0ms)
- ✅ **No server load** - All processing on client
- ✅ **Works offline** - Once cached, works without internet
- ✅ **Simple** - No backend changes needed
- ✅ **Smooth UX** - No loading spinners

**Cons:**
- ⚠️ **Browser memory** - 500KB cached + full list in memory (~1MB total)
- ⚠️ **Limited by cache** - Can only filter what's cached
- ⚠️ **No complex queries** - Can't filter by relationships easily

**Best for:**
- Simple sorting (A-Z, clinic, funding)
- Basic filters (text search, dropdowns)
- Fast, responsive UX

---

### **Option B: Server-Side Sorting/Filtering**

**How it works:**
- Send sort/filter params to API
- Backend queries database with WHERE/ORDER BY
- Return filtered/sorted results

**Pros:**
- ✅ **Powerful queries** - Can filter by any database field
- ✅ **Lower memory** - Only load what's needed
- ✅ **Complex filters** - Joins, aggregations, date ranges
- ✅ **Pagination** - Load 50 at a time

**Cons:**
- ❌ **Network delay** - 200-500ms per filter change
- ❌ **Server load** - More database queries
- ❌ **Loading states** - Spinners on every change
- ❌ **Backend changes** - Need to modify API
- ❌ **Cache invalidation** - Complex to manage

**Best for:**
- Very large datasets (10,000+ patients)
- Complex filters (age ranges, plan dates, coordinator assignments)
- When network is fast and reliable

---

### **Option C: Hybrid Approach (Advanced)**

**How it works:**
- Client-side for simple filters (clinic, funding, search)
- Server-side for complex filters (age range, date filters)
- Smart caching - cache each filter combination

**Pros:**
- ✅ **Best of both** - Fast simple filters, powerful complex ones
- ✅ **Scalable** - Can handle growth
- ✅ **Flexible** - Easy to add new filters

**Cons:**
- ⚠️ **Complex** - More code to maintain
- ⚠️ **Cache management** - Need to track multiple caches
- ⚠️ **UX complexity** - Users need to understand difference

**Best for:**
- Large clinics with complex workflows
- Power users who need advanced filtering
- Future-proofing the system

---

## 💡 Recommended Approach

### **Start with Option A: Client-Side (Simple & Fast)**

**Why:**
1. You already cache ALL patients (2,842 → 500KB)
2. Instant response = great UX
3. No backend changes = faster to implement
4. Easy to upgrade to Option C later

**Implementation:**
- Add sort controls to header
- Filter cached data in real-time
- Save preferences to localStorage

---

## 🎨 UI Design Concepts

### **Concept 1: Column Headers (Like Excel)**

```
┌─────────────────────────────────────────────────┐
│ 2842 of 2842 found                              │
├─────────────────────────────────────────────────┤
│ Name ▼ | Clinic ▲ | Funding | Age              │  ← Clickable headers
├─────────────────────────────────────────────────┤
│ Alan Smith       Tamworth    NDIS   45          │
│ Elaine Russell   Narrabri    DVA    67          │
│ John Hamilton    Narrabri    Private 52         │
└─────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Familiar pattern (Excel, spreadsheets)
- ✅ Clear visual indication of sort
- ✅ One-click sorting

**Cons:**
- ⚠️ Takes up vertical space
- ⚠️ Doesn't fit current design well
- ⚠️ Hard to add on narrow screens

---

### **Concept 2: Toolbar with Dropdowns (Current Style)**

```
┌─────────────────────────────────────────────────┐
│ [🔍 Search...] [Sort: Name ▼] [Clinic: All ▼]  │
│ 2842 of 2842 found                              │
├─────────────────────────────────────────────────┤
│ Alan Smith                                      │
│   Tamworth • NDIS                               │
├─────────────────────────────────────────────────┤
│ Elaine Russell                                  │
│   Narrabri • DVA                                │
└─────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Matches current design
- ✅ Compact
- ✅ Mobile-friendly

**Cons:**
- ⚠️ Dropdowns can be slow to use
- ⚠️ Takes 2 clicks (open, select)

---

### **Concept 3: Quick Filter Chips (Modern)**

```
┌─────────────────────────────────────────────────┐
│ [🔍 Search...]  [↕️ Sort ▼]                     │
│ [Tamworth ×] [NDIS ×] [Age 40-60 ×]            │  ← Active filters
│ 234 of 2842 found                               │
├─────────────────────────────────────────────────┤
│ Alan Smith                                      │
│   Tamworth • NDIS                               │
└─────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Visual - see active filters at a glance
- ✅ Easy to remove (click X)
- ✅ Modern UX pattern

**Cons:**
- ⚠️ Takes vertical space when filters active
- ⚠️ Can get cluttered with many filters

---

### **Concept 4: Side Panel (Advanced Filters)**

```
┌──────────┬──────────────────────────────────────┐
│ Filters  │ 2842 of 2842 found                   │
│          ├──────────────────────────────────────┤
│ Sort     │ Alan Smith                           │
│ [Name ▼] │   Tamworth • NDIS                    │
│          │                                      │
│ Clinic   │ Elaine Russell                       │
│ [All  ▼] │   Narrabri • DVA                     │
│          │                                      │
│ Funding  │ John Hamilton                        │
│ [All  ▼] │   Narrabri • Private                 │
│          │                                      │
│ Age      │                                      │
│ [Range]  │                                      │
└──────────┴──────────────────────────────────────┘
```

**Pros:**
- ✅ Always visible
- ✅ Room for many filters
- ✅ Professional look

**Cons:**
- ❌ Takes horizontal space (less room for list)
- ❌ Major UI change

---

## 🎯 Recommended Design: **Concept 2 + 3 Hybrid**

### **Proposal: Enhanced Toolbar with Active Filter Chips**

```
┌─────────────────────────────────────────────────┐
│ [🔍 Search...]  Sort: [Name ▼]  [+ Filters]     │  ← Toolbar
│ Active: [Tamworth ×] [NDIS ×]                   │  ← Chips (if any)
│ 234 of 2842 found                               │
├─────────────────────────────────────────────────┤
│ Alan Smith                                      │
│   Tamworth • NDIS                               │
└─────────────────────────────────────────────────┘
```

**Why this design:**
- ✅ Minimal when no filters active
- ✅ Shows active filters clearly
- ✅ Easy to add/remove filters
- ✅ Matches current design language
- ✅ Mobile-friendly

---

## 📋 Sorting Options

### **Basic Sorts (Client-Side):**

1. **Name (A-Z / Z-A)**
   - Default: Alphabetical by last name
   - Icon: ⬆️ or ⬇️

2. **Clinic (A-Z / Z-A)**
   - Group by clinic, then alphabetical
   - Show clinic colors

3. **Funding (A-Z / Z-A)**
   - Group by funding type
   - Order: NDIS, DVA, Private, Enable, etc.

4. **Recently Added**
   - Newest first
   - Based on created_at timestamp

5. **Recently Updated**
   - Most recently modified
   - Based on updated_at timestamp

6. **Age (Youngest / Oldest)**
   - Calculated from DOB
   - Useful for pediatrics vs geriatrics

### **Advanced Sorts (Future):**

7. **Appointment Date** (needs appointment data)
8. **Plan End Date** (NDIS patients)
9. **Number of Documents** (most documented)
10. **Last Contact Date** (engagement tracking)

---

## 🔍 Filtering Options

### **Current Filters (Keep These):**

1. **✅ Search** - Free text (name, health number)
2. **✅ Archive toggle** - Active/Archived
3. **✅ Clinic** - Dropdown with all clinics
4. **✅ Funding** - Dropdown with funding types

### **New Simple Filters (Client-Side):**

5. **Title** - Mr., Mrs., Ms., etc.
6. **Age Range** - Sliders (0-100)
   - Presets: "Children (<18)", "Adults (18-65)", "Seniors (65+)"
7. **Has Documents** - Yes/No toggle
8. **Has Notes** - Yes/No toggle
9. **Has Phone** - Yes/No toggle
10. **Has Email** - Yes/No toggle

### **Advanced Filters (Server-Side, Future):**

11. **Date Added** - Date range picker
12. **Last Updated** - Date range picker
13. **Plan Dates** - NDIS plan active/expired
14. **Coordinator** - Filter by assigned coordinator
15. **Has Appointments** - Past/Future/Any
16. **Custom Fields** - Any database field

---

## 🎮 User Experience Flow

### **Scenario 1: Quick Sort**

```
User wants to see patients alphabetically
  ↓
Click "Sort: Date Added ▼"
  ↓
Select "Name (A-Z)"
  ↓
List re-sorts instantly (0ms)
  ↓
Scroll and select patient
```

**Time:** <1 second
**Clicks:** 2

---

### **Scenario 2: Filter by Clinic + Funding**

```
User wants "Newcastle NDIS patients"
  ↓
Click "+ Filters" button
  ↓
Select "Newcastle" from Clinic dropdown
  ↓
Select "NDIS" from Funding dropdown
  ↓
Click "Apply"
  ↓
List filters instantly (10ms)
Shows "234 of 2842 found"
Active filters: [Newcastle ×] [NDIS ×]
  ↓
User can click × to remove filters
```

**Time:** <2 seconds
**Clicks:** 4-5

---

### **Scenario 3: Saved Filter Set (Future)**

```
User has a saved filter: "My Regular Patients"
  ↓
Click "Saved Filters" dropdown
  ↓
Select "My Regular Patients"
  ↓
Instantly applies: Newcastle + NDIS + Active
  ↓
List filtered (10ms)
```

**Time:** <1 second
**Clicks:** 2

---

## ⚡ Performance Considerations

### **Current Cache: 2,842 patients, 500KB**

**Sorting Performance:**
- JavaScript Array.sort() on 2,842 items: **<5ms**
- Re-render list: **<10ms**
- **Total: <15ms** ✅ Instant!

**Filtering Performance:**
- JavaScript Array.filter() on 2,842 items: **<3ms**
- Re-render filtered list: **<10ms**
- **Total: <13ms** ✅ Instant!

**Memory Usage:**
- Cached list: 500KB
- Filtered list: 100-300KB (subset)
- **Total: <1MB** ✅ Very light!

**Conclusion:** Client-side sorting/filtering is **extremely fast** for this dataset size.

---

## 💾 State Management

### **Where to Store Sort/Filter State:**

**Option 1: React State (Current Session Only)**
```typescript
const [sortBy, setSortBy] = useState('name');
const [sortOrder, setSortOrder] = useState('asc');
const [filters, setFilters] = useState({ clinic: '', funding: '' });
```

**Pros:** ✅ Simple, ✅ No persistence needed
**Cons:** ❌ Lost on refresh, ❌ Can't share

---

**Option 2: localStorage (Persistent)**
```typescript
// On change
localStorage.setItem('patientSort', JSON.stringify({ by: 'name', order: 'asc' }));

// On load
const savedSort = JSON.parse(localStorage.getItem('patientSort'));
```

**Pros:** ✅ Persists across sessions, ✅ Fast access
**Cons:** ⚠️ Per-browser only, ❌ Can't sync across devices

---

**Option 3: URL Query Params (Shareable)**
```typescript
// URL: /patients?sort=name&order=asc&clinic=newcastle&funding=ndis

const searchParams = useSearchParams();
const sortBy = searchParams.get('sort') || 'name';
```

**Pros:** ✅ Shareable links, ✅ Browser back/forward works
**Cons:** ⚠️ URL gets long, ⚠️ Lost if user types new URL

---

**Option 4: Backend User Preferences (Enterprise)**
```typescript
// Save to database
await fetch('/api/user/preferences/', {
  method: 'PATCH',
  body: JSON.stringify({ defaultSort: 'name', defaultFilters: {...} })
});
```

**Pros:** ✅ Syncs across devices, ✅ Per-user preferences
**Cons:** ❌ Complex, ❌ Slower (network), ❌ Needs backend changes

---

### **Recommended: Hybrid (localStorage + URL)**

```typescript
// Load from localStorage (default)
// Override with URL params (if present)
// Save changes back to localStorage

const getSort = () => {
  // 1. Check URL first (shareable links)
  const urlSort = searchParams.get('sort');
  if (urlSort) return urlSort;
  
  // 2. Check localStorage (user preference)
  const saved = localStorage.getItem('patientSort');
  if (saved) return JSON.parse(saved).by;
  
  // 3. Default
  return 'name';
};
```

**Benefits:**
- ✅ Persistent preferences
- ✅ Shareable filtered views
- ✅ Best of both worlds

---

## 🚀 Implementation Plan

### **Phase 1: Basic Sorting (2-3 hours)**

**Tasks:**
1. Add sort dropdown to toolbar
2. Implement client-side sorting (name, clinic, funding)
3. Save sort preference to localStorage
4. Add visual indicators (▲▼ arrows)

**Deliverable:** Users can sort patient list by name, clinic, or funding

---

### **Phase 2: Enhanced Filtering (3-4 hours)**

**Tasks:**
1. Improve filter UI (chips for active filters)
2. Add "Clear All Filters" button
3. Add quick filters (age range toggle, has documents)
4. Combine filters with sorting

**Deliverable:** Users can filter by multiple criteria simultaneously

---

### **Phase 3: Persistence & Sharing (2-3 hours)**

**Tasks:**
1. Add URL query params for shareability
2. Save filter preferences to localStorage
3. Add "Copy Link" button to share filtered view
4. Restore preferences on page load

**Deliverable:** Filters persist across sessions and can be shared

---

### **Phase 4: Saved Filter Sets (Future)**

**Tasks:**
1. Add "Save Filter Set" button
2. Store in localStorage or backend
3. Dropdown to quickly apply saved sets
4. "My Favorites" section

**Deliverable:** Power users can save common filter combinations

---

## 📊 Success Metrics

### **Measure These:**

1. **Speed** - Sort/filter response time (<50ms target)
2. **Usage** - % of users who use sorting (track clicks)
3. **Adoption** - % of sessions with active filters
4. **Retention** - Do users return to saved filters?
5. **Performance** - Page load time still <100ms?

### **User Feedback:**

- "Can I sort by clinic?" → **Should drop to zero**
- "Where's the filter button?" → **Should be obvious**
- "It's too slow" → **Should never hear this**

---

## 🎯 Decision Matrix

| Criteria | Client-Side | Server-Side | Hybrid |
|----------|-------------|-------------|--------|
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Complexity** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Scalability** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Power** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Maintenance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **UX** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**Winner for 2,842 patients:** ✅ **Client-Side** (with option to add server-side later)

---

## 💭 Open Questions

1. **Should we add grouping?** (e.g., group by clinic with headers)
2. **Multi-column sort?** (Sort by clinic, then name within clinic)
3. **Advanced search?** (Boolean operators: "Newcastle AND NDIS")
4. **Export filtered list?** (CSV download of current view)
5. **Bulk actions?** (Archive all filtered patients)

---

## 📝 Recommendations

### **Start Small, Iterate:**

1. ✅ **Phase 1** - Add basic sorting (name, clinic, funding)
2. ✅ **Test with users** - Get feedback
3. ✅ **Phase 2** - Add filter chips if needed
4. ✅ **Phase 3** - Add persistence if requested
5. ⏳ **Phase 4+** - Advanced features based on usage

### **Don't Over-Engineer:**

- ❌ Don't build saved filters until users ask
- ❌ Don't add 20 filter options if 3 are enough
- ❌ Don't make it complex - simple is better

### **Focus on Common Use Cases:**

- ✅ "Show me my Newcastle patients"
- ✅ "Sort by name so I can find someone"
- ✅ "Filter NDIS patients for reporting"
- ✅ "Hide archived patients" (already have!)

---

## 🎉 Next Steps

1. **Review this document** with team/users
2. **Get approval** on recommended approach
3. **Create UI mockups** if needed
4. **Implement Phase 1** (basic sorting)
5. **Test and gather feedback**
6. **Iterate** based on real usage

---

**Ready to build?** Let's start with Phase 1! 🚀

