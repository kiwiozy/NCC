# 📊 FileMaker Integration Documentation

Documentation for FileMaker Server Data API connectivity and data migration.

---

## 📚 Documentation Files

### 1. **[PRODUCTION_IMPORT_SUCCESS.md](./PRODUCTION_IMPORT_SUCCESS.md)** 🎉 **IMPORT COMPLETE** ⭐⭐⭐
   - **ALL 2,845 patients successfully imported!**
   - Production import completed November 9, 2025
   - OData API breakthrough and results
   - Final metrics and validation

### 2. **[IMPORT_IMPROVEMENTS_TODO.md](./IMPORT_IMPROVEMENTS_TODO.md)** 📋 **TODO LIST** ⭐
   - **Checklist of import script improvements**
   - Completed improvements (date parsing, phone cleaning)
   - Pending improvements (contact details, validation)
   - Priority order and testing checklist
   - Current data quality metrics

### 3. **[IMPORT_COMPLETE_GUIDE.md](./IMPORT_COMPLETE_GUIDE.md)** 🎯 **COMPREHENSIVE GUIDE** ⭐
   - Complete guide for importing FileMaker data into Nexus
   - Field mappings, data transformations, scripts & commands
   - Updated with OData API information
   - Production-tested and verified

### 4. **[Test_FileMaker_Data_API.md](./Test_FileMaker_Data_API.md)** 🧪 **API TESTING GUIDE**
   - Complete FileMaker Data API testing guide
   - Authentication (get API token)
   - cURL examples for all operations
   - Postman collection setup
   - Python examples
   - Container field operations (file upload/download)
   - Troubleshooting common issues

### 3. **[FILEMAKER_IMPORT_PLAN.md](./FILEMAKER_IMPORT_PLAN.md)** 📋 **PLANNING DOC**
   - Original planning document for FileMaker import
   - 6-phase approach with detailed steps
   - Schema discovery and mapping templates
   - Field mapping reference

### 4. **[CONTACT_DETAILS_ANALYSIS.md](./CONTACT_DETAILS_ANALYSIS.md)** 📞 **CONTACT DATA STRUCTURE**
   - Details about FileMaker contact details structure
   - One-to-many relationship with patients
   - Multi-type records (phone, email, address)
   - Transformation logic to Nexus JSON fields

---

## 🎯 Quick Reference

### **FileMaker Server Details**

| Setting | Value |
|---------|-------|
| **Version** | FileMaker Server 20.3.2 |
| **Data API** | Available (requires fmrest privilege) |
| **Base URL** | `https://your-server.example.com` |
| **Port** | 443 (HTTPS) |
| **Authentication** | Basic Auth → API Token |

---

## 🔑 Authentication

### **1. Get API Token**

```bash
curl -X POST "https://your-server.example.com/fmi/data/v1/databases/YourDatabase/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)"
```

Response:
```json
{
  "response": {
    "token": "your-api-token-here"
  },
  "messages": [{"code": "0", "message": "OK"}]
}
```

### **2. Use Token for Requests**

```bash
curl "https://your-server.example.com/fmi/data/v1/databases/YourDatabase/layouts/LayoutName/records" \
  -H "Authorization: Bearer your-api-token-here"
```

---

## 📋 Common Operations

### **Get Records**
```bash
GET /fmi/data/v1/databases/{database}/layouts/{layout}/records
```

### **Create Record**
```bash
POST /fmi/data/v1/databases/{database}/layouts/{layout}/records
Body: {"fieldData": {"Field1": "value1", "Field2": "value2"}}
```

### **Update Record**
```bash
PATCH /fmi/data/v1/databases/{database}/layouts/{layout}/records/{recordId}
Body: {"fieldData": {"Field1": "new_value"}}
```

### **Delete Record**
```bash
DELETE /fmi/data/v1/databases/{database}/layouts/{layout}/records/{recordId}
```

### **Find Records**
```bash
POST /fmi/data/v1/databases/{database}/layouts/{layout}/_find
Body: {"query": [{"Field1": "search_value"}]}
```

---

## 📁 Container Field Operations

### **Upload File to Container**
```bash
curl -X POST \
  "https://your-server.example.com/fmi/data/v1/databases/YourDatabase/layouts/LayoutName/records/{recordId}/containers/ContainerFieldName" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: multipart/form-data" \
  -F "upload=@/path/to/file.pdf"
```

### **Download File from Container**
```bash
curl "https://your-server.example.com/Streaming_SSL/MainDB/{recordId}/ContainerFieldName/1/file.pdf?RCType=EmbeddedRCFileProcessor" \
  -H "Authorization: Bearer your-token" \
  --output downloaded_file.pdf
```

---

## 🗄️ Data Migration Strategy

### **Phase 1: Initial Data Export**
1. Use FileMaker Data API to export all records
2. Save to JSON format for backup
3. Validate data completeness

### **Phase 2: Transform & Load**
1. Map FileMaker fields to PostgreSQL schema
2. Transform data types and formats
3. Load into PostgreSQL staging tables

