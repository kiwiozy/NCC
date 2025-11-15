# Prosthetics & Orthotics AT Report Mapping Guide

**Source:** Scott Laird NDIS P&O AT Assessment (Scott.pdf)  
**Target:** General AT Report Structure (ATReport.tsx)  
**Date:** October 31, 2025

---

## Executive Summary

This document maps the specialized **Prosthetics and Orthotics (P&O) AT Assessment Template** (as seen in Scott.pdf) to the current general AT report structure. The P&O template has a different structure focused on device specification, fabrication, and ongoing maintenance.

### Key Differences:
1. **P&O templates have 6 Parts** vs General AT templates with 5 Parts
2. **Part 6 is unique to P&O** - focuses on device specification, fabrication labor, and maintenance
3. **More technical/clinical focus** on measurements, device features, and professional certifications
4. **Quote attachment requirements** are more detailed for custom-made devices

---

## Part-by-Part Mapping

### PART 1 - Details ✅ (Already Implemented)

| PDF Field | Current Implementation | Status | Notes |
|-----------|----------------------|--------|-------|
| **PARTICIPANT DETAILS** | | | |
| Name | `participant.name` | ✅ Exists | |
| DOB | `participant.dateOfBirth` | ✅ Exists | Format: DD/MM/YYYY in PDF, stored as YYYY-MM-DD |
| Address | `participant.address` | ✅ Exists | |
| Phone | `participant.contactTelephone` | ✅ Exists | |
| NDIS Number | `participant.ndisNumber` | ✅ Exists | |
| Alternative Contact/Guardian | `participant.nomineeName` + `nomineePhone` | ✅ Exists | PDF shows "Alternative Contact", we have "Nominee" |
| Participant's NDIS Contact info | `participant.coordinatorEmail` | ⚠️ Partial | Need separate field for coordinator/support contact |
| **ASSESSOR DETAILS** | | | |
| Name | `assessor.name` | ✅ Exists | |
| Qualifications | `assessor.qualifications` | ✅ Exists | e.g., "B.Ped & B.Pod, C.Ped CM Au" |
| Position | ❌ Missing | ⭐ **ADD** | e.g., "Pedorthist", "Prosthetist/Orthotist" |
| Email | `assessor.email` | ✅ Exists | |
| Phone | `assessor.telephone` | ✅ Exists | |
| Prescriber Number | `assessor.registrationNumber` | ✅ Exists | For P&O: "NDIS Provider Number" |
| Date of Initial Assessment | `assessor.assessmentDate` | ✅ Exists | |
| Date of Report | `assessor.reportDate` | ✅ Exists | |
| **COMPANY/PROVIDER** | | | |
| Company Name | ❌ Missing | ⭐ **ADD** | e.g., "Walk Easy Pedorthics" - Important for P&O assessors |

---

### PART 2 - Participant's Goals and AT Assessment Request ✅ (Mostly Complete)

| PDF Section | Current Implementation | Status | Notes |
|-------------|----------------------|--------|-------|
| Participant's Goals section | `participantGoals` | ✅ Exists | Single textarea field |
| Background section | `background` | ✅ Exists | Covers living arrangements, informal supports, safety considerations |

**P&O Example from PDF:**
> "Scott has significantly reduced mobility... Without the aid of his specialised footwear & custom orthoses Scott cannot weight-bear independently... want Scott to be able to continue to walk short distances, continue social interaction... undertake his favourite activity of indoor lawn bowls..."

---

### PART 3 - Evaluation / Assessment ⚠️ (Needs P&O-Specific Fields)

