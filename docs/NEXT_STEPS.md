# 🎯 NEXT STEPS - Where to Go From Here

**Last Updated:** October 30, 2025  
**Current Status:** ✅ Xero Integration Complete, Ready for Feature Development

---

## 🚀 **Quick Decision Guide**

Choose your next goal based on priority:

### 🔥 **Option A: Build Xero Features** (Recommended - Complete the Integration)
- **Why:** Foundation is done, let's finish what we started
- **Time:** 2-4 hours per feature
- **Impact:** HIGH - Core business value
- **Go to:** [Section 1: Xero Features](#1-build-xero-features)

### 📱 **Option B: SMS Integration** (Communication Critical)
- **Why:** Patient communication is essential
- **Time:** 3-5 hours  
- **Impact:** HIGH - Patient engagement
- **Go to:** [Section 2: SMS Integration](#2-implement-sms-integration)

### ☁️ **Option C: Deploy to Cloud** (Make it Live)
- **Why:** Move from localhost to production
- **Time:** 4-6 hours
- **Impact:** MEDIUM - Makes it accessible
- **Go to:** [Section 3: Cloud Deployment](#3-deploy-to-cloud)

### 🎨 **Option D: Enhance Frontend** (Polish the UI)
- **Why:** Better user experience
- **Time:** 2-3 hours
- **Impact:** MEDIUM - UX improvements
- **Go to:** [Section 4: Frontend Enhancements](#4-enhance-frontend)

---

## 1. Build Xero Features

**Goal:** Implement the 4 core Xero integrations

### ✅ **Already Complete**
- OAuth2 connection
- Token management
- Database models
- API endpoints
- Frontend UI

### 🔵 **Feature 1: Sync Patient Contacts** (Priority: HIGHEST)

**What it does:** Push patient details to Xero as contacts

**Implementation Steps:**

1. **Backend: Implement Service Method**
   ```python
   # In backend/xero_integration/services.py
   
   def sync_contact(self, patient_id: uuid.UUID) -> dict:
       """
       Sync a patient to Xero as a contact
       Returns: {'contact_id': '...', 'status': 'created/updated'}
       """
       # 1. Get patient from database
       patient = Patient.objects.get(id=patient_id)
       
       # 2. Check if already synced
       link = XeroContactLink.objects.filter(patient=patient).first()
       
       # 3. Prepare Xero contact data
       contact_data = {
           'ContactID': link.xero_contact_id if link else None,
           'Name': patient.get_full_name(),
           'FirstName': patient.first_name,
           'LastName': patient.last_name,
           'EmailAddress': patient.get_email(),
           'Phones': [
               {'PhoneType': 'MOBILE', 'PhoneNumber': patient.get_mobile()}
           ],
           'Addresses': [patient.address_json] if patient.address_json else []
       }
       
       # 4. Call Xero API
       api_client = self.get_api_client()
       accounting_api = AccountingApi(api_client)
       
       if link:
           # Update existing
           response = accounting_api.update_contact(...)
       else:
           # Create new
           response = accounting_api.create_contacts(...)
       
       # 5. Save/update link
       XeroContactLink.objects.update_or_create(
           patient=patient,
           defaults={'xero_contact_id': response.contact_id}
       )
       
       return {'contact_id': response.contact_id, 'status': 'synced'}
   ```

2. **Backend: Add API Endpoint**
   ```python
   # In backend/xero_integration/views.py
   
   @api_view(['POST'])
   def sync_contact(request, patient_id):
       try:
           result = xero_service.sync_contact(patient_id)
           return JsonResponse(result)
       except Exception as e:
           return JsonResponse({'error': str(e)}, status=400)
   ```

3. **Frontend: Add Sync Button**
   ```typescript
   // In frontend - add to patient list/detail page
   
   const handleSyncToXero = async (patientId: string) => {
     const response = await fetch(
       `https://localhost:8000/xero/sync-contact/${patientId}/`,
       { method: 'POST' }
     );
     // Show success notification
   };
   ```

**Test:** Sync a patient, verify contact appears in Xero

---

### 🔵 **Feature 2: Create Invoices** (Priority: HIGH)

**What it does:** Generate Xero invoices from appointments

**Implementation Steps:**

1. **Backend: Implement Service Method**
   ```python
   def create_invoice(self, appointment_id: uuid.UUID) -> dict:
       # 1. Get appointment with patient, clinic
       appointment = Appointment.objects.select_related('patient', 'clinic').get(id=appointment_id)
       
       # 2. Ensure patient is synced to Xero
       contact_link = XeroContactLink.objects.get(patient=appointment.patient)
       
       # 3. Get account codes from XeroItemMapping
       mapping = XeroItemMapping.objects.get(appointment_type=appointment.type)
       
       # 4. Build invoice data
       invoice_data = {
           'Type': 'ACCREC',  # Accounts Receivable
           'Contact': {'ContactID': contact_link.xero_contact_id},
           'Date': appointment.start_time.date(),
           'DueDate': appointment.start_time.date() + timedelta(days=14),
           'LineItems': [
               {
                   'Description': f'{appointment.reason}',
                   'Quantity': 1,
                   'UnitAmount': mapping.unit_price,
                   'AccountCode': mapping.account_code,
                   'TaxType': 'OUTPUT',  # GST
               }
           ],
           'Status': 'DRAFT'  # Create as draft, not sent
       }
       
       # 5. Call Xero API
       response = accounting_api.create_invoices(...)
       
       # 6. Save link
       XeroInvoiceLink.objects.create(
           appointment=appointment,
           xero_invoice_id=response.invoice_id
       )
       
       return {'invoice_id': response.invoice_id, 'status': 'created'}
   ```

2. **Admin Action:** Add "Create Xero Invoice" button in Appointment admin

3. **Test:** Create invoice, verify it appears in Xero as draft

---

### 🔵 **Feature 3: Track Payments** (Priority: MEDIUM)

**What it does:** Poll Xero for invoice payment status

**Implementation Steps:**

1. **Backend: Implement Service Method**
   ```python
   def sync_payment_status(self, invoice_id: uuid.UUID) -> dict:
       # 1. Get invoice link
       link = XeroInvoiceLink.objects.get(id=invoice_id)
       
       # 2. Fetch invoice from Xero
       response = accounting_api.get_invoice(link.xero_invoice_id)
       
       # 3. Update local status
       link.status = response.status  # PAID, AUTHORISED, VOIDED
       link.amount_paid = response.amount_paid
       link.amount_due = response.amount_due
       link.last_synced_at = timezone.now()
       link.save()
       
       # 4. Update appointment if paid
       if link.status == 'PAID':
           link.appointment.is_paid = True
           link.appointment.save()
       
       return {'status': link.status, 'paid': link.amount_paid}
   ```

2. **Scheduled Job:** Run sync every hour for unpaid invoices

3. **UI:** Show payment status badge on appointments

---

### 🔵 **Feature 4: Multi-Clinic Tracking** (Priority: LOW)

**What it does:** Use Xero tracking categories to segment revenue by clinic

**Implementation Steps:**

1. **Fetch Tracking Categories from Xero**
2. **Map Clinics to Tracking Categories in Admin**
3. **Include TrackingCategory in Invoice LineItems**

**Test:** Create invoices, verify tracking in Xero reports

---

## 2. Implement SMS Integration

**Goal:** Send appointment reminders and confirmations via SMS

### 📱 **What You Need**

1. **SMS Broadcast Account**
   - Sign up at https://www.smsbroadcast.com.au/
   - Get username and password
   - Store in `.env`:
     ```
     SMSB_USERNAME=your_username
     SMSB_PASSWORD=your_password
     ```

2. **Install Python Package**
   ```bash
   pip install requests
   ```

### 📱 **Implementation Steps**

1. **Create Django App**
   ```bash
   cd backend
   python manage.py startapp sms_integration
   ```

2. **Create Models**
   ```python
   # backend/sms_integration/models.py
   
   class SMSMessage(models.Model):
       id = models.UUIDField(primary_key=True, default=uuid.uuid4)
       patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE)
       appointment = models.ForeignKey('appointments.Appointment', null=True)
       phone_number = models.CharField(max_length=20)
       message = models.TextField()
       status = models.CharField(max_length=20)  # pending, sent, delivered, failed
       sent_at = models.DateTimeField(null=True)
       delivered_at = models.DateTimeField(null=True)
       error_message = models.TextField(blank=True)
   ```

3. **Create Service**
   ```python
   # backend/sms_integration/services.py
   
   class SMSService:
       def send_sms(self, phone_number: str, message: str) -> dict:
           url = 'https://api.smsbroadcast.com.au/api-adv.php'
           params = {
               'username': os.getenv('SMSB_USERNAME'),
               'password': os.getenv('SMSB_PASSWORD'),
               'to': phone_number,
               'message': message,
               'from': 'Walk Easy'
           }
           response = requests.get(url, params=params)
           return {'status': 'sent', 'message_id': response.text}
   ```

4. **Add Frontend UI**
   - SMS tab already exists at `frontend/app/sms/page.tsx`
   - Add form to send SMS
   - Show sent messages list

5. **Schedule Reminders**
   - Create Django management command
   - Run daily at 9am to send reminders for next-day appointments

**Time:** 3-5 hours

---

## 3. Deploy to Cloud

**Goal:** Move from localhost to Google Cloud Run (production)

### ☁️ **Prerequisites**

- ✅ Google Cloud project exists (`nexus-core-clinic-dev`)
- ✅ Service accounts created
- ❌ Cloud SQL PostgreSQL (needs creation)
- ❌ Docker images (need building)
- ❌ Cloud Run services (need deploying)

### ☁️ **Implementation Steps**

1. **Create Cloud SQL Database**
   ```bash
   gcloud sql instances create ncc-postgres \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=australia-southeast1 \
     --root-password=YOUR_PASSWORD
   
   gcloud sql databases create ncc_db --instance=ncc-postgres
   ```

2. **Switch Django to PostgreSQL**
   ```python
   # backend/ncc_api/settings.py
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'HOST': '/cloudsql/nexus-core-clinic-dev:australia-southeast1:ncc-postgres',
           'NAME': 'ncc_db',
           'USER': 'postgres',
           'PASSWORD': os.getenv('DB_PASSWORD'),
       }
   }
   ```

3. **Dockerize Backend**
   ```dockerfile
   # backend/Dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD gunicorn ncc_api.wsgi:application --bind 0.0.0.0:8000
   ```

4. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy ncc-api \
     --source . \
     --region=australia-southeast1 \
     --allow-unauthenticated \
     --set-env-vars="DATABASE_URL=..." \
     --add-cloudsql-instances=ncc-postgres
   ```

