# Question for ChatGPT: SMS Broadcast MMS API Parameters

## Context

We're integrating MMS (sending images via SMS) with **SMS Broadcast Australia** (https://www.smsbroadcast.com.au/). We're using their **Advanced API** endpoint:

```
POST https://api.smsbroadcast.com.au/api-adv.php
```

## Current Implementation

We're currently sending MMS with these parameters:

```python
params = {
    'username': 'our_username',
    'password': 'our_password',
    'to': '61412345678',          # Australian mobile number
    'message': '[Image]',          # Message text
    'maxsplit': '10',
    'ref': 'internal_reference_id',
    
    # MMS parameters (THESE MIGHT BE WRONG):
    'attachment0': '<base64_encoded_image_data>',  # Full base64 string
    'type0': 'image/jpeg',                         # MIME type
    'name0': 'image.jpg'                           # Filename
}

response = requests.post('https://api.smsbroadcast.com.au/api-adv.php', data=params)
```

## The Problem

1. **Message is delivered** ✅ - We get `OK` response with message ID from SMS Broadcast
2. **Text arrives** ✅ - The text "[Image]" appears on the recipient's iPhone
3. **Image does NOT arrive** ❌ - No image/attachment is shown

## What We Need to Know

**Question:** How do we correctly send MMS (multimedia messages with images) using the SMS Broadcast Australia API?

Specifically:

1. **Are we using the correct API endpoint?**
   - Is `api-adv.php` the right endpoint for MMS?
   - Or is there a different endpoint like `api-mms.php` or `api/v1/mms`?

2. **Are we using the correct parameter names?**
   - Is `attachment0`, `type0`, `name0` correct?
   - Or should it be `media`, `media_url`, `mediaUrl`, `file`, etc.?

3. **Should the image be base64-encoded in the request body?**
   - Current: We're sending base64 string directly in POST body
   - Alternative: Should we host the image and send a URL instead?
   - Alternative: Should we use multipart/form-data instead of application/x-www-form-urlencoded?

4. **Does SMS Broadcast support MMS through their standard API?**
   - Or does it require a different service/plan?
   - Is there a separate MMS API vs SMS API?

## Additional Info

- **Provider:** SMS Broadcast Australia (smsbroadcast.com.au)
- **Current API:** Advanced HTTP API (`api-adv.php`)
- **Account type:** Standard SMS account (not sure if MMS is enabled)
- **Image specs:**
  - Format: JPEG
  - Size: ~59KB (base64: ~79KB)
  - Resolution: Under 1024x1024px

## What We've Tried

1. ✅ Sending with `attachment0`, `type0`, `name0` - Message delivered, no image
2. ✅ Image downloads successfully from S3 presigned URL
3. ✅ Base64 encoding works (tested manually)
4. ✅ SMS Broadcast accepts the request (returns `OK` with message ID)

## Please Help Us Find

1. **Official SMS Broadcast MMS API documentation link**
2. **Correct API endpoint and parameters for MMS**
3. **Working example of MMS request to SMS Broadcast**
4. **Any special account requirements or settings needed**

---

**Note:** If SMS Broadcast doesn't support MMS through their API, please let us know so we can consider alternatives (Twilio, etc.).

