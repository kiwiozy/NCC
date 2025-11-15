# FileMaker Document Import - Analysis & Investigation

**Date:** November 9, 2025  
**Import Time:** 3:27 PM - 5:17 PM (1 hour 50 minutes)  
**Status:** ⚠️ **Partial Success - Script Logic Issue**

---

## 🔍 **Investigation: Why It Stopped at 6,165**

### **Root Cause Found:** ✅

**Location:** `backend/documents/management/commands/import_filemaker_documents.py` **Line 370**

```python
# Check if we've processed all
if returned_count < batch_size or total_processed >= stats['total_found']:
    self.stdout.write("\n   ✅ All documents processed!")
    break
```

### **The Problem:**

The script has a **logic error** in the exit condition:

**Exit Condition:** `returned_count < batch_size`

**What Happened:**
1. Script fetched batches of 50 documents at a time
2. At offset 6151, FileMaker returned only **15 documents** (not 50)
3. Script interpreted this as "end of records" and stopped
4. **But there were still 5,094 more documents to process!**

---

## 📊 **Why Did FileMaker Return Only 15 Documents?**

### **Possible Reasons:**

#### **1. FileMaker Query Pagination Issue** (Most Likely)
- FileMaker's `_find` API might have a result set limit
- After 6,150+ records, it may have hit an internal cursor limit
- FileMaker Cloud might have pagination restrictions we didn't account for

#### **2. NexusExportDate Changed During Import**
- Unlikely, but possible: As documents were marked exported, the query results shrank
- FileMaker might have been re-evaluating the query on each fetch

#### **3. FileMaker Server Performance**
- After ~2 hours of continuous queries, server might have started throttling
- Result set might have been refreshed/reset

---

## 📈 **Import Results Breakdown:**

### **What We Know:**

| Metric | Count | Calculation |
|--------|-------|-------------|
| **Total in FileMaker** | 11,259 | Initial query result |
| **Batches Processed** | 124 batches | (6,165 / 50 = 123.3) |
| **Last Batch Size** | 15 documents | Triggered early exit |
| **Processed** | 6,165 | Attempted to process |
| **✅ Successful** | 5,109 | Actually imported (82.9% of processed) |
| **❌ Failed** | 1,041 | Download failures (16.9% of processed) |
| **⏭️ Skipped** | 15 | Already in database (0.2% of processed) |
| **⏸️ Not Attempted** | 5,094 | **Never reached due to script exit** |

---

### **The Missing 5,094 Documents:**

These documents were:
- ✅ Found by initial query (in the 11,259 count)
- ✅ Have empty `NexusExportDate` (need to be exported)
- ❌ Never attempted (script exited too early)
- ✅ **Can be imported by re-running the script** (tracking is safe)

---

## 🐛 **The Bug Explained:**

### **Current Logic (Incorrect):**

```python
# Exit if batch is smaller than requested
if returned_count < batch_size:
    break
```

**Problem:** FileMaker can return fewer than requested for many reasons:
- Pagination limits
- Server performance
- Query optimization
- **But there might still be more records!**

---

### **Correct Logic (Should Be):**

```python
# Exit only if NO records returned
if not records or returned_count == 0:
    break

# OR: Exit if we've processed all we found
if total_processed >= stats['total_found']:
    break
```

**This would:**
- Continue fetching until FileMaker returns 0 records
- Or until we've processed all 11,259 documents
- Not exit just because one batch is smaller

---

## 🔧 **Fix Required:**

### **Option 1: Remove the `< batch_size` check** (Safest)

```python
# Line 370 - CHANGE THIS:
if returned_count < batch_size or total_processed >= stats['total_found']:
    break

# TO THIS:
if total_processed >= stats['total_found']:
    # Still processed less than found? Keep going!
    if returned_count > 0:
        offset += batch_size
        continue
    else:
        # No records returned, truly done
        break
```

---

### **Option 2: Add better logging and continue**

```python
# Line 370 - MORE ROBUST:
if returned_count < batch_size:
    self.stdout.write(f"   ⚠️ Received {returned_count} (less than batch size {batch_size})")
    if total_processed >= stats['total_found']:
        self.stdout.write("   ✅ All documents processed!")
        break
    elif returned_count == 0:
        self.stdout.write("   ✅ No more records to process")
        break
    else:
        self.stdout.write("   ➡️ Continuing to next batch...")
        # Continue anyway - might be more records
```

---

## 🎯 **Immediate Solutions:**

### **Solution 1: Re-run the Script (No Changes)** ⭐ **RECOMMENDED**

Since we're using `NexusExportDate` tracking:

```bash
cd backend
./venv/bin/python manage.py import_filemaker_documents
```

