# MMS Support Enhancement Plan

**Status:** 🔍 Research Complete - Ready for Implementation  
**Priority:** Phase 3 (after SMS Notification Widget)  
**Date:** November 8, 2025  
**Branch:** `MMS` (current)  
**Last Updated:** November 8, 2025

---

## 📊 **Executive Summary**

**✅ SMS Broadcast DOES support MMS!**

- **Inbound MMS:** Confirmed via webhook configuration (checkbox visible)
- **Implementation:** 2-3 days (backend + frontend + testing)
- **Storage:** Use existing S3 infrastructure (already in use for documents)
- **Cost:** TBD (need to check SMS Broadcast pricing)
- **Complexity:** Medium (build on SMS notification widget experience)

**Recommendation:** ✅ Proceed with implementation using SMS Broadcast (no provider change needed)

---

## 🎯 **Implementation Order:**

1. ✅ **Phase 1:** SMS Notification Widget (COMPLETE - Nov 8, 2025)
2. ✅ **Phase 2:** SMS Notification Widget Testing & Production (COMPLETE - Nov 8, 2025)
3. 🎯 **Phase 3:** MMS Support (THIS DOCUMENT - READY TO START)

---

## 📱 **Goal: Add MMS (Image) Support to SMS Integration**

Enable clinic staff to send and receive images (MMS) alongside SMS messages, enhancing patient communication for sharing photos of devices, prescriptions, appointment cards, etc.

---

## 🔍 **RESEARCH FINDINGS (November 8, 2025)**

### **✅ Confirmed: SMS Broadcast Supports MMS**

**Evidence:**
1. **Inbound MMS Webhook:**
   - ✅ Webhook configuration UI shows **"SMS → Receive an MMS"** checkbox
   - ✅ Screenshot confirmed by user
   - ✅ Follows same pattern as existing "SMS → Receive an SMS" setup

2. **Webhook Parameters (Expected):**
   Based on standard SMS Broadcast webhook format, inbound MMS likely sends:
   - `from` - Sender phone number
   - `to` - Recipient number
   - `message` - Text content (if any)
   - `media_url` - URL to image hosted by SMS Broadcast (TBD)
   - `media_type` - MIME type (e.g., `image/jpeg`) (TBD)
   - `msgref` - Message reference ID

3. **Outbound MMS API:**
   - ⚠️ **NEEDS VERIFICATION:** Check SMS Broadcast API documentation
   - Expected endpoint: `https://api.smsbroadcast.com.au/api-adv.php`
   - Expected parameter: `media_url` (publicly accessible image URL)
   - **Action Required:** Test sending MMS via API or contact support

4. **Media Storage:**
   - Inbound: SMS Broadcast likely hosts media temporarily
   - Our approach: Download immediately and store in S3 (permanent storage)
   - Outbound: We host media on S3 (already configured for documents)
   - S3 bucket: Same as documents (already has public read access)

---

### **📋 Next Steps for Verification**

Before starting implementation, we need to confirm:

1. **✅ Already Confirmed:**
   - Inbound MMS webhook exists
   - SMS Broadcast supports receiving MMS

2. **⏳ Still Need to Verify:**
   - [ ] Outbound MMS API endpoint and parameters
   - [ ] MMS pricing (vs SMS pricing)
   - [ ] Maximum image size supported
   - [ ] Supported image formats (JPEG, PNG, GIF?)
   - [ ] How SMS Broadcast delivers media URLs (temporary or permanent?)
   - [ ] Webhook parameter names for inbound MMS

3. **📞 How to Verify:**
   - **Option A:** Check SMS Broadcast API documentation
   - **Option B:** Contact SMS Broadcast support (support@smsbroadcast.com.au)
   - **Option C:** Test via SMS Broadcast web dashboard (send MMS manually)
   - **Option D:** Set up MMS webhook and test with real message

---

## 🆚 **Provider Comparison: SMS Broadcast vs Twilio**

