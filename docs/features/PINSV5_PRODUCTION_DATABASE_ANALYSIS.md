# 🔍 PinsV5 Production Database Analysis

**Date:** November 16, 2025  
**Purpose:** Document PinsV5 production setup and database connection patterns for migration planning  
**Firebase Project:** `referrer-map`

---

## 📊 **Executive Summary**

**PinsV5 Production Environment:**
- **Frontend:** https://referrer-map.web.app (Firebase Hosting)
- **Firebase Project:** `referrer-map`
- **Database:** Firebase Firestore (Production)
- **Storage:** Firebase Storage
- **Backend APIs:** Google Cloud Run (Australia-Southeast1)
- **Total Data:** 555 companies, 1,265 practitioners

**Key Finding:** PinsV5 uses a **unified production database** for both development and production - no separate dev/staging databases.

---

## 🗄️ **Firebase Firestore Database Structure**

### **Production Database: `referrer-map`**

**Collections:**

1. **`providers`** - Main provider data (555 companies)
2. **`contacts`** - Contact history records
3. **`provider_contact_summary`** - Aggregated contact data
4. **`unified_callbacks`** / `followUpQueue`** - Scheduled callbacks
5. **`companyProfiles`** - Company profile (shared)
6. **`mapAreas`** - Geographic territories
7. **`postcodeExtractions`** - Postcode data from scraping
8. **`scrapeSession`** - Web scraping session history
9. **`users`** - User data

**Total Records:**
```
Providers Collection:
├── Newcastle Region: 382 companies (1,048 practitioners)
│   ├── Podiatrists: 122 companies (149 practitioners)
│   ├── Physiotherapists: 77 companies (123 practitioners)
│   └── Occupational Therapists: 183 companies (776 practitioners)
│
└── Tamworth Region: 173 companies (217 practitioners)
    ├── Podiatrists: 131 companies (159 practitioners)
    ├── Physiotherapists: 15 companies (20 practitioners)
    └── Occupational Therapists: 27 companies (38 practitioners)

TOTAL: 555 companies, 1,265 practitioners
```

---

## 🔑 **Firebase Configuration**

### **Connection Configuration (from code):**

```javascript
// web/src/services/firebase.ts
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,  // "referrer-map"
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

### **Key Configuration Details:**

1. **Unified Database Approach:**
   - Development and production use **same Firebase project**
   - No data prefixes (e.g., `dev_providers`, `prod_providers`)
   - Collection names are clean (e.g., `providers`, not `prod_providers`)

2. **HTTP-Only Mode:**
   ```javascript
   // Configured to prevent CORS errors in development
   db = initializeFirestore(app, {
     experimentalForceLongPolling: true, // Force HTTP long polling
     ignoreUndefinedProperties: true,
     cacheSizeBytes: 1048576 // 1MB cache
   });
   ```

3. **No Emulators:**
   - Always connects to production Firestore
   - No local emulator usage
   - Development reads/writes to production data

---

## 🔌 **Database Connection Patterns**

### **1. Frontend Connection (React/TypeScript)**

**File:** `web/src/services/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  cacheSizeBytes: 1048576
});
export const storage = getStorage(app);
```

**Usage in Services:**
```typescript
// web/src/services/providers.ts
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

class ProvidersService {
  private get collection() {
    return collection(db, 'providers');  // No prefix!
  }

