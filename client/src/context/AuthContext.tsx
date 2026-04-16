import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { firebaseAuth, useMockMode } from '../services/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider wraps the app and provides Firebase auth state.
 * Uses onAuthStateChanged for real-time auth state tracking.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useMockMode || !firebaseAuth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      if (!firebaseAuth) throw new Error('Auth disabled in Mock Mode');
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      if (firebaseAuth) await firebaseSignOut(firebaseAuth);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    signIn,
    signOut,
  }), [user, loading, error, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state from any component.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