### **SMS Broadcast (Current Provider)**

**Pros:**
- ✅ Already integrated and working
- ✅ MMS support confirmed (inbound at minimum)
- ✅ Australian company (local support, AU pricing)
- ✅ Simple API (already familiar)
- ✅ No migration needed
- ✅ Existing webhook infrastructure works

**Cons:**
- ⚠️ Limited documentation online (vs Twilio)
- ⚠️ MMS details need verification
- ⚠️ Unknown pricing for MMS

**Cost (Current SMS):**
- SMS: ~$0.08 AUD per message
- MMS: Unknown (needs verification)

---

### **Twilio (Alternative)**

**Pros:**
- ✅ Extensive documentation
- ✅ Well-known MMS support
- ✅ Multiple SDKs available
- ✅ Robust API
- ✅ 5 MB media file limit
- ✅ Supports JPEG, PNG, GIF

**Cons:**
- ❌ Requires full migration (3-5 days work)
- ❌ Learning curve for new API
- ❌ US-based (pricing in USD)
- ❌ Need new webhook setup
- ❌ Higher per-message cost

**Cost:**
- SMS: ~$0.10 AUD (~$0.0065 USD)
- MMS: ~$0.20 AUD (~$0.02 USD)
- Inbound MMS: ~$0.02 AUD (~$0.0165 USD)

**Monthly estimate (if 500 MMS/month):**
- 500 × $0.20 = **$100 AUD/month**

---

## 🎯 **RECOMMENDATION: Stick with SMS Broadcast**

**Reasons:**
1. ✅ MMS support confirmed (no need to switch)
2. ✅ Already integrated and working well
3. ✅ Avoid 3-5 days of migration work
4. ✅ Keep Australian provider (local support)
5. ✅ Existing S3 infrastructure supports MMS storage

**Action Plan:**
1. Verify outbound MMS API details
2. Test sending/receiving MMS
3. Confirm pricing is acceptable
4. Proceed with implementation (2-3 days)

**If SMS Broadcast MMS doesn't work:**
- Fallback: Implement "image via link" workaround (1 day)
- Last resort: Migrate to Twilio (3-5 days)

---

## 🛠️ **Technical Architecture**

### **Inbound MMS Flow:**

```
Patient sends MMS
    ↓
SMS Broadcast receives MMS
    ↓
Webhook fires → /api/sms/webhook/inbound/
    ↓
Backend receives webhook data
    ↓
Check for media_url parameter
    ↓
If media_url exists:
    ├─ Download image from SMS Broadcast URL
    ├─ Upload to our S3 bucket (permanent storage)
    ├─ Save S3 URL to SMSInbound.media_downloaded_url
    └─ Update download_status = 'downloaded'
    ↓
Link message to patient (by phone number)
    ↓
Save to SMSInbound table
    ↓
Frontend polls and displays new message with image
```

---

### **Outbound MMS Flow:**

```
Staff opens SMS dialog
    ↓
Staff clicks "Attach Image" button
    ↓
File picker opens
    ↓
Staff selects image (JPEG/PNG/GIF, <600KB)
    ↓
Frontend uploads to /api/sms/upload-media/
    ↓
Backend receives image file
    ↓
Validate file (type, size)
    ↓
Upload to S3 with public read access
    ↓
Return public S3 URL to frontend
    ↓
Frontend shows image preview
    ↓
Staff clicks "Send MMS"
    ↓
Frontend sends to /api/sms/patient/{id}/send/
    with media_url parameter
    ↓
Backend calls SMS Broadcast API
    with media_url (our S3 URL)
    ↓
SMS Broadcast fetches image from S3
    ↓
SMS Broadcast sends MMS to patient
    ↓
Save to SMSMessage table
    (has_media=True, media_url=S3_URL)
    ↓
Frontend displays sent MMS in conversation
```

---

## 💾 **Storage Strategy**

