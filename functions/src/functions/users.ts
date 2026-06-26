import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { defineSecret } from 'firebase-functions/params';
import { User, ContactNote } from '../types';

const db = admin.firestore();

const gmailUser = defineSecret('GMAIL_USER');
const gmailPassword = defineSecret('GMAIL_APP_PASSWORD');

const APP_URL = 'https://faith-responders-prod.web.app';

// Options for onCall functions
const callOptions = { cors: true };

async function notifyAdminsOfNewRegistration(user: User): Promise<void> {
  const apiKey = gmailUser.value();
  const appPassword = gmailPassword.value();
  if (!apiKey || !appPassword) return;

  const adminsSnap = await db.collection('users')
    .where('roles', 'array-contains', 'administrator')
    .get();

  const adminEmails = adminsSnap.docs
    .map((d) => (d.data() as User).email)
    .filter(Boolean);

  if (adminEmails.length === 0) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: apiKey, pass: appPassword },
  });

  const roleList = user.requestedRoles?.join(', ') || 'none';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1565c0;">New Volunteer Registration</h2>
      <p>A new user has registered and is pending role approval.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; color: #666; width: 140px;">Name</td><td style="padding: 8px; font-weight: bold;">${user.firstName} ${user.lastName}</td></tr>
        <tr style="background: #f5f5f5;"><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;">${user.email}</td></tr>
        <tr><td style="padding: 8px; color: #666;">Phone</td><td style="padding: 8px;">${user.phoneNumber}</td></tr>
        ${user.organization ? `<tr style="background: #f5f5f5;"><td style="padding: 8px; color: #666;">Organization</td><td style="padding: 8px;">${user.organization}</td></tr>` : ''}
        <tr ${user.organization ? '' : 'style="background: #f5f5f5;"'}><td style="padding: 8px; color: #666;">Requested Roles</td><td style="padding: 8px;">${roleList}</td></tr>
      </table>
      <a href="${APP_URL}/admin/users" style="display: inline-block; padding: 10px 20px; background: #1565c0; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
        Review in Admin Dashboard
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"Faith Responders" <${apiKey}>`,
    to: adminEmails,
    subject: `New registration pending approval — ${user.firstName} ${user.lastName}`,
    html,
    text: `New volunteer registration\n\nName: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nPhone: ${user.phoneNumber}${user.organization ? `\nOrganization: ${user.organization}` : ''}\nRequested roles: ${roleList}\n\nReview at: ${APP_URL}/admin/users`,
  });
}

export const registerUser = onCall(
  { ...callOptions, secrets: [gmailUser, gmailPassword] },
  async (request: any) => {
    const { email, firstName, lastName, phoneNumber, address, organization, availability, eventIds, communicationPreference, requestedRoles, tshirtSize } = request.data;

    if (!email || !firstName || !lastName || !phoneNumber || !communicationPreference || !requestedRoles) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields: email, firstName, lastName, phoneNumber, communicationPreference, requestedRoles'
      );
    }

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;

    const user: User = {
      id: userId,
      firstName,
      lastName,
      email,
      phoneNumber,
      ...(address ? { address } : {}),
      ...(organization ? { organization } : {}),
      ...(availability?.length ? { availability } : {}),
      ...(eventIds?.length ? { eventIds } : {}),
      ...(tshirtSize ? { tshirtSize } : {}),
      communicationPreference,
      roles: [], // Initially empty until approved
      requestedRoles,
      roleApprovalStatus: 'pending',
      legalReleaseSigned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.collection('users').doc(userId).set(user);

    // Non-blocking — a mail failure must not break registration
    notifyAdminsOfNewRegistration(user).catch((err) =>
      console.error('Failed to send admin registration notification:', err)
    );

    return { success: true, userId, user };
  }
);

async function notifyUserOfApproval(user: User, approvedRoles: string[]): Promise<void> {
  const apiKey = gmailUser.value();
  const appPassword = gmailPassword.value();
  if (!apiKey || !appPassword || !user.email) return;

  const roleLabels: Record<string, string> = {
    assessor: 'Assessor',
    fieldCoordinator: 'Field Coordinator',
    baseCampHost: 'Basecamp Host',
    workGroupLead: 'Team Leader',
    volunteer: 'Volunteer',
    secChaplain: 'SEC/Chaplain',
    administrator: 'Administrator',
  };
  const roleList = approvedRoles.map((r) => roleLabels[r] || r).join(', ');

  // Fetch event and center logistics to include in the email
  let logisticsRows = '';
  let logisticsText = '';
  if (user.eventIds && user.eventIds.length > 0) {
    try {
      for (const eventId of user.eventIds.slice(0, 3)) {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) continue;
        const ev = eventDoc.data()!;
        let centerItems = '';
        let centerText = '';
        for (const centerId of (ev.centerIds || []).slice(0, 3)) {
          const cDoc = await db.collection('centers').doc(centerId).get();
          if (!cDoc.exists) continue;
          const c = cDoc.data()!;
          centerItems += `<li style="margin: 2px 0;">${c.name} — ${c.address}</li>`;
          centerText += `\n    • ${c.name} — ${c.address}`;
        }
        logisticsRows += `<tr><td style="padding: 8px; color: #666; vertical-align: top;">Event</td><td style="padding: 8px; font-weight: bold;">${ev.name}</td></tr>`;
        if (centerItems) {
          logisticsRows += `<tr style="background: #f5f5f5;"><td style="padding: 8px; color: #666; vertical-align: top;">Base Camp</td><td style="padding: 8px;"><ul style="margin: 0; padding-left: 18px;">${centerItems}</ul></td></tr>`;
        }
        logisticsText += `\nEvent: ${ev.name}${centerText ? `\nBase Camp:${centerText}` : ''}`;
      }
    } catch (err) {
      console.error('Error fetching logistics for approval email:', err);
    }
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1565c0;">You've Been Approved!</h2>
      <p>Dear ${user.firstName},</p>
      <p>Great news — your volunteer application with Faith Responders has been reviewed and approved. We're glad to have you on the team!</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; color: #666; width: 140px;">Name</td><td style="padding: 8px; font-weight: bold;">${user.firstName} ${user.lastName}</td></tr>
        <tr style="background: #f5f5f5;"><td style="padding: 8px; color: #666;">Approved As</td><td style="padding: 8px;">${roleList}</td></tr>
        ${logisticsRows}
      </table>
      <p>You can now log in to the Faith Responders platform to access your dashboard and connect with your team.</p>
      <a href="${APP_URL}" style="display: inline-block; padding: 10px 20px; background: #1565c0; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">
        Log In to Faith Responders
      </a>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">If you have any questions, please contact your event coordinator.</p>
      <p style="color: #666; font-size: 14px;">— The Faith Responders Team</p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: apiKey, pass: appPassword },
  });

  await transporter.sendMail({
    from: `"Faith Responders" <${apiKey}>`,
    to: user.email,
    subject: `You've been approved — Welcome to Faith Responders!`,
    html,
    text: `Dear ${user.firstName},\n\nYour volunteer application has been approved!\n\nApproved as: ${roleList}${logisticsText}\n\nLog in at: ${APP_URL}\n\nIf you have questions, contact your event coordinator.\n\n— The Faith Responders Team`,
  });
}

