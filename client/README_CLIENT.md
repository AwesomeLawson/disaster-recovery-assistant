# Faith Responders Client Application

A comprehensive React frontend for the Faith Responders disaster relief management system.

## Features

- **User Authentication**: Firebase-based authentication with role-based access control
- **Role Management**: Support for Administrator, Assessor, Work Group Lead, Worker, and Third-Party roles
- **Assessment Management**: Create and manage disaster assessments with photo uploads
- **Workgroup Management**: Organize and track work teams
- **Real-time Messaging**: Built-in communication system
- **Digital Signatures**: Legal release signing with digital signature capture
- **Responsive Design**: Mobile-first design using Material-UI

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Material-UI (MUI)** - Component library
- **React Router** - Client-side routing
- **Firebase** - Backend services (Auth, Firestore, Storage, Functions)
- **Vite** - Build tool
- **Vitest** - Testing framework

## Project Structure

```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── DigitalSignature.tsx
│   │   ├── Layout.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── __tests__/
│   ├── config/              # Configuration files
│   │   └── firebase.ts
│   ├── context/             # React context providers
│   │   └── AuthContext.tsx
│   ├── pages/               # Page components
│   │   ├── AdminDashboard.tsx
│   │   ├── AssessmentList.tsx
│   │   ├── AssessorDashboard.tsx
│   │   ├── CenterManagement.tsx
│   │   ├── CreateAssessment.tsx
│   │   ├── Dashboard.tsx
│   │   ├── GroupManagement.tsx
│   │   ├── Login.tsx
│   │   ├── Messaging.tsx
│   │   ├── Register.tsx
│   │   ├── SignLegalRelease.tsx
│   │   ├── WorkerDashboard.tsx
│   │   ├── WorkGroupLeadDashboard.tsx
│   │   ├── WorkgroupManagement.tsx
│   │   └── __tests__/
│   ├── services/            # Firebase service layer
│   │   ├── assessment.service.ts
│   │   ├── auth.service.ts
│   │   ├── center.service.ts
│   │   ├── escalation.service.ts
│   │   ├── group.service.ts
│   │   ├── legalRelease.service.ts
│   │   ├── message.service.ts
│   │   ├── user.service.ts
│   │   ├── workgroup.service.ts
│   │   └── __tests__/
│   ├── test/                # Test setup
│   │   └── setup.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── .env.example             # Environment variables template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with enabled services (Auth, Firestore, Storage, Functions)

### Installation

1. **Install dependencies:**
   ```bash
   cd client
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file with your Firebase configuration:**
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

### Running the Application

#### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:5173`

#### Production Build

```bash
npm run build
npm run preview
```

### Testing

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Linting

```bash
npm run lint
```

## Application Flow

### 1. User Registration
- New users register with email, phone number, and requested roles
- Users must wait for administrator approval
- Once approved, users must sign a legal release

### 2. Authentication
- Users log in with email and password
- Firebase handles authentication securely
- Auth state is managed globally via AuthContext

### 3. Role-Based Dashboards
- **Administrator**: Manage users, groups, centers, and view all data
- **Assessor**: Create and manage disaster assessments
- **Work Group Lead**: Create and manage workgroups, handle escalations
- **Worker**: View assigned tasks and update progress

### 4. Assessment Workflow
- Assessors create assessments with photos and details
- Assessments can be flagged for review
- Workgroups are created based on assessments
- Progress is tracked with notes and photos

### 5. Escalation Process
- Work group leads can escalate issues
- Three escalation types: Assessor, Administrative, Third-Party
- Administrators manage and resolve escalations

## Key Features Explained

### Digital Signature Component
- Canvas-based signature capture
- Touch and mouse support
- Converts to image for storage
- Used for legal release signing

### Private Route Component
- Protects routes based on authentication
- Enforces role-based access control
- Checks legal release status
- Redirects unauthorized users

### Service Layer
- Abstracts Firebase operations
- Type-safe API calls
- Error handling
- File upload management

### Real-time Updates
- Firestore listeners for messages
- Auth state changes
- Automatic UI updates

## Environment Configuration

The application uses Vite's environment variable system. All Firebase-related variables must be prefixed with `VITE_`.

### Development vs Production

In development mode (when `import.meta.env.DEV` is true), the application connects to Firebase emulators:
- Auth: `localhost:9099`
- Firestore: `localhost:8080`
- Storage: `localhost:9199`
- Functions: `localhost:5001`

## Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

## Troubleshooting

### Firebase Connection Issues

1. Verify your `.env` file has correct Firebase configuration
2. Check that Firebase services are enabled in your project
3. Ensure Firebase Functions are deployed

### Build Errors

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```

### Test Failures

1. Update test snapshots if needed
2. Check mock implementations in `src/test/setup.ts`
3. Ensure all dependencies are installed

## Best Practices

1. **Component Organization**: Keep components small and focused
2. **Type Safety**: Always define proper TypeScript types
3. **Error Handling**: Use try-catch blocks and display user-friendly errors
4. **Loading States**: Show loading indicators for async operations
5. **Responsive Design**: Test on multiple screen sizes
6. **Accessibility**: Use semantic HTML and ARIA labels

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure linting passes
5. Submit a pull request

## Additional Resources

- [React Documentation](https://react.dev/)
- [Material-UI Documentation](https://mui.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vitest Documentation](https://vitest.dev/)
- [React Router Documentation](https://reactrouter.com/)

## License

[Add your license information here]