  async getProviders(filters) {
    const q = query(this.collection, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}
```

---

### **2. Backend Connection (Node.js - Admin SDK)**

**File:** `web/scripts/web-database-import.js`

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

// Web SDK (not Admin SDK) for easier auth
const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: "referrer-map",
  // ... other config
});

const db = getFirestore(app);

// Import data
const companiesRef = collection(db, 'providers');
await addDoc(companiesRef, companyData);
```

**Alternative: Admin SDK (when needed)**
```javascript
import admin from 'firebase-admin';

// Initialize with service account
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
```

---

### **3. API Server Connection (Cloud Run)**

**File:** `web/scripts/api-server-v2/server.js`

```javascript
// Auto-save to Firestore
const admin = await import('firebase-admin');

// Initialize if not already initialized
if (admin.default.apps.length === 0) {
  const serviceAccountPath = path.join(__dirname, '../../../firebase-service-account.json');
  const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
  
  admin.default.initializeApp({
    credential: admin.default.credential.cert(serviceAccount)
  });
}

const db = admin.default.firestore();
const providersRef = db.collection('providers');
```

---

## 🚀 **Production Deployment URLs**

### **Frontend:**
- **URL:** https://referrer-map.web.app
- **Platform:** Firebase Hosting
- **Deployment:** `firebase deploy --only hosting`

### **Backend APIs (Google Cloud Run):**

| Service | URL | Region | Purpose |
|---------|-----|--------|---------|
| **API V2** | https://api-v2-qpivswfenq-ts.a.run.app | australia-southeast1 | Web scraping, provider operations |
| **Email Server** | https://email-server-qpivswfenq-ts.a.run.app | australia-southeast1 | Email sending (SES) |
| **Bounce Processor** | https://bounce-processor-qpivswfenq-ts.a.run.app | australia-southeast1 | Email bounce handling |

---

## 📦 **Service Account & Authentication**

### **Firebase Service Account:**

**File:** `firebase-service-account.json` (not in repo - .gitignored)

**Structure:**
```json
{
  "type": "service_account",
  "project_id": "referrer-map",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@referrer-map.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**How to Get:**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: `referrer-map`
3. Project Settings → Service Accounts
4. Generate new private key
5. Download JSON file

**Usage:**
- Backend scraping (Node.js)
- Data import scripts
- API servers (Cloud Run)
- Not used in frontend (uses Web SDK)

---

## 🔐 **Environment Variables (Production)**

### **Frontend (.env.production):**
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=referrer-map.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=referrer-map
VITE_FIREBASE_STORAGE_BUCKET=referrer-map.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# OpenAI
VITE_OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS (for SES email)
VITE_AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxx
VITE_AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=ap-southeast-2

# API URLs
VITE_API_BASE_URL=https://api-v2-qpivswfenq-ts.a.run.app
VITE_EMAIL_API_BASE_URL=https://email-server-qpivswfenq-ts.a.run.app
VITE_FRONTEND_URL=https://referrer-map.web.app
```

### **Backend (.env for scripts):**
```bash
# Same Firebase config as frontend
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=referrer-map
# ... etc

# Node environment
NODE_ENV=production

# Service account path (for Admin SDK)
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

---

## 📊 **Data Export Strategy for Migration**

### **Option 1: Firebase Admin SDK Export (Recommended)**

**Create:** `scripts/export-pinsv5-data.js`

```javascript
const admin = require('firebase-admin');
const fs = require('fs/promises');

// Initialize with service account
const serviceAccount = require('./pinsv5-firebase-adminsdk.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'referrer-map'
});

const db = admin.firestore();

async function exportCollection(collectionName) {
  console.log(`Exporting ${collectionName}...`);
  
  const snapshot = await db.collection(collectionName).get();
  const data = [];
  
  snapshot.forEach(doc => {
    data.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  await fs.writeFile(
    `./exports/${collectionName}.json`,
    JSON.stringify(data, null, 2)
  );
  
  console.log(`✅ Exported ${data.length} documents from ${collectionName}`);
  return data.length;
}

async function exportAllData() {
  const collections = [
    'providers',
    'contacts',
    'provider_contact_summary',
    'unified_callbacks',
    'companyProfiles',
    'mapAreas'
  ];
  
  for (const collection of collections) {
    await exportCollection(collection);
  }
}

exportAllData().then(() => {
  console.log('✅ Export complete!');
  process.exit(0);
});
```

**Run:**
```bash
node scripts/export-pinsv5-data.js
```

**Output:**
```
exports/
├── providers.json                 (555 companies)
├── contacts.json                  (contact history)
├── provider_contact_summary.json  (summaries)
├── unified_callbacks.json         (callbacks)
├── companyProfiles.json           (1 document)
└── mapAreas.json                  (map territories)
```

---

### **Option 2: Firestore Export (Firebase CLI)**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Export entire database
firebase firestore:export gs://referrer-map-exports/pinsv5-backup

# Or export specific collections
gcloud firestore export gs://referrer-map-exports/pinsv5-backup \
  --collection-ids=providers,contacts,provider_contact_summary,unified_callbacks,mapAreas
```

**Download exports:**
```bash
gsutil -m cp -r gs://referrer-map-exports/pinsv5-backup ./exports/
```

---

### **Option 3: Direct Firebase Query (Web SDK)**

For smaller datasets or testing:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs/promises';

const app = initializeApp({ /* config */ });
const db = getFirestore(app);

const snapshot = await getDocs(collection(db, 'providers'));
const providers = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));

await fs.writeFile('providers.json', JSON.stringify(providers, null, 2));
```

---

## 🔄 **Import to Nexus Django**

### **After Exporting from Firebase:**

**Create:** `backend/providers/management/commands/import_pinsv5_data.py`

```python
import json
from django.core.management.base import BaseCommand
from providers.models import Provider, ContactRecord, ProviderContactSummary

class Command(BaseCommand):
    help = 'Import PinsV5 data from Firebase exports'
    
