import * as admin from 'firebase-admin';

// Initialize Firebase Admin before importing functions
if (!admin.apps.length) {
  admin.initializeApp();
}

import * as userFunctions from './functions/users';
import * as groupFunctions from './functions/groups';
import * as centerFunctions from './functions/centers';
import * as assessmentFunctions from './functions/assessments';
import * as workgroupFunctions from './functions/workgroups';
import * as escalationFunctions from './functions/escalations';
import * as messageFunctions from './functions/messages';
import * as legalReleaseFunctions from './functions/legalReleases';

// User Management
export const registerUser = userFunctions.registerUser;
export const approveUserRole = userFunctions.approveUserRole;
export const updateUserProfile = userFunctions.updateUserProfile;
export const getUser = userFunctions.getUser;
export const listUsers = userFunctions.listUsers;

// Group Management
export const createGroup = groupFunctions.createGroup;
export const updateGroup = groupFunctions.updateGroup;
export const getGroup = groupFunctions.getGroup;
export const listGroups = groupFunctions.listGroups;
export const addUserToGroup = groupFunctions.addUserToGroup;

// Center Management
export const createCenter = centerFunctions.createCenter;
export const updateCenter = centerFunctions.updateCenter;
export const getCenter = centerFunctions.getCenter;
export const listCenters = centerFunctions.listCenters;

// Assessment Management
export const createAssessment = assessmentFunctions.createAssessment;
export const updateAssessment = assessmentFunctions.updateAssessment;
export const reassessment = assessmentFunctions.reassessment;
export const getAssessment = assessmentFunctions.getAssessment;
export const listAssessments = assessmentFunctions.listAssessments;

// Workgroup Management
export const createWorkgroup = workgroupFunctions.createWorkgroup;
export const updateWorkgroup = workgroupFunctions.updateWorkgroup;
export const updateWorkgroupStatus = workgroupFunctions.updateWorkgroupStatus;
export const addWorkerToWorkgroup = workgroupFunctions.addWorkerToWorkgroup;
export const getWorkgroup = workgroupFunctions.getWorkgroup;
export const listWorkgroups = workgroupFunctions.listWorkgroups;

// Escalation Management
export const createEscalation = escalationFunctions.createEscalation;
export const updateEscalationStatus = escalationFunctions.updateEscalationStatus;
export const resolveEscalation = escalationFunctions.resolveEscalation;
export const getEscalation = escalationFunctions.getEscalation;
export const listEscalations = escalationFunctions.listEscalations;

// Message Management
export const sendMessage = messageFunctions.sendMessage;
export const sendGroupMessage = messageFunctions.sendGroupMessage;
export const getMessages = messageFunctions.getMessages;

// Legal Release Management
export const createLegalRelease = legalReleaseFunctions.createLegalRelease;
export const signLegalRelease = legalReleaseFunctions.signLegalRelease;
export const getLegalRelease = legalReleaseFunctions.getLegalRelease;

// Trigger: Send welcome email when user is approved
// Note: Firestore triggers will be configured separately
// export const onUserRoleApproved = functions.firestore
//   .document('users/{userId}')
//   .onUpdate(async (change: any, context: any) => {
//     const before = change.before.data();
//     const after = change.after.data();
//
//     if (before && after && before.roleApprovalStatus === 'pending' && after.roleApprovalStatus === 'approved') {
//       console.log(`User ${context.params.userId} role approved. Sending notification...`);
//       // TODO: Implement email/SMS notification
//     }
//   });