### **Phase 3: Validation**
1. Compare record counts
2. Verify data integrity
3. Test relationships and foreign keys

### **Phase 4: Cutover**
1. Final sync of incremental changes
2. Switch to PostgreSQL as primary database
3. Keep FileMaker as read-only backup

---

## 🔧 Prerequisites

### **FileMaker Server Requirements**
- ✅ FileMaker Server 16 or later (you have 20.3.2)
- ✅ Data API enabled
- ✅ User account with **fmrest** extended privilege
- ✅ SSL certificate configured
- ✅ Network access to server

### **Client Requirements**
- ✅ cURL or Postman for testing
- ✅ Python 3.x with `requests` library
- ✅ Valid credentials

---

## 🐛 Troubleshooting

### **Common Errors**

#### **Error 952: Invalid Credentials**
```json
{"messages": [{"code": "952", "message": "Invalid credentials"}]}
```
**Solution:** Check username/password and ensure user has `fmrest` privilege

#### **Error 105: Layout Missing**
```json
{"messages": [{"code": "105", "message": "Layout is missing"}]}
```
**Solution:** Verify layout name (case-sensitive)

#### **Error 401: Unauthorized**
**Solution:** Token expired - re-authenticate to get new token

#### **SSL Certificate Error**
```
SSL certificate problem: self signed certificate
```
**Solution:** Use `-k` flag in cURL or disable SSL verification (not recommended for production)

---

## 🔒 Security

### **Best Practices**
- ✅ **Use HTTPS only** - Never use HTTP for API calls
- ✅ **Rotate tokens** - Tokens expire, implement refresh logic
- ✅ **Least privilege** - Grant minimal permissions needed
- ✅ **Environment variables** - Store credentials securely
- ✅ **IP whitelist** - Restrict API access by IP
- ✅ **Audit logging** - Track all API access

---

## 📊 FileMaker → PostgreSQL Mapping

### **Example Field Mapping**

| FileMaker | PostgreSQL | Notes |
|-----------|-----------|-------|
| **Patients::PatientID** | `patients.id` | UUID → Integer |
| **Patients::FirstName** | `patients.first_name` | Text |
| **Patients::DOB** | `patients.date_of_birth` | Date format |
| **Patients::Phone** | `patients.phone` | Format: +61... |
| **Patients::Address** | `patients.address` | Text |

### **Data Type Mapping**

| FileMaker Type | PostgreSQL Type |
|----------------|-----------------|
| Text | VARCHAR/TEXT |
| Number | INTEGER/NUMERIC |
| Date | DATE |
| Time | TIME |
| Timestamp | TIMESTAMP |
| Container | BYTEA or S3 reference |

---

## 🧪 Testing Checklist

- [ ] Authenticate and get API token
- [ ] List all records from a layout
- [ ] Create a new record
- [ ] Update an existing record
- [ ] Delete a record
- [ ] Find/search records
- [ ] Upload file to container field
- [ ] Download file from container field
- [ ] Handle errors gracefully
- [ ] Test token expiration

---

## 🐍 Python Example

```python
import requests
import base64

# Configuration
FM_BASE_URL = "https://your-server.example.com"
FM_DATABASE = "YourDatabase"
FM_USERNAME = "username"
FM_PASSWORD = "password"

# Authenticate
auth_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/sessions"
auth = base64.b64encode(f"{FM_USERNAME}:{FM_PASSWORD}".encode()).decode()
headers = {"Authorization": f"Basic {auth}"}

response = requests.post(auth_url, headers=headers, verify=False)
token = response.json()["response"]["token"]

# Get records
records_url = f"{FM_BASE_URL}/fmi/data/v1/databases/{FM_DATABASE}/layouts/LayoutName/records"
headers = {"Authorization": f"Bearer {token}"}

response = requests.get(records_url, headers=headers, verify=False)
records = response.json()["response"]["data"]

print(f"Found {len(records)} records")
```

---

## 📚 Additional Resources

### **Official Documentation**
- [FileMaker Data API Guide](https://help.claris.com/en/data-api-guide/)
- [FileMaker 20 Platform Documentation](https://help.claris.com/en/pro-help/)

### **Tools**
- **Postman** - API testing and development
- **Python requests** - Scripting and automation
- **cURL** - Command-line testing

---

## 📞 Support

For FileMaker integration issues:
1. Check `Test_FileMaker_Data_API.md` for complete testing guide
2. Verify FileMaker Server version and Data API enabled
3. Confirm user has `fmrest` extended privilege
4. Test authentication with cURL first
5. Check server logs for errors

---

## 🚀 Next Steps

### **Data Migration Pipeline** (TODO)
1. ✅ Test FileMaker Data API connectivity
2. ⏳ Export all FileMaker data to JSON
3. ⏳ Create ETL scripts for transformation
4. ⏳ Load data into PostgreSQL
5. ⏳ Validate data migration
6. ⏳ Implement incremental sync

---

**Last Updated:** October 30, 2025  
**Version:** 1.0  
**Status:** 🧪 Testing Phase - Data API connectivity verified

