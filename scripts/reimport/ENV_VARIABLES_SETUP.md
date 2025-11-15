# ⚠️ IMPORTANT: FileMaker Environment Variables Configuration

**Date:** November 14, 2025  
**Issue:** Environment variable naming mismatch  
**Status:** 🟡 NEEDS USER ACTION

---

## 🔴 PROBLEM IDENTIFIED

Your `.env` file uses **different variable names** than the reimport scripts expect!

### Your Current `.env` (What You Have):
```bash
FM_BASE_URL=https://walkeasy.fmcloud.fm
FM_DB_NAME=WEP-DatabaseV2
FM_USERNAME=Craig
FM_PASSWORD=Marknet//2
```

### What Scripts Expect (What's Needed):
```bash
FILEMAKER_HOST=walkeasy.fmcloud.fm
FILEMAKER_DATABASE=WEP-DatabaseV2
FILEMAKER_USERNAME=Craig
FILEMAKER_PASSWORD=Marknet//2
```

---

## ✅ SOLUTION: Add These Lines to Your `.env` File

**Option 1: Add New Variables (Recommended)**

Add these lines to your existing `.env` file:

```bash
# ========================================
# FileMaker Reimport Scripts Configuration
# ========================================
FILEMAKER_HOST=walkeasy.fmcloud.fm
FILEMAKER_DATABASE=WEP-DatabaseV2
FILEMAKER_USERNAME=Craig
FILEMAKER_PASSWORD=Marknet//2

# Note: Keep your existing FM_* variables for other parts of the system
# The reimport scripts specifically look for FILEMAKER_* variables
```

**Option 2: Update Scripts (Not Recommended)**

Alternatively, I could modify all the scripts to use `FM_*` instead of `FILEMAKER_*`, but this would require changing multiple files and might break compatibility.

---

## 📍 WHERE TO ADD THEM

### Location: `.env` file in your project root

```bash
cd /Users/craig/Documents/nexus-core-clinic
nano .env  # or open with your text editor
```

Add the `FILEMAKER_*` variables to the file.

---

## 🔍 WHICH SCRIPTS USE THESE VARIABLES

### Reimport Scripts (use `FILEMAKER_*`):
1. ✅ `scripts/reimport/utils/filemaker_client.py`
   - Lines 37-40: Uses `FILEMAKER_HOST`, `FILEMAKER_DATABASE`, `FILEMAKER_USERNAME`, `FILEMAKER_PASSWORD`

2. ✅ `backend/extract_filemaker_all_images.py`
   - Lines 32-33: Uses `FILEMAKER_USERNAME`, `FILEMAKER_PASSWORD`

3. ✅ `backend/extract_filemaker_images_odata.py`
   - Lines 36-37: Uses `FILEMAKER_USERNAME`, `FILEMAKER_PASSWORD`

### Main Application (uses `FM_*`):
- Your Django settings likely use `FM_BASE_URL`, `FM_DB_NAME`, `FM_USERNAME`, `FM_PASSWORD`
- Keep these for your main application!

---

## ✅ FINAL `.env` CONFIGURATION

Your `.env` file should have **BOTH** sets of variables:

```bash
# ========================================
# FileMaker API (Main Application)
# ========================================
FM_BASE_URL=https://walkeasy.fmcloud.fm
FM_DB_NAME=WEP-DatabaseV2
FM_USERNAME=Craig
FM_PASSWORD=Marknet//2

# ========================================
# FileMaker Reimport Scripts
# ========================================
FILEMAKER_HOST=walkeasy.fmcloud.fm
FILEMAKER_DATABASE=WEP-DatabaseV2
FILEMAKER_USERNAME=Craig
FILEMAKER_PASSWORD=Marknet//2
```

---

## 🚨 CRITICAL: Security Warning

**Your password `Marknet//2` was exposed in git history!**

### Immediate Actions Required:

1. ✅ **Change your FileMaker password IMMEDIATELY**
   - Log into FileMaker Server
   - Change password for user `Craig`
   - Update both `FM_PASSWORD` and `FILEMAKER_PASSWORD` in `.env`

2. ✅ **Update `.env` file with new password**
   ```bash
   FM_PASSWORD=<your-new-secure-password>
   FILEMAKER_PASSWORD=<your-new-secure-password>
   ```

3. ⚠️ **Verify `.env` is in `.gitignore`**
   ```bash
   grep "^\.env$" .gitignore
   ```
   Should return: `.env`

---

## 🧪 TEST THE CONFIGURATION

After adding the variables, test them:

### Test 1: Verify Variables Are Set
```bash
cd /Users/craig/Documents/nexus-core-clinic
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('FILEMAKER_USERNAME:', os.getenv('FILEMAKER_USERNAME')); print('FILEMAKER_HOST:', os.getenv('FILEMAKER_HOST'))"
```

**Expected Output:**
```
FILEMAKER_USERNAME: Craig
FILEMAKER_HOST: walkeasy.fmcloud.fm
```

### Test 2: Test FileMaker Connection
```bash
cd scripts/reimport/phase0_validation
python validate_filemaker_connection.py
```

**Expected:** Connection successful!

### Test 3: Test Dry Run
```bash
cd scripts/reimport
python master_reimport.py --dry-run
```

**Expected:** All phases run in preview mode

---

## 📋 QUICK CHECKLIST

Before running reimport:

- [ ] Add `FILEMAKER_HOST` to `.env`
- [ ] Add `FILEMAKER_DATABASE` to `.env`
- [ ] Add `FILEMAKER_USERNAME` to `.env`
- [ ] Add `FILEMAKER_PASSWORD` to `.env`
- [ ] Change FileMaker password (security)
- [ ] Update both `FM_PASSWORD` and `FILEMAKER_PASSWORD` with new password
- [ ] Verify `.env` is in `.gitignore`
- [ ] Test connection with `validate_filemaker_connection.py`
- [ ] Run dry-run test

---

## 🎯 SUMMARY

**What You Need to Do:**

1. **Add 4 lines to your `.env` file:**
   ```bash
   FILEMAKER_HOST=walkeasy.fmcloud.fm
   FILEMAKER_DATABASE=WEP-DatabaseV2
   FILEMAKER_USERNAME=Craig
   FILEMAKER_PASSWORD=Marknet//2
   ```

2. **Change your FileMaker password** (security!)

3. **Update passwords in `.env`** (both `FM_PASSWORD` and `FILEMAKER_PASSWORD`)

4. **Test it:**
   ```bash
   cd scripts/reimport
   python master_reimport.py --dry-run
   ```

**That's it!** Once you do this, the reimport scripts will work perfectly.

---

**Status:** ⚠️ **WAITING FOR USER ACTION**  
**Next Step:** Add variables to `.env` and test

