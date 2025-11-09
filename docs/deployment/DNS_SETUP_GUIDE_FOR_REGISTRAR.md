# DNS Setup Guide for Domain Registrar

**Domain:** walkeasy.com.au  
**Subdomain:** nexus.walkeasy.com.au  
**Date:** November 9, 2025  
**Deployment:** Hybrid AWS + Google Cloud

---

## 📋 **What You Need to Request from Your Domain Registrar**

### **Option 1: Transfer DNS Management to AWS Route 53 (RECOMMENDED)**

**Why this is best:**
- ✅ Full control over DNS
- ✅ Easier to manage with AWS/GCP setup
- ✅ Better integration with SSL certificates
- ✅ Free with AWS account
- ✅ Fast DNS updates (no waiting for registrar)

**What to ask your domain registrar:**

> "I need to update the nameservers for walkeasy.com.au to use AWS Route 53. Please change the nameservers to the following AWS Route 53 nameservers (I will provide these after creating the hosted zone in Route 53)."

**You'll provide them 4 nameservers like:**
```
ns-1234.awsdns-12.com
ns-5678.awsdns-34.net
ns-9012.awsdns-56.org
ns-3456.awsdns-78.co.uk
```

**Steps:**
1. Create Route 53 hosted zone (we'll do this)
2. Get the 4 nameservers from AWS
3. Send them to your registrar
4. Registrar updates nameservers (takes 24-48 hours to propagate)

---

### **Option 2: Keep DNS with Registrar (Simpler, Less Control)**

If you prefer to keep DNS management with your current registrar (e.g., GoDaddy, Crazy Domains, VentraIP, etc.), you can just ask them to add DNS records.

**What to ask your domain registrar:**

> "I need to add the following DNS records for nexus.walkeasy.com.au. Please add these to the DNS zone for walkeasy.com.au."

---

## 🔧 **DNS Records Needed (For Your Registrar)**

### **Step 1: Point nexus.walkeasy.com.au to Google Cloud Load Balancer**

**Record Type:** A Record (IPv4 address) or CNAME  
**Name/Host:** nexus  
**Value/Points to:** [You'll get this from Google Cloud after deploying]  
**TTL:** 300 (5 minutes) or Auto

**Example A Record:**
```
Type: A
Name: nexus
Value: 34.151.123.456  (example IP from Google Cloud Load Balancer)
TTL: 300
```

**OR CNAME Record (if GCP provides a hostname):**
```
Type: CNAME
Name: nexus
Value: ghs.googlehosted.com  (example, you'll get actual value from GCP)
TTL: 300
```

---

### **Step 2: SSL Certificate Verification (For Let's Encrypt or AWS ACM)**

When setting up SSL, you'll need to add a verification record.

**For AWS Certificate Manager (ACM):**
```
Type: CNAME
Name: _abc123def456.nexus  (AWS will give you this)
Value: _xyz789uvw012.acm-validations.aws.  (AWS will give you this)
TTL: 300
```

**For Let's Encrypt / Google-managed SSL:**
```
Type: TXT
Name: _acme-challenge.nexus
Value: [verification string provided by Let's Encrypt/GCP]
TTL: 300
```

---

### **Step 3: Optional - Add WWW Redirect**

If you want www.nexus.walkeasy.com.au to redirect to nexus.walkeasy.com.au:

```
Type: CNAME
Name: www.nexus
Value: nexus.walkeasy.com.au
TTL: 300
```

---

## 📝 **Complete DNS Record Summary**

Send this table to your domain registrar:

| Type | Name | Value | TTL | Purpose |
|------|------|-------|-----|---------|
| **A** or **CNAME** | nexus | [GCP Load Balancer IP or hostname] | 300 | Main application |
| **CNAME** | _[verification].nexus | [SSL verification value] | 300 | SSL certificate validation |
| **CNAME** (optional) | www.nexus | nexus.walkeasy.com.au | 300 | WWW redirect |

**Note:** The exact values in brackets [ ] will be provided after we set up Google Cloud.

---

## 🏢 **Common Australian Domain Registrars**

### **If using GoDaddy:**
1. Log in to GoDaddy account
2. Go to "My Products" → "Domains"
3. Click "DNS" next to walkeasy.com.au
4. Click "Add Record"
5. Add the records from the table above

### **If using Crazy Domains:**
1. Log in to Crazy Domains account
2. Go to "Domains" → "Manage"
3. Click "DNS Settings"
4. Add the records

### **If using VentraIP:**
1. Log in to VentraIP Control Panel
2. Go to "Domain Management"
3. Click "Manage DNS"
4. Add the records

### **If using Netregistry:**
1. Log in to Netregistry account
2. Go to "Domain Names"
3. Click "Manage" → "DNS Management"
4. Add the records

### **If using Melbourne IT:**
1. Log in to Melbourne IT account
2. Go to "My Services" → "Domains"
3. Click "Manage DNS"
4. Add the records

---

## 📧 **Email Template for Your Domain Registrar**

**Subject:** DNS Record Update Request for walkeasy.com.au

---

Hi [Registrar Support Team],

I need to add DNS records for a new subdomain on **walkeasy.com.au**.

**Subdomain:** nexus.walkeasy.com.au

**Please add the following DNS records:**

1. **Main Application Record:**
   - Type: A (or CNAME if you prefer)
   - Name: nexus
   - Value: [I will provide this after setting up hosting]
   - TTL: 300

2. **SSL Certificate Verification:**
   - Type: CNAME
   - Name: [I will provide this when requesting SSL certificate]
   - Value: [I will provide this when requesting SSL certificate]
   - TTL: 300

**Timeline:** I'll provide the exact IP address / hostname values within the next 1-2 weeks.

Can you please confirm:
1. ✅ These records can be added to walkeasy.com.au?
2. ✅ How long DNS propagation typically takes?
3. ✅ Can I make changes myself via your control panel, or do I need to contact support each time?

Thank you,
Craig

**Account Details:**
- Domain: walkeasy.com.au
- Account Email: [your email]

---

## ⏱️ **Timeline & Next Steps**

### **Week 1 (Nov 11-17): Prepare DNS**

**You (Business Owner):**
- [ ] Contact domain registrar
- [ ] Ask about DNS management options (control panel access vs support tickets)
- [ ] Confirm they can add A/CNAME records for nexus subdomain

**Us (Development):**
- [ ] Create Route 53 hosted zone (if Option 1 chosen)
- [ ] OR: Prepare DNS record values for registrar (if Option 2 chosen)

### **Week 2 (Nov 18-24): Set Up Infrastructure**

**Us (Development):**
- [ ] Deploy Google Cloud Run
- [ ] Get load balancer IP address or hostname
- [ ] Request SSL certificate
- [ ] Get SSL verification record

**You (Business Owner):**
- [ ] Provide load balancer IP/hostname to registrar
- [ ] Add SSL verification record via registrar

### **Week 3 (Nov 25-Dec 1): DNS Goes Live**

**Us (Development):**
- [ ] Verify DNS propagation (using dig/nslookup)
- [ ] Verify SSL certificate issued
- [ ] Test nexus.walkeasy.com.au → Google Cloud Run

### **Week 4 (Dec 2-8): Go Live**

**Cutover (Saturday Night):**
- [ ] DNS already pointing to production
- [ ] Just enable the application
- [ ] Users access nexus.walkeasy.com.au

---

## 🔍 **How to Check DNS After Setup**

### **Windows (Command Prompt):**
```cmd
nslookup nexus.walkeasy.com.au
```

**Expected result:**
```
Name:    nexus.walkeasy.com.au
Address: 34.151.123.456  (example IP)
```

### **Mac/Linux (Terminal):**
```bash
dig nexus.walkeasy.com.au
```

**Expected result:**
```
;; ANSWER SECTION:
nexus.walkeasy.com.au. 300 IN A 34.151.123.456
```

### **Online Tool:**
Visit: https://mxtoolbox.com/SuperTool.aspx  
Enter: nexus.walkeasy.com.au  
Check: Shows correct IP address

---

## ⚠️ **Common Issues & Solutions**

### **Issue 1: "Subdomain already exists"**

**Solution:** Ask registrar to update the existing record, not create a new one.

---

### **Issue 2: "DNS propagation taking too long"**

**Solution:** 
- Typical propagation: 1-24 hours
- If >48 hours: Contact registrar to verify changes were made
- Use https://www.whatsmydns.net/ to check propagation globally

---

### **Issue 3: "Can't add CNAME for root domain"**

**Solution:** 
- CNAME records can't be used for root (walkeasy.com.au)
- But nexus.walkeasy.com.au is a subdomain, so CNAME is fine
- If registrar insists on A record, we'll provide the IP address instead

---

### **Issue 4: "Need to upgrade DNS plan"**

**Solution:**
- Some registrars charge extra for advanced DNS features
- If cost is significant, recommend switching to Route 53 (free)
- Let me know registrar name, I can advise

---

## 💰 **Cost Considerations**

### **Option 1: Route 53 (AWS)**
- **Hosted Zone:** $0.50 USD/month (~$0.75 AUD)
- **Queries:** $0.40 per million queries (negligible for your traffic)
- **Total:** ~$1 AUD/month

### **Option 2: Registrar DNS**
- **Usually:** Included free with domain
- **Sometimes:** $5-20 AUD/year for "advanced DNS"
- **Check:** Ask your registrar if there are any DNS fees

---

## 🎯 **Recommended Approach for You**

**I recommend Option 2 (Keep DNS with registrar) initially because:**

1. ✅ **Simpler:** No need to transfer nameservers
2. ✅ **Faster:** Can add records immediately
3. ✅ **Familiar:** You already manage domain there
4. ✅ **No additional cost:** Usually included

**You can switch to Route 53 later if:**
- Your registrar makes DNS management difficult
- You want faster DNS updates
- You need advanced features (e.g., health checks, routing policies)

---

## 📋 **What You Need from Your Registrar (Summary)**

**Ask them:**

1. **Question 1:** "Can I add DNS records myself via your control panel, or do I need to submit support tickets?"

2. **Question 2:** "I need to add an A record or CNAME for the subdomain nexus.walkeasy.com.au. Are there any restrictions or additional costs?"

3. **Question 3:** "How long does DNS propagation typically take after I make changes?"

4. **If they ask:** "I'm setting up a new application at nexus.walkeasy.com.au that will be hosted on Google Cloud. I'll provide the exact IP address or hostname once my hosting is configured (within 1-2 weeks)."

---

## 📞 **When to Contact Them**

**Contact Now (This Week):**
- Find out if you can manage DNS yourself
- Verify no restrictions on subdomains
- Get access to DNS control panel (if available)

**Contact in Week 2 (Nov 18-24):**
- Provide the actual IP address or hostname
- Add the DNS records (or ask them to)

**Contact in Week 2-3 (If Issues):**
- If DNS not propagating
- If SSL verification failing
- If any errors occur

---

## 📚 **Additional Resources**

**Understanding DNS Records:**
- A Record: Points domain to IP address (e.g., 34.151.123.456)
- CNAME Record: Points domain to another domain (e.g., ghs.googlehosted.com)
- TXT Record: Used for verification (e.g., SSL, email)

**DNS Propagation Checker:**
- https://www.whatsmydns.net/

**DNS Lookup Tools:**
- https://mxtoolbox.com/SuperTool.aspx
- https://www.nslookup.io/

---

## ✅ **Checklist: What You Need**

**From Your Registrar:**
- [ ] Name of registrar (e.g., GoDaddy, Crazy Domains)
- [ ] Access to DNS control panel (login details)
- [ ] OR: Support contact method (email, phone, ticket system)
- [ ] Confirmation they can add subdomain DNS records

**From Us (We'll Provide):**
- [ ] Google Cloud Load Balancer IP address or hostname (Week 2)
- [ ] SSL certificate verification record (Week 2)
- [ ] Instructions for adding the records (Week 2)

---

## 📧 **Next Steps**

1. **This Week:** Contact your domain registrar using the email template above
2. **Let me know:** 
   - Who is your domain registrar?
   - Can you access DNS settings yourself, or need to contact support?
   - Are there any fees for DNS management?

3. **Week 2:** I'll provide you with:
   - The exact IP address or hostname to use
   - The SSL verification record
   - Step-by-step instructions for your specific registrar

---

**Questions? Let me know your registrar name and I can provide specific instructions!**

**Document Created:** November 9, 2025  
**Last Updated:** November 9, 2025  
**Status:** Ready for registrar contact

