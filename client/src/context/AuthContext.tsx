import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import type { User, UserRole } from '../types';
import { userService } from '../services/user.service';

const PREVIEW_ROLE_KEY = 'fr_preview_role';
const IMPERSONATION_KEY = 'fr_impersonation';

interface ImpersonationInfo {
  adminId: string;
  adminName: string;
  targetId: string;
  targetName: string;
  startedAt: number;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  realUser: User | null;
  loading: boolean;
  userLoadComplete: boolean;
  refreshUser: () => Promise<void>;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  impersonation: ImpersonationInfo | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [realUser, setRealUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLoadComplete, setUserLoadComplete] = useState(false);
  const [previewRole, setPreviewRoleState] = useState<UserRole | null>(() => {
    const stored = localStorage.getItem(PREVIEW_ROLE_KEY);
    return stored ? (stored as UserRole) : null;
  });
  const [impersonation, setImpersonation] = useState<ImpersonationInfo | null>(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    return stored ? (JSON.parse(stored) as ImpersonationInfo) : null;
  });
  const loadGeneration = useRef(0);

  const setPreviewRole = (role: UserRole | null) => {
    setPreviewRoleState(role);
    if (role) {
      localStorage.setItem(PREVIEW_ROLE_KEY, role);
    } else {
      localStorage.removeItem(PREVIEW_ROLE_KEY);
    }
  };

  const loadUserData = async (fbUser: FirebaseUser, retries = 5) => {
    const gen = ++loadGeneration.current;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const userData = await userService.getUser(fbUser.uid);
        if (gen !== loadGeneration.current) return;
        setRealUser(userData);
        setUserLoadComplete(true);
        return;
      } catch (error: any) {
        if (gen !== loadGeneration.current) return;
        if (error?.code === 'functions/not-found' && attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 1500));
          if (gen !== loadGeneration.current) return;
          continue;
        }
        console.error('Error loading user data:', error);
        setUserLoadComplete(true);
        return;
      }
    }
    if (gen !== loadGeneration.current) return;
    setUserLoadComplete(true);
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await loadUserData(firebaseUser);
    }
  };

  // Pick up impersonation handoff on app boot.
  // Admin tab puts payload in localStorage under a random key and opens us with ?impersonate-key=<key>.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('impersonate-key');
    if (!key) return;

    const raw = localStorage.getItem(key);
    params.delete('impersonate-key');
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash
    );

    if (!raw) return;
    localStorage.removeItem(key);

    try {
      const data = JSON.parse(raw) as {
        token: string;
        target: { id: string; firstName: string; lastName: string; email: string };
        admin: { id: string; firstName: string; lastName: string };
      };
      const info: ImpersonationInfo = {
        adminId: data.admin.id,
        adminName: `${data.admin.firstName} ${data.admin.lastName}`,
        targetId: data.target.id,
        targetName: `${data.target.firstName} ${data.target.lastName}`,
        startedAt: Date.now(),
      };
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(info));
      setImpersonation(info);
      signInWithCustomToken(auth, data.token).catch((err) => {
        console.error('Impersonation sign-in failed:', err);
        sessionStorage.removeItem(IMPERSONATION_KEY);
        setImpersonation(null);
      });
    } catch (err) {
      console.error('Failed to parse impersonation handoff:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setRealUser(null);
      setUserLoadComplete(false);

      if (fbUser) {
        await loadUserData(fbUser);
      } else {
        setUserLoadComplete(true);
        // Clear preview/impersonation on logout
        setPreviewRoleState(null);
        localStorage.removeItem(PREVIEW_ROLE_KEY);
        setImpersonation(null);
        sessionStorage.removeItem(IMPERSONATION_KEY);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Effective user: apply role preview substitution when active.
  // Only administrators can preview as another role (defense in depth).
  let user: User | null = realUser;
  if (realUser && previewRole && realUser.roles.includes('administrator')) {
    user = { ...realUser, roles: [previewRole] };
  }

  const value: AuthContextType = {
    firebaseUser,
    user,
    realUser,
    loading,
    userLoadComplete,
    refreshUser,
    previewRole,
    setPreviewRole,
    impersonation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
