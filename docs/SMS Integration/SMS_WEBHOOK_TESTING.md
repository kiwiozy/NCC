# SMS Webhook Testing - Next Steps

## ✅ Current Status

- **Webhook URL Configured**: `https://mails-unfortunately-bills-lang.trycloudflare.com/api/sms/webhook/inbound/?secret=D3dI45Gza572l-FbY2BvkbUTh7QHBzGUHPfdRGPv0-o`
- **Django Server**: Running with `ALLOWED_HOSTS` fixed
- **Cloudflare Tunnel**: Active and forwarding requests
- **Webhook Secret**: Configured in `.env`

## 🧪 Testing Steps

### 1. Test Webhook Manually
```bash
curl "https://mails-unfortunately-bills-lang.trycloudflare.com/api/sms/webhook/inbound/?from=61487000872&to=61488868772&message=Test&secret=D3dI45Gza572l-FbY2BvkbUTh7QHBzGUHPfdRGPv0-o"
```
Should return: `OK`

### 2. Send Real SMS and Reply
1. **Send SMS** from your app to your phone
2. **Reply** to that SMS from your phone
3. **Wait 5-10 seconds** for webhook to process
4. **Check Django console** - should see:
   ```
   [SMS Webhook] Inbound message - from=61487000872, to=61488868772, message=...
   ```
5. **Check your app**:
   - Go to SMS History
   - Click on the message row you sent
   - Reply should appear in the modal!

### 3. Verify in Database
```bash
curl http://localhost:8000/api/sms/inbound/
```
Should show your reply in the results.

## 🔍 Troubleshooting

### If Reply Doesn't Appear:

1. **Check Cloudflared is Running**
   ```bash
   ps aux | grep cloudflared
   ```
   Should show: `cloudflared tunnel --url https://localhost:8000`

2. **Check Django Console**
   - Look for webhook logs: `[SMS Webhook] Inbound message...`
   - Check for errors: `[SMS Webhook] ✗ Unauthorized...`

3. **Check SMS Broadcast Dashboard**
   - Verify webhook URL is correct
   - Check if webhook shows as "active"
   - Look for webhook delivery logs

4. **Test Webhook Directly**
   ```bash
   curl "https://mails-unfortunately-bills-lang.trycloudflare.com/api/sms/webhook/inbound/?from=61487000872&to=61488868772&message=Test&secret=D3dI45Gza572l-FbY2BvkbUTh7QHBzGUHPfdRGPv0-o"
   ```

## ⚠️ Important Notes

- **Keep Cloudflared Running**: If you close the terminal, webhook stops working
- **Keep Django Running**: Server must be running to receive webhooks
- **URL Changes**: Cloudflare Tunnel URL changes each time you restart it
  - For production: Use your actual domain instead

## 🚀 Production Setup

When ready for production:
1. Deploy to your server (e.g., `https://nexus-core-clinic.com`)
2. Update webhook URL in SMS Broadcast to:
   ```
   https://your-domain.com/api/sms/webhook/inbound/?secret=D3dI45Gza572l-FbY2BvkbUTh7QHBzGUHPfdRGPv0-o
   ```
3. Remove `ALLOWED_HOSTS = ['*']` and use specific domain:
   ```python
   ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']
   ```

## ✅ Success Criteria

- ✅ Send SMS from app
- ✅ Reply from phone
- ✅ Reply appears in Django console within 10 seconds
- ✅ Reply shows in app when clicking message row
- ✅ Reply count badge appears on message row

