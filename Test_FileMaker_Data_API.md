# 🧪 FileMaker Data API — Full Connectivity Test Guide

This document walks you through **all steps** required to test connectivity to your FileMaker Server’s **Data API**, including cURL, Postman, and Python examples.

---

## ⚙️ 1. Prerequisites

Before starting, make sure you have:

| Requirement | Description |
|-------------|-------------|
| **FileMaker Server 16+** | You’re on 20.3.2 ✅ |
| **fmrest privilege** | The FileMaker account you use must have the **fmrest** extended privilege |
| **Base URL** | Example: `https://your-server.example.com` or your IP |
| **Database Name** | The hosted `.fmp12` file name without the extension |
| **Username / Password** | FileMaker account credentials |
| **Layout Name** | Any layout with visible fields (try one that includes a container field) |

---

## 🔑 2. Authenticate (Get API Token)

Run the following (Linux/macOS terminal, or PowerShell with `$env:` prefix):

```bash
export FM_BASE="https://your-server.example.com"
export FM_DB="YourDatabaseName"
export FM_USER="username"
export FM_PASS="password"

curl -s -X POST "$FM_BASE/fmi/data/vLatest/databases/$FM_DB/sessions"   -H "Content-Type: application/json"   -u "$FM_USER:$FM_PASS"
```

**Expected response:** JSON with `"response":{"token":"..."}`  
Save that token; you’ll use it in later steps.

✅ **Success tip:** If you see a 401 or 403 error, check that the account’s privilege set includes `fmrest`.

---

## 📋 3. List Available Layouts

Once authenticated, list all layouts your account can see:

```bash
export FM_TOKEN="PASTE_THE_TOKEN"

curl -s "$FM_BASE/fmi/data/vLatest/databases/$FM_DB/layouts"   -H "Authorization: Bearer $FM_TOKEN" | jq .
```

Expected output: a JSON array of layout names.  
Choose one (for example, `Contacts` or `Appointments`).

---

## 📄 4. Fetch Sample Records

```bash
export LAYOUT="Contacts"  # use a valid layout name

curl -s "$FM_BASE/fmi/data/vLatest/databases/$FM_DB/layouts/$LAYOUT/records?limit=5"   -H "Authorization: Bearer $FM_TOKEN" | jq .
```

Expected: `response.data` array with `fieldData` objects.  
If you see empty data, confirm your account has access to that layout’s fields.

---

## 📎 5. Download a Container Field (Image / Document)

1. Find the field name in your `fieldData` that looks like a URL, e.g.:
   ```json
   "Photo": "https://your-server/fmi/stream/123456"
   ```

2. Download it with the same bearer token:

```bash
export CONTAINER_URL="PASTE_URL_FROM_FIELD_DATA"

curl -L -s "$CONTAINER_URL"   -H "Authorization: Bearer $FM_TOKEN"   --output sample_file.bin
```

You should now have the binary file (`sample_file.bin`) on disk.

---

## 🧰 6. Run the Python Test Script (Optional)

If you prefer Python, you can automate the same steps.

### a) Save these files
- [`test_fm_api.py`](sandbox:/mnt/data/fm-dataapi-test/test_fm_api.py)
- [`.env.example`](sandbox:/mnt/data/fm-dataapi-test/.env.example)

### b) Install dependencies
```bash
pip install requests python-dotenv
```

### c) Create a `.env` file
```
FM_BASE=https://your-server.example.com
FM_DB=YourDatabaseName
FM_USER=username
FM_PASS=password
FM_LAYOUT=Contacts
```

### d) Run
```bash
python3 test_fm_api.py
```

Expected output:
- Token printed (first 8 chars)
- List of available layouts
- Sample records from your layout
- If any record includes a container URL → file downloaded to `downloads/`

---

## 🚪 7. Logout (End Session)

Cleanly close your session (optional but recommended):

```bash
curl -s -X DELETE "$FM_BASE/fmi/data/vLatest/databases/$FM_DB/sessions/$FM_TOKEN"   -H "Authorization: Bearer $FM_TOKEN"
```

Tokens expire automatically, but explicit logout is good practice.

---

## 🧠 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|----------|---------------|-----|
| `401 Unauthorized` | Wrong user/pass | Verify credentials |
| `403 Forbidden` | Privilege set missing `fmrest` | Enable the privilege |
| `404 Not Found` | Wrong DB or layout | Use `/layouts` to confirm |
| `500 Server Error` | Layout has restricted fields | Use a simpler layout |
| SSL/TLS error | Cert mismatch | Use correct hostname / reissue certificate |

---

✅ **You’re connected if:**
- You can list layouts.  
- You can retrieve JSON records.  
- You can download a container field successfully.

---

**Next Step:** Once this works, you can script bulk exports or incremental syncs via Python (using `requests`) or your preferred ETL tool (e.g., Airbyte, dbt, or custom Cloud Run jobs).

