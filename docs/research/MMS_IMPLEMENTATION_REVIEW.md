# MMS Implementation Review - Codebase Analysis

**Date:** November 8, 2025  
**Status:** Planning Complete - Ready to Build  
**Branch:** `MMS`

---

## 📊 **Codebase Review Summary**

After reviewing the existing codebase, I now understand:
- ✅ How SMS Dialog works (conversation display, sending, templates)
- ✅ How Images system works (batches, S3 storage, thumbnails)
- ✅ How S3Service is used (via `documents.services`)
- ✅ Frontend patterns (Mantine UI, React hooks, modals)
- ✅ Backend patterns (Django REST, viewsets, serializers)
- ✅ SMS Broadcast integration (webhooks, message sending)

---

## 🎯 **Implementation Strategy**

Based on the codebase, here's how to build MMS support following your established patterns:

---

### **Phase 1: Backend Foundation (Day 1)**

#### **1.1 Database Models** ✅ Pattern Identified

**File:** `backend/sms_integration/models.py` (protected - need to temporarily remove from `.cursorignore`)

**Pattern to follow:** Similar to `Image` model fields in `backend/images/models.py`

```python
# Add to SMSMessage model (outbound)
has_media = models.BooleanField(default=False)
media_url = models.URLField(blank=True, null=True)  # Our S3 URL
media_type = models.CharField(max_length=50, blank=True)  # image/jpeg
media_size = models.IntegerField(blank=True, null=True)
media_filename = models.CharField(max_length=255, blank=True)
s3_key = models.CharField(max_length=500, blank=True)  # S3 path

# Add to SMSInbound model (inbound)
has_media = models.BooleanField(default=False)
media_url = models.URLField(blank=True, null=True)  # Provider's URL
media_downloaded_url = models.URLField(blank=True, null=True)  # Our S3 URL
media_type = models.CharField(max_length=50, blank=True)
media_size = models.IntegerField(blank=True, null=True)
s3_key = models.CharField(max_length=500, blank=True)
download_status = models.CharField(
    max_length=20,
    choices=[('pending', 'Pending'), ('downloaded', 'Downloaded'), ('failed', 'Failed')],
    default='pending'
)
```

**Migration:**
```bash
python manage.py makemigrations sms_integration
python manage.py migrate
```

---

#### **1.2 MMS Service Layer** ✅ Pattern Identified

**File:** `backend/sms_integration/mms_service.py` (NEW)

**Pattern to follow:** Similar to `backend/images/views.py` lines 84-224 (batch upload logic)

**Key methods needed:**
1. `upload_media_for_sending(file)` - Upload image to S3 for outbound MMS
2. `download_inbound_media(provider_url, message_id)` - Download from SMS Broadcast
3. `validate_media(file)` - Check format/size
4. `resize_image(file)` - Auto-resize to 1024px/600KB
5. `convert_heic_to_jpeg(file)` - Handle iPhone photos

**S3Service pattern:**
```python
from documents.services import S3Service

s3_service = S3Service()

# Upload pattern (from images/views.py:157-163)
s3_service.s3_client.put_object(
    Bucket=s3_service.bucket_name,
    Key=s3_key,
    Body=file.read(),
    ContentType=file.content_type or 'image/jpeg'
)

# Generate presigned URL (from documents/serializers.py:48-52)
s3_service.generate_presigned_url(
    s3_key, 
    expiration=3600,
    filename=original_name
)
```

**Pillow resize pattern** (from images/views.py:123-137):
```python
from PIL import Image as PILImage
from io import BytesIO

img = PILImage.open(file)
width, height = img.size

# Resize to max 1024px while maintaining aspect ratio
img.thumbnail((1024, 1024), PILImage.Resampling.LANCZOS)

# Save to BytesIO
buffer = BytesIO()
img.save(buffer, format='JPEG', quality=85)
buffer.seek(0)
```

---

#### **1.3 API Endpoints** ✅ Pattern Identified

**File:** `backend/sms_integration/patient_views.py` (protected - need to temporarily remove from `.cursorignore`)

**Pattern to follow:** Existing `patient_send_sms` function (lines 295-414)

