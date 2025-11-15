# 📋 File Migration Checklist - PinsV5 to Nexus

**Date:** November 15, 2025  
**Status:** Ready for migration  
**Source:** `/Users/craig/Documents/1.PinsV5`  
**Target:** `/Users/craig/Documents/nexus-core-clinic`

---

## 🎯 **Quick Summary**

Migrating **61 files** (~13,700 lines of code) from PinsV5 to Nexus Marketing module.

| Feature | Files | Priority |
|---------|-------|----------|
| Email Builder | 45 | 🔥 Critical |
| Email Framework | 9 | 🔥 High |
| Asset Management | 4 | 🔥 High |
| Company Profile | 3 | 🟡 Medium |

---

## 📂 **1. Email Builder Components (45 files)**

### **Main Builder Files** ✅ Copy these first

```bash
# Source: /Users/craig/Documents/1.PinsV5/web/src/components/email-builder/
# Target: frontend/app/components/marketing/email-builder/

□ EmailBuilderV2Modular.tsx
□ VisualFrameworkBuilderV2.tsx
□ VisualFrameworkBuilder.tsx
□ CompanyProfileEmailBuilder.tsx
□ CanvasArea.tsx
□ ComponentPalette.tsx
□ PropertyPanel.tsx
□ ComponentCard.tsx
□ EmailComponent.tsx
□ EmailFrameworkConfig.tsx
□ AssetLibrary.tsx
□ AssetLibraryDialog.tsx
□ AssetLibraryButton.tsx
□ AssetPicker.tsx
□ AssetSelector.tsx
□ SmartUploadDialog.tsx
□ IconSelector.tsx
□ BulletPointSelector.tsx
□ BulletproofSelect.tsx
```

### **Email Components** (components/ subfolder)

```bash
# Target: frontend/app/components/marketing/email-builder/components/

□ AssetPickerModal.tsx
□ Button.tsx
□ ButtonComponent.tsx
□ Contact.tsx
□ ContactComponent.tsx
□ DividerComponent.tsx
□ Footer.tsx
□ FooterComponent.tsx
□ Header.tsx
□ HeaderComponent.tsx
□ iconData.ts
□ IconSelector.tsx
□ iconUtils.ts
□ ImageComponent.tsx
□ ImageCropModal.tsx
□ index.ts
□ MapsComponent.tsx
□ RemoveButton.tsx
□ Social.tsx
□ SocialLinksComponent.tsx
□ SpacerComponent.tsx
□ Text.tsx
□ TextComponent.tsx
```

### **Supporting Files**

```bash
# Configuration & Types
□ constants.ts
□ types.ts
□ mjml-generators.ts
□ index.ts

# Hooks (hooks/ subfolder)
□ hooks/useDragAndDrop.ts
□ hooks/useEmailBuilder.ts

# Utilities (utils/ subfolder)
□ utils/emailTracking.ts
□ utils/responsiveFonts.ts

# Styles (if present)
□ styles/* (copy entire folder if exists)
```

---

## 📬 **2. Email Framework Services (9 files)**

```bash
# Source: /Users/craig/Documents/1.PinsV5/web/src/services/
# Target: frontend/app/services/email/

□ emailService.ts
□ emailFrameworkTemplates.ts
□ emailHtmlGenerator.ts
□ componentGeneration.ts
□ companyEmailTemplateService.ts
□ contactCardDefaultsService.ts
□ emailAssetManager.ts
□ sesService.ts                      # ⚠️ Adapt to Gmail API

# Type definitions
# Source: /Users/craig/Documents/1.PinsV5/web/src/types/
# Target: frontend/app/types/
□ types/emailTypes.ts
```

---

## 🖼️ **3. Asset Management (4 files)**

```bash
# Source: /Users/craig/Documents/1.PinsV5/web/src/services/
# Target: frontend/app/services/assets/

□ assetService.ts
□ assetCacheService.ts
□ firebaseAssetService.ts            # ⚠️ Adapt to S3
□ imageOptimizationService.ts
```

---

## 🏢 **4. Company Profile (3 files)**

```bash
# Component
# Source: /Users/craig/Documents/1.PinsV5/web/src/components/content/
# Target: frontend/app/components/marketing/company-profile/
□ CompanyProfile.tsx

# Service
# Source: /Users/craig/Documents/1.PinsV5/web/src/services/
# Target: frontend/app/services/marketing/
□ companyProfile.ts

# Types
# Source: /Users/craig/Documents/1.PinsV5/web/src/types/
# Target: frontend/app/types/
□ company.ts
```

---

## 🛠️ **Migration Steps**

### **Step 1: Create Directory Structure**

```bash
cd /Users/craig/Documents/nexus-core-clinic/frontend/app

# Create component directories
mkdir -p components/marketing/email-builder/components
mkdir -p components/marketing/email-builder/hooks
mkdir -p components/marketing/email-builder/utils
mkdir -p components/marketing/email-builder/styles
mkdir -p components/marketing/company-profile

# Create service directories
mkdir -p services/email
mkdir -p services/assets
mkdir -p services/marketing

# Create types directory if needed
mkdir -p types
```

