const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'faith-responders-prod'
});

const db = admin.firestore();

async function createTestUser() {
  const userId = 'Cu60Vop5hRUbf0SRYNrBD6zk4HO2';

  const user = {
    id: userId,
    email: 'test@test.com',
    phoneNumber: '555-1234',
    communicationPreference: 'email',
    roles: ['administrator'], // Make test user an admin
    requestedRoles: ['administrator'],
    roleApprovalStatus: 'approved',
    legalReleaseSigned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.collection('users').doc(userId).set(user);
  console.log('✅ Test user created successfully!');
  console.log('User ID:', userId);
  console.log('Email: test@test.com');
  console.log('Roles: administrator');

  process.exit(0);
}

createTestUser().catch(error => {
  console.error('Error creating test user:', error);
  process.exit(1);
});
