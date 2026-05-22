import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import type { User } from '../types';
import { userService } from '../services/user.service';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  userLoadComplete: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLoadComplete, setUserLoadComplete] = useState(false);
  const loadGeneration = useRef(0);

  const loadUserData = async (fbUser: FirebaseUser, retries = 5) => {
    const gen = ++loadGeneration.current;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const userData = await userService.getUser(fbUser.uid);
        if (gen !== loadGeneration.current) return;
        setUser(userData);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setUser(null);
      setUserLoadComplete(false);

      if (fbUser) {
        await loadUserData(fbUser);
      } else {
        setUserLoadComplete(true);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    userLoadComplete,
    refreshUser,
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
