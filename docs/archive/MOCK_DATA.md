# 📦 Mock Data Management

**Purpose:** Generate and manage mock/test data for development and testing

---

## 🎯 Overview

We use Django management commands to create mock patient data, allowing us to:
- Develop frontend without real production data
- Test various scenarios (empty states, large datasets, edge cases)
- Demo the application
- Test filtering, searching, and pagination

---

## 🚀 Usage

### **Create Mock Patients**

```bash
cd backend
source venv/bin/activate
python manage.py create_mock_patients --count 50
```

**Options:**
- `--count N` - Number of patients to create (default: 50)
- `--clear` - Clear all existing patients before creating new ones

**Examples:**
```bash
# Create 50 mock patients
python manage.py create_mock_patients

# Create 100 mock patients
python manage.py create_mock_patients --count 100

# Clear existing and create 25 new patients
python manage.py create_mock_patients --count 25 --clear
```

---

## 📊 Generated Data

### **Patient Data Includes:**
- **Names:** Random first, middle, last names from pools
- **Demographics:** Random DOB (ages 18-85), sex, title
- **Identifiers:** Optional MRN, optional health number
- **Clinic:** Randomly assigned from existing clinics (if any)
- **Funding:** Randomly assigned from active funding sources (if any)
- **Contact:** Phone, email, address (Australian addresses)
- **Coordinator:** 33% of patients have coordinator info
- **Plan Dates:** 50% of patients have NDIS plan dates
- **Notes:** Some patients have random notes

### **Data Distribution:**
- **33% have coordinators** - Tests coordinator display
- **50% have plan dates** - Tests plan date display
- **75% have titles** - Tests title field
- **Random clinic/funding** - Tests filtering

---

## 🔧 Requirements

### **Before Creating Mock Patients:**
1. **Clinics must exist** - Run Clinics Settings UI to create clinics
2. **Funding Sources must exist** - Run Funding Sources Settings UI to create funding sources

If clinics/funding sources don't exist, mock patients will still be created but without those assignments.

### **Quick Setup:**
```bash
# 1. Create some clinics via Settings UI or Django admin
# 2. Create some funding sources via Settings UI or Django admin
# 3. Create mock patients
python manage.py create_mock_patients --count 50
```

---

## 📝 Future Enhancements

### **Possible Additional Commands:**
- `create_mock_clinics` - Generate clinic data
- `create_mock_funding_sources` - Generate funding sources
- `create_mock_appointments` - Generate appointment data linked to patients
- `create_mock_encounters` - Generate encounter data
- `create_full_dataset` - Create complete mock dataset (patients + appointments + encounters)

### **Data Variety:**
- More varied names (international names)
- More realistic Australian addresses
- More varied coordinator names and organizations
- Edge cases (very old patients, patients with no contact info, etc.)

---

## 🧪 Testing Scenarios

### **Empty States:**
```bash
# Clear all patients
python manage.py create_mock_patients --count 0 --clear
```

### **Large Dataset:**
```bash
# Create 1000 patients for performance testing
python manage.py create_mock_patients --count 1000
```

### **Small Dataset:**
```bash
# Create 10 patients for quick testing
python manage.py create_mock_patients --count 10 --clear
```

---

## 🔗 Related Commands

### **Django Shell Alternative:**
```python
python manage.py shell

from patients.models import Patient
from clinicians.models import Clinic
from settings.models import FundingSource

# Create a single test patient manually
clinic = Clinic.objects.first()
funding = FundingSource.objects.first()

Patient.objects.create(
    first_name='Test',
    last_name='Patient',
    clinic=clinic,
    funding_type=funding,
    # ... other fields
)
```

---

## 📚 Files

- **Command:** `backend/patients/management/commands/create_mock_patients.py`
- **Usage:** `python manage.py create_mock_patients --count N`

---

**Last Updated:** November 4, 2025

