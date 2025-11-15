# FileMaker Server Data API - ChatGPT Response & Solutions

**Date:** November 10, 2025  
**Source:** ChatGPT analysis of FileMaker Server Data API issues

---

## 🎯 **Key Findings**

### **Root Cause:**
FileMaker Server is **NOT intentionally disabling the API**. The 502 errors indicate that the **Web Publishing Engine (WPE) is crashing or becoming unresponsive** under load during heavy container field downloads.

---

## 1. Why This Happens

- ✅ **No hidden rate limit** - Only annual outbound data cap (144 GB)
- ❌ **WPE/Tomcat overwhelmed** - Heavy container downloads crash the Web Publishing Engine
- ⚠️ **nginx returns 502** - When backend crashes, nginx returns "502 Bad Gateway"
- 📊 **Admin Console misleading** - May show API as "disabled" but it's actually a backend crash

---

## 2. Verify Using Logs

**Check Admin Console → Logs for:**
- `fmdapi.log` - API-specific requests and errors
- `wpe.log` - Web Publishing Engine (Tomcat) activity
- `event.log` - Service restarts or crashes

**Look for messages like:**
- "FileMaker Data API Engine stopped"
- "Web Publishing Engine terminated abnormally"

---

## 3. Heartbeat Pings (Not Needed During Active Import)

**Key Insight:** Heartbeat won't prevent crashes - it only keeps sessions alive during **idle periods**. During active imports, requests already keep the connection alive.

**Optional Implementation (for idle periods only):**
```python
while True:
    requests.get(
        "https://yourserver/fmi/data/vLatest/databases",
        headers={"Authorization": f"Bearer {token}"}
    )
    time.sleep(300)  # Ping every 5 minutes
```

---

## 4. Best Practices for Bulk Downloads ⭐

### **Critical Changes Needed:**
1. ✅ **Low Concurrency:** 1-3 simultaneous downloads max
2. ✅ **Add Delays:** 0.2-0.5 sec delay between container downloads
3. ✅ **Sequential Processing:** Fetch record IDs first, then retrieve containers sequentially
4. ✅ **Off-Peak Hours:** Run imports during low-traffic times
5. ✅ **Monitor Resources:** WPE is single-threaded per request - watch CPU/memory
6. ✅ **Token Reuse:** Don't re-authenticate too often; reuse single token per import job

---

## 5. Token Management

**Best Practices:**
- ✅ **Persistent tokens are fine** - They reset expiry with every call
- ❌ **Don't login repeatedly** - Can cause "Too many sessions" errors
- ✅ **Log out only after import completes** - Not between batches
- 📊 **Each new token = one active session** on the server

---

## 6. Configuration Checks

**Verify:**
1. ✅ Latest FileMaker Server version (19.6.3+)
2. ✅ Connectors → FileMaker Data API is enabled
3. ⚠️ Check for resource exhaustion or proxy rate limits (nginx)
4. 📋 Review logs around 502 errors for restart/crash evidence
5. 📞 If hosted (fmcloud.fm), contact support with relevant logs

---

## 7. Error Handling Strategy

**When 502 occurs:**
- Pause and retry with **exponential backoff** (30s, 60s, 120s, etc.)
- Use a health check to verify when API becomes responsive again

**Example pseudocode:**
```python
if response.status_code == 502:
    wait = 30  # Start with 30 seconds
    for retry in range(5):
        time.sleep(wait)
        # Try again
        if success:
            break
        wait *= 2  # Double wait time (30, 60, 120, 240, 480)
```

---

## 8. If Problems Persist

**Collect and share with Claris Support:**
- `fmdapi.log`
- `wpe.log`
- `event.log`

**Mention:** Data API consistently crashes after 50-100 container downloads (~2-3 MB each)

---

## 9. TL;DR Summary

1. ✅ **Not rate-limited** - It's crashing under heavy load
2. ✅ **Limit concurrency** - Max 1-3 downloads at once
3. ✅ **Add delays** - 0.2-0.5 sec between downloads
4. ✅ **Run off-peak** - Low-traffic hours
5. ✅ **Monitor logs** - Watch for WPE crashes
6. ✅ **Exponential backoff** - Retry with increasing delays
7. ✅ **Upgrade server** - Latest FileMaker Server version

---

## 🛠️ **Implementation Plan**

### **Immediate Changes to Import Script:**
1. ✅ Add 0.5 second delay between container downloads
2. ✅ Implement exponential backoff for 502 errors
3. ✅ Reduce batch size from 50 to 10-20 images
4. ✅ Add health check before retrying after 502
5. ✅ Log more details about crashes/errors

### **Server Configuration:**
1. ⏳ Check FileMaker Server version
2. ⏳ Review server logs (`fmdapi.log`, `wpe.log`, `event.log`)
3. ⏳ Monitor CPU/memory during import
4. ⏳ Schedule imports during off-peak hours (e.g., overnight)

### **Testing Strategy:**
1. ⏳ Test with 10 images first (with delays)
2. ⏳ Monitor server resources during test
3. ⏳ Check logs for any warnings/errors
4. ⏳ Gradually increase to 20, 50, 100 images
5. ⏳ Full import once stable

---

**Next Step:** Implement the script improvements with delays and exponential backoff.