**New endpoint 1: Upload Media**
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_mms_media(request):
    """
    POST /api/sms/upload-media/
    Upload image for MMS, returns S3 URL
    """
    # Pattern: Similar to images/views.py:84-224
    # 1. Get file from request.FILES
    # 2. Validate (JPEG/PNG/GIF/HEIC, any size)
    # 3. Convert HEIC if needed
    # 4. Resize to 1024px/600KB
    # 5. Upload to S3 at: mms/outbound/{uuid}.jpg
    # 6. Return S3 URL
```

**Update existing endpoint: Send SMS to accept media_url**
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def patient_send_sms(request, patient_id):
    """
    EXISTING FUNCTION - ADD media_url support
    
    Body: {
        "phone_number": "+61412345678",
        "message": "Your message",
        "media_url": "https://s3.../mms/outbound/uuid.jpg"  # NEW
    }
    """
    # Pattern: Modify existing send logic (lines 295-414)
    # 1. Extract media_url from request.data
    # 2. Pass to SMSService.send_sms(media_url=media_url)
    # 3. Update SMSMessage with has_media=True
```

---

#### **1.4 Update SMS Service** ✅ Pattern Identified

**File:** `backend/sms_integration/services.py` (protected)

**Pattern:** Modify existing `send_sms` method to support MMS

**SMS Broadcast MMS API:**
```python
# For MMS, add to SMS Broadcast API call:
payload = {
    'to': phone_number,
    'message': message,
    'from': settings.SMS_FROM_NUMBER,
    # NEW: MMS support
    'media': media_url  # Public S3 URL that SMS Broadcast can access
}
```

---

#### **1.5 Webhook Handler for Inbound MMS** ✅ Pattern Identified

**File:** `backend/sms_integration/webhook_views.py` (protected)

**Pattern:** Modify existing `sms_inbound` function (lines 96-200+)

**Current webhook parameters:**
- `from` - sender phone
- `to` - our number
- `message` - text content
- `ref` - message reference
- `smsref` - SMS Broadcast ID

**NEW MMS parameters** (from SMS Broadcast MMS webhook):
- `media_url` - URL to image on SMS Broadcast's server
- `media_type` - MIME type (image/jpeg)

**Implementation:**
```python
# In sms_inbound function, after line 136:
media_url = data.get('media_url') or request.GET.get('media_url')
media_type = data.get('media_type') or request.GET.get('media_type')

# When creating SMSInbound (around line 165):
inbound = SMSInbound.objects.create(
    # ... existing fields ...
    has_media=bool(media_url),
    media_url=media_url,
    media_type=media_type,
    download_status='pending' if media_url else None,
)

# Download media in background (to prevent webhook timeout)
if media_url:
    # Option A: Celery task (if available)
    download_mms_media_task.delay(inbound.id, media_url)
    
    # Option B: Django threading (simpler)
    import threading
    thread = threading.Thread(
        target=mms_service.download_inbound_media,
        args=(media_url, inbound.id)
    )
    thread.start()
```

---

#### **1.6 Save MMS to Images Feature** ✅ Pattern Identified

**File:** `backend/sms_integration/views.py` (protected)

**Pattern:** Similar to `backend/images/views.py` create/update logic

**New endpoints:**
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_mms_to_images(request, message_id):
    """
    POST /api/sms/mms/<message_id>/save-to-images/
    
    Save MMS image to patient's Images folder
    Creates new ImageBatch + Image record
    Copies S3 file from mms/inbound/ to images/{patient_id}/
    """
    # 1. Get SMSInbound message
    # 2. Check if already saved (prevent duplicates)
    # 3. Create ImageBatch (from documents/models.py pattern)
    # 4. Copy S3 file (S3 copy operation, not re-upload)
    # 5. Create Image record with:
    #    - source='sms'
    #    - source_sms_message_id=message_id
    #    - category=request.data['category']
    # 6. Return success

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_mms_saved(request, message_id):
    """
    GET /api/sms/mms/<message_id>/is-saved/?patient_id=xxx
    
    Check if MMS already saved to Images
    """
    # Query Image model for source_sms_message_id
