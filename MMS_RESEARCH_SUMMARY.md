# MMS Support - Research Summary

**Date:** November 8, 2025  
**Branch:** `MMS`  
**Status:** ✅ Research Complete - Ready for Implementation

---

## 🎯 **Quick Summary**

**✅ SMS Broadcast supports MMS!** We can implement MMS without changing providers.

- **Confirmed:** Inbound MMS webhook exists (checkbox visible in SMS Broadcast UI)
- **Time:** 2-3 days implementation
- **Cost:** Unknown (need to verify pricing)
- **Complexity:** Medium (similar to SMS notification widget)
- **Storage:** Reuse existing S3 infrastructure

---

## ✅ **What We Know**

### **Inbound MMS (Receiving Images from Patients)**
- ✅ SMS Broadcast webhook UI shows **"SMS → Receive an MMS"** checkbox
- ✅ Follows same pattern as existing SMS webhook
- ✅ Will receive webhook with media URL when patient sends image
- ⏳ Need to confirm: exact webhook parameter names

### **Outbound MMS (Sending Images to Patients)**
- ⏳ Need to verify: API endpoint and parameters
- Expected: `https://api.smsbroadcast.com.au/api-adv.php` with `media_url` parameter
- ⏳ Need to confirm: supported image formats and size limits

### **Storage**
- ✅ Can reuse existing S3 bucket (already configured for documents)
- ✅ Same infrastructure, same credentials
- Strategy:
  - Inbound: Download from SMS Broadcast → Upload to S3 (permanent)
  - Outbound: Upload to S3 → Send S3 URL to SMS Broadcast

---

## 🆚 **Provider Decision: SMS Broadcast vs Twilio**

### **SMS Broadcast (Recommended ✅)**
- Already integrated and working
- MMS support confirmed
- Australian company (local support)
- No migration needed
- Unknown MMS pricing (needs verification)

### **Twilio (Alternative)**
- Well-documented MMS support
- $0.20 AUD per MMS (~$100/month for 500 MMS)
- Requires 3-5 days migration
- Overkill when SMS Broadcast already works

**Decision:** ✅ Proceed with SMS Broadcast

---

## 🛠️ **Technical Approach**

### **Architecture**

**Inbound (Patient → Staff):**
```
Patient sends MMS
  → SMS Broadcast webhook fires
  → Backend downloads image from their URL
  → Upload to our S3 (permanent storage)
  → Save to database (SMSInbound)
  → Frontend displays in SMS dialog
```

**Outbound (Staff → Patient):**
```
Staff attaches image
  → Frontend uploads to backend
  → Backend uploads to S3 (public read)
  → Backend calls SMS Broadcast API with S3 URL
  → SMS Broadcast fetches from S3 and sends MMS
  → Save to database (SMSMessage)
  → Frontend displays in SMS dialog
```

### **Storage Structure**

```
s3://your-bucket/
├─ documents/         # Existing (patient docs)
├─ mms/               # New (MMS media)
│  ├─ inbound/        # Images from patients
│  │  └─ {message_id}/{filename}
│  └─ outbound/       # Images to patients
│     └─ {message_id}/{filename}
```

### **Media Specifications**

- **Formats:** JPEG, PNG, GIF (images only)
- **Size Limit:** 600 KB (carrier-safe)
- **Validation:** Frontend checks type and size before upload
- **Dimensions:** Max 1024x1024 recommended

---

## 📋 **Implementation Plan**

### **Phase 1: Backend (1 day)**
1. Update database models:
   - `SMSMessage`: Add `has_media`, `media_url`, `media_type`
   - `SMSInbound`: Add `has_media`, `media_url`, `media_downloaded_url`, `download_status`
2. Create `mms_service.py`:
   - `upload_media_for_sending()` - Upload to S3 with public read
   - `download_inbound_media()` - Download from SMS Broadcast → S3
   - `validate_media()` - Check format and size
3. Update `services.py`:
   - `send_sms()` → Accept `media_url` parameter
   - Call SMS Broadcast MMS API when media_url provided
4. Update webhook (`webhook_views.py`):
   - Detect inbound MMS (check for `media_url` param)
   - Download media in background
5. Add API endpoints:
   - `POST /api/sms/upload-media/` - Upload image for MMS
   - Update `POST /api/sms/patient/{id}/send/` - Accept `media_url`

### **Phase 2: Frontend (1 day)**
1. Update `SMSDialog.tsx`:
   - Add image upload button (Mantine `FileButton`)
   - Show image preview before sending
   - Display images in message bubbles
   - Click to view full-size (Mantine `Modal`)
2. Update `SMSNotificationWidget.tsx`:
   - Show "📷 Image" indicator for MMS messages
