# SMS Webhook Quick Configuration

## Your Webhook URLs (After Starting ngrok)

Once ngrok is running, you'll get a URL like: `https://abc123.ngrok-free.app`

Then use these exact URLs in SMS Broadcast:

### Delivery Receipt URL:
```
https://YOUR-NGROK-URL.ngrok-free.app/api/sms/webhook/dlr/
```

### Inbound Message URL:
```
https://YOUR-NGROK-URL.ngrok-free.app/api/sms/webhook/inbound/
```

## SMS Broadcast Dashboard Instructions

### Where to Find Webhook Settings:

1. **Log in:** https://www.smsbroadcast.com.au/
2. **Navigate to:** 
   - Settings → Webhooks
   - OR Settings → API Settings  
   - OR Settings → Callbacks
   - OR Settings → Notifications
   - OR Account → Webhooks

3. **Look for fields like:**
   - "Delivery Receipt URL"
   - "Inbound Message URL"  
   - "Callback URL"
   - "Webhook URL"
   - "DLR URL"

### What to Enter:

1. **Paste your ngrok URL** into the "Inbound Message" or "Callback" field
2. **Paste your ngrok URL + `/api/sms/webhook/inbound/`** for inbound messages
3. **Paste your ngrok URL + `/api/sms/webhook/dlr/`** for delivery receipts
4. **Click Save/Update**

## Testing Checklist

After configuring:

- [ ] ngrok is running and shows forwarding URL
- [ ] Webhook URLs saved in SMS Broadcast
- [ ] Send test SMS from app
- [ ] Reply to SMS from phone
- [ ] Check Django console for `[SMS Webhook]` logs
- [ ] Click message row in app - reply should appear!

## Troubleshooting

### Can't find webhook settings?
- Check SMS Broadcast help/docs
- Contact SMS Broadcast support
- Some accounts may need webhooks enabled first

### Webhook URL format
Must include:
- `https://` (not http)
- Full ngrok URL
- `/api/sms/webhook/inbound/` at the end
- No trailing spaces

### Test webhook manually
Visit in browser (replace with your ngrok URL):
```
https://your-url.ngrok-free.app/api/sms/webhook/inbound/?from=61487000872&to=61488868772&message=Test
```

Should return: `OK`