```

**Image model updates** (backend/images/models.py):
```python
# Add to Image model (around line 140):
source = models.CharField(
    max_length=20,
    choices=[('upload', 'Direct Upload'), ('sms', 'From SMS/MMS'), ('email', 'From Email')],
    default='upload'
)
source_sms_message_id = models.UUIDField(blank=True, null=True)
source_sms_date = models.DateTimeField(blank=True, null=True)
```

---

### **Phase 2: Frontend UI (Day 2)**

#### **2.1 Update SMSDialog** ✅ Pattern Identified

**File:** `frontend/app/components/dialogs/SMSDialog.tsx` (protected)

**Pattern:** Similar to `frontend/app/components/dialogs/ImagesDialog.tsx` dropzone (lines 596-649)

**Changes needed:**

**1. Add state (after line 126):**
```typescript
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [isDragging, setIsDragging] = useState(false);
const [uploading, setUploading] = useState(false);
```

**2. Add FileButton icon (in send form around line 641):**
```typescript
// Pattern from: ImagesDialog dropzone (Dropzone.Accept)
<FileButton
  accept="image/png,image/jpeg,image/gif,image/heic,image/heif"
  onChange={handleImageSelect}
>
  {(props) => (
    <ActionIcon {...props} size="lg" variant="light" color="grape">
      <IconPhoto size={20} />
    </ActionIcon>
  )}
</FileButton>
```

**3. Add image preview (below textarea, around line 638):**
```typescript
{imagePreview && (
  <Box pos="relative">
    <Image
      src={imagePreview}
      alt="Preview"
      width={150}
      height={150}
      fit="cover"
      radius="md"
    />
    <ActionIcon
      pos="absolute"
      top={5}
      right={5}
      size="sm"
      color="red"
      variant="filled"
      onClick={handleRemoveImage}
    >
      <IconX size={14} />
    </ActionIcon>
  </Box>
)}
```

**4. Add drag & drop overlay:**
```typescript
// Pattern: Similar to ImagesDialog Dropzone (lines 651-685)
{isDragging && (
  <Box
    pos="absolute"
    top={0}
    left={0}
    right={0}
    bottom={0}
    bg="rgba(94, 53, 177, 0.1)"  // Grape/purple overlay
    style={{
      border: '3px dashed var(--mantine-color-grape-5)',
      borderRadius: '8px',
      zIndex: 1000,
      pointerEvents: 'none',
    }}
  >
    <Center h="100%">
      <Stack align="center" gap="xs">
        <IconPhoto size={48} color="var(--mantine-color-grape-6)" />
        <Text size="lg" fw={500} c="grape">
          Drop image here
        </Text>
      </Stack>
    </Center>
  </Box>
)}
```

**5. Update send button (around line 645):**
```typescript
<Button
  leftSection={selectedImage ? <IconPhoto size={16} /> : <IconSend size={16} />}
  onClick={selectedImage ? handleSendMMS : handleSend}
  disabled={!selectedPhone || sending || (!messageText.trim() && !selectedImage)}
  loading={sending || uploading}
  color={selectedImage ? 'grape' : 'blue'}
>
  {selectedImage ? 'Send MMS' : 'Send SMS'}
</Button>
```

**6. Update message interface (around line 31):**
```typescript
interface SMSMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  message: string;
  // ... existing fields ...
  // NEW:
  has_media?: boolean;
  media_url?: string;
  media_type?: string;
}
```

**7. Update MessageBubble (around line 686):**
```typescript
// In MessageBubble component, after message text:
{message.has_media && message.media_url && (
  <Box mt="xs">
    <Image
      src={message.media_url}
      alt="MMS"
      width={100}
      height={100}
      fit="cover"
      radius="md"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        // Open full-size modal (next section)
        setSelectedImageMessage(message);
        setImageModalOpened(true);
      }}
    />
  </Box>
)}
```

---

#### **2.2 MMSImageModal Component** ✅ Pattern Identified

**File:** `frontend/app/components/dialogs/MMSImageModal.tsx` (NEW)

**Pattern:** Similar to `frontend/app/components/dialogs/ImagesDialog.tsx` ImageViewer (lines 858-1012)

**Purpose:** Full-size image display with Save to Images button

**Key features:**
1. Full-size image display
2. Context bar (sender, date, time)
3. Message caption (if any)
4. Category dropdown (for "Save to Images")
5. Save button with states (normal → loading → saved)

**Component structure:**
```typescript
interface MMSImageModalProps {
  opened: boolean;
  onClose: () => void;
  message: SMSMessage;  // Contains image URL, patient info, timestamp
  patientId: string;
  patientName: string;
}

