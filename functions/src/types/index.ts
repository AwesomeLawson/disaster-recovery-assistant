export type UserRole = 'administrator' | 'assessor' | 'workGroupLead' | 'worker' | 'thirdParty';

export type CommunicationPreference = 'email' | 'sms';

export type AssessmentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type EscalationType = 'assessor' | 'administrative' | 'thirdParty';

export type EscalationStatus = 'pending' | 'inProgress' | 'resolved' | 'rejected';

export type WorkgroupTaskStatus = 'notStarted' | 'inProgress' | 'partiallyCompleted' | 'completed' | 'needsEscalation';

export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  communicationPreference: CommunicationPreference;
  roles: UserRole[];
  requestedRoles?: UserRole[];
  roleApprovalStatus: 'pending' | 'approved' | 'rejected';
  groupIds?: string[];
  centerIds?: string[];
  legalReleaseId?: string;
  legalReleaseSigned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  eventType: string; // e.g., "storm", "flood", "conference"
  description?: string;
  userIds: string[];
  centerIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Center {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  groupId: string;
  leadUserIds: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Assessment {
  id: string;
  placeName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  assessorId: string;
  centerId: string;
  groupId: string;
  damages: string;
  needs: string;
  affectedPeople: number;
  severity: AssessmentSeverity;
  photoUrls: string[];
  legalReleaseUrl?: string;
  reassessmentCount: number;
  flaggedForReview: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Workgroup {
  id: string;
  name: string;
  centerId: string;
  groupId: string;
  leadUserId: string;
  workerUserIds: string[];
  assessmentId: string;
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
  assessmentId?: string;
  workgroupId: string;
  centerId: string;
  groupId: string;
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

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  recipientIds: string[];
  content: string;
  type: 'sms' | 'email' | 'inApp';
  groupId?: string;
  centerId?: string;
  workgroupId?: string;
  createdAt: number;
}

export interface LegalRelease {
  id: string;
  userId: string;
  releaseType: 'volunteer' | 'propertyAccess';
  documentUrl?: string;
  signatureImageUrl?: string;
  signedDigitally: boolean;
  signedAt?: number;
  assessmentId?: string;
  createdAt: number;
  updatedAt: number;
}