3. Add validation:
   - Check file type (JPEG/PNG/GIF)
   - Check file size (<600KB)
   - Show error if invalid

### **Phase 3: Testing (0.5 day)**
1. Test inbound MMS:
   - Set up MMS webhook in SMS Broadcast
   - Send MMS from phone → app
   - Verify image downloads and displays
2. Test outbound MMS:
   - Attach image in SMS dialog
   - Send to phone
   - Verify image received correctly
3. Test edge cases:
   - Large files (should reject)
   - Wrong formats (should reject)
   - Multiple images (future enhancement)

---

## ⏳ **Still Need to Verify**

Before starting implementation:

1. **Outbound MMS API**
   - Exact endpoint and parameters
   - How to pass media URL
   - Response format

2. **MMS Pricing**
   - Cost per MMS (vs SMS: ~$0.08 AUD)
   - Acceptable budget?

3. **Media Specifications**
   - Maximum file size supported
   - Supported formats (confirm JPEG/PNG/GIF)
   - How long SMS Broadcast hosts media
   - Webhook parameter names for inbound MMS

4. **Testing**
   - Send test MMS via web dashboard
   - Receive test MMS (set up webhook first)

### **How to Verify:**

**Option A:** Check SMS Broadcast API Documentation
- Log into https://www.smsbroadcast.com.au/
- Look for MMS, multimedia, media sections

**Option B:** Contact Support
- Email: support@smsbroadcast.com.au
- Ask about: API, pricing, specs

**Option C:** Test via Dashboard
- Try sending MMS manually
- Check if MMS option exists

**Option D:** Set Up Webhook and Test
- Configure "Receive an MMS" webhook
- Send MMS from phone
- Inspect webhook payload

---

## 💰 **Cost Estimate**

### **Development Cost:**
- 2-3 days implementation
- Leverages existing code (SMS, S3, notifications)
- Medium complexity

### **Operating Cost:**
- **MMS per message:** Unknown (needs verification)
- **S3 storage:** ~$0.023 per GB/month
- **Expected volume:** 50-200 MMS/month?

**If SMS Broadcast MMS is ~$0.15 AUD per message:**
- 100 MMS/month = $15/month
- 500 MMS/month = $75/month

**Twilio (for comparison):**
- 100 MMS/month = $20/month
- 500 MMS/month = $100/month

---

## 🚀 **Next Steps**

### **Immediate Actions:**

1. **Verify SMS Broadcast MMS API** (30 minutes)
   - Check documentation or contact support
   - Confirm outbound API and pricing

2. **Test MMS Webhook** (30 minutes)
   - Configure "Receive an MMS" webhook
   - Send test MMS from phone
   - Inspect payload

3. **Make Go/No-Go Decision** (5 minutes)
   - If API confirmed → Start implementation
   - If pricing too high → Consider alternatives
   - If doesn't work → Implement link workaround or migrate to Twilio

### **If Go:**

1. **Create branch:** `feature/mms-support` (or continue on `MMS`)
2. **Start Phase 1:** Backend implementation
3. **Test incrementally:** After each phase
4. **Document as we go:** Update docs with findings

---

## 📚 **Documentation**

**Planning:**
- `docs/features/MMS_SUPPORT_PLAN.md` - Comprehensive implementation plan

**Related Docs:**
- `docs/integrations/SMS.md` - SMS integration (current state)
- `docs/features/SMS_NOTIFICATION_WIDGET_PLAN.md` - SMS notifications (recently completed)
- `QUICK_COMMANDS.md` - Development commands

---

## 🎯 **Success Criteria**

Implementation is successful when:

- ✅ Staff can attach images to SMS messages
- ✅ Images display in SMS conversation threads
- ✅ Patients can send images (inbound MMS)
- ✅ Images stored permanently in S3
- ✅ SMS notification widget shows MMS indicator
- ✅ Click image to view full-size
- ✅ File validation prevents invalid uploads
- ✅ No breaking changes to existing SMS functionality

---

## 🤔 **Questions to Answer**

1. **How often will MMS be used?**
   - Daily? Weekly? Rarely?
   - Helps determine if cost is acceptable

2. **What types of images?**
   - Appointment cards?
   - Device photos?
   - Prescriptions?
   - Determines storage and privacy requirements

3. **Budget for MMS?**
   - $50/month? $100/month?
   - Helps decide if SMS Broadcast pricing is acceptable

4. **Fallback plan?**
   - If SMS Broadcast MMS doesn't work or is too expensive
   - Options: Link workaround, Twilio migration

---

**Ready to proceed with verification and implementation!** 🚀

Once outbound API is confirmed, we can start coding immediately.