| PDF Section | Current Implementation | Status | Notes |
|-------------|----------------------|--------|-------|
| **A. Background** | | | |
| Living situation | `background` (general field) | ✅ Exists | Covered in Part 2 |
| Informal supports | `background` (general field) | ✅ Exists | |
| Daily routines | `background` (general field) | ✅ Exists | |
| **B. Functional Assessment Findings** | | | |
| Height | `height` | ✅ Exists | In cm |
| Weight | `weight` | ✅ Exists | In kg |
| Gait assessment | `functionalLimitations.physical` | ⚠️ Partial | P&O needs more detailed gait/mobility assessment |
| Foot/limb measurements | ❌ Missing | ⭐ **ADD P&O** | Specific to P&O: foot shape, ankle stability, muscle spasticity |
| Physical changes description | `functionalLimitations.physical` | ⚠️ Partial | P&O example: "rigid varus position bilaterally", "plantar flexed 1st metatarsal" |
| **C. Current AT in Use** | | | |
| Type of AT | `currentATList[].description` | ✅ Exists | Dynamic list |
| Usage | ❌ Missing | ⭐ **ADD** | "Daily" / "Weekly" / etc. |
| Participant's report of suitability | ❌ Missing | ⭐ **ADD** | Free text or rating |
| Does it need reassessment? | ❌ Missing | ⭐ **ADD** | Yes/No field |
| Unmet needs or alternatives | ❌ Missing | ⭐ **ADD** | Textarea |

**P&O-Specific Clinical Notes (from PDF):**
> "Due to Scott's disability he cannot weight-bear or mobilise without these devices... spasticity of Scott's muscles do not allow him to proceed through the normal gait cycle motions of heel strike, midstance and propulsion. The spasticity in his tricep surae (calf muscles) forces Scott to severely laterally weight-bear & toe walk..."

**Recommendation:** Add a dedicated P&O assessment section with fields for:
- Gait analysis
- Range of motion
- Muscle tone/spasticity
- Limb measurements
- Foot/ankle position
- Weight-bearing ability

---

### PART 4 - Exploration of Options ⚠️ (Structure Differs)

The PDF uses a table format that differs from the current general template:

| PDF Field | Current Implementation | Status | Notes |
|-----------|----------------------|--------|-------|
| **Options Table:** | | | |
| Circle preferred option | ❌ Missing | ⭐ **ADD** | Checkbox or radio to mark preferred |
| Describe features/functions | `alternativeOptions[].description` | ✅ Exists | |
| Trialled (T) or Considered (C)? | ❌ Missing | ⭐ **ADD** | Radio or select field |
| Trial details | `trialLocations[]` | ✅ Exists | Separate section in Part 3 |
| Why not suitable | `alternativeOptions[].reasonsNotSuitable` | ✅ Exists | |
| Estimated cost | `alternativeOptions[].estimatedCost` | ✅ Exists | |

**P&O Example from PDF:**
> "Custom made Boots to fit Scott's complex footwear requirements. [...] no other solution as functional goal of independent transfers and mobility can only be achieved by suitable foot wear."

---

### PART 5 - Recommended Option ⚠️ (Needs P&O Fields)

| PDF Section | Current Implementation | Status | Notes |
|-------------|----------------------|--------|-------|
| **A. Supports Required** | | | |
| Custom made boots/devices | `atItems[]` | ✅ Exists | List of AT items with costs |
| Non-AT supports | `supportChanges` | ⚠️ Partial | General field, not specific |
| Environmental modifications | `implementationPlan` (general) | ⚠️ Partial | Not explicitly separated |
| Do Assessor and Participant agree? | `participantAgreement` | ✅ Exists | Yes/No in Part 5&6 |
| Comments | `agreementIssues` | ✅ Exists | |
| **B. Evidence for Recommendation** | | | |
| Evidence explanation | `evidence` | ✅ Exists | Long textarea in Part 3 |
| Clinical justification | `evidence` + `bestPracticeEvidence` | ✅ Exists | |
| **C. Additional Factors** | | | |
| Factors needing resolution | ❌ Missing | ⭐ **ADD** | P&O example: "Scott requires 2 pair of boots a year... adding more reinforcing over the toe area" |
| **D. Above-Standard Features** | | | |
| Additional features/customization | ❌ Missing | ⭐ **ADD P&O** | Justification for above-minimum features |
| Clinical justification | ❌ Missing | ⭐ **ADD P&O** | Why custom/premium features are necessary |
| **E. Measuring Success** | | | |
| Expected outcomes | `implementationPlan` (partial) | ⚠️ Partial | Not explicitly separated |
| How to measure | ❌ Missing | ⭐ **ADD** | Measurement criteria |
| When to measure | `reviewFrequency` | ⚠️ Partial | General field exists |
| How funded | ❌ Missing | ⭐ **ADD** | "NDIS" / "Self-funded" / "Medicare" / etc. |