export const approveUserRole = onCall(
  { ...callOptions, secrets: [gmailUser, gmailPassword] },
  async (request: any) => {
    const { userId, approve, roles } = request.data;

    if (!userId || approve === undefined) {
      throw new HttpsError('invalid-argument', 'Missing required fields: userId, approve');
    }
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');

    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    const caller = callerDoc.data() as User;
    if (!caller || !caller.roles.includes('administrator')) {
      throw new HttpsError('permission-denied', 'Only administrators can approve roles');
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

    const user = userDoc.data() as User;

    if (approve) {
      if (!user.lastBackgroundCheck) {
        throw new HttpsError(
          'failed-precondition',
          'A background check must be recorded before approving this user'
        );
      }
      const approvedRoles = roles || user.requestedRoles || [];
      await userRef.update({
        roles: approvedRoles,
        roleApprovalStatus: 'approved',
        updatedAt: Date.now(),
      });
      notifyUserOfApproval(user, approvedRoles).catch((err) =>
        console.error('Failed to send approval email:', err)
      );
    } else {
      await userRef.update({
        roleApprovalStatus: 'rejected',
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  }
);

export const updateUserProfile = onCall(callOptions, async (request: any) => {
  const { userId, updates } = request.data;

  if (!userId || !updates) {
    throw new HttpsError('invalid-argument', 'Missing required fields: userId, updates');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Users can update their own profile, or admins can update any profile
  if (request.auth.uid !== userId) {
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    const caller = callerDoc.data() as User;

    if (!caller || !caller.roles.includes('administrator')) {
      throw new HttpsError('permission-denied', 'Permission denied');
    }
  }

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  // Prevent updating sensitive fields
  delete updates.roles;
  delete updates.roleApprovalStatus;
  delete updates.id;
  delete updates.createdAt;

  await userRef.update({
    ...updates,
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const getUser = onCall(callOptions, async (request: any) => {
  try {
    console.log('getUser called with request:', JSON.stringify({ auth: !!request.auth, data: request.data }));

    const { userId } = request.data;

    if (!userId) {
      console.error('Missing userId in request.data');
      throw new HttpsError('invalid-argument', 'Missing required field: userId');
    }

    if (!request.auth) {
      console.error('Missing auth in request');
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    console.log(`Fetching user document for userId: ${userId}`);
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.error(`User not found: ${userId}`);
      throw new HttpsError('not-found', 'User not found');
    }

    console.log('User found successfully');
    return { user: userDoc.data() };
  } catch (error) {
    console.error('Error in getUser:', error);
    throw error;
  }
});

export const getUserAuthInfo = onCall(callOptions, async (request: any) => {
  const { userId } = request.data;

  if (!userId) throw new HttpsError('invalid-argument', 'Missing required field: userId');
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User;
  if (!caller?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can view auth info');
  }

  const authUser = await admin.auth().getUser(userId);
  return {
    creationTime: authUser.metadata.creationTime,
    lastSignInTime: authUser.metadata.lastSignInTime,
    providers: authUser.providerData.map((p) => p.providerId),
  };
});

export const updateUserRoles = onCall(callOptions, async (request: any) => {
  const { userId, roles } = request.data;

  if (!userId || !Array.isArray(roles)) {
    throw new HttpsError('invalid-argument', 'Missing required fields: userId, roles');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User;
  if (!caller?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can update roles');
  }

  const userRef = db.collection('users').doc(userId);
  if (!(await userRef.get()).exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  await userRef.update({ roles, updatedAt: Date.now() });
  return { success: true };
});

export const listUsers = onCall(callOptions, async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { role, eventId, centerId, limit = 100 } = request.data || {};

  let query: admin.firestore.Query = db.collection('users');

  if (role) {
    query = query.where('roles', 'array-contains', role);
  }

  if (eventId) {
    query = query.where('eventIds', 'array-contains', eventId);
  }

  if (centerId) {
    query = query.where('centerIds', 'array-contains', centerId);
  }

  const snapshot = await query.limit(limit).get();
  const users = snapshot.docs.map((doc) => doc.data());

  return { users };
});

export const deleteUser = onCall(callOptions, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User | undefined;
  if (!caller?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can delete users');
  }

  const { userId } = request.data;
  if (!userId) throw new HttpsError('invalid-argument', 'Missing required field: userId');
  if (userId === request.auth.uid) throw new HttpsError('invalid-argument', 'Cannot delete your own account');

  await Promise.all([
    admin.auth().deleteUser(userId),
    db.collection('users').doc(userId).delete(),
  ]);

  return { success: true };
});

export const addContactNote = onCall(callOptions, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User | undefined;
  if (!caller?.roles.some((r) => ['administrator', 'fieldCoordinator'].includes(r))) {
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }

  const { userId, text } = request.data;
  if (!userId || !text?.trim()) {
    throw new HttpsError('invalid-argument', 'Missing required fields: userId, text');
  }

  const note: ContactNote = {
    text: text.trim(),
    authorId: request.auth.uid,
    authorName: `${caller.firstName} ${caller.lastName}`,
    createdAt: Date.now(),
  };

  await db.collection('users').doc(userId).update({
    contactNotes: admin.firestore.FieldValue.arrayUnion(note),
    updatedAt: Date.now(),
  });

  return { success: true };
});

export const impersonateUser = onCall(callOptions, async (request: any) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  const caller = callerDoc.data() as User | undefined;
  if (!caller?.roles.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Only administrators can impersonate');
  }

  const { targetUserId } = request.data;
  if (!targetUserId) throw new HttpsError('invalid-argument', 'targetUserId required');
  if (targetUserId === request.auth.uid) {
    throw new HttpsError('invalid-argument', 'Cannot impersonate yourself');
  }

  const targetDoc = await db.collection('users').doc(targetUserId).get();
  if (!targetDoc.exists) throw new HttpsError('not-found', 'Target user not found');

  const target = targetDoc.data() as User;
  if (target.roles?.includes('administrator')) {
    throw new HttpsError('permission-denied', 'Cannot impersonate another administrator');
  }

  // Custom token with claim flagging this as an impersonation session.
  const token = await admin.auth().createCustomToken(targetUserId, {
    impersonatedBy: request.auth.uid,
  });

  // Audit log — write-only from this function, never edited.
  await db.collection('impersonationAudit').add({
    adminId: request.auth.uid,
    adminName: `${caller.firstName} ${caller.lastName}`,
    targetUserId,
    targetName: `${target.firstName} ${target.lastName}`,
    createdAt: Date.now(),
  });

  return {
    token,
    target: {
      id: targetUserId,
      firstName: target.firstName,
      lastName: target.lastName,
      email: target.email,
    },
    admin: {
      id: request.auth.uid,
      firstName: caller.firstName,
      lastName: caller.lastName,
    },
  };
});

export const listOrganizations = onCall(callOptions, async (_request: any) => {
  const [userSnapshot, managedSnapshot] = await Promise.all([
    db.collection('users').where('organization', '!=', '').select('organization').limit(500).get(),
    db.collection('organizations').get(),
  ]);

  const orgs = new Set<string>();
  userSnapshot.docs.forEach((doc) => {
    const org = doc.data().organization;
    if (org) orgs.add(org);
  });
  managedSnapshot.docs.forEach((doc) => {
    const name = doc.data().name;
    if (name) orgs.add(name);
  });

  return { organizations: Array.from(orgs).sort() };
});