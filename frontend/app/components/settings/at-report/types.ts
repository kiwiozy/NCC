// Shared TypeScript types for NDIS AT Report

export interface ParticipantDetails {
  name: string;
  dateOfBirth: string;
  ndisNumber: string;
  address: string;
  contactTelephone: string;
  email: string;
  preferredContact: string;
  nomineeName: string;
  nomineePhone: string;
  coordinatorName: string;
  coordinatorPhone: string;
  coordinatorEmail: string;
}

export interface AssessorDetails {
  name: string;
  registrationNumber: string;
  telephone: string;
  email: string;
  qualifications: string;
  assessmentDate: string;
  reportDate: string;
}

export interface PlanManagement {
  agencyManaged: boolean;
  selfManaged: boolean;
  planManager: boolean;
  planManagerContact: string;
}

export interface FunctionalLimitation {
  physical: string;
  sensory: string;
  communication: string;
  cognitive: string;
  behavioural: string;
  other: string;
}

export interface CurrentAT {
  id: string;
  description: string;
}

export interface ATItem {
  id: string;
  item: string;
  cost: string;
  replacing: 'Yes' | 'No' | '';
}

export interface TrialLocation {
  id: string;
  location: string;
  duration: string;
  details: string;
}

export interface ATFeature {
  id: string;
  feature: string;
  outcomes: string;
}

export interface AlternativeOption {
  id: string;
  option: string;
  description: string;
  reasonsNotSuitable: string;
  estimatedCost: string;
}

export interface Risk {
  id: string;
  risk: string;
  mitigation: string;
}

export interface ImplementationSupport {
  setup: string;
  training: string;
  review: string;
}

export interface ATReportData {
  // Part 1
  participant: ParticipantDetails;
  assessor: AssessorDetails;
  planManagement: PlanManagement;
  
  // Part 2
  background: string;
  participantGoals: string;
  functionalLimitations: FunctionalLimitation;
  height: string;
  weight: string;
  currentATList: CurrentAT[];
  
  // Part 3
  atItems: ATItem[];
  includesMainstream: 'yes' | 'no' | '';
  mainstreamEssential: string;
  mainstreamValueMoney: string;
  trialLocations: TrialLocation[];
  atFeatures: ATFeature[];
  previousExperience: string;
  alternativeOptions: AlternativeOption[];
  evidence: string;
  supportChanges: string;
  implementationPlan: string;
  bestPracticeEvidence: string;
  longTermBenefit: string;
  longTermImpact: string;
  risks: Risk[];
  lowerRiskOptions: string;
  risksWithoutAT: string;
  complianceStandards: string;
  behavioursOfConcern: string;
  restrictivePractice: string;
  careExpectations: string;
  otherFunding: string;
  
  // Part 4
  implementationSupport: ImplementationSupport;
  reviewFrequency: string;
  repairsCost: string;
  maintenanceInfo: string;
  maintenanceCoordinator: string;
  provisionTimeframe: string;
  participantAtRisk: 'yes' | 'no' | '';
  shortTermOption: 'yes' | 'no' | '';
  
  // Part 5 & 6
  participantAgreement: 'yes' | 'no' | '';
  agreementIssues: string;
  assessmentGiven: 'yes' | 'no' | '';
  assessmentNotGivenReason: string;
  assessorDeclaration: boolean;
  assessorName: string;
  assessorSignature: string;
  declarationDate: string;
  consentGiven: 'yes' | 'no' | '';
  consentSignature: string;
  consentDate: string;
  consentFullName: string;
  representativeName: string;
  representativeRelation: string;
}

// Helper function to create empty form data
export const createEmptyATReportData = (): ATReportData => ({
  participant: {
    name: 'Mr. Scott Laird',
    dateOfBirth: '1994-08-16',
    ndisNumber: '430372789',
    address: '8 Sherborne Street, North Tamworth, NSW, 2340',
    contactTelephone: '0431 478 238',
    email: '',
    preferredContact: 'Phone',
    nomineeName: 'Jackie Laird',
    nomineePhone: '0431 478 238',
    coordinatorName: '',
    coordinatorPhone: '',
    coordinatorEmail: 'jackie.laird@example.com',
  },
  assessor: {
    name: 'Jonathan Madden',
    registrationNumber: '4050009706',
    telephone: '6766 3153',
    email: 'office@walkeasy.com.au',
    qualifications: 'B.Ped & B.Pod, C.Ped CM Au',
    assessmentDate: '2018-07-02',
    reportDate: '2018-07-31',
  },
  planManagement: {
    agencyManaged: false,
    selfManaged: true,
    planManager: false,
    planManagerContact: '',
  },
  background: 'Scott lives with his Mum & Dad and in a privately rented home. Mum and Dad are the only form of informal support, they support Scott\'s with all personal care and activities of daily living. Scott requires to have someone with me at all time due to safety reasons.\n\nMonday to Friday.\n\nScott cannot weight-bear on his feet without boots on, so Mum has to supported Scott to transfer from bed to my wheel chair. For showering etc.\n\nScott has carers at a ratio of 1:1 due to safety reasons.',
  participantGoals: 'Scott has significantly reduced mobility which is part of his overall disability which occurs in Cockayne Syndrome. Without the aid of his specialised footwear & custom orthoses Scott cannot weight-bear independently & the alternative would be confined to a wheelchair. Scott\'s carer\'s (mother Jackie & father Craig) want Scott to be able to continue to walk short distances, continue social interaction at his day programmes & be able to undertake his favourite activity of indoor lawn bowls, regardless of this physical disability. With these devices Scott\'s parents (carers) know that Scott can have a sense of independence and improved mobility which is the current goal which will give Scott an improved quality of life, again regardless of his disability.',
  functionalLimitations: {
    physical: '',
    sensory: '',
    communication: '',
    cognitive: '',
    behavioural: '',
    other: '',
  },
  height: '',
  weight: '',
  currentATList: [],
  atItems: [],
  includesMainstream: '',
  mainstreamEssential: '',
  mainstreamValueMoney: '',
  trialLocations: [],
  atFeatures: [],
  previousExperience: '',
  alternativeOptions: [],
  evidence: '',
  supportChanges: '',
  implementationPlan: '',
  bestPracticeEvidence: '',
  longTermBenefit: '',
  longTermImpact: '',
  risks: [],
  lowerRiskOptions: '',
  risksWithoutAT: '',
  complianceStandards: '',
  behavioursOfConcern: '',
  restrictivePractice: '',
  careExpectations: '',
  otherFunding: '',
  implementationSupport: {
    setup: '',
    training: '',
    review: '',
  },
  reviewFrequency: '',
  repairsCost: '',
  maintenanceInfo: '',
  maintenanceCoordinator: '',
  provisionTimeframe: '',
  participantAtRisk: '',
  shortTermOption: '',
  participantAgreement: '',
  agreementIssues: '',
  assessmentGiven: '',
  assessmentNotGivenReason: '',
  assessorDeclaration: false,
  assessorName: '',
  assessorSignature: '',
  declarationDate: '',
  consentGiven: '',
  consentSignature: '',
  consentDate: '',
  consentFullName: '',
  representativeName: '',
  representativeRelation: '',
});