5. **Dockerize & Deploy Frontend**
   ```bash
   gcloud run deploy ncc-web \
     --source . \
     --region=australia-southeast1 \
     --allow-unauthenticated \
     --set-env-vars="NEXT_PUBLIC_API_URL=https://ncc-api-xxx.run.app"
   ```

**Time:** 4-6 hours

---

## 4. Enhance Frontend

**Goal:** Improve user experience and add features

### 🎨 **Ideas**

1. **Patient Management Page**
   - List all patients
   - Search and filter
   - Add/edit patients
   - View patient history
   - Sync to Xero button

2. **Appointment Booking Interface**
   - Calendar click to create appointment
   - Patient search/select
   - Clinician assignment
   - Email confirmation

3. **Dashboard**
   - Today's appointments
   - Revenue summary
   - Recent activity
   - Quick actions

4. **Reports**
   - Appointments by clinic
   - Revenue by clinic
   - Patient demographics
   - Export to CSV

5. **User Authentication**
   - Login/logout
   - User roles (admin, clinician, receptionist)
   - Permissions

**Time:** 2-3 hours per feature

---

## 🎯 **My Recommendation**

### **Phase 1: Complete Xero (This Week)**
1. ✅ Implement Contact Sync (2 hours)
2. ✅ Implement Invoice Creation (3 hours)
3. ✅ Test end-to-end with real data (1 hour)