### **Using Existing S3 Infrastructure**

We already have S3 configured for document storage. Reuse this for MMS:

**Current S3 Setup:**
- Bucket: `backend/documents/services.py` → `document_service`
- Already configured: AWS credentials, bucket name, regions
- Already working: Upload, download, generate presigned URLs

**MMS Storage Approach:**

1. **Organize by Type:**
   ```
   s3://your-bucket/
   ├─ documents/          # Existing (patient docs)
   ├─ mms/                # New (MMS media)
   │  ├─ inbound/         # Images received from patients
   │  │  └─ {message_id}/{filename}
   │  └─ outbound/        # Images sent to patients
   │     └─ {message_id}/{filename}
   ```

2. **Access Control:**
   - **Inbound:** Private by default (presigned URLs for viewing)
   - **Outbound:** Public read (so SMS Broadcast can fetch)
   - Use S3 bucket policies to enforce

3. **Lifecycle:**
   - Keep all MMS media permanently (same as documents)
   - Consider archiving to Glacier after 1 year (optional)
   - Total cost estimate: ~$0.023 per GB/month

---

## 📊 **MMS Media Specifications**

### **Carrier Limitations (General)**

Most carriers impose these limits:

| Spec | Limit |
|------|-------|
| **File Size** | 600 KB - 1 MB (varies by carrier) |
| **Image Formats** | JPEG, PNG, GIF |
| **Image Dimensions** | Max 1024x1024 recommended |
| **Video** | MP4, 3GP (if supported) |
| **Audio** | MP3, AMR (if supported) |

**For This Implementation:**
- Focus on **images only** (JPEG, PNG, GIF)
- Enforce **600 KB limit** (safe for all carriers)
- Auto-resize if needed (optional enhancement)

---

### **Frontend Validation**

```typescript
// Validate image before upload
function validateMMSImage(file: File): boolean {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    showNotification({
      title: 'Invalid File Type',
      message: 'Please select a JPEG, PNG, or GIF image',
      color: 'red'
    });
    return false;
  }
  
  // Check file size (600 KB)
  const maxSize = 600 * 1024; // 600 KB in bytes
  if (file.size > maxSize) {
    showNotification({
      title: 'File Too Large',
      message: `Image must be under 600 KB (current: ${Math.round(file.size / 1024)} KB)`,
      color: 'red'
    });
    return false;
  }
  
  return true;
}
```

---

## 📋 **CRITICAL FIRST STEP: VERIFY SMS BROADCAST MMS SUPPORT**

### **⚠️ IMPORTANT: We Need to Confirm This First**

Before we start building anything, we **MUST** verify:

1. **Does SMS Broadcast (smsbroadcast.com.au) support MMS?**
   - ✅ **CONFIRMED:** Inbound MMS webhook exists
   - ⏳ **NEEDS VERIFICATION:** Outbound MMS API

2. **If YES:**
   - What's the API endpoint for sending MMS?
   - How do they deliver inbound MMS media?
   - What file formats are supported?
   - What's the file size limit?
   - How does webhook deliver media URLs?

3. **If NO:**
   - Do we need to switch providers? (Twilio, MessageMedia)
   - Can we use a secondary provider just for MMS?
   - What's the cost comparison?

---

## 📋 **Research Checklist**

### **Step 1: Check SMS Broadcast Documentation**
- [ ] Log into https://www.smsbroadcast.com.au/
- [ ] Check API documentation for MMS endpoints
- [ ] Look for "MMS", "Multimedia", "Image", "Media" in docs
- [ ] Check pricing page for MMS costs

### **Step 2: Contact SMS Broadcast Support**
- [ ] Email: support@smsbroadcast.com.au
- [ ] Ask: "Do you support MMS (sending/receiving images)?"
- [ ] Ask: "What's your API endpoint for MMS?"
- [ ] Ask: "How are inbound MMS images delivered?"

### **Step 3: Test Account Capabilities**
- [ ] Try sending MMS via web dashboard
- [ ] Check if MMS option exists in account settings
- [ ] Review webhook documentation for media URLs

---

## 🎯 **IF SMS BROADCAST SUPPORTS MMS:**

### **What We Need to Build:**

#### **1. Backend Changes:**

##### **1.1 Update Database Models**

**New Fields for `SMSMessage` (Outbound):**
```python
# backend/sms_integration/models.py

class SMSMessage(models.Model):
    # ... existing fields ...
    
    # MMS Support
    has_media = models.BooleanField(default=False)
    media_url = models.URLField(blank=True, null=True)  # Our hosted URL
    media_type = models.CharField(max_length=50, blank=True)  # image/jpeg, image/png
    media_size = models.IntegerField(blank=True, null=True)  # bytes
    media_filename = models.CharField(max_length=255, blank=True)
    
    # If using S3:
    s3_key = models.CharField(max_length=500, blank=True)  # S3 object key
```

**New Fields for `SMSInbound` (Inbound):**
```python
class SMSInbound(models.Model):
    # ... existing fields ...
    
    # MMS Support
    has_media = models.BooleanField(default=False)
    media_url = models.URLField(blank=True, null=True)  # Provider's URL
    media_downloaded_url = models.URLField(blank=True, null=True)  # Our S3 URL
    media_type = models.CharField(max_length=50, blank=True)
    media_size = models.IntegerField(blank=True, null=True)
    s3_key = models.CharField(max_length=500, blank=True)
    download_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('downloaded', 'Downloaded'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
```

---

##### **1.2 Create MMS Service Layer**

**New File:** `backend/sms_integration/mms_service.py`

```python
import requests
from django.conf import settings
from documents.services import document_service  # Reuse S3 upload

class MMSService:
    """
    Handles MMS-specific operations:
    - Upload images to S3
    - Download inbound MMS media
    - Generate public URLs
    - Handle media formats/sizes
    """
    
    def upload_media_for_sending(self, file):
        """
        Upload media file to S3 for outbound MMS
        Returns public URL that SMS Broadcast can access
        """
        # 1. Validate file (type, size)
        # 2. Upload to S3 with public read access
        # 3. Return public URL
        pass
    
    def download_inbound_media(self, provider_url, message_id):
        """
        Download media from SMS Broadcast's URL
        Save to our S3 for permanent storage
        """
        # 1. Download from provider URL
        # 2. Upload to our S3
        # 3. Return our S3 URL
        # 4. Update SMSInbound record
        pass
    
    def validate_media(self, file):
        """
        Check if file is acceptable for MMS
        - Format: JPEG, PNG, GIF
        - Size: < 600KB (carrier limit)
        """
        pass
```

---

##### **1.3 Update SMS Service to Support MMS**

**File:** `backend/sms_integration/services.py`

**Add MMS sending capability:**
```python
class SMSService:
    def send_sms(self, to_number, message, from_number=None, media_url=None):
        """
        Send SMS or MMS
        
        Args:
            media_url: Public URL of image (for MMS)
        """
        # If media_url provided, send MMS instead of SMS
        if media_url:
            return self._send_mms(to_number, message, media_url, from_number)
        else:
            return self._send_sms(to_number, message, from_number)
    
    def _send_mms(self, to_number, message, media_url, from_number=None):
        """
        Send MMS with image
        
        SMS Broadcast MMS API (TO BE CONFIRMED):
        POST https://api.smsbroadcast.com.au/api-adv.php
        
        Parameters:
        - username
        - password
        - to
        - from (sender ID)
        - message (text content)
        - media_url (public URL of image)
        """
        # TODO: Implement based on SMS Broadcast's MMS API docs
        pass
```

---

##### **1.4 Update Webhook to Handle Inbound MMS**

**File:** `backend/sms_integration/webhook_views.py`

