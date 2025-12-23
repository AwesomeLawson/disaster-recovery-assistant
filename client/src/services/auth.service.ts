import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';

// Initialize OAuth providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Configure Google provider
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Configure Facebook provider
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

export const authService = {
  // Register new user with email and password
  async register(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Sign in with email and password
  async login(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Sign out current user
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Send password reset email
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  // Update current user's password
  async changePassword(newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    await updatePassword(user, newPassword);
  },

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  // Get current user ID token
  async getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    return await user.getIdToken();
  },

  // Sign in with Google
  async loginWithGoogle(): Promise<FirebaseUser> {
    const userCredential = await signInWithPopup(auth, googleProvider);
    return userCredential.user;
  },

  // Sign in with Facebook
  async loginWithFacebook(): Promise<FirebaseUser> {
    const userCredential = await signInWithPopup(auth, facebookProvider);
    return userCredential.user;
  },
};
