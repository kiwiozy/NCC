# Crazy Domains DNS Setup - Step-by-Step Guide

**Domain:** walkeasy.com.au  
**Subdomain:** nexus.walkeasy.com.au  
**Registrar:** Crazy Domains  
**Date:** November 9, 2025

---

## 🚨 **ACTION REQUIRED: Send This Email TODAY**

### **📧 Copy This Email and Send to Crazy Domains Now:**

**To:** support@crazydomains.com.au  
**Subject:** DNS Record Request for walkeasy.com.au - Add Subdomain

**Body (Copy everything below the line):**

---

Hi Crazy Domains Support Team,

I need to set up a new subdomain for my domain walkeasy.com.au.

New Subdomain: nexus.walkeasy.com.au

I'm setting up a new web application at nexus.walkeasy.com.au that will be hosted on Google Cloud. I will need to add DNS records for this subdomain in approximately 2 weeks.

Can you please confirm:
1. I can add DNS records for the subdomain "nexus" under walkeasy.com.au?
2. There are no additional fees for adding subdomain DNS records?
3. What information you'll need from me when I'm ready to add the records (in 2 weeks)?

I'll contact you again in approximately 2 weeks (around November 25th) with the exact DNS record values to add.

My account details:
- Domain: walkeasy.com.au
- Account email: [YOUR CRAZY DOMAINS ACCOUNT EMAIL]

Thank you for your help!

Regards,
Craig

---

### **After Sending:**
1. ✅ Wait for Crazy Domains response (1-2 business days)
2. ✅ Forward their response to me
3. ✅ I'll confirm everything is good to proceed

---

## 📧 **Email to Send to Crazy Domains Support in Week 2 (Nov 18-24)**

**IMPORTANT:** We'll provide you with the exact values to fill in the [brackets] below.

**To:** support@crazydomains.com.au  
**Subject:** DNS Record Setup for nexus.walkeasy.com.au (Follow-up)

---

Hi Crazy Domains Support Team,

Following up on my previous email about setting up nexus.walkeasy.com.au.

I'm now ready to add the DNS records. Please add the following records to **walkeasy.com.au**:

---

**Record 1: Main Application**

- **Record Type:** A Record
- **Host/Name:** nexus
- **Points To/Value:** [WE WILL PROVIDE THIS - Example: 34.151.123.456]
- **TTL:** 300 (or your default if 300 is not available)

---

**Record 2: SSL Certificate Verification**

- **Record Type:** CNAME
- **Host/Name:** [WE WILL PROVIDE THIS - Example: _abc123.nexus]
- **Points To/Value:** [WE WILL PROVIDE THIS - Example: _xyz789.acm-validations.aws.]
- **TTL:** 300 (or your default)

---

**Summary:**
- These records will point nexus.walkeasy.com.au to my Google Cloud application
- The SSL verification record is needed for my HTTPS certificate

**Please confirm:**
1. When the records have been added
2. Approximately how long until DNS propagates

Thank you!

Regards,  
Craig

**Account Details:**
- Domain: walkeasy.com.au
- Account email: [your email]

---

## 📋 **What Crazy Domains Will Do:**

### **Step 1: They verify your request**
- Check you own the domain
- Confirm no conflicts with existing records

### **Step 2: They add the DNS records**
- Usually within 1-2 business days
- They'll add both records (A record + CNAME)

### **Step 3: DNS propagates**
- Takes 1-24 hours typically
- nexus.walkeasy.com.au will start working

### **Step 4: They confirm**
- They'll email you when done
- You can test using: https://www.whatsmydns.net/

---

## ⏱️ **Timeline:**

### **Week 1 (Nov 11-17): First Contact**

**TODAY - Send Email #1 to Crazy Domains:**
- Ask if subdomain DNS can be added
- Confirm no fees
- Give them a heads-up you'll need this in 2 weeks

**Expected Response:**
- "Yes, we can add subdomain DNS records"
- "No additional fees"
- "Contact us when ready with the values"

---

### **Week 2 (Nov 18-24): Provide DNS Values**

