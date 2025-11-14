# WebKit Sticky Positioning Bugs - Research Summary

## Search Results from bugs.webkit.org

**Search Query:** `position sticky overflow`  
**Results Found:** 20 bugs

## Most Relevant Bugs

### 🔴 Bug #195983 - **CRITICAL FOR OUR ISSUE**
**Title:** Fix sticky positioning inside async overflow:scroll on macOS  
**Status:** NEW (unfixed since 2019)  
**Priority:** P2  
**Component:** Scrolling  
**Reported:** 2019-03-19  
**URL:** https://bugs.webkit.org/show_bug.cgi?id=195983

**Description:**
> RenderLayerCompositor::isAsyncScrollableStickyLayer has some iOS-only code related to finding the ancestor async overflow scroll of a sticky layer. We should enable this on macOS too.

**Key Finding:** Safari on macOS has a known bug where `position: sticky` doesn't work correctly inside elements with `overflow: auto` or `overflow: scroll`. The fix exists for iOS but hasn't been enabled for macOS.

**Impact:** This is **exactly** our issue! Our sticky headers are inside `AppShell.Main` with `overflow: 'auto'`.

---

### Other Relevant Bugs

#### Bug #203120
**Title:** Position: sticky, overflow: auto and rtl direction issue  
**Status:** NEW  
**Reported:** 2025-02-05  
**URL:** https://bugs.webkit.org/show_bug.cgi?id=203120

#### Bug #230438
**Title:** WKWebview sticky element with overflow scroll/auto causes elements to disappear during overscroll  
**Status:** NEW  
**Reported:** 2021-09-30  
**URL:** https://bugs.webkit.org/show_bug.cgi?id=230438

#### Bug #291895
**Title:** overflow-x: clip and position: sticky on same element cuts it vertically  
**Status:** NEW  
**Reported:** 2025-04-24  
**URL:** https://bugs.webkit.org/show_bug.cgi?id=291895

#### Bug #210368
**Title:** position:sticky prematurely unsticks in height-set flex overflow with-in flex  
**Status:** NEW  
**Reported:** 2021-09-20  
**URL:** https://bugs.webkit.org/show_bug.cgi?id=210368

---

## Root Cause Analysis

### Why Our Fix Worked

Our solution moved `overflow: auto` to an inner `div` instead of `AppShell.Main`, which **bypasses Safari's bug** by ensuring sticky elements are direct children of the scrolling container, not nested inside an element with overflow.

**Our Working Structure:**
```tsx
<AppShell.Main> {/* No overflow here */}
  <div style={{ height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
    {/* Sticky elements as direct children */}
    <div style={{ position: 'sticky' }}>Letters Title</div>
    <div style={{ position: 'sticky' }}>Toolbar</div>
    {/* Content */}
  </div>
</AppShell.Main>
```

**Why This Works:**
1. Sticky elements are direct children of the scroll container
2. The overflow is on an inner div, not the parent
3. Safari's async scrolling bug only affects sticky elements inside overflow containers

---

## WebKit CSS Feature Status

From webkit.org/css-status:
- `position: sticky` is **officially supported** ✅
- Includes `-webkit-sticky` prefix for compatibility
- But has **known bugs** with overflow containers ⚠️

---

## Recommendations

### 1. ✅ **Current Solution is Correct**
   - Our workaround (overflow on inner div) is the recommended approach
   - This avoids triggering Safari's bug #195983

### 2. ⚠️ **Bug Still Unfixed**
   - Bug #195983 is still NEW after 6 years (2019-2025)
   - Don't expect a fix anytime soon
   - Our workaround is necessary

### 3. 📝 **Document the Issue**
   - Document that this is a known Safari bug
   - Link to bug #195983 in our documentation
   - Explain why we use the inner scroll div pattern

### 4. 🔄 **Monitor for Updates**
   - Watch bug #195983 for status changes
   - If fixed, we could potentially simplify our structure

---

## References

- **WebKit Bug Tracker:** https://bugs.webkit.org
- **CSS Feature Status:** https://webkit.org/css-status/
- **Bug #195983:** https://bugs.webkit.org/show_bug.cgi?id=195983
- **CSS Position Spec:** https://www.w3.org/TR/css-position-3/#propdef-position

---

**Last Updated:** 2025-11-02  
**Researched By:** AI Assistant using WebKit Bugzilla

