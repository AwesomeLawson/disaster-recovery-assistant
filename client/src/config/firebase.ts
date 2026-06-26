import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Detect impersonation tab. URL param is the initial signal (new tab); sessionStorage
// keeps the signal across refreshes (sessionStorage is per-tab, so admin's tab is unaffected).
const isImpersonationTab =
  new URLSearchParams(window.location.search).has('impersonate-key') ||
  sessionStorage.getItem('fr_impersonation') !== null;

// Use a separate named FirebaseApp for impersonation so its Auth state is isolated
// from the admin's primary tab (which uses the default app + IndexedDB persistence).
const app = isImpersonationTab
  ? initializeApp(firebaseConfig, 'impersonation')
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
if (isImpersonationTab) {
  // sessionStorage-backed persistence keeps the impersonation session tab-local —
  // it won't leak into other tabs or survive the tab being closed.
  setPersistence(auth, browserSessionPersistence).catch((err) =>
    console.error('Failed to set impersonation persistence:', err)
  );
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, window.location.hostname, parseInt(window.location.port) || 5173);
}

export default app;
