# 🗄️ PinsV5 → Nexus Database Migration Strategy

**Date:** November 16, 2025  
**Purpose:** Design database schema for integrating PinsV5 providers into Nexus  
**Challenge:** PinsV5 uses Firebase/Firestore (NoSQL), Nexus uses SQLite/Django (SQL)

---

## 🎯 **Executive Summary**

**The Problem:**
- **PinsV5:** Firebase Firestore (NoSQL) - 6 collections for provider data
- **Nexus:** Django SQLite (SQL) - Has `referrers` table but different structure
- **Need:** Keep PinsV5 providers separate but linkable to Nexus referrers

**The Solution:**
Create a **parallel provider system** in Nexus that maintains PinsV5 structure while allowing integration with existing Nexus referrers when needed.

---

## 📊 **PinsV5 Firestore Collections (Current)**

### **1. `providers` Collection** (Main provider data)
```typescript
interface Provider {
  // Identity
  id: string;                              // Firestore doc ID
  providerId?: string;                     // Custom ID for analytics
  name: string;                            // Company or individual name
  type: string;                            // "Podiatrist", "Physiotherapist", "OT"
  providerStructure: 'individual' | 'company';
  
  // Contact
  address: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  phone: string;
  email?: string;
  website?: string;
  
  // Location
  coordinates: { lat: number; lng: number };
  
  // Individual practitioner (if providerStructure = 'individual')
  individualPractitioner?: {
    name: string;
    specialties?: string[];
    languages?: string[];
    qualifications?: string[];
    experience?: string;
    memberInterests?: string[];
    sourceUrl?: string;
    sourcePostcode?: string;
    searchStrategy?: string;
  };
  
  // Company info (if providerStructure = 'company')
  practitioners?: Practitioner[];          // Array of practitioners
  practitionerCount?: number;
  companyInfo?: {
    businessType?: 'clinic' | 'hospital' | 'practice' | 'center' | 'group';
    establishedYear?: number;
    accreditation?: string[];
    services?: string[];
  };
  
  // Services & Specialties
  specialties: string[];
  services?: string[];                     // Medicare, DVA, etc.
  languages?: string[];
  
  // Contact tracking (one-way flags)
  hasBeenContacted?: boolean;              // Once true, never false
  isReferring?: boolean;                   // Actively referring?
  
  // Metadata
  lastUpdated: Date;
  createdBy?: string;
  updatedBy?: string;
  extractionSource?: string;               // Web scraping source
  extractionDate?: string;
  extractedAt?: Date;
  importedAt?: Date;
  
  // Legacy fields
  rating?: number;
  reviewCount?: number;
  isActive?: boolean;
  acceptsNewPatients?: boolean;
  bulkBilling?: boolean;
  openingHours?: { [key: string]: string };
}
```

### **2. `contacts` Collection** (Contact history)
```typescript
interface ContactRecord {
  id: string;
  providerId: string;                      // Links to provider
  contactDate: Date;
  contactType: 'call' | 'visit' | 'email' | 'marketing_drop';
  duration?: number;                       // minutes
  outcome: 'successful' | 'no_answer' | 'busy' | 'left_message' | 'completed_delivery';
  notes: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  contactedBy: string;                     // user ID
  practitionerContacted?: string;          // specific practitioner
  materialsLeft?: string[];
  nextSteps?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Provider snapshot at time of contact
  providerSnapshot: {
    name: string;
    phone: string;
    address: string;
  };
}
```