### **Step 2: Copy Email Builder (Priority 1)**

```bash
# Copy main email builder files
cp -r /Users/craig/Documents/1.PinsV5/web/src/components/email-builder/* \
      /Users/craig/Documents/nexus-core-clinic/frontend/app/components/marketing/email-builder/
```

### **Step 3: Copy Email Framework (Priority 1)**

```bash
# Copy email services
cp /Users/craig/Documents/1.PinsV5/web/src/services/email*.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/email/

cp /Users/craig/Documents/1.PinsV5/web/src/services/component*.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/email/

cp /Users/craig/Documents/1.PinsV5/web/src/services/company*.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/email/

cp /Users/craig/Documents/1.PinsV5/web/src/services/contact*.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/email/

cp /Users/craig/Documents/1.PinsV5/web/src/services/sesService.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/email/

# Copy email types
cp /Users/craig/Documents/1.PinsV5/web/src/types/emailTypes.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/types/
```

### **Step 4: Copy Asset Management (Priority 1)**

```bash
# Copy asset services
cp /Users/craig/Documents/1.PinsV5/web/src/services/asset*.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/assets/

cp /Users/craig/Documents/1.PinsV5/web/src/services/firebaseAssetService.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/assets/

cp /Users/craig/Documents/1.PinsV5/web/src/services/imageOptimizationService.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/assets/
```

### **Step 5: Copy Company Profile (Priority 2)**

```bash
# Copy company profile component
cp /Users/craig/Documents/1.PinsV5/web/src/components/content/CompanyProfile.tsx \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/components/marketing/company-profile/

# Copy company profile service
cp /Users/craig/Documents/1.PinsV5/web/src/services/companyProfile.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/services/marketing/

# Copy company types
cp /Users/craig/Documents/1.PinsV5/web/src/types/company.ts \
   /Users/craig/Documents/nexus-core-clinic/frontend/app/types/
```

---

## ⚠️ **Required Adaptations**

After copying files, these adaptations are **REQUIRED**:

### **1. Firebase → S3 (firebaseAssetService.ts)**

Replace Firebase Storage calls with S3:

```typescript
// OLD (Firebase)
import { getStorage, ref, uploadBytes } from 'firebase/storage';

// NEW (S3)
import { S3Service } from '@/services/s3Service';
```

### **2. AWS SES → Gmail API (sesService.ts)**

Replace SES calls with Gmail API:

```typescript
// OLD (SES)
import AWS from 'aws-sdk';
const ses = new AWS.SES();

// NEW (Gmail API)
import { GmailService } from '@/services/gmailService';
```

### **3. Firestore → Django API (all services)**

Replace Firestore calls with Django REST API:

```typescript
// OLD (Firestore)
import { collection, getDocs } from 'firebase/firestore';

// NEW (Django API)
const response = await fetch('/api/marketing/templates/');
```

### **4. Firebase Auth → Django Allauth**

Replace auth calls:

```typescript
// OLD (Firebase)
import { getAuth } from 'firebase/auth';

// NEW (Django)
const response = await fetch('/api/auth/user/');
```

### **5. Import Path Updates**

Update all import paths from PinsV5 structure to Nexus:

```typescript
// OLD
import { EmailComponent } from '@/components/email-builder/types';

// NEW
import { EmailComponent } from '@/app/components/marketing/email-builder/types';
```

---

## ✅ **Verification Checklist**

After migration, verify:

- [ ] All 61 files copied successfully
- [ ] No TypeScript errors (run `npm run type-check`)
- [ ] All imports resolve correctly
- [ ] Firebase references removed
- [ ] S3 integration working
- [ ] Gmail API integration working
- [ ] Django API calls working
- [ ] Email builder loads without errors
- [ ] Can create new email template
- [ ] Can edit email components
- [ ] Can save template to database
- [ ] Asset upload working
- [ ] Image optimization working
- [ ] Company profile loads
- [ ] No console errors

---

## 📚 **Related Documentation**

- **Main Migration Plan:** [NEXUS_MARKETING_MIGRATION_PLAN.md](./NEXUS_MARKETING_MIGRATION_PLAN.md)
- **Name Change Doc:** [NEXUS_MARKETING_NAME_CHANGE.md](./NEXUS_MARKETING_NAME_CHANGE.md)
- **UI Summary:** [MARKETING_SECTION_UI_SUMMARY.md](./MARKETING_SECTION_UI_SUMMARY.md)

---

## 🆘 **Troubleshooting**

### **Import errors:**
- Update paths to match Nexus structure
- Check `tsconfig.json` for path aliases

### **Firebase errors:**
- Search for `firebase` imports and replace with Nexus equivalents
- Use S3 for storage, Django API for database

### **Component not rendering:**
- Check Mantine v7 compatibility
- Verify all dependencies installed
- Check browser console for errors

---

**Ready to migrate! Follow steps 1-5 above.** 🚀