// Implementation pattern:
// - Use Mantine Modal (size="xl", centered)
// - Use Mantine Image (fit="contain", maxHeight="60vh")
// - Use Mantine Select for category dropdown
// - Use Mantine Button with IconCheck/IconDownload
// - Use notifications.show() for success/error
```

---

#### **2.3 HEIC Preview Conversion** ✅ Pattern Identified

**File:** `frontend/app/components/dialogs/SMSDialog.tsx`

**Pattern:** Dynamic import to avoid bundle bloat

**Implementation:**
```typescript
// In handleImageSelect function
if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
  try {
    // Dynamic import (only loads when needed)
    const heic2any = (await import('heic2any')).default;
    
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8,
    });
    
    // Create preview from converted blob
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(convertedBlob as Blob);
  } catch (error) {
    // Fallback: Show generic image icon
    console.error('HEIC conversion failed:', error);
    setImagePreview('/icons/image-placeholder.png');
  }
} else {
  // Normal image preview
  const reader = new FileReader();
  reader.onload = (e) => setImagePreview(e.target?.result as string);
  reader.readAsDataURL(file);
}
```

**Install dependency:**
```bash
npm install heic2any
```

---

#### **2.4 Update SMSNotificationWidget** ✅ Pattern Identified

**File:** `frontend/app/components/SMSNotificationWidget.tsx`

**Pattern:** Add image indicator similar to message preview

**Change needed (in message list item):**
```typescript
// After message text preview:
{msg.has_media && (
  <Group gap={4} c="dimmed">
    <IconPhoto size={14} />
    <Text size="xs">Image</Text>
  </Group>
)}
```

---

### **Phase 3: Testing & Integration (Day 3-3.5)**

#### **3.1 Backend Testing**

**Test endpoints:**
```bash
# 1. Upload media
curl -X POST https://localhost:8000/api/sms/upload-media/ \
  -F "file=@test_image.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Send MMS
curl -X POST https://localhost:8000/api/sms/patient/{patient_id}/send/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+61412345678",
    "message": "Test MMS",
    "media_url": "https://s3.../mms/outbound/uuid.jpg"
  }'

# 3. Test inbound webhook
curl -X POST https://YOUR_NGROK_URL/api/sms/webhook/inbound/ \
  -d "from=+61412345678" \
  -d "to=+61400000000" \
  -d "message=Test" \
  -d "media_url=https://example.com/test.jpg" \
  -d "media_type=image/jpeg"