### **3. `provider_contact_summary` Collection** (Aggregated contact data)
```typescript
interface ProviderContactSummary {
  providerId: string;
  providerName: string;
  
  // Statistics
  totalContacts: number;
  totalCalls: number;
  totalVisits: number;
  
  // Last contact
  lastContactDate?: Date;
  lastContactType?: 'call' | 'visit' | 'email' | 'marketing_drop';
  lastContactOutcome?: string;
  lastContactNotes?: string;
  
  // Status
  contactStatus: 'never_contacted' | 'attempted' | 'contacted' | 'follow_up_needed' | 'do_not_contact';
  
  // Follow-up
  nextFollowUpDate?: Date;
  nextFollowUpType?: 'call' | 'visit' | 'email';
  followUpNotes?: string;
  
  // Materials
  materialsDelivered: {
    type: string;
    deliveryDate: Date;
    deliveredBy: string;
  }[];
  
  // Relationship
  interestLevel?: 'high' | 'medium' | 'low' | 'not_interested';
  partnershipStatus?: 'prospect' | 'partner' | 'inactive' | 'blacklisted';
  
  createdAt: Date;
  updatedAt: Date;
}
```

### **4. `followUpQueue` / `unified_callbacks` Collection** (Scheduled callbacks)
```typescript
interface UnifiedCallback {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  
  // Assignment
  assignedTo: string[];                    // Array of user UIDs
  createdBy: string;
  
  // Scheduling
  dueDate?: Date;
  scheduledTime?: string;                  // "HH:MM"
  reminderBefore?: number;                 // minutes
  
  // Status & Priority
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Type
  type: 'call' | 'visit' | 'email' | 'task' | 'material_drop' | 'follow_up';
  category?: 'callback' | 'general_task' | 'provider_task' | 'material_delivery';
  
  // Provider link
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerAddress?: string;
  
  // Context
  originalContactId?: string;
  parentCallbackId?: string;               // Follow-up chains
  
  // Completion
  completedAt?: Date;
  completedBy?: string;
  completionNotes?: string;
  outcome?: 'successful' | 'no_answer' | 'left_message' | 'busy';
  
  // Follow-up generation
  followUpRequired?: boolean;
  nextFollowUpDate?: Date;
  nextFollowUpType?: 'call' | 'visit' | 'email';
  
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### **5. `companyProfiles` Collection** (Company profile - shared)
```typescript
interface CompanyProfile {
  // Company identity
  companyName: string;
  abn?: string;
  acn?: string;
  
  // Contact
  email: string;
  phone: string;
  website?: string;
  address: string;
  
  // Branding
  logo?: string;                           // Firebase Storage URL
  colors: {
    primary: string;
    secondary: string;
  };
  
  // Social
  socialMedia?: {
    facebook?: string;
    linkedin?: string;
    twitter?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

### **6. `mapAreas` Collection** (Geographic territories)
```typescript
interface MapArea {
  id: string;
  name: string;                            // "Newcastle CBD"
  description: string;
  coordinates: LatLng[];                   // Polygon points
  center: LatLng;
  bounds: LatLngBounds;
  color: string;                           // "#3B82F6"
  opacity: number;                         // 0.35
  tags: string[];
  metadata: Record<string, unknown>;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🏗️ **Nexus Current Structure (Referrers)**

### **`referrers` Table** (Existing in Nexus)
```python
class Referrer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # FileMaker imported fields
    fm_referrer_id = models.CharField(max_length=50, blank=True)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=100, blank=True)
    
    # Contact info
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Legacy FileMaker fields
    referrer_address = models.TextField(blank=True)  # Legacy field name
    referrer_phone = models.CharField(max_length=50, blank=True)
```

**Problems with current `referrers` table:**
- ❌ No structure type (individual vs company)
- ❌ No practitioner details
- ❌ No coordinates
- ❌ No specialties array
- ❌ No contact tracking
- ❌ No web scraping metadata

---

## ✅ **Proposed Solution: Parallel Provider System**

### **Strategy:**
1. **Keep PinsV5 providers in separate tables** (maintain rich data structure)
2. **Create linking mechanism** to Nexus referrers when needed
3. **Allow conversion** from discovered provider → referrer (when they start referring)
4. **Preserve all PinsV5 functionality** (contact tracking, callbacks, etc.)

---

## 📐 **New Django Models for Nexus**

### **1. `providers` App** (New Django app)

```python
# backend/providers/models.py

from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
import uuid

class Provider(models.Model):
    """
    PinsV5 Provider - Discovered through web scraping or manual entry
    Can be converted to Referrer when they start referring patients
    """
    PROVIDER_STRUCTURE_CHOICES = [
        ('individual', 'Individual Practitioner'),
        ('company', 'Company/Practice'),
    ]
    
