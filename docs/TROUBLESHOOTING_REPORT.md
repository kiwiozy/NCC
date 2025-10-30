# FileMaker Data API Troubleshooting Report

## Test Results - October 29, 2025

### Configuration Tested
- **Server**: walkeasy.fmcloud.fm
- **Database**: WEP-DatabaseV2  
- **User**: Craig
- **Status**: ❌ FAILED - 502 Bad Gateway

### What We Tested
1. ✅ Server accessibility - OK
2. ❌ Data API authentication - 502 Bad Gateway
3. ❌ Data API v1 endpoint - 502 Bad Gateway
4. ❌ Database listing - 502 Bad Gateway
5. ⚠️  Admin API - Responding but resource not found

### Root Cause
The FileMaker Data API service is not responding. Nginx can't connect to the backend FileMaker Data API service.

### Required Actions

#### 1. Check FileMaker Server Admin Console
Log into the FileMaker Server Admin Console (port 16000) and verify:

- [ ] FileMaker Server is running
- [ ] Web Publishing Engine (WPE) is started
- [ ] Data API is enabled in: **Configuration > Data API Settings**
- [ ] The database "WEP-DatabaseV2" is hosted and open

#### 2. Verify Database Settings
In FileMaker Pro:

- [ ] Open WEP-DatabaseV2.fmp12
- [ ] Go to **File > Manage > Security**
- [ ] Find the "Craig" account's privilege set
- [ ] Ensure it has **"fmrest"** extended privilege enabled
- [ ] Save and close the database

#### 3. Check FileMaker Cloud Status
Since this is on fmcloud.fm (FileMaker Cloud):

- [ ] Check FileMaker Cloud console at https://manage.filemaker.com
- [ ] Verify the instance is running
- [ ] Check if Data API is enabled for your subscription
- [ ] Review any service alerts or maintenance notices

#### 4. Restart FileMaker Server
If all settings look correct:

- [ ] Restart the Web Publishing Engine service
- [ ] Or restart the entire FileMaker Server

#### 5. Test Alternative Connection Methods
Try connecting via:

- [ ] FileMaker Pro (direct connection to verify server is up)
- [ ] FileMaker WebDirect (if enabled) at https://walkeasy.fmcloud.fm/fmi/webd

### Common Causes of 502 Errors

1. **Data API Not Enabled**: Most common - feature needs to be turned on
2. **WPE Not Running**: Web Publishing Engine must be started
3. **Database Not Open**: File must be hosted and open
4. **fmrest Privilege Missing**: Account needs fmrest extended privilege
5. **Server Restart Needed**: After config changes, restart required

### How to Enable Data API

In FileMaker Server Admin Console:
1. Go to **Configuration > Data API Settings**
2. Check **"Enable Data API"**
3. Click **Save**
4. Restart Web Publishing Engine

### Testing After Fix

Once the Data API is enabled, run:
```bash
cd /Users/craig/Documents/1.Filemaker_Test
python3 test_fm_api.py
```

Or test with cURL:
```bash
curl -X POST "https://walkeasy.fmcloud.fm/fmi/data/vLatest/databases/WEP-DatabaseV2/sessions" \
  -H "Content-Type: application/json" \
  -u "Craig:Marknet//2"
```

Expected successful response:
```json
{
  "response": {
    "token": "abc123..."
  },
  "messages": [
    {
      "code": "0",
      "message": "OK"
    }
  ]
}
```

### Support Resources

- FileMaker Data API Guide: https://help.claris.com/en/data-api-guide/
- FileMaker Cloud Admin: https://manage.filemaker.com
- FileMaker Community: https://community.claris.com

---

**Generated**: October 29, 2025  
**Test Script**: test_fm_api.py  
**Status**: Awaiting server configuration fix

