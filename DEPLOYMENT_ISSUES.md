# 🔍 What's Going Wrong - Deployment Issues

## Current Problem

**Goal:** Drop all existing tables and run fresh migrations (clean slate)

**Issues Encountered:**

### 1. **Management Commands Not in Docker Image**
- Created `drop_all_tables.py` management command locally
- Files exist in: `backend/ncc_api/management/commands/`
- **Problem:** When Cloud Run builds from source, it might use cached builds or the files aren't being included
- **Error:** `Unknown command: 'drop_all_tables'`

### 2. **Python Scripts Not in Image**
- Created `drop_tables.py` script locally
- **Problem:** Scripts created after deployment aren't in the container
- **Error:** `can't open file '/app/python': [Errno 2] No such file or directory`

### 3. **Database Connection Issues**
- Cloud SQL Proxy needs authentication
- Direct SQL connection needs password (authentication issues)
- **Status:** ✅ Authentication now working

### 4. **Partial Migrations Applied**
- Some tables already exist (`appointment_types`, etc.)
- Django migration state is inconsistent
- **Status:** Fake migrations worked, but tables still exist

---

## ✅ What Actually Worked

1. **Fake Migrations:** Successfully marked migrations as applied
   ```
   Applying xero_integration.0001_initial... FAKED
   ```

2. **Database Connection:** Cloud Run can connect to Cloud SQL
   - Password authentication working
   - Connection via Unix socket working

---

## 🎯 Solution Options

### **Option A: Use Django Shell (Recommended)**
```python
# In Django shell on Cloud Run
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
tables = [r[0] for r in cursor.fetchall()]
for t in tables:
    cursor.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE')
```

### **Option B: Direct SQL via Cloud SQL Admin API**
- Use `gcloud sql` commands
- Execute DROP statements directly

### **Option C: Redeploy with Management Command**
- Ensure `drop_all_tables.py` is committed
- Force fresh build (no cache)
- Then run the command

### **Option D: Use --run-syncdb Flag**
- Run migrations with `--run-syncdb`
- This recreates tables even if they exist
- Simpler but less clean

---

## 🚀 Recommended Next Step

**Use Django shell approach** - it's already in the container and doesn't require new files.

