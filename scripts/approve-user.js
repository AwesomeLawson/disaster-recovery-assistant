const admin = require('firebase-admin');

// Initialize with emulator settings
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({
  projectId: 'demo-project'
});

const db = admin.firestore();

async function findAndApproveUsers() {
  console.log('Connecting to Firestore emulator at localhost:8080...\n');

  // Find all users with pending approval
  const pendingSnapshot = await db.collection('users')
    .where('roleApprovalStatus', '==', 'pending')
    .get();

  if (pendingSnapshot.empty) {
    console.log('No users with pending approval found.');

    // List all users for reference
    const allUsersSnapshot = await db.collection('users').get();
    if (allUsersSnapshot.empty) {
      console.log('No users exist in the database.');
    } else {
      console.log('\nAll users in database:');
      allUsersSnapshot.forEach(doc => {
        const user = doc.data();
        console.log(`- ${user.email} (${doc.id}): status=${user.roleApprovalStatus}, roles=${JSON.stringify(user.roles)}`);
      });
    }
    return;
  }

  console.log(`Found ${pendingSnapshot.size} user(s) with pending approval:\n`);

  for (const doc of pendingSnapshot.docs) {
    const user = doc.data();
    console.log(`Approving: ${user.email} (${doc.id})`);
    console.log(`  Requested roles: ${JSON.stringify(user.requestedRoles)}`);

    // Approve the user with their requested roles
    await db.collection('users').doc(doc.id).update({
      roles: user.requestedRoles || ['volunteer'],
      roleApprovalStatus: 'approved',
      updatedAt: Date.now()
    });

    console.log(`  ✓ Approved with roles: ${JSON.stringify(user.requestedRoles || ['volunteer'])}\n`);
  }

  console.log('Done!');
}

findAndApproveUsers().catch(console.error).finally(() => process.exit());