**P&O Example from PDF:**
> "Scott requires 2 pair of boots a year, this is due to Scott being a active young man who is on the go all the time. He just wares his boots out. In his next pair I will be adding more reinforcing over the toe area to try to stop some of the wear."

---

### PART 6 - Specification of Recommended P&O Solution/Device 🆕 (P&O SPECIFIC - MISSING)

⚠️ **This is entirely missing from the general AT template and is unique to P&O assessments.**

#### Section A: Capacity Building (Professional Services)

| PDF Field | Current Implementation | Status | Notes |
|-----------|----------------------|--------|-------|
| Clinical Assessment (hours) | ❌ Missing | 🆕 **P&O ONLY** | Time spent on initial assessment |
| Liaise with other health professionals | ❌ Missing | 🆕 **P&O ONLY** | Hours + detail |
| Device specification/measurement | ❌ Missing | 🆕 **P&O ONLY** | Casting, measuring, fitting |
| Fitting and adjustment | ❌ Missing | 🆕 **P&O ONLY** | Hours required |
| Client education | ❌ Missing | 🆕 **P&O ONLY** | Training time |
| Ongoing review schedule | `reviewFrequency` | ⚠️ Partial | P&O needs specific intervals (3-4 months for Scott) |

#### Section B: Capital (Labour Costs)

| PDF Field | Current Implementation | Status | Notes |
|-----------|----------------------|--------|-------|
| Fabrication/modification (hours) | ❌ Missing | 🆕 **P&O ONLY** | Lab time to build device |
| Fitting/s (hours) | ❌ Missing | 🆕 **P&O ONLY** | Number of fitting sessions |
| Administration (hours) | ❌ Missing | 🆕 **P&O ONLY** | Paperwork, NDIS liaison |

#### Section C: Extra Features (Non-NDIS Funded)

| PDF Field | Current Implementation | Status | Notes |
|-----------|----------------------|--------|-------|
| Extra features list | ❌ Missing | 🆕 **P&O ONLY** | Items participant pays for |
| Cost estimate | ❌ Missing | 🆕 **P&O ONLY** | Price for each extra |
| Participant agreement to pay | ❌ Missing | 🆕 **P&O ONLY** | Signed agreement |

#### Section D: Maintenance & Servicing

| PDF Field | Current Implementation | Status | Notes |
|-----------|----------------------|--------|-------|
| Supplier for ongoing maintenance | `maintenanceCoordinator` | ⚠️ Partial | General field exists |
| Maintenance info for participant | `maintenanceInfo` | ⚠️ Partial | Who does maintenance and when |
| Timeframe to provision | `provisionTimeframe` | ✅ Exists | "4 weeks" in Scott's case |
| Participant at risk while waiting? | `participantAtRisk` | ✅ Exists | Yes/No field |

**P&O Example from PDF:**
> "Scott will require modifications every 3 - 4 months i.e new soles due to Scott being a very active young man."

#### Section E: Declaration & Images

| PDF Field | Current Implementation | Status | Notes |
|-----------|----------------------|--------|-------|
| Provider suitability certification | `assessorDeclaration` | ✅ Exists | Boolean checkbox |
| Specification consistent with preferred option | ❌ Missing | ⭐ **ADD P&O** | Assessor confirms specs match recommendation |
| Signature of AT Assessor | `assessorSignature` | ✅ Exists | |
| Date | `declarationDate` | ✅ Exists | |
| **Images Section** | ❌ Missing | 🆕 **P&O CRITICAL** | Photos of: Dorsal view, Toe, AFO, Tongue, Boots, etc. |

**P&O Critical:** The PDF includes 6 labeled images:
1. Dorsal (top of foot)
2. Toe
3. AFO (Ankle-Foot Orthosis)
4. Tongue AFO
5. Boots
6. Tongue AFO (different angle)

---

## Quote Attachment Structure (Scott.pdf Example)

The P&O template requires a detailed quote attachment:

```
Walk Easy Pedorthics Australia Pty LTD
Quote Date: 1/8/2018
RE: Mr. Scott Laird, DOB: 16/8/1994, NDIS Quote 430372789

ITEM:
Custom made cast footwear including:
  - Rocker sole modifications
  - Custom moulded orthoses
  - Carbon Fibre AFO's built in
  - Made from plaster casting of both feet
COST: $5,850.00

ONGOING:
Repairs and modifications every 3-4 months
Cost per repair: $195.00

TOTAL: $6,045.00 (GST Ex)

NOTE: This quote includes casting, fabrication, fitting and check ups for 3 months.
Valid for 60 days. Payment terms: 7 days.
```

### Suggested Quote Structure Fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `quoteProvider` | String | Yes | Company name |
| `quoteDate` | Date | Yes | Issue date |
| `quoteReference` | String | No | Internal reference |
| `quoteValidUntil` | Date | Yes | Expiry date |
| `itemDescription` | Textarea | Yes | Detailed description of device |
| `itemCost` | Number | Yes | Base cost |
| `ongoingRepairsCost` | Number | Yes (P&O) | Cost per repair/modification |
| `ongoingRepairsFrequency` | String | Yes (P&O) | "Every 3-4 months" |
| `totalCost` | Number | Yes | Calculated total |
| `gstStatus` | Select | Yes | "GST Ex" / "GST Inc" |
| `includedInQuote` | Textarea | Yes | What's included (casting, fitting, follow-ups) |
| `paymentTerms` | String | Yes | "7 days" / "30 days" / etc. |
| `quoteAttachment` | File | Yes | PDF or image of quote |

---

## Recommendations for Implementation

### 🔴 Critical (Must Have for P&O):

1. **Add Part 6 - P&O Device Specification**
   - Professional services breakdown (assessment, liaison, fitting, education)
   - Fabrication labor costs (fabrication hours, fitting sessions)
   - Extra features (non-NDIS funded items)
   - Image upload section (minimum 4-6 images of device/limb)

2. **Enhanced Quote Management**
   - Structured quote fields (not just free text)
   - Ongoing maintenance costs
   - Repair frequency
   - GST status
   - Quote attachment upload

3. **Clinical Assessment Fields (Part 3)**
   - Gait analysis
   - Range of motion
   - Muscle tone/spasticity
   - Specific measurements (for P&O: foot shape, ankle stability)

### 🟡 Important (Should Have):

4. **Company/Provider Information** (Part 1)
   - Company name
   - ABN/ACN
   - NDIS registration number

5. **Current AT Enhancements** (Part 3)
   - Usage frequency
   - Suitability rating
   - Needs reassessment checkbox
   - Unmet needs field

6. **Measuring Success** (Part 5)
   - Separate fields for expected outcomes
   - How to measure outcomes
   - When to measure (specific dates/intervals)
   - Funding source

### 🟢 Nice to Have:

7. **Assessor Position/Role** (Part 1)
   - Add position field (Pedorthist, Prosthetist, OT, Physio, etc.)

8. **Options Comparison Table** (Part 4)
   - Mark preferred option clearly
   - Trial status (Trialled vs Considered)

9. **Above-Standard Features** (Part 5)
   - Separate section for premium/custom features
   - Clinical justification for each

---

## Data Model Changes Required

### New Types to Add:

```typescript
// Part 6 - P&O Specific
export interface POProfessionalService {
  id: string;
  activity: string;  // "Clinical Assessment", "Liaison", "Device specification", etc.
  hours: number;
  detail: string;
}

export interface POLabourCost {
  id: string;
  activity: string;  // "Fabrication/modification", "Fitting/s", "Administration"
  hours: number;
  detail: string;
}

export interface POExtraFeature {
  id: string;
  item: string;
  costEstimate: string;
  participantAgreesToPay: boolean;
}

export interface POImageAttachment {
  id: string;
  label: string;  // "Dorsal", "Toe", "AFO", etc.
  imageUrl: string;
  uploadDate: string;
}

export interface POQuoteDetails {
  provider: string;
  quoteDate: string;
  quoteReference?: string;
  validUntil: string;
  itemDescription: string;
  itemCost: number;
  ongoingRepairsCost?: number;
  ongoingRepairsFrequency?: string;
  totalCost: number;
  gstStatus: 'GST Ex' | 'GST Inc';
  includedInQuote: string;
  paymentTerms: string;
  quoteAttachment?: string;  // File URL
}

// Enhanced Current AT
export interface EnhancedCurrentAT extends CurrentAT {
  usage: string;  // "Daily", "Weekly", etc.
  suitability: string;  // Participant's report
  needsReassessment: boolean;
}
```

### Extended ATReportData:

```typescript
export interface POATReportData extends ATReportData {
  // Part 1 additions
  assessorPosition?: string;
  companyName?: string;
  companyABN?: string;
  
  // Part 3 additions
  currentATListEnhanced?: EnhancedCurrentAT[];
  unmetNeeds?: string;
  
  // Part 5 additions
  additionalFactorsNeeded?: string;
  aboveStandardFeatures?: string;
  aboveStandardJustification?: string;
  expectedOutcomes?: string;
  howToMeasure?: string;
  whenToMeasure?: string;
  fundingSource?: string;
  
  // Part 6 - P&O Specific
  professionalServices?: POProfessionalService[];
  labourCosts?: POLabourCost[];
  extraFeatures?: POExtraFeature[];
  specificationConsistent?: boolean;
  images?: POImageAttachment[];
  quoteDetails?: POQuoteDetails;
}
```

---

## AI Extraction Mapping

For the PDF import feature, update the extraction prompt to handle P&O-specific fields:

### Current AI Extraction Fields:
```json
{
  "participant_name": "",
  "ndis_number": "",
  "date_of_birth": "",
  "background": "",
  "participant_goals": "",
  "physical_limitations": "",
  "sensory_limitations": "",
  "communication_limitations": "",
  "cognitive_limitations": "",
  "behavioural_limitations": ""
}
```

### Enhanced P&O Extraction Fields:
```json
{
  // Part 1
  "participant_name": "",
  "ndis_number": "",
  "date_of_birth": "",
  "address": "",
  "phone": "",
  "guardian_name": "",
  "guardian_phone": "",
  "assessor_name": "",
  "assessor_qualifications": "",
  "assessor_position": "",
  "assessor_phone": "",
  "assessor_email": "",
  "assessor_registration_number": "",
  "company_name": "",
  "assessment_date": "",
  "report_date": "",
  
  // Part 2
  "background": "",
  "participant_goals": "",
  
  // Part 3
  "height": "",
  "weight": "",
  "gait_assessment": "",
  "physical_limitations": "",
  "current_at_description": "",
  "current_at_usage": "",
  "current_at_suitability": "",
  
  // Part 5
  "recommended_device": "",
  "device_cost": "",
  "clinical_justification": "",
  "additional_factors": "",
  "expected_outcomes": "",
  "review_frequency": "",
  "ongoing_repairs_cost": "",
  "ongoing_repairs_frequency": "",
  
  // Part 6
  "provision_timeframe": "",
  "quote_total": "",
  "quote_provider": ""
}
```

---

## UI/UX Recommendations

### 1. Report Type Selection
At the start of the AT Report, ask:
```
What type of AT assessment are you completing?
○ General AT Assessment
○ Prosthetics & Orthotics (P&O) Assessment
○ Complex Rehabilitation Technology
○ Home Modifications Assessment
```

This selection would:
- Show/hide relevant sections
- Enable P&O-specific fields in Part 6
- Adjust AI enhancement prompts accordingly

### 2. P&O-Specific Tabs (Part 6)
```
Part 6 - P&O Device Specification
├── Professional Services (Capacity Building)
├── Fabrication Costs (Capital)
├── Extra Features (Non-NDIS)
├── Quote Details
├── Maintenance & Servicing
└── Images & Documentation
```

### 3. Image Upload Section
Create a visual grid for P&O images:
```
┌─────────────┬─────────────┬─────────────┐
│   Dorsal    │     Toe     │     AFO     │
│ [Upload Img]│ [Upload Img]│ [Upload Img]│
└─────────────┴─────────────┴─────────────┘
┌─────────────┬─────────────┬─────────────┐
│   Lateral   │    Boots    │   Other 1   │
│ [Upload Img]│ [Upload Img]│ [Upload Img]│
└─────────────┴─────────────┴─────────────┘
```

---

## Example P&O Report Flow (Scott's Case)

### Part 1 - Details
- **Participant:** Scott Laird, 16/8/1994, NDIS #430372789
- **Assessor:** Jonathan Madden, B.Ped & B.Pod, C.Ped CM Au, Pedorthist
- **Company:** Walk Easy Pedorthics
- **Dates:** Assessment 2/7/2018, Report 31/7/2018

### Part 2 - Goals
- **Background:** Cockayne Syndrome, cannot weight-bear without boots, lives with parents who provide all care
- **Goals:** Continue walking short distances, social interaction, play indoor lawn bowls, maintain independence

### Part 3 - Assessment
- **Height:** 128cm, **Weight:** 40kg
- **Gait Assessment:** Spasticity in tricep surae, cannot proceed through normal gait cycle, severe lateral weight-bearing, toe walking, rigid varus position bilaterally
- **Current AT:** AFO Boots (daily usage), increased independence, boots are worn out

### Part 4 - Options
- **Preferred:** Custom made bivalve AFO boots + custom moulded orthotics
- **Alternative:** Regular footwear - NOT SUITABLE (cannot provide required support)

### Part 5 - Recommendation
- **Device:** Custom bivalve AFO boots with carbon fiber reinforcement + custom orthoses
- **Evidence:** Only solution for weight-bearing and independent mobility
- **Special Needs:** 2 pairs per year due to high activity level, reinforced toe area
- **Success Measures:** Review at 4 weeks, then every 3 months
- **Funding:** NDIS

### Part 6 - Specification
- **Professional Services:**
  - Clinical assessment: 2 hours
  - Device specification/measurement: 1 hour
  - Fitting and adjustment: 1.5 hours
  - Client education: 0.5 hours
  - Ongoing reviews: Every 3-4 months
  
- **Fabrication Costs:**
  - Fabrication time: included in quote
  - Fitting sessions: 2 sessions
  
- **Quote:**
  - Item: Custom made cast footwear with rocker soles, custom orthoses, carbon fiber AFOs
  - Cost: $5,850.00
  - Ongoing repairs: $195.00 every 3-4 months
  - Total: $6,045.00 (GST Ex)
  - Provider: Walk Easy Pedorthics
  
- **Maintenance:** Modifications every 3-4 months (new soles)
- **Provision:** 4 weeks from approval
- **Images:** 6 images attached (Dorsal, Toe, AFO, Tongue, Boots, etc.)

---

## Next Steps

### Phase 1: Core P&O Fields
1. Add company information fields (Part 1)
2. Enhance current AT section with usage/suitability (Part 3)
3. Add clinical assessment fields for P&O (Part 3)

### Phase 2: Quote Management
4. Create structured quote interface (Part 5)
5. Add ongoing maintenance cost tracking
6. Implement quote PDF attachment upload

### Phase 3: Part 6 Implementation
7. Build Part 6 component (POSpecification.tsx)
8. Professional services table
9. Fabrication costs table
10. Extra features section
11. Image upload grid

### Phase 4: Enhancements
12. Report type selector (General vs P&O vs other)
13. Conditional rendering based on report type
14. Enhanced AI extraction for P&O reports
15. PDF export with P&O-specific formatting

---

## References

- **Source PDF:** Scott Laird NDIS P&O Assessment (Scott.pdf)
- **NDIS Guidelines:** Assistive Technology Guidelines
- **Provider:** Walk Easy Pedorthics Australia
- **Current Implementation:** ATReport.tsx, ATReportPart2.tsx, ATReportPart3.tsx, types.ts

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Author:** AI Assistant + Craig  
**Status:** Ready for Implementation

