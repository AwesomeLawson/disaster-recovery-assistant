import * as admin from 'firebase-admin';

// Initialize Firebase Admin before importing functions
if (!admin.apps.length) {
  admin.initializeApp();
}

import * as userFunctions from './functions/users';
import * as eventFunctions from './functions/events';
import * as centerFunctions from './functions/centers';
import * as workOrderFunctions from './functions/workOrders';
import * as workgroupFunctions from './functions/workgroups';
import * as escalationFunctions from './functions/escalations';
import * as messageFunctions from './functions/messages';
import * as legalReleaseFunctions from './functions/legalReleases';
import * as organizationFunctions from './functions/organizations';
import * as preApprovedUserFunctions from './functions/preApprovedUsers';
import * as homeownerReleaseFunctions from './functions/homeownerReleases';
import * as userEventDataFunctions from './functions/userEventData';

// User Management
export const registerUser = userFunctions.registerUser;
export const approveUserRole = userFunctions.approveUserRole;
export const getUserAuthInfo = userFunctions.getUserAuthInfo;
export const updateUserRoles = userFunctions.updateUserRoles;
export const updateUserProfile = userFunctions.updateUserProfile;
export const getUser = userFunctions.getUser;
export const listUsers = userFunctions.listUsers;
export const listOrganizations = userFunctions.listOrganizations;
export const addContactNote = userFunctions.addContactNote;
export const impersonateUser = userFunctions.impersonateUser;
export const deleteUser = userFunctions.deleteUser;

// Event Management
export const createEvent = eventFunctions.createEvent;
export const updateEvent = eventFunctions.updateEvent;
export const getEvent = eventFunctions.getEvent;
export const listEvents = eventFunctions.listEvents;
export const addUserToEvent = eventFunctions.addUserToEvent;
export const addCenterToEvent = eventFunctions.addCenterToEvent;
export const removeCenterFromEvent = eventFunctions.removeCenterFromEvent;

// Center Management
export const createCenter = centerFunctions.createCenter;
export const updateCenter = centerFunctions.updateCenter;
export const getCenter = centerFunctions.getCenter;
export const listCenters = centerFunctions.listCenters;

// Work Order Management
export const createWorkOrder = workOrderFunctions.createWorkOrder;
export const updateWorkOrder = workOrderFunctions.updateWorkOrder;
export const completeFieldAssessment = workOrderFunctions.completeFieldAssessment;
export const reassessment = workOrderFunctions.reassessment;
export const assignAssessor = workOrderFunctions.assignAssessor;
export const deleteWorkOrder = workOrderFunctions.deleteWorkOrder;
export const getWorkOrder = workOrderFunctions.getWorkOrder;
export const listWorkOrders = workOrderFunctions.listWorkOrders;

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
export const getReachableContacts = messageFunctions.getReachableContacts;
export const getOrCreateDirectThread = messageFunctions.getOrCreateDirectThread;
export const getOrCreateWorkgroupThread = messageFunctions.getOrCreateWorkgroupThread;
export const sendMessage = messageFunctions.sendMessage;

// Legal Release Management
export const createLegalRelease = legalReleaseFunctions.createLegalRelease;
export const signLegalRelease = legalReleaseFunctions.signLegalRelease;
export const getLegalRelease = legalReleaseFunctions.getLegalRelease;

// Organization Management
export const createOrganization = organizationFunctions.createOrganization;
export const deleteOrganization = organizationFunctions.deleteOrganization;
export const listManagedOrganizations = organizationFunctions.listManagedOrganizations;
export const mergeOrganizations = organizationFunctions.mergeOrganizations;

// Pre-Approved Users
export const lookupPreApprovedUser = preApprovedUserFunctions.lookupPreApprovedUser;
export const listPreApprovedUsers = preApprovedUserFunctions.listPreApprovedUsers;

// Homeowner Releases
export const createHomeownerRelease = homeownerReleaseFunctions.createHomeownerRelease;
export const getHomeownerRelease = homeownerReleaseFunctions.getHomeownerRelease;

// User Event Data (availability)
export const setUserEventAvailability = userEventDataFunctions.setUserEventAvailability;
export const listMyEventData = userEventDataFunctions.listMyEventData;
export const listUserEventData = userEventDataFunctions.listUserEventData;
export const listAllEventData = userEventDataFunctions.listAllEventData;
export const confirmUserEventDates = userEventDataFunctions.confirmUserEventDates;

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