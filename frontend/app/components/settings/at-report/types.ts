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
    name: '',
    dateOfBirth: '',
    ndisNumber: '',
    address: '',
    contactTelephone: '',
    email: '',
    preferredContact: '',
    nomineeName: '',
    nomineePhone: '',
    coordinatorName: '',
    coordinatorPhone: '',
    coordinatorEmail: '',
  },
  assessor: {
    name: '',
    registrationNumber: '',
    telephone: '',
    email: '',
    qualifications: '',
    assessmentDate: '',
    reportDate: '',
  },
  planManagement: {
    agencyManaged: false,
    selfManaged: false,
    planManager: false,
    planManagerContact: '',
  },
  background: '',
  participantGoals: '',
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

