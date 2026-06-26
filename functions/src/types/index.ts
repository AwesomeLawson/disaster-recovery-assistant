export type UserRole = 'administrator' | 'assessor' | 'workGroupLead' | 'volunteer' | 'fieldCoordinator' | 'baseCampHost' | 'secChaplain';

export type UserCapability =
  | 'trainer'
  | 'assessor'
  | 'basicDRT'
  | 'chainsaw'
  | 'spiritualEmotionalCare'
  | 'heavyEquipment'
  | 'construction'
  | 'adminBaseCampSupport';

export interface AvailabilityRange {
  start: number;
  end: number;
}

export type CommunicationPreference = 'email' | 'sms';

export type TshirtSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

export type TrainingKey = 'chainsaw' | 'basic' | 'assessment' | 'spiritualEmotional';

export interface ContactNote {
  text: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

export type AssessmentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type WorkOrderStatus = 'intake' | 'awaitingAssessment' | 'assessed' | 'assigned' | 'inProgress' | 'completed';

export type HomeType = 'mobile_modular' | 'stick_built' | 'block' | 'multi_family';
export type FEMAStatus = 'yes' | 'no' | 'na';

export type EscalationType = 'assessor' | 'administrative' | 'thirdParty';

export type EscalationStatus = 'pending' | 'inProgress' | 'resolved' | 'rejected';

export type WorkgroupTaskStatus = 'notStarted' | 'inProgress' | 'partiallyCompleted' | 'completed' | 'needsEscalation';

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address?: UserAddress;
  communicationPreference: CommunicationPreference;
  roles: UserRole[];
  requestedRoles?: UserRole[];
  roleApprovalStatus: 'pending' | 'approved' | 'rejected';
  capabilities?: UserCapability[];
  eventIds?: string[];
  baseCampIds?: string[];
  organization?: string;
  availability?: AvailabilityRange[];
  tshirtSize?: TshirtSize;
  trainings?: Partial<Record<TrainingKey, boolean>>;
  contacted?: boolean;
  contactNotes?: ContactNote[];
  legalReleaseId?: string;
  legalReleaseSigned: boolean;
  lastBackgroundCheck?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Event {
  id: string;
  name: string;
  eventType: string; // e.g., "storm", "flood", "tornado", "earthquake"
  description?: string;
  userIds: string[];
  baseCampIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface BaseCamp {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  eventIds: string[]; // Base camps can be associated with multiple events
  leadUserIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkOrder {
  id: string;
  status: WorkOrderStatus;

  // Intake fields (captured first — survivor contact + initial description)
  survivorName: string;
  survivorPhone: string;
  altContact?: string;
  altContactPhone?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  county?: string;
  tempAddress?: string;
  descriptionOfNeed: string;
  source?: string;
  intakeVolunteerName?: string;
  workOrderNumber?: string;

  baseCampId: string;
  eventId?: string;

  // On-site assessment fields (captured by assessor — optional until field assessment is completed)
  assessorId?: string;
  placeName?: string;
  damages?: string;
  needs?: string;
  affectedPeople?: number;
  severity?: AssessmentSeverity;

  // Occupancy & household
  currentlyOccupied?: boolean;
  numberOfOccupants?: number;
  householdUnder18?: number;
  household19to64?: number;
  household65plus?: number;

  // Property
  isPrimaryResidence?: boolean;
  isHabitable?: boolean;
  survivorOwnsProperty?: boolean;
  ownerName?: string;
  ownerPhone?: string;
  homeType?: HomeType;

  // Insurance & FEMA
  registeredForFEMA?: FEMAStatus;
  hasHOInsurance?: boolean;
  insuranceContacted?: boolean;

  accessConcerns?: string;
  photoUrls: string[];
  homeownerReleaseId?: string;
  reassessmentCount: number;
  flaggedForReview: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface HomeownerRelease {
  id: string;
  workOrderId: string;
  createdBy: string;
  homeownerName: string;
  phoneNumber: string;
  propertyAddress: string;
  propertyCityStateZip: string;
  coOwnerName?: string;
  coOwnerPhone?: string;
  frrRepName: string;
  frrPhone: string;
  homeownerSignatureUrl: string;
  coOwnerSignatureUrl?: string;
  frrWitnessSignatureUrl: string;
  signedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface Workgroup {
  id: string;
  name: string;
  baseCampId: string;
  eventId?: string; // Optional - which event this workgroup is for
  leadUserId: string;
  volunteerUserIds: string[];
  workOrderId: string;
  taskDescription: string;
  taskStatus: WorkgroupTaskStatus;
  progressNotes: string[];
  photoUrls: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Escalation {
  id: string;
  workOrderId?: string;
  workgroupId: string;
  baseCampId: string;
  eventId?: string;
  type: EscalationType;
  status: EscalationStatus;
  reason: string;
  createdBy: string;
  assignedTo?: string;
  resolution?: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

export interface UserEventData {
  id: string;
  userId: string;
  eventId: string;
  submittedAvailability: AvailabilityRange[];
  confirmedDates: AvailabilityRange[];
  confirmedBy?: string;
  confirmedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VolunteerHours {
  id: string;
  userId: string;
  userName: string;             // denormalized for fast list rendering
  eventId: string;
  date: number;                 // unix ms at midnight (local) of the day
  hours: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Thread {
  id: string;
  type: 'direct' | 'workgroup';
  participantIds: string[];
  participantNames: Record<string, string>;
  workgroupId?: string;
  title: string;
  lastMessageAt: number;
  lastMessagePreview: string;
  createdAt: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  participantIds: string[];
  createdAt: number;
}

export type TrainingCategory = 'chainsaw' | 'basic' | 'assessment' | 'spiritualEmotional' | 'other';

export interface Training {
  id: string;
  title: string;
  description?: string;
  category: TrainingCategory;
  fileUrl: string;             // download URL from Storage
  filePath: string;            // storage path for deletes
  fileSizeBytes: number;
  uploadedBy: string;          // user id
  uploadedByName: string;
  createdAt: number;
  updatedAt: number;
}

export interface LegalRelease {
  id: string;
  userId: string;
  releaseType: 'volunteer' | 'propertyAccess';
  documentUrl?: string;
  signatureImageUrl?: string;
  signedDigitally: boolean;
  signedAt?: number;
  workOrderId?: string;
  createdAt: number;
  updatedAt: number;
}