# 🎯 Quick Testing Guide - Field Saving Fixes

**Run these tests to verify the fixes work correctly**

---

## ✅ Test 1: Patient Note Field (2 minutes)

### Steps:
1. Start backend and frontend:
   ```bash
   ./restart-dev.sh
   ```

2. Open browser: `https://localhost:3000`

3. Navigate to Patients page

4. Click any patient to open their detail view

5. Scroll to bottom - find "Note" textarea

6. Type: "This is a test note - [your name] - [timestamp]"

7. Click OUTSIDE the textarea (anywhere else on screen)

8. **Expected:** Green notification: "Note saved" ✅

9. Check browser console (F12) - look for:
   ```
   🔄 NOTE FIELD CHANGED
   📤 Sending PATCH request to backend...
   📥 Response status: 200 OK
   ✅ Save successful
   ```

10. Refresh the page (F5)

11. **Expected:** Your note is still there ✅

12. Navigate to another patient, then back to this one

13. **Expected:** Note is still preserved ✅

### If Test Fails:
- Check console for red error messages
- Verify backend is running: `curl https://localhost:8000/api/patients/`
- Check Django logs: `tail -f logs/django.log`

---

## ✅ Test 2: Appointment Xero Fields (3 minutes)

### Steps:
1. Test via Django Admin (easiest):
   - Go to: `https://localhost:8000/admin/`
   - Login
   - Go to Appointments
   - Click any appointment
   - **Expected:** See 3 new fields:
     - Invoice contact type
     - Billing company
     - Billing notes
   - Add some data, save
   - **Expected:** No errors ✅

2. Test via API (more thorough):
   ```bash
   # Get an appointment
   curl -k https://localhost:8000/api/appointments/ | jq '.[0]'
   
   # Should see these fields in response:
   # - invoice_contact_type
   # - billing_company
   # - billing_notes
   ```

3. Test update:
   ```bash
   # Update billing notes (replace {id} with actual appointment ID)
   curl -k -X PATCH https://localhost:8000/api/appointments/{id}/ \
     -H "Content-Type: application/json" \
     -d '{"billing_notes": "Test PO: ABC123"}' \
     | jq
   
   # Expected: 200 OK with updated data
   ```

### If Test Fails:
- Restart Django: `./restart-dev.sh`
- Check serializer file was saved: `cat backend/appointments/serializers.py | grep billing_notes`
- Check Django logs for errors

---

## ✅ Test 3: No Regression (1 minute)

Verify existing functionality still works:

### Quick Checks:
- [ ] Can still edit patient Title (dropdown at top)
- [ ] Can still edit Health Number (text input)
- [ ] Can still edit Clinic (dropdown)
- [ ] Can still edit Funding Source (dropdown)
- [ ] Can still add/edit Plan Dates (modal)
- [ ] Can still add Communication (phone/email/address)
- [ ] No console errors on any page

---

## 🐛 If Something Breaks

### Quick Fixes:

1. **"getCsrfToken is not defined"**
   - Check if `getCsrfToken` function exists in the file
   - Should be defined near top of `patients/page.tsx`

2. **"notifications is not defined"**
   - Check imports at top of file
   - Should have: `import { notifications } from '@mantine/notifications';`

3. **500 Error from Backend**
   - Check Django logs: `tail -f logs/django.log`
   - Common issue: field name mismatch
   - Remember: frontend uses `note` (singular), backend uses `notes` (plural)

4. **Nothing Happens When Blur**
   - Check browser console - should see logs starting with 🔄
   - If no logs: code may not have loaded, refresh hard (Cmd+Shift+R)
   - If logs show "No change detected": that's correct - type something different

### Rollback if Needed:
```bash
# Undo changes
git restore frontend/app/patients/page.tsx
git restore backend/appointments/serializers.py

# Restart
./restart-dev.sh
```

---

## ✅ Success Criteria

All these should be true:
- ✅ Patient notes save automatically
- ✅ Patient notes persist after refresh
- ✅ Green "Note saved" notification appears
- ✅ Xero fields appear in appointment API responses
- ✅ No console errors
- ✅ No Django errors in logs
- ✅ Existing functionality still works

---

**Need Help?**
- Check: `FIXES_APPLIED_NOV_20_2025.md` for detailed information
- Check: `docs/architecture/TROUBLESHOOTING.md` for common issues
- Check browser console (F12) for error messages
- Check Django logs: `tail -f logs/django.log`