**We do:**
- [ ] Deploy Google Cloud Run
- [ ] Get load balancer IP address
- [ ] Request SSL certificate
- [ ] Get SSL verification record
- [ ] **Provide you with BOTH values** (I'll give you exactly what to put in Email #2)

**You do:**
- [ ] Copy Email #2 template (I'll fill in the brackets for you)
- [ ] Send to Crazy Domains support
- [ ] Forward me their confirmation email

---

### **Week 3 (Nov 25-Dec 1): DNS Goes Live**

**Crazy Domains does:**
- [ ] Add DNS records (1-2 business days)
- [ ] Email you confirmation

**We verify:**
- [ ] DNS propagation complete
- [ ] SSL certificate issued
- [ ] nexus.walkeasy.com.au accessible

---

## 🔍 **How to Check if DNS is Working**

After Crazy Domains confirms they've added the records:

### **Method 1: Online Tool (Easiest)**

1. Go to: https://www.whatsmydns.net/
2. Enter: nexus.walkeasy.com.au
3. Select: A
4. Click "Search"

**What to look for:**
- ✅ Green checkmarks around the world
- ✅ Shows the IP address we provided
- ⏸️ If some are grey, wait a few hours (still propagating)

---

### **Method 2: Windows Command**

1. Open Command Prompt
2. Type: `nslookup nexus.walkeasy.com.au`
3. Press Enter

**Expected result:**
```
Server:  dns.google
Address:  8.8.8.8

Name:    nexus.walkeasy.com.au
Address: 34.151.123.456  (the IP we provided)
```

---

### **Method 3: In Your Browser**

After DNS propagates and we deploy:

1. Go to: https://nexus.walkeasy.com.au
2. **Should show:** Your Nexus application (once deployed)
3. **If error:** DNS might still be propagating (wait a few hours)

---

## 💡 **Important Notes About Crazy Domains:**

### **They're Pretty Good For:**
- ✅ Australian company (support in AEST hours)
- ✅ No fees for basic DNS records
- ✅ Usually respond within 24 hours
- ✅ DNS changes propagate relatively fast

### **Things to Know:**
- ⏱️ DNS changes via support take 1-2 business days (not instant)
- 📧 Always use support tickets/email (they don't do phone DNS support)
- 📄 Keep all confirmation emails (we might need them)
- 🔄 Changes might take 24-48 hours total (their processing + propagation)

---

## 📞 **Crazy Domains Contact Details:**

**Email:** support@crazydomains.com.au  
**Phone:** 1300 542 542 (but they'll redirect DNS requests to email)  
**Support Portal:** https://www.crazydomains.com.au/support/  
**Hours:** Monday-Friday 8am-6pm AEST

**Best Method:** Email (support@crazydomains.com.au)

---

## ⚠️ **If Crazy Domains Says:**

### **"We need more information"**

**Reply with:**
> "I'm setting up a subdomain (nexus.walkeasy.com.au) that will point to my Google Cloud hosted application. I need to add an A record and a CNAME record for SSL certificate verification. The values are provided in my email above."

---

### **"This will cost extra"**

**Reply with:**
> "I was informed that basic DNS record management is included with my domain registration. I'm only adding standard A and CNAME records for a subdomain. Can you please confirm if there are any fees?"

**Note:** There shouldn't be fees - DNS is included with your domain.

---

### **"You need to use our control panel"**

**Reply with:**
> "I'm not familiar with DNS management and would prefer if your support team could add these records for me. If required, could you please provide step-by-step instructions for adding these records via the control panel?"

---

### **"We can't add subdomain records"**

**This is unlikely, but if they say this:**
> "Can you please clarify why subdomain DNS records cannot be added? This is a standard subdomain (nexus.walkeasy.com.au) which should be supported by all DNS providers. If there's a technical limitation, please escalate to your technical team."

**Then:** Let me know immediately, and we'll consider transferring to Route 53.

---

## ✅ **Checklist for You:**

### **This Week (Nov 11):**
- [ ] Send Email #1 to Crazy Domains (use template above)
- [ ] Wait for confirmation (1-2 business days)
- [ ] Forward me their response

### **Week 2 (Nov 18-24):**
- [ ] Wait for me to provide the DNS values
- [ ] I'll give you Email #2 with values filled in
- [ ] Send Email #2 to Crazy Domains
- [ ] Forward me their confirmation

### **Week 3 (Nov 25):**
- [ ] Wait for Crazy Domains to confirm records added
- [ ] Check DNS propagation (I'll help you)
- [ ] Forward me any confirmation emails

---

## 📧 **What to Forward to Me:**

**Please forward these emails to me:**

1. ✅ Crazy Domains' response to Email #1 (confirming they can add records)
2. ✅ Crazy Domains' confirmation after Email #2 (confirming records added)
3. ⚠️ Any questions or issues they raise

**Why:** So I can:
- Verify they've added the correct records
- Help troubleshoot if issues arise
- Know when to proceed with testing

---

## 🎯 **Summary: Your Action Items**

### **TODAY (Nov 9):**
1. Copy Email #1 template from above
2. Fill in your account email
3. Send to: support@crazydomains.com.au
4. Wait for response (1-2 days)

### **When Crazy Domains Responds:**
1. Forward their email to me
2. If they say "yes, we can do this" → Great! Wait for Week 2
3. If they say anything else → Let me know immediately

### **Week 2 (Nov 18-24):**
1. I'll send you Email #2 with values filled in
2. You copy/paste and send to Crazy Domains
3. Forward me their confirmation

### **Week 3 (Nov 25):**
1. Wait for Crazy Domains to confirm
2. I'll verify DNS working
3. Application goes live!

---

## 💬 **Quick Answers to Common Questions:**

**Q: How long will this take?**  
A: Email #1 → 1-2 days response. Email #2 → 1-2 days for them to add records, then 1-24 hours DNS propagation. Total: ~5-7 days from when we send Email #2.

**Q: What if I make a mistake?**  
A: Don't worry! I'll review everything before you send Email #2. Just forward me Crazy Domains' responses.

**Q: Do I need to understand DNS?**  
A: No! Just copy/paste the email templates. Crazy Domains will handle the technical parts.

**Q: Will this break my current website?**  
A: No! We're adding a NEW subdomain (nexus.walkeasy.com.au). Your main domain (walkeasy.com.au) and any existing subdomains won't be affected at all.

**Q: What if Crazy Domains asks me technical questions?**  
A: Forward their email to me and I'll give you the exact answer to send back.

---

## 📄 **Save This Guide:**

Keep this guide handy! You'll need:
- Email #1 template (send this week)
- Email #2 template (send in Week 2 - I'll fill in the values)
- Instructions for forwarding Crazy Domains' responses to me

---

## 🆘 **If You Need Help:**

**Just send me:**
1. 📧 Any emails from Crazy Domains
2. ❓ Any questions they ask
3. ⚠️ Any issues or concerns

**I'll respond with:**
1. ✅ Exactly what to reply
2. 🔧 How to fix any issues
3. 📋 Next steps

---

**Ready to send Email #1 to Crazy Domains?** Just copy the template from the top of this document!

**Document Created:** November 9, 2025  
**Registrar:** Crazy Domains  
**Status:** Ready to send first email