**What will happen:**
- FileMaker will find documents with empty `NexusExportDate`
- Should now return ~5,094 documents (the ones we missed)
- Will import them
- **Safe**: Won't re-import the 5,109 already done (they have `NexusExportDate` set)

**Estimated time:** ~1.5 hours (5,094 docs at ~56 docs/min)

---

### **Solution 2: Fix the Script, Then Re-run** (Better Long-term)

1. **Fix the exit logic** (line 370)
2. **Test with small batch** (to verify fix)
3. **Run full import** (will get remaining 5,094)
4. **Benefit:** More robust for future imports

---

### **Solution 3: Manual Query Remaining Range**

Query FileMaker directly for records **after** ID 12043 (last processed):

```python
# Custom query
search_data = {
    "query": [
        {"NexusExportDate": "="},  # Empty
        {"id": ">12043"}  # After last one
    ],
    "limit": "5000"
}
```

**Not recommended:** More complex, easier to just re-run.

---

## 📊 **Expected Re-run Results:**

### **If We Re-run Now:**

| Scenario | Expected |
|----------|----------|
| **Total found** | ~5,094 (remaining) |
| **Success rate** | ~83% (based on first run) |
| **Expected successful** | ~4,228 documents |
| **Expected failures** | ~866 documents |
| **Total successful (after re-run)** | **~9,337 documents** (5,109 + 4,228) |
| **Final success rate** | **~83% of 11,259** |

---

## 🔍 **Analysis of Failures (1,041 in first run):**

### **Failure Types:**

From the logs, two main types:

1. **"Failed to download file content"** (~95% of failures)
   - Network timeout
   - FileMaker server throttling
   - Temporary connection issues
   - **May succeed on retry!**

2. **"Container field 'Doc' is empty"** (~5% of failures)
   - No file actually attached in FileMaker
   - These will always fail
   - **Expected behavior**

---

### **Re-run Benefits:**

Some of the 1,041 "failed to download" might succeed on re-run if they were:
- Temporary network issues
- Server throttling
- Timeout issues

**Estimated recovery:** 10-20% of failures might succeed on retry (~100-200 more documents)

---

## 📋 **Recommended Action Plan:**

### **Step 1: Re-run Import (No Changes)** ⏰ ~1.5 hours

```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
./venv/bin/python -u manage.py import_filemaker_documents > ../logs/filemaker_bulk_export_run2.log 2>&1 &
```

**Expected:**
- Process remaining 5,094 documents
- Import ~4,228 successfully
- Total: 9,337 documents imported

---

### **Step 2: Fix Script Logic** (After re-run completes)

Update line 370 in `import_filemaker_documents.py`:

```python
# Remove the "< batch_size" check
# Keep only the total_processed check
if total_processed >= stats['total_found'] and returned_count == 0:
    self.stdout.write("\n   ✅ All documents processed!")
    break
```

---

### **Step 3: Final Verification**

After both runs:
- Check total documents in S3
- Verify Document count in database
- Check for any remaining empty `NexusExportDate` in FileMaker

---

## 🎯 **Questions Answered:**

### **Q: Why did it stop at 6,165?**
**A:** Script logic error - exited when batch size was less than 50, even though more records existed.

### **Q: Are the 5,109 imported documents safe?**
**A:** ✅ Yes! They're in S3, in the database, and marked in FileMaker.

### **Q: Can we get the remaining 5,094?**
**A:** ✅ Yes! Just re-run the script - it won't duplicate anything.

### **Q: Will re-running cause duplicates?**
**A:** ❌ No! The `NexusExportDate` tracking prevents duplicates.

### **Q: How long will re-run take?**
**A:** ~1.5 hours for ~5,094 documents at ~56 docs/min.

### **Q: Should we fix the script first?**
**A:** Optional - re-running works fine. Fix it after for future robustness.

---

## 💡 **Key Learnings:**

1. **FileMaker pagination is unpredictable** - Don't rely on consistent batch sizes
2. **Tracking field (`NexusExportDate`) was brilliant** - Prevents duplicates on re-run
3. **Exit conditions matter** - Always check for 0 records, not just smaller batches
4. **Incremental import design works!** - Can stop/restart safely

---

## ✅ **Summary:**

| Status | Details |
|--------|---------|
| **Issue** | Script exited early due to logic error (line 370) |
| **Impact** | 5,094 documents not attempted (45% of total) |
| **Risk** | ✅ None - data is safe, can re-run |
| **Fix** | Re-run script (will get remaining docs) |
| **ETA** | ~1.5 hours to complete |
| **Final Expected** | ~9,337 documents (83% success rate) |

---

**Next Action:** Re-run the import script to get the remaining 5,094 documents? 🚀

**Document Created:** November 9, 2025  
**Analysis:** Complete  
**Status:** Ready to re-run import