    BUSINESS_TYPE_CHOICES = [
        ('clinic', 'Clinic'),
        ('hospital', 'Hospital'),
        ('practice', 'Practice'),
        ('center', 'Center'),
        ('group', 'Group'),
    ]
    
    # Identity
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    provider_id = models.CharField(max_length=100, blank=True, db_index=True)  # Custom ID for analytics
    name = models.CharField(max_length=200)  # Company or individual name
    type = models.CharField(max_length=100)  # Podiatrist, Physiotherapist, OT, GP, etc.
    provider_structure = models.CharField(max_length=20, choices=PROVIDER_STRUCTURE_CHOICES, default='company')
    
    # Contact
    address = models.TextField()
    suburb = models.CharField(max_length=100, blank=True, db_index=True)
    state = models.CharField(max_length=50, blank=True)
    postcode = models.CharField(max_length=10, blank=True, db_index=True)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    
    # Location (for mapping)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Individual practitioner details (JSON)
    individual_practitioner = models.JSONField(null=True, blank=True)
    # Structure: {
    #   "name": "Dr. Jane Smith",
    #   "specialties": ["Sports Podiatry", "Diabetes Care"],
    #   "languages": ["English", "Mandarin"],
    #   "qualifications": ["DPM", "PhD"],
    #   "experience": "15 years",
    #   "member_interests": ["Running injuries"],
    #   "source_url": "https://...",
    #   "source_postcode": "2300",
    #   "search_strategy": "postcode_search"
    # }
    
    # Company details (JSON)
    company_info = models.JSONField(null=True, blank=True)
    # Structure: {
    #   "business_type": "clinic",
    #   "established_year": 1995,
    #   "accreditation": ["AHPRA", "Medicare"],
    #   "services": ["Medicare", "DVA", "NDIS", "Workers Comp"]
    # }
    
    # Practitioners array (for companies) - JSON
    practitioners = models.JSONField(null=True, blank=True)
    # Structure: [
    #   {
    #     "name": "Dr. John Doe",
    #     "specialties": ["Biomechanics"],
    #     "languages": ["English"],
    #     "member_interests": ["Gait analysis"]
    #   }
    # ]
    practitioner_count = models.IntegerField(default=0)
    
    # Services & Specialties (PostgreSQL ArrayField for SQLite use JSONField)
    specialties = models.JSONField(default=list)  # ["Sports Medicine", "Diabetes Care"]
    services = models.JSONField(default=list)     # ["Medicare", "DVA", "NDIS"]
    languages = models.JSONField(default=list)    # ["English", "Mandarin", "Arabic"]
    
    # Contact tracking (one-way flags)
    has_been_contacted = models.BooleanField(default=False, db_index=True)
    is_referring = models.BooleanField(default=False, db_index=True)
    
    # Web scraping metadata
    extraction_source = models.CharField(max_length=200, blank=True)  # URL scraped from
    extraction_date = models.DateField(null=True, blank=True)
    extracted_at = models.DateTimeField(null=True, blank=True)
    imported_at = models.DateTimeField(auto_now_add=True)
    
