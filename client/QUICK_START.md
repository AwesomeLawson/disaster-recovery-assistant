# Quick Start Guide - Faith Responders Client

## Get Running in 5 Minutes

### Step 1: Install Dependencies (1 minute)
```bash
cd client
npm install
```

### Step 2: Configure Firebase (2 minutes)

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Get your Firebase config from the Firebase Console:
   - Go to https://console.firebase.google.com
   - Select your project
   - Click the gear icon → Project settings
   - Scroll down to "Your apps" section
   - Copy the config values

3. Edit `.env` file:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Step 3: Start Development Server (1 minute)
```bash
npm run dev
```

Application will open at: http://localhost:5173

### Step 4: Create Your First User (1 minute)

1. Click "Sign Up" on the login page
2. Fill in:
   - Email: admin@example.com
   - Phone: (555) 123-4567
   - Password: password123
   - Confirm Password: password123
   - Communication Preference: Email
   - Requested Roles: ✓ Assessor (or any role)

3. Click "Sign Up"
4. Sign the legal release with your mouse/finger
5. Click "Sign and Continue"

**Note**: You'll see a "Pending Approval" message because your role needs admin approval.

### Step 5: Approve Your User (Development Only)

Since this is your first user, you need to manually approve it in Firebase Console:

1. Go to Firebase Console → Firestore Database
2. Find the `users` collection
3. Find your user document
4. Edit the document:
   - Change `roleApprovalStatus` from `"pending"` to `"approved"`
   - Change `roles` from `[]` to `["assessor"]` (or your requested role)
5. Save changes
6. Refresh the application

Now you can access the full system!

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint
```

## Quick Feature Tour

### As an Administrator:
- **Dashboard**: View stats, approve pending users
- **Groups**: Create disaster event groups
- **Centers**: Create relief centers
- **Assessments**: View all assessments
- **Messages**: Communicate with team

### As an Assessor:
- **Dashboard**: View your assessments
- **Create Assessment**: Document disaster sites with photos
- **Reassess**: Update existing assessments
- **Messages**: Coordinate with team

### As a Work Group Lead:
- **Dashboard**: View your workgroups
- **Create Workgroup**: Organize work teams
- **Manage Workers**: Assign team members
- **Escalations**: Handle issues that need attention
- **Messages**: Communicate with workers

### As a Worker:
- **Dashboard**: View assigned tasks
- **Update Progress**: Add notes and photos
- **Messages**: Stay in touch with your team

## Common Tasks

### Creating an Assessment (Assessor)
1. Navigate to "Assessments" in the sidebar
2. Click "New Assessment"
3. Fill in all required fields:
   - Place name
   - Address
   - Group and Center
   - Damage description
   - Needs description
   - Number affected
   - Severity level
4. Optionally upload photos
5. Click "Create Assessment"

### Creating a Workgroup (Work Group Lead)
1. Navigate to "Workgroups"
2. Click "New Workgroup"
3. Fill in:
   - Workgroup name
   - Select center
   - Select group
   - Select lead user
   - Select assessment
   - Task description
4. Click "Create"

### Sending a Message
1. Navigate to "Messages"
2. Type your message in the text field
3. Press Enter or click "Send"

## Troubleshooting

### "Cannot connect to Firebase"
- Check your `.env` file has correct values
- Verify Firebase services are enabled in console
- Make sure you're not behind a restrictive firewall

### "User not found" after login
- The backend functions need to be deployed
- Check Firebase Functions in the console

### "Permission denied"
- Your user role may not be approved
- Check Firestore to verify role approval status

### Build errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npx tsc --noEmit
```

## Next Steps

1. **Deploy Backend Functions**: See `functions/README.md`
2. **Configure Firebase Rules**: Set up security rules
3. **Add More Users**: Create admin users to manage the system
4. **Customize Theme**: Edit `src/App.tsx` to change colors
5. **Add Features**: Extend with additional pages and functionality

## Need Help?

- Check `README_CLIENT.md` for full documentation
- See `PROJECT_SUMMARY.md` for architecture details
- Review the requirements in `requirements.txt`

## Production Deployment

When ready to deploy:

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your app will be live at: `https://your-project.firebaseapp.com`

---

**You're all set!** Start building and managing disaster relief operations. 🚀