**Update inbound webhook:**
```python
@csrf_exempt
@require_http_methods(["POST"])
def sms_inbound(request):
    """
    Webhook for inbound SMS/MMS
    
    SMS Broadcast sends (TO BE CONFIRMED):
    - from: sender phone
    - to: our number
    - message: text content
    - media_url: URL to image (if MMS)
    - media_type: image/jpeg, etc.
    """
    data = request.POST
    
    from_number = data.get('from')
    to_number = data.get('to')
    message = data.get('message', '')
    media_url = data.get('media_url')  # MMS support
    media_type = data.get('media_type')
    
    # Find patient
    patient = find_patient_by_phone(from_number)
    
    # Create inbound record
    inbound = SMSInbound.objects.create(
        from_number=from_number,
        to_number=to_number,
        message=message,
        patient=patient,
        has_media=bool(media_url),
        media_url=media_url,
        media_type=media_type,
        download_status='pending' if media_url else None,
    )
    
    # Download media in background (async task)
    if media_url:
        download_mms_media_task.delay(inbound.id, media_url)
    
    return JsonResponse({'status': 'received'})
```

---

##### **1.5 Create Background Task for Media Download**

**File:** `backend/sms_integration/tasks.py` (if using Celery)

```python
from celery import shared_task
from .mms_service import mms_service

@shared_task
def download_mms_media_task(inbound_id, provider_url):
    """
    Background task to download inbound MMS media
    Prevents webhook timeout
    """
    try:
        inbound = SMSInbound.objects.get(id=inbound_id)
        
        # Download from provider, upload to our S3
        our_url = mms_service.download_inbound_media(provider_url, inbound_id)
        
        # Update record
        inbound.media_downloaded_url = our_url
        inbound.download_status = 'downloaded'
        inbound.save()
        
    except Exception as e:
        inbound.download_status = 'failed'
        inbound.save()
        raise
```

**Alternative (if NO Celery):**
- Download synchronously in webhook (simpler but slower)
- Or use Django's `threading` for background download

---

##### **1.6 Create API Endpoints**

**File:** `backend/sms_integration/patient_views.py`

**New endpoint: Upload media for sending:**
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_mms_media(request):
    """
    Upload image for MMS sending
    Returns S3 URL to use when sending MMS
    """
    file = request.FILES.get('file')
    
    if not file:
        return Response({'error': 'No file provided'}, status=400)
    
    # Validate media
    if not mms_service.validate_media(file):
        return Response({'error': 'Invalid file format or size'}, status=400)
    
    # Upload to S3
    media_url = mms_service.upload_media_for_sending(file)
    
    return Response({
        'media_url': media_url,
        'media_type': file.content_type,
        'media_size': file.size,
    })
```

**Update send endpoint to accept media:**
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def patient_send_sms(request, patient_id):
    """
    Send SMS/MMS to patient
    
    Body:
    - phone: target phone
    - message: text content
    - media_url: (optional) public URL of image for MMS
    """
    media_url = request.data.get('media_url')
    
    # Send via SMS service
    result = sms_service.send_sms(
        to_number=phone,
        message=message,
        media_url=media_url,  # New parameter
    )
    
    # Save to database
    SMSMessage.objects.create(
        patient=patient,
        to_number=phone,
        message=message,
        has_media=bool(media_url),
        media_url=media_url,
        # ... other fields ...
    )
```

---

#### **2. Frontend Changes:**

##### **2.1 Update SMSDialog to Support MMS**

**File:** `frontend/app/components/dialogs/SMSDialog.tsx`

**Add image upload UI:**
```typescript
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);

const handleImageSelect = (file: File) => {
  // Validate file
  if (!file.type.startsWith('image/')) {
    showNotification({ message: 'Please select an image file', color: 'red' });
    return;
  }
  
  if (file.size > 600 * 1024) { // 600KB limit
    showNotification({ message: 'Image too large (max 600KB)', color: 'red' });
    return;
  }
  
  setSelectedImage(file);
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => setImagePreview(e.target?.result as string);
  reader.readAsDataURL(file);
};

const handleSendMMS = async () => {
  setUploading(true);
  
  // 1. Upload image to get URL
  const formData = new FormData();
  formData.append('file', selectedImage);
  
  const uploadResponse = await fetch('https://localhost:8000/api/sms/upload-media/', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  
  const { media_url } = await uploadResponse.json();
  
  // 2. Send MMS with media URL
  await fetch(`https://localhost:8000/api/sms/patient/${patientId}/send/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: selectedPhone,
      message: messageText,
      media_url: media_url, // Include media URL
    }),
  });
  
  setUploading(false);
  setSelectedImage(null);
  setImagePreview(null);
};
```

**Update message display to show images:**
```typescript
interface SMSMessage {
  // ... existing fields ...
  has_media: boolean;
  media_url?: string;
  media_type?: string;
}

function MessageBubble({ message }: { message: SMSMessage }) {
  return (
    <Box>
      {/* Text content */}
      <Text>{message.message}</Text>
      
      {/* Image attachment */}
      {message.has_media && message.media_url && (
        <Box mt="xs">
          <Image
            src={message.media_url}
            alt="MMS attachment"
            fit="contain"
            style={{ maxWidth: '300px', borderRadius: '8px' }}
            onClick={() => {
              // Open full-size in modal
              modals.open({
                children: <Image src={message.media_url} />,
              });
            }}
          />
        </Box>
      )}
    </Box>
  );
}
```

**Add image upload button:**
```typescript
<Group>
  {/* Existing send button */}
  <Button onClick={handleSend}>Send SMS</Button>
  
  {/* New: Image attach button */}
  <FileButton
    accept="image/png,image/jpeg,image/gif"
    onChange={handleImageSelect}
  >
    {(props) => (
      <ActionIcon {...props} size="lg" variant="light">
        <IconPhoto size={20} />
      </ActionIcon>
    )}
  </FileButton>
</Group>

{/* Image preview */}
{imagePreview && (
  <Box mt="xs">
    <Text size="xs" c="dimmed">Attached image:</Text>
    <Image
      src={imagePreview}
      alt="Preview"
      style={{ maxWidth: '200px' }}
    />
    <Button
      size="xs"
      variant="subtle"
      color="red"
      onClick={() => {
        setSelectedImage(null);
        setImagePreview(null);
      }}
    >
      Remove
    </Button>
  </Box>
)}
```

---

##### **2.2 Update SMSNotificationWidget for MMS Preview**

**File:** `frontend/app/components/SMSNotificationWidget.tsx`

**Show image indicator:**
```typescript
<Box>
  {/* Patient name */}
  <Text>{patientName}</Text>
  
  {/* Message preview */}
  <Text>{msg.message}</Text>
  
  {/* MMS indicator */}
  {msg.has_media && (
    <Group gap="xs">
      <IconPhoto size={14} />
      <Text size="xs" c="dimmed">Image attached</Text>
    </Group>
  )}
</Box>
```

---

## 🚫 **IF SMS BROADCAST DOES NOT SUPPORT MMS:**

### **Option 1: Switch to Twilio (Full Migration)**

**Pros:**
- ✅ Full MMS support (US, Canada, Australia)
- ✅ Robust API documentation
- ✅ Inbound/outbound MMS
- ✅ Webhook support

**Cons:**
- ❌ Need to migrate entire SMS integration
- ❌ Different pricing structure
- ❌ Learning curve
- ❌ ~3-5 days of work

---

### **Option 2: Dual Provider Setup**

**Use SMS Broadcast for SMS + Twilio for MMS only**

**Pros:**
- ✅ Keep existing SMS integration
- ✅ Add MMS as separate feature
- ✅ Gradual migration possible

**Cons:**
- ❌ Manage two providers
- ❌ More complex architecture
- ❌ Two sets of webhooks

**Architecture:**
```
User sends message
     ↓
Has image?
  ├─ NO → SMS Broadcast (existing)
  └─ YES → Twilio MMS (new)
```

---

### **Option 3: Manual Image Sharing (Workaround)**

**If MMS not viable, use alternative:**

1. **Upload image to patient's Documents section**
2. **Generate short link** (e.g., `walkeasy.link/img/abc123`)
3. **Send SMS with link** (standard SMS)

**Pros:**
- ✅ No provider change needed
- ✅ Works with any SMS provider
- ✅ Reuses existing S3 infrastructure

**Cons:**
- ❌ Not true MMS (requires click)
- ❌ Extra step for recipient
- ❌ Need to build short link system

---

## 💰 **Cost Comparison (Estimated)**

| Provider | SMS Cost | MMS Cost | Notes |
|----------|----------|----------|-------|
| SMS Broadcast | ~$0.08 AUD | **Unknown** | Need to verify MMS support |
| Twilio | ~$0.10 AUD | ~$0.20 AUD | Full MMS support |
| MessageMedia | ~$0.09 AUD | ~$0.15 AUD | AU-based, MMS supported |

**Monthly estimate (if 500 MMS/month):**
- Twilio: 500 × $0.20 = **$100 AUD/month**
- MessageMedia: 500 × $0.15 = **$75 AUD/month**

---

## 📊 **Decision Matrix**

| Scenario | Recommendation | Time | Complexity |
|----------|---------------|------|------------|
| SMS Broadcast supports MMS | ✅ Implement MMS with SMS Broadcast | 2-3 days | Medium |
| SMS Broadcast NO MMS | Consider Twilio/MessageMedia | 3-5 days | High |
| Low MMS volume expected | Option 3: Link workaround | 1 day | Low |
| High MMS volume expected | Switch to Twilio/MessageMedia | 3-5 days | High |

---

## ✅ **NEXT STEPS:**

### **Immediate Actions:**

1. **Research SMS Broadcast MMS Support** ⭐ **DO THIS FIRST**
   - [ ] Check documentation
   - [ ] Contact support
   - [ ] Test in dashboard

2. **Once Confirmed:**
   - If YES → Proceed with implementation plan above
   - If NO → Evaluate Twilio vs MessageMedia vs Link workaround

3. **Estimate Budget:**
   - How many MMS per month do you expect?
   - Calculate monthly cost
   - Compare providers

---

## 🤔 **Questions to Answer:**

1. **How often will MMS be used?**
   - Daily? Weekly? Rarely?
   - Helps decide if provider switch is worth it

2. **What types of images?**
   - Appointment cards?
   - Device photos?
   - Prescriptions?
   - Helps determine storage needs

3. **Who sends images?**
   - Staff → Patients (outbound MMS)
   - Patients → Staff (inbound MMS)
   - Both directions?

4. **Budget for MMS?**
   - ~$0.20 per MMS (Twilio)
   - Acceptable monthly spend?

---

## 📝 **Summary:**

**We can add MMS support, but need to:**
1. ✅ Verify SMS Broadcast supports it (CRITICAL FIRST STEP)
2. ✅ If yes: Implement MMS service layer (~2-3 days)
3. ✅ If no: Decide between Twilio migration or link workaround
4. ✅ Update frontend to upload/display images
5. ✅ Store media in S3 (already have this infrastructure)
6. ✅ Test inbound/outbound MMS

**Implementation time:** 2-5 days depending on provider support

---

## 🚀 **Ready When You Are!**

Once you verify SMS Broadcast's MMS capabilities, we can:
1. Update this plan with specific API details
2. Start implementation
3. Test with real images

**What do you want to do first?**
- Research SMS Broadcast MMS support?
- Compare alternative providers?
- Discuss use cases more?