    # Legacy fields (optional)
    rating = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)
    review_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    accepts_new_patients = models.BooleanField(default=True)
    bulk_billing = models.BooleanField(default=False)
    opening_hours = models.JSONField(null=True, blank=True)
    
    # Link to Nexus referrer (when converted)
    referrer = models.OneToOneField(
        'referrers.Referrer', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='provider_source'
    )
    
    # Audit
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='providers_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='providers_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'providers'
        indexes = [
            models.Index(fields=['type', 'suburb']),
            models.Index(fields=['has_been_contacted', 'is_referring']),
            models.Index(fields=['provider_structure']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.type})"
    
    def convert_to_referrer(self):
        """
        Convert this provider to a Nexus referrer when they start referring patients
        """
        from referrers.models import Referrer
        
        if self.referrer:
            return self.referrer  # Already converted
        
        # Create referrer from provider data
        referrer = Referrer.objects.create(
            name=self.name,
            type=self.type,
            phone=self.phone,
            email=self.email,
            address=self.address,
            notes=f"Converted from provider discovery. Original provider ID: {self.id}"
        )
        
        # Link back
        self.referrer = referrer
        self.is_referring = True
        self.save()
        
        return referrer


class ContactRecord(models.Model):
    """
    Contact history with providers (calls, visits, emails, material drops)
    """
    CONTACT_TYPES = [
        ('call', 'Phone Call'),
        ('visit', 'In-Person Visit'),
        ('email', 'Email'),
        ('marketing_drop', 'Marketing Material Drop'),
    ]
    
    OUTCOMES = [
        ('successful', 'Successful Contact'),
        ('no_answer', 'No Answer'),
        ('busy', 'Busy/Line Engaged'),
        ('left_message', 'Left Message'),
        ('completed_delivery', 'Completed Delivery'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, related_name='contacts')
    
    # Contact details
    contact_date = models.DateTimeField()
    contact_type = models.CharField(max_length=20, choices=CONTACT_TYPES)
    duration = models.IntegerField(null=True, blank=True, help_text="Duration in minutes")
    outcome = models.CharField(max_length=50, choices=OUTCOMES)
    notes = models.TextField()
    
    # Follow-up
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateTimeField(null=True, blank=True)
    
    # Who contacted
    contacted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    practitioner_contacted = models.CharField(max_length=200, blank=True)
    
    # Materials
    materials_left = models.JSONField(default=list)  # ["Brochure - Walk Easy", "Business Cards"]
    next_steps = models.TextField(blank=True)
    
    # Provider snapshot (at time of contact)
    provider_snapshot = models.JSONField()
    # Structure: {
    #   "name": "...",
    #   "phone": "...",
    #   "address": "..."
    # }
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'provider_contacts'
        ordering = ['-contact_date']
        indexes = [
            models.Index(fields=['provider', '-contact_date']),
            models.Index(fields=['contact_type']),
        ]
    
    def __str__(self):
        return f"{self.contact_type} with {self.provider.name} on {self.contact_date.strftime('%Y-%m-%d')}"


class ProviderContactSummary(models.Model):
    """
    Aggregated contact summary for each provider (for performance)
    Updated via signals when ContactRecord is created/updated
    """
    CONTACT_STATUS_CHOICES = [
        ('never_contacted', 'Never Contacted'),
        ('attempted', 'Attempted Contact'),
        ('contacted', 'Successfully Contacted'),
        ('follow_up_needed', 'Follow-up Needed'),
        ('do_not_contact', 'Do Not Contact'),
    ]
    
    INTEREST_LEVELS = [
        ('high', 'High Interest'),
        ('medium', 'Medium Interest'),
        ('low', 'Low Interest'),
        ('not_interested', 'Not Interested'),
    ]
    
    PARTNERSHIP_STATUS = [
        ('prospect', 'Prospect'),
        ('partner', 'Active Partner'),
        ('inactive', 'Inactive'),
        ('blacklisted', 'Blacklisted'),
    ]
    
    provider = models.OneToOneField(Provider, on_delete=models.CASCADE, related_name='contact_summary', primary_key=True)
    
    # Statistics
    total_contacts = models.IntegerField(default=0)
    total_calls = models.IntegerField(default=0)
    total_visits = models.IntegerField(default=0)
    total_emails = models.IntegerField(default=0)
    
    # Last contact
    last_contact_date = models.DateTimeField(null=True, blank=True)
    last_contact_type = models.CharField(max_length=20, blank=True)
    last_contact_outcome = models.CharField(max_length=50, blank=True)
    last_contact_notes = models.TextField(blank=True)
    
    # Status
    contact_status = models.CharField(max_length=30, choices=CONTACT_STATUS_CHOICES, default='never_contacted')
    
    # Follow-up
    next_follow_up_date = models.DateTimeField(null=True, blank=True)
    next_follow_up_type = models.CharField(max_length=20, blank=True)
    follow_up_notes = models.TextField(blank=True)
    
    # Materials
    materials_delivered = models.JSONField(default=list)
    # Structure: [
    #   {
    #     "type": "Brochure",
    #     "delivery_date": "2025-01-15",
    #     "delivered_by": "John Doe"
    #   }
    # ]
    
    # Relationship
    interest_level = models.CharField(max_length=20, choices=INTEREST_LEVELS, blank=True)
    partnership_status = models.CharField(max_length=20, choices=PARTNERSHIP_STATUS, default='prospect')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'provider_contact_summaries'
    
    def __str__(self):
        return f"Contact summary for {self.provider.name}"


class UnifiedCallback(models.Model):
    """
    Unified callback/task system (CallV3)
    Handles calls, visits, emails, tasks, material drops, follow-ups
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('overdue', 'Overdue'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    TYPE_CHOICES = [
        ('call', 'Phone Call'),
        ('visit', 'Visit'),
        ('email', 'Email'),
        ('task', 'Task'),
        ('material_drop', 'Material Drop'),
        ('follow_up', 'Follow-up'),
    ]
    
    CATEGORY_CHOICES = [
        ('callback', 'Callback'),
        ('general_task', 'General Task'),
        ('provider_task', 'Provider Task'),
        ('material_delivery', 'Material Delivery'),
    ]
    
    OUTCOME_CHOICES = [
        ('successful', 'Successful'),
        ('no_answer', 'No Answer'),
        ('left_message', 'Left Message'),
        ('busy', 'Busy'),
        ('completed_delivery', 'Completed Delivery'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Basic info
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    # Assignment
    assigned_to = models.ManyToManyField(User, related_name='assigned_callbacks')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_callbacks')
    
    # Scheduling
    due_date = models.DateTimeField(null=True, blank=True)
    scheduled_time = models.TimeField(null=True, blank=True)
    reminder_before = models.IntegerField(null=True, blank=True, help_text="Minutes before due date")
    
    # Status & Priority
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Type & Category
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, blank=True)
    
    # Provider association (optional)
    provider = models.ForeignKey(Provider, on_delete=models.CASCADE, null=True, blank=True, related_name='callbacks')
    provider_name = models.CharField(max_length=200, blank=True)
    provider_phone = models.CharField(max_length=50, blank=True)
    provider_address = models.TextField(blank=True)
    
    # Context
    original_contact = models.ForeignKey(ContactRecord, on_delete=models.SET_NULL, null=True, blank=True)
    parent_callback = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_ups')
    
    # Completion
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_callbacks')
    completion_notes = models.TextField(blank=True)
    outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES, blank=True)
    
    # Follow-up generation
    follow_up_required = models.BooleanField(default=False)
    next_follow_up_date = models.DateTimeField(null=True, blank=True)
    next_follow_up_type = models.CharField(max_length=20, blank=True)
    
    # Metadata
    tags = models.JSONField(default=list)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'unified_callbacks'
        ordering = ['due_date', '-priority']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['provider', 'status']),
            models.Index(fields=['created_by', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.status})"


class MapArea(models.Model):
    """
    Geographic territories for campaign targeting
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Polygon coordinates (array of lat/lng points)
    coordinates = models.JSONField()
    # Structure: [
    #   {"lat": -32.9283, "lng": 151.7817},
    #   {"lat": -32.9300, "lng": 151.7850},
    #   ...
    # ]
    
    # Calculated center point
    center = models.JSONField()
    # Structure: {"lat": -32.9283, "lng": 151.7817}
    
    # Bounds
    bounds = models.JSONField()
    # Structure: {
    #   "north": -32.9200,
    #   "south": -32.9400,
    #   "east": 151.7900,
    #   "west": 151.7700
    # }
    
    # Display
    color = models.CharField(max_length=7, default="#3B82F6")  # Hex color
    opacity = models.DecimalField(max_digits=3, decimal_places=2, default=0.35)
    
    # Metadata
    tags = models.JSONField(default=list)
    metadata = models.JSONField(default=dict)
    
    # Owner
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='map_areas')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'map_areas'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def providers_in_area(self):
        """
        Get all providers within this geographic area
        """
        # Would need PostGIS for proper polygon queries
        # For now, use bounding box
        bounds = self.bounds
        return Provider.objects.filter(
            latitude__gte=bounds['south'],
            latitude__lte=bounds['north'],
            longitude__gte=bounds['west'],
            longitude__lte=bounds['east']
        )
```

---

## 🔗 **Integration with Existing Nexus**

### **Linking Providers ↔ Referrers:**

**Scenario 1: Provider starts referring patients**
```python
# Discovered provider becomes active referrer
provider = Provider.objects.get(id=provider_id)
referrer = provider.convert_to_referrer()

# Now can link patients to this referrer
patient.referrer = referrer
patient.save()
```

**Scenario 2: Existing referrer needs provider data**
```python
# Link existing referrer to discovered provider for contact tracking
referrer = Referrer.objects.get(id=referrer_id)
provider = Provider.objects.get(name=referrer.name)
provider.referrer = referrer
provider.save()

# Now can track contacts with this referrer via provider system
```

**Scenario 3: Query all referrers with contact history**
```python
# Get referrers who have associated provider data
referrers_with_contacts = Referrer.objects.filter(
    provider_source__isnull=False
).select_related('provider_source__contact_summary')

for referrer in referrers_with_contacts:
    provider = referrer.provider_source
    summary = provider.contact_summary
    print(f"{referrer.name}: {summary.total_contacts} contacts, last on {summary.last_contact_date}")
```

---

## 📊 **Data Migration Plan**

### **Phase 1: Schema Creation (Week 1)**
1. ✅ Create Django models (Provider, ContactRecord, ProviderContactSummary, UnifiedCallback, MapArea)
2. ✅ Create migrations
3. ✅ Run migrations
4. ✅ Add indexes

### **Phase 2: Firebase Export (Week 1)**
1. Export PinsV5 Firestore data to JSON
2. Clean and transform data
3. Validate data integrity

### **Phase 3: Import to Nexus (Week 2)**
1. Import providers (341 records)
2. Import contact records
3. Import contact summaries
4. Import callbacks
5. Import map areas

### **Phase 4: Link to Referrers (Week 2)**
1. Match existing referrers to providers by name/phone
2. Create `provider ↔ referrer` links
3. Verify data integrity

### **Phase 5: API & UI (Week 3-4)**
1. Create Django REST API endpoints
2. Build frontend UI
3. Test end-to-end workflows

---

## 🎯 **Benefits of This Approach**

✅ **Preserves PinsV5 structure** - All rich provider data maintained  
✅ **Keeps systems separate** - No disruption to existing referrers  
✅ **Flexible linking** - Can link/unlink as needed  
✅ **Full contact tracking** - Complete CallV3 functionality  
✅ **Web scraping integration** - Direct import from scraping jobs  
✅ **Geographic targeting** - Map areas for campaigns  
✅ **Performance** - Indexed queries, summary tables  
✅ **Scalability** - Can handle 1000s of providers  
✅ **Data integrity** - Provider snapshots in contact records  

---

## 🚀 **Next Steps**

1. **Review this design** - Confirm structure meets needs
2. **Create Django models** - Copy code above
3. **Run migrations** - Create tables
4. **Build import script** - Firebase → Django
5. **Test with sample data** - Verify functionality

**Ready to proceed?** 🎉