### **Phase 2: Add SMS (Next Week)**
4. ✅ Set up SMS Broadcast account
5. ✅ Implement SMS sending
6. ✅ Add reminder scheduling

### **Phase 3: Deploy (Week After)**
7. ✅ Create Cloud SQL database
8. ✅ Deploy backend to Cloud Run
9. ✅ Deploy frontend to Cloud Run
10. ✅ Configure custom domain

### **Phase 4: Polish (Ongoing)**
11. ✅ Add patient management
12. ✅ Build dashboard
13. ✅ Add reports
14. ✅ User authentication

---

## 📊 **Estimated Timeline**

| Feature | Time | Priority |
|---------|------|----------|
| Xero Contact Sync | 2 hours | 🔥 HIGHEST |
| Xero Invoice Creation | 3 hours | 🔥 HIGH |
| Xero Payment Tracking | 2 hours | MEDIUM |
| SMS Integration | 5 hours | HIGH |
| Cloud Deployment | 6 hours | MEDIUM |
| Patient Management UI | 3 hours | MEDIUM |
| Dashboard | 3 hours | LOW |
| Reports | 4 hours | LOW |

**Total:** ~28 hours of development

---

## ✅ **Quick Wins (Can Do Right Now)**

1. **Add "Sync to Xero" button** in Patient admin (30 min)
2. **Display Xero contact link** in Patient list (15 min)
3. **Show invoice status badges** in Appointment list (20 min)
4. **Add "Create Invoice" button** in Appointment admin (30 min)
5. **Improve error messages** in Xero UI (20 min)

---

## 🎊 **Summary**

You have a **solid foundation** and multiple paths forward:

- **Business Value:** Xero Contact Sync → Invoice Creation
- **Patient Engagement:** SMS Integration
- **Go Live:** Cloud Deployment
- **User Experience:** Frontend Enhancements

**My advice:** Complete the Xero features first, then SMS, then deploy.

**You're 85% done with the foundation!** 🚀

---

**Questions to Consider:**

1. Which feature delivers the most immediate value?
2. Do you need to demo this soon? (If yes → Polish UI)
3. Do you have patient data to migrate? (If yes → Build import tools)
4. Do you need multi-user access? (If yes → Add authentication)

**Let me know which direction you want to go!** 🎯