```

**Verify:**
- ✅ Image uploads to S3 at `mms/outbound/{uuid}.jpg`
- ✅ Image resizes to ≤1024px and ≤600KB
- ✅ HEIC converts to JPEG
- ✅ MMS sends via SMS Broadcast
- ✅ Inbound MMS downloads to S3 at `mms/inbound/{message_id}/`
- ✅ Database records created correctly

---

#### **3.2 Frontend Testing**

**Test scenarios:**
1. ✅ Upload JPEG image (normal flow)
2. ✅ Upload PNG image
3. ✅ Upload HEIC image (iPhone photo) - preview works
4. ✅ Upload large image (5MB) - auto-resizes
5. ✅ Drag & drop image
6. ✅ Remove image before sending
7. ✅ Send MMS with caption
8. ✅ Send MMS without caption
9. ✅ Receive MMS - thumbnail displays
10. ✅ Click thumbnail - full-size modal opens
11. ✅ Save to Images - category selection
12. ✅ Save to Images - prevent duplicates
13. ✅ Images section shows SMS context

**Verify UI:**
- ✅ Send button changes to "Send MMS" (grape color)
- ✅ Image preview shows below textarea (150x150px)
- ✅ X button removes image
- ✅ Drag & drop overlay appears (purple/grape)
- ✅ Icon button for image attach
- ✅ Thumbnails in conversation (100x100px, clickable)
- ✅ Full-size modal displays correctly
- ✅ Save button changes to "✅ Saved"

---

#### **3.3 Integration Testing**

**End-to-end scenarios:**

**Scenario 1: Staff sends MMS to patient**
1. Open SMS dialog for patient
2. Click image attach icon
3. Select image (or drag & drop)
4. Image preview appears (150x150px)
5. Type optional caption
6. Click "Send MMS" (grape button)
7. Message sends, appears in conversation with thumbnail
8. Patient receives MMS on phone

**Scenario 2: Patient sends MMS to staff**
1. Patient sends image via SMS on their phone
2. Webhook receives MMS
3. Image downloads to S3 in background
4. Staff sees desktop notification (if enabled)
5. SMS widget shows unread count
6. Staff opens SMS dialog
7. Message displays with thumbnail (100x100px)
8. Staff clicks thumbnail
9. Full-size modal opens with Save button
10. Staff selects category, clicks Save
11. Image appears in patient's Images section
12. Image shows "From SMS: [date]" badge

**Scenario 3: iPhone HEIC photo**
1. Staff selects HEIC image from iPhone uploads
2. Frontend converts to JPEG for preview (using heic2any)
3. Preview displays successfully
4. Staff sends MMS
5. Backend converts HEIC to JPEG (using Pillow)
6. MMS sends successfully
7. Patient receives as JPEG

---

## 📁 **Files to Create/Modify**

### **New Files:**
1. ✅ `backend/sms_integration/mms_service.py` - MMS logic
2. ✅ `frontend/app/components/dialogs/MMSImageModal.tsx` - Full-size viewer
3. ✅ `backend/sms_integration/migrations/000X_add_mms_fields.py` - Auto-generated

### **Modified Files (Protected - Temporarily remove from .cursorignore):**
1. ⚠️ `backend/sms_integration/models.py` - Add MMS fields
2. ⚠️ `backend/sms_integration/patient_views.py` - Add upload endpoint, modify send
3. ⚠️ `backend/sms_integration/services.py` - Add MMS sending
4. ⚠️ `backend/sms_integration/webhook_views.py` - Handle inbound MMS
5. ⚠️ `backend/sms_integration/views.py` - Add save-to-images endpoints
6. ⚠️ `backend/sms_integration/serializers.py` - Add media fields
7. ⚠️ `backend/sms_integration/urls.py` - Register new endpoints
8. ⚠️ `backend/images/models.py` - Add source tracking fields
9. ⚠️ `frontend/app/components/dialogs/SMSDialog.tsx` - Add MMS UI
10. ⚠️ `frontend/app/components/SMSNotificationWidget.tsx` - Show image indicator

### **Documentation Updates:**
1. ✅ `docs/features/MMS_SUPPORT_PLAN.md` - Already complete
2. ✅ `docs/integrations/SMS.md` - Add MMS section
3. ✅ `QUICK_COMMANDS.md` - Add MMS examples
4. ✅ `docs/architecture/DATABASE_SCHEMA.md` - Document new fields

---

## 🔧 **Dependencies to Install**

### **Backend:**
```bash
# Already have Pillow (from images system)
pip install pillow-heif  # For HEIC support
```

### **Frontend:**
```bash
npm install heic2any  # For HEIC preview
```

---

## 🎯 **Implementation Order**

### **Day 1: Backend**
1. ✅ Update models (add MMS fields)
2. ✅ Create migrations, run migrate
3. ✅ Create `mms_service.py` (upload, download, resize, convert)
4. ✅ Add upload endpoint (`/api/sms/upload-media/`)
5. ✅ Update send endpoint (accept `media_url`)
6. ✅ Update webhook (handle inbound MMS)
7. ✅ Add save-to-images endpoints
8. ✅ Test with curl/Postman

### **Day 2: Frontend**
1. ✅ Install `heic2any`
2. ✅ Update SMSDialog (add image upload UI)
3. ✅ Add drag & drop overlay
4. ✅ Add image preview
5. ✅ Update send button behavior
6. ✅ Update MessageBubble (display thumbnails)
7. ✅ Create MMSImageModal component
8. ✅ Add HEIC preview conversion
9. ✅ Update SMSNotificationWidget (image indicator)
10. ✅ Test in browser

### **Day 3: Testing & Polish**
1. ✅ End-to-end testing (send/receive MMS)
2. ✅ iPhone HEIC photo testing
3. ✅ Save to Images testing
4. ✅ Edge case testing (large files, invalid formats)
5. ✅ Update documentation
6. ✅ Commit and push

---

## ✅ **Ready to Start?**

**Next steps:**
1. Review this document - any questions or changes?
2. Temporarily remove `.cursorignore` (to edit protected files)
3. Start with Day 1: Backend (database models first)
4. Test incrementally after each step
5. Restore `.cursorignore` when complete

**Estimated time:** 3.5 days (slightly longer due to Save to Images feature)

**All patterns identified:** ✅  
**All files located:** ✅  
**Dependencies known:** ✅  
**Implementation path clear:** ✅  

🚀 **Ready to build!**

