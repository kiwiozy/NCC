# Development to Production Deployment Guide

**Date:** November 9, 2025  
**Architecture:** Hybrid AWS S3 + Google Cloud Run  
**Branch Strategy:** Feature branches → Main → Production

---

## 📋 Table of Contents

1. [Development Workflow](#development-workflow)
2. [Git Branch Strategy](#git-branch-strategy)
3. [Local Development](#local-development)
4. [Testing Before Deploy](#testing-before-deploy)
5. [Deploying to Production](#deploying-to-production)
6. [Rollback Strategy](#rollback-strategy)
7. [Continuous Integration/Deployment (CI/CD)](#cicd-future)

---

## 🔄 Development Workflow Overview

```
Local Development → Git Commit → Push to GitHub → Deploy to Production
     ↓                  ↓              ↓                ↓
   Test Locally    Create PR     Review & Merge    Cloud Run Deploy
```

---

## 🌿 Git Branch Strategy

### **Branch Structure:**

```
main (production)
  └── filemaker-import-docs (current work)
       └── feature/new-feature (your work)
```

### **Branch Rules:**

1. **`main`** - Production-ready code only
   - Always stable
   - Deploys automatically to production (after CI/CD setup)
   - Never commit directly to main

2. **Feature Branches** - Your development work
   - Named: `feature/description` or `fix/description`
   - Created from: `main`
   - Merged to: `main` (via pull request)

3. **Current Branch** - `filemaker-import-docs`
   - Temporary branch for FileMaker work
   - Will be merged to main when complete

---

## 💻 Local Development

### **Step 1: Start Development Environment**

```bash
# Start all services (Django + Next.js + ngrok)
cd /Users/craig/Documents/nexus-core-clinic
./start-dev.sh

# Or use quick start (background)
./quick-start.sh

# Check status
./status-dev.sh
```

**Access:**
- Frontend: https://localhost:3000
- Backend: https://localhost:8000
- Admin: https://localhost:8000/admin

---

### **Step 2: Make Changes**

**Backend (Django):**
```bash
cd backend

# Make changes to Python files
# Example: backend/patients/models.py

# Create/run migrations if models changed
python manage.py makemigrations
python manage.py migrate

# Test changes
python manage.py test
```

**Frontend (Next.js):**
```bash
cd frontend

# Make changes to TypeScript/React files
# Example: frontend/app/patients/page.tsx

# Check for errors
npm run lint

# Build to test production build
npm run build
```

---

### **Step 3: Test Locally**

**Run Django Tests:**
```bash
cd backend
source venv/bin/activate
python manage.py test

# Specific app
python manage.py test patients

# With coverage
coverage run --source='.' manage.py test
coverage report
```

**Run Frontend Tests:**
```bash
cd frontend
npm run test  # If tests configured
npm run build  # Ensure build works
```

**Manual Testing:**
1. Test in browser: https://localhost:3000
2. Test API endpoints: https://localhost:8000/api/
3. Test admin: https://localhost:8000/admin
4. Test all integrations (Gmail, Xero, SMS, etc.)

---

## 📝 Committing Changes

### **Step 1: Check What Changed**

```bash
cd /Users/craig/Documents/nexus-core-clinic
git status
git diff
```

---

### **Step 2: Stage Changes**

```bash
# Stage specific files
git add backend/patients/models.py
git add frontend/app/patients/page.tsx

# Or stage all changes (be careful!)
git add .

# Check what's staged
git status
```

---

### **Step 3: Commit with Good Message**

**Commit Message Format:**
```
type(scope): short description

Longer description (optional)
- Change 1
- Change 2
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code change (no new feature or bug fix)
- `test:` - Adding tests
- `chore:` - Maintenance (dependencies, config)

**Examples:**
```bash
# New feature
git commit -m "feat(patients): add patient search functionality

- Add search bar component
- Implement search API endpoint
- Add tests for search"

# Bug fix
git commit -m "fix(appointments): correct date formatting in calendar

- Use Luxon dd/MM/yyyy format
- Fix hydration mismatch
- Update tests"

# Documentation
git commit -m "docs: update deployment guide with DNS setup"
```

---

### **Step 4: Push to GitHub**

```bash
# Push current branch
git push origin filemaker-import-docs

# Or if on a feature branch
git push origin feature/patient-search

# First time pushing a new branch
git push -u origin feature/patient-search
```

---

## 🔀 Merging to Main (Production Ready)

### **Option 1: Merge via GitHub Pull Request (RECOMMENDED)**

**On GitHub:**
1. Go to https://github.com/kiwiozy/NCC
2. Click "Pull Requests" → "New Pull Request"
3. Base: `main` ← Compare: `filemaker-import-docs`
4. Add description of changes
5. Click "Create Pull Request"
6. Review changes
7. Click "Merge Pull Request"
8. Delete branch (optional)

**Benefits:**
- ✅ Review changes before production
- ✅ Can add comments/discussion
- ✅ Keeps history clean
- ✅ Can request review from others

---

### **Option 2: Merge Locally (Quick)**

```bash
cd /Users/craig/Documents/nexus-core-clinic

# Make sure everything is committed
git status

# Switch to main
git checkout main

# Pull latest changes
git pull origin main

# Merge your branch
git merge filemaker-import-docs

# Push to GitHub
git push origin main
```

---

## 🚀 Deploying to Production

### **Phase 1: Pre-Deployment (Current - Before Infrastructure Setup)**

**What Happens:**
- Changes pushed to GitHub
- No automatic deployment yet
- Manual deployment later (Phase 2)

**Current Workflow:**
```bash
# 1. Commit changes
git add .
git commit -m "feat: add new feature"

# 2. Push to GitHub
git push origin filemaker-import-docs

# 3. Merge to main when ready
# (via GitHub PR or locally)

# 4. Wait for infrastructure setup
# (Week 2-3 of deployment plan)
```

---

### **Phase 2: Manual Deployment (Weeks 2-4)**

Once Google Cloud Run is set up:

**Backend (Django) Deployment:**

```bash
cd /Users/craig/Documents/nexus-core-clinic/backend

# 1. Build Docker image
docker build -t nexus-django:latest .

# 2. Tag for Google Container Registry
docker tag nexus-django:latest gcr.io/YOUR-PROJECT-ID/nexus-django:latest

# 3. Push to GCR
docker push gcr.io/YOUR-PROJECT-ID/nexus-django:latest

# 4. Deploy to Cloud Run
gcloud run deploy nexus-django \
  --image gcr.io/YOUR-PROJECT-ID/nexus-django:latest \
  --platform managed \
  --region australia-southeast1 \
  --allow-unauthenticated
```

**Frontend (Next.js) Deployment:**

```bash
cd /Users/craig/Documents/nexus-core-clinic/frontend

# 1. Build static site
npm run build

# 2. Upload to AWS S3
aws s3 sync out/ s3://nexus-frontend-bucket/ --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR-DISTRIBUTION-ID \
  --paths "/*"
```

---

### **Phase 3: Automated Deployment (Future - CI/CD)**

**GitHub Actions Workflow** (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      
      - name: Build and Deploy to Cloud Run
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/nexus-django
          gcloud run deploy nexus-django --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/nexus-django --region australia-southeast1

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          cd frontend
          npm ci
          npm run build
      
      - name: Deploy to S3
        run: |
          aws s3 sync frontend/out/ s3://nexus-frontend-bucket/ --delete
```

**When Enabled:**
1. Push to `main` branch
2. GitHub Actions automatically runs
3. Tests run
4. If tests pass, deploys to production
5. You get email notification

---

## 📋 Pre-Deployment Checklist

Before deploying to production, verify:

### **Code Quality:**
- [ ] All tests pass locally
- [ ] No linter errors (`npm run lint`, `flake8`)
- [ ] Code reviewed (by you or team)
- [ ] No commented-out code
- [ ] No console.log() statements in production code

### **Database:**
- [ ] Migrations created and tested
- [ ] Migrations run successfully locally
- [ ] No data loss (if modifying existing models)
- [ ] Backup created before running migrations in prod

### **Environment Variables:**
- [ ] All required env vars documented
- [ ] Production env vars set in GCP Secret Manager
- [ ] No secrets committed to git
- [ ] `.env` file in `.gitignore`

### **Integrations:**
- [ ] Google OAuth redirect URIs updated
- [ ] Gmail OAuth still working
- [ ] Xero OAuth still working
- [ ] SMS webhook URL correct
- [ ] S3 access working
- [ ] OpenAI API key valid

### **Frontend:**
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] Production API URLs correct
- [ ] All images/assets loading

### **Security:**
- [ ] Django `DEBUG = False` in production
- [ ] CORS settings correct for production domain
- [ ] SSL certificates valid
- [ ] Security headers enabled
- [ ] No exposed API keys

---

## 🔙 Rollback Strategy

### **If Deployment Breaks Production:**

**Quick Rollback (Cloud Run):**
```bash
# List recent revisions
gcloud run revisions list --service nexus-django

# Rollback to previous revision
gcloud run services update-traffic nexus-django \
  --to-revisions REVISION-NAME=100
```

**Or via Console:**
1. Go to Google Cloud Console
2. Navigate to Cloud Run → nexus-django
3. Click "Revisions" tab
4. Select previous working revision
5. Click "Manage Traffic"
6. Route 100% traffic to previous revision

---

**Git Rollback (If Needed):**
```bash
# See recent commits
git log --oneline

# Revert specific commit (creates new commit)
git revert COMMIT-HASH

# Or hard reset (dangerous!)
git reset --hard COMMIT-HASH
git push --force origin main  # Only if absolutely necessary!
```

---

## 🔍 Monitoring Deployment

### **Check Logs After Deployment:**

**Cloud Run Logs:**
```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Stream logs in real-time
gcloud logging tail "resource.type=cloud_run_revision"
```

**Or via Console:**
1. Go to Google Cloud Console
2. Navigate to Cloud Run → nexus-django
3. Click "Logs" tab
4. Check for errors

---

### **Health Check Endpoints:**

**After deployment, test:**
```bash
# Backend health check
curl https://nexus.walkeasy.com.au/api/health/

# Should return: {"status": "healthy"}

# Test main API endpoint
curl https://nexus.walkeasy.com.au/api/patients/

# Frontend (in browser)
https://nexus.walkeasy.com.au
```

---

## 📊 Deployment Timeline

### **Current State (Week 1):**
```
Local Dev → Git → GitHub
(Manual deployment not yet set up)
```

### **Week 2-3 (Infrastructure Setup):**
```
Local Dev → Git → GitHub → Manual Deploy to GCP
(Deploy manually via command line)
```

### **Week 4+ (After Go-Live):**
```
Local Dev → Git → GitHub → CI/CD → Auto Deploy
(Automated via GitHub Actions)
```

---

## 🛠️ Development Environment Setup (New Machine)

If setting up on a new machine:

### **1. Clone Repository:**
```bash
git clone https://github.com/kiwiozy/NCC.git
cd NCC
```

### **2. Setup Backend:**
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### **3. Setup Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your API URLs
```

### **4. Start Development:**
```bash
# From project root
./start-dev.sh
```

---

## 🔐 Environment Variables Management

### **Local Development (Current):**

**Backend:** `backend/.env`
```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nexus

# AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET_NAME=walkeasy-nexus-documents
AWS_REGION=ap-southeast-2

# Google OAuth
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret

# Other integrations
XERO_CLIENT_ID=your-xero-id
SMS_BROADCAST_USERNAME=your-username
OPENAI_API_KEY=your-openai-key
```

**Frontend:** `frontend/.env.local`
```bash
NEXT_PUBLIC_API_URL=https://localhost:8000
```

---

### **Production (Google Cloud Run):**

**Set via Secret Manager:**
```bash
# Create secrets
echo -n "your-secret-key" | gcloud secrets create django-secret-key --data-file=-

# Use in Cloud Run
gcloud run deploy nexus-django \
  --set-secrets="SECRET_KEY=django-secret-key:latest"
```

**Or via Console:**
1. Go to Secret Manager
2. Create secret
3. In Cloud Run → Edit & Deploy → Variables & Secrets
4. Add secret as environment variable

---

## 📚 Quick Reference Commands

### **Daily Development:**
```bash
# Start development
./start-dev.sh

# Check status
./status-dev.sh

# Restart services
./restart-dev.sh

# Stop all
./stop-dev.sh
```

### **Git Workflow:**
```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: description"

# Push
git push origin filemaker-import-docs

# Pull latest
git pull origin filemaker-import-docs
```

### **Django Commands:**
```bash
cd backend
source venv/bin/activate

# Migrations
python manage.py makemigrations
python manage.py migrate

# Tests
python manage.py test

# Shell
python manage.py shell

# Admin
python manage.py createsuperuser
```

### **Frontend Commands:**
```bash
cd frontend

# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run type-check
```

---

## 🎯 Typical Development Session

**Example: Adding a new feature**

```bash
# 1. Start fresh
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/patient-export

# 3. Start development environment
./start-dev.sh

# 4. Make changes
# Edit files in backend/patients/ and frontend/app/patients/

# 5. Test changes
cd backend
python manage.py test patients
cd ../frontend
npm run build

# 6. Commit changes
cd ..
git add backend/patients/ frontend/app/patients/
git commit -m "feat(patients): add patient export to CSV

- Add export button to patient list
- Create CSV generation endpoint
- Add tests for CSV export
- Update documentation"

# 7. Push to GitHub
git push origin feature/patient-export

# 8. Create Pull Request on GitHub
# (merge to main when ready)

# 9. Deploy to production
# (manual or automatic via CI/CD)
```

---

## ⚠️ Common Issues & Solutions

### **Issue: Migrations conflict**
```bash
# Solution: Reset migrations
python manage.py migrate --fake-initial
# Or: Delete conflicting migration files and recreate
```

### **Issue: Port already in use**
```bash
# Solution: Kill process on port
lsof -ti:8000 | xargs kill -9  # Django
lsof -ti:3000 | xargs kill -9  # Next.js
```

### **Issue: Docker build fails**
```bash
# Solution: Clear Docker cache
docker system prune -a
docker build --no-cache -t nexus-django:latest .
```

### **Issue: Environment variables not loading**
```bash
# Solution: Check .env file exists and is loaded
cat backend/.env
# Restart services
./restart-dev.sh
```

---

## 📖 Next Steps

### **Week 1 (Current):**
- [x] Document development workflow ✅
- [ ] Practice git workflow
- [ ] Review deployment plan

### **Week 2 (Infrastructure Setup):**
- [ ] Create Dockerfile for Django
- [ ] Set up Google Cloud Run
- [ ] Configure CI/CD pipeline
- [ ] Test manual deployment

### **Week 3 (Testing):**
- [ ] Deploy to staging environment
- [ ] Run full integration tests
- [ ] Train on deployment process

### **Week 4 (Go-Live):**
- [ ] Deploy to production
- [ ] Monitor logs and metrics
- [ ] Switch from manual to automated deployment

---

**Document Created:** November 9, 2025  
**Last Updated:** November 9, 2025  
**Status:** Ready for development workflow

