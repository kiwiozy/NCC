# ChatGPT Question: FileMaker Server Data API Keeps Disabling

**Date:** November 10, 2025  
**Context:** FileMaker Server keeps disabling/turning off the Data API during long-running import jobs

---

## 📋 Question for ChatGPT:

I'm using FileMaker Server's Data API to import images from a hosted database to AWS S3. The problem is that **FileMaker Server keeps automatically disabling/turning off the Data API** during my import, causing 502 Bad Gateway errors.

**Current Situation:**
- **FileMaker Server:** Self-hosted (walkeasy.fmcloud.fm - but it's FileMaker Server, not FileMaker Cloud)
- **Data API:** Enabled in Admin Console
- **Problem:** API works for 5-10 requests, then starts returning 502 Bad Gateway errors
- **Symptom:** The Data API appears to be getting automatically disabled/throttled by FileMaker Server
- **Need:** Keep the Data API active and responsive during a long-running import (6,664 images)

**What I've Observed:**
1. Data API starts working fine - authentication succeeds
2. After 50-100 container field downloads, server returns 502 Bad Gateway
3. Need to manually restart FileMaker Server or wait 1-2 hours for it to recover
4. The API appears to be getting automatically disabled, not just rate-limited
5. This is a self-hosted FileMaker Server (not FileMaker Cloud)

**My Current Implementation:**
```python
# I'm using persistent authentication tokens (reuse same token)
# Token lifetime: 15 minutes
# Auto-refresh before expiry
# Batch import: 50 images at a time with --limit parameter
```

**The Advice I Found:**
> "Tip for Continuous Data Pulling: Maintain a persistent authentication token where possible to avoid repeated logins. Add a heartbeat script (cron job) that pings the `/fmi/data/v1/databases` endpoint every few minutes to keep the API active."

**My Questions:**

1. **Why is FileMaker Server disabling the Data API?**
   - Is there a hidden rate limit (requests per minute/hour)?
   - Does FileMaker Server automatically disable the API when it detects "excessive" usage?
   - Are container field downloads (large files) treated differently than regular API calls?
   - Could this be a memory/resource issue on the server?

2. **How do I keep the Data API active during long imports?**
   - Should I implement a "heartbeat" ping to `/fmi/data/v1/databases` every few minutes?
   - How often should I ping (every 1 min? 5 min? 10 min?)?
   - Will this heartbeat prevent the API from being disabled?
   - Should the heartbeat use the same authentication token or create a separate one?

3. **Best practices for bulk container field downloads:**
   - What's the recommended delay between container field downloads?
   - Should I limit to X requests per minute?
   - Is there a "polite" rate that won't trigger FileMaker Server's auto-disable?
   - Should I download in smaller batches (10 images) with longer pauses?

4. **Token management:**
   - Is reusing the same token for hours problematic?
   - Should I logout and re-authenticate periodically?
   - Does FileMaker Server limit concurrent sessions?
   - Could multiple authentication attempts trigger the auto-disable?

5. **FileMaker Server Configuration:**
   - Are there Admin Console settings I need to change to prevent auto-disable?
   - Should I increase max connections or timeout values?
   - Are there server logs I can check to see why it's disabling?
   - Is this a known issue with FileMaker Server's Data API?

6. **Error handling:**
   - When I get a 502 error, should I immediately retry or wait?
   - How long should I wait before retrying (1 min? 5 min? 30 min?)?
   - Is there a way to detect if the API is disabled vs temporarily overloaded?

**My Goal:**
Import 6,664 images (average 2-3 MB each, ~20 GB total) from FileMaker Server to AWS S3 using the Data API **without the API getting disabled**.

**What I Need:**
1. Why is FileMaker Server disabling the API?
2. How to implement the "heartbeat script" to keep it active
3. Optimal request rate/delay to avoid triggering auto-disable
4. FileMaker Server configuration settings to check/change
5. Any other strategies to maintain API availability during bulk imports

---

## 📝 Copy-Paste Ready Version:

```
I'm using FileMaker Server's Data API to download 6,664 images to AWS S3, but FileMaker Server keeps automatically disabling/turning off the Data API after 50-100 downloads, returning 502 Bad Gateway errors.

Current Setup:
- FileMaker Server (self-hosted, not FileMaker Cloud)
- Domain: walkeasy.fmcloud.fm
- Data API enabled in Admin Console
- Using persistent auth tokens (15 min lifetime with auto-refresh)
- Batch imports: 50 images at a time

Problem:
- API works fine initially
- After 50-100 container field downloads → 502 errors
- Need to restart FileMaker Server or wait 1-2 hours to recover
- API appears to be getting auto-disabled, not just rate-limited

I found this advice:
"Maintain a persistent authentication token where possible. Add a heartbeat script (cron job) that pings the /fmi/data/v1/databases endpoint every few minutes to keep the API active."

Questions:
1. Why is FileMaker Server auto-disabling the Data API? Is there a hidden rate limit? Memory/resource issue?
2. How do I implement the "heartbeat script" to keep the API active? How often should I ping (every 1 min? 5 min?)?
3. What's the recommended delay between container field downloads to avoid triggering the auto-disable?
4. Should I limit to X requests per minute? What's a "polite" rate?
5. Are there FileMaker Server Admin Console settings I need to change (max connections, timeouts)?
6. Are there server logs I can check to see why it's disabling?
7. When I get a 502 error, how long should I wait before retrying?

Goal: Download 6,664 images (~20 GB) using the Data API without it getting disabled.

Please provide: (1) Why this happens, (2) Heartbeat implementation details, (3) Optimal request rate, (4) Server configuration settings, (5) Other strategies to maintain API availability.
```

---

## ✅ Next Steps After Getting ChatGPT Response:

1. Implement the "heartbeat script" to keep API active
2. Add recommended delays between downloads
3. Test with small batch (10-20 images) first
4. Monitor FileMaker Cloud admin panel during import
5. Adjust rate/delays based on what works
6. Run full import of all 6,664 images
7. Verify all images imported correctly

---

**Ready to copy and paste into ChatGPT!**