    def handle(self, *args, **options):
        # Import providers
        with open('exports/providers.json', 'r') as f:
            providers_data = json.load(f)
        
        for item in providers_data:
            Provider.objects.create(
                provider_id=item.get('id'),
                name=item['name'],
                type=item['type'],
                provider_structure=item.get('providerStructure', 'company'),
                address=item['address'],
                suburb=item.get('suburb', ''),
                postcode=item.get('postcode', ''),
                phone=item['phone'],
                email=item.get('email', ''),
                website=item.get('website', ''),
                latitude=item['coordinates']['lat'],
                longitude=item['coordinates']['lng'],
                specialties=item.get('specialties', []),
                services=item.get('services', []),
                # ... map all other fields
            )
        
        self.stdout.write(self.style.SUCCESS(f'Imported {len(providers_data)} providers'))
```

**Run:**
```bash
python manage.py import_pinsv5_data
```

---

## 🎯 **Key Findings for Migration**

### **1. Single Production Database**
- ✅ No dev/staging separation
- ✅ Clean collection names (no prefixes)
- ⚠️ **Be careful:** Any tests write to production!

### **2. Authentication Methods**
- **Frontend:** Firebase Web SDK (public API key)
- **Backend Scripts:** Admin SDK (service account)
- **Cloud Run:** Admin SDK (service account)

### **3. Data Integrity**
- 555 companies with full details
- 1,265 practitioners with specialties
- Complete contact history
- Geographic coordinates (98%+ coverage)

### **4. Export Approach**
- **Recommended:** Admin SDK export (full control)
- **Alternative:** Firebase CLI export (official backup)
- **Testing:** Web SDK direct queries (quick tests)

### **5. Import Considerations**
- Firebase Timestamps → Django DateTimeField
- Nested JSON → Django JSONField
- Arrays → Django JSONField or PostgreSQL ArrayField
- GeoPoints → Decimal latitude/longitude

---

## 📋 **Next Steps for Migration**

1. ✅ **Get Firebase Service Account**
   - Download from Firebase Console
   - Save as `pinsv5-firebase-adminsdk.json`

2. ✅ **Create Export Script**
   - Export all 6 collections
   - Save to JSON files
   - Verify data integrity

3. ✅ **Create Django Models**
   - Use models from DATABASE_MIGRATION_STRATEGY.md
   - Run migrations

4. ✅ **Create Import Script**
   - Map Firebase → Django fields
   - Handle data transformations
   - Import in order (providers → contacts → callbacks)

5. ✅ **Verify Data**
   - Count records
   - Check relationships
   - Test queries

---

## 🔗 **Related Documentation**

- **Database Schema:** `docs/features/DATABASE_MIGRATION_STRATEGY.md`
- **Credentials:** `docs/features/CREDENTIALS_REQUIREMENTS.md`
- **File Migration:** `docs/features/FILE_MIGRATION_CHECKLIST.md`
- **Complete Analysis:** `docs/features/COMPLETE_PINSV5_FEATURE_ANALYSIS.md`

---

**Firebase Project: `referrer-map`**  
**Total Data: 555 companies, 1,265 practitioners**  
**Export Method: Firebase Admin SDK (Recommended)**  
**Ready for migration!** 🚀

