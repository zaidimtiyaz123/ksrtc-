import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Driver, UserRole } from '../types';
import { api } from '../services/api';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { setWorkspaceAccessToken } from '../services/googleWorkspace';

interface AuthContextType {
  user: User | null;
  driver: Driver | null;
  role: UserRole;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password?: string, role?: string) => Promise<void>;
  loginDriver: (driverId: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithOtp: (email: string, otp: string) => Promise<void>;
  requestOtp: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>;
  signup: (name: string, email: string, phone?: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ksrtc_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [driver, setDriver] = useState<Driver | null>(() => {
    const saved = localStorage.getItem('ksrtc_driver');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('ksrtc_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const role: UserRole = user?.role || 'passenger';

  // Listen to Firebase auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser && !user) {
        try {
          const data = await api.loginWithGoogle({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          });
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('ksrtc_user', JSON.stringify(data.user));
          localStorage.setItem('ksrtc_token', data.token);
        } catch (e) {
          console.warn('[Firebase Auth] Failed to sync session user:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Standard login for driver / passenger / admin
  const login = async (identifier: string, password?: string, intendedRole?: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(identifier, password, intendedRole);
      setUser(data.user);
      if (data.driver) {
        setDriver(data.driver);
        localStorage.setItem('ksrtc_driver', JSON.stringify(data.driver));
      } else {
        setDriver(null);
        localStorage.removeItem('ksrtc_driver');
      }
      setToken(data.token);

      localStorage.setItem('ksrtc_user', JSON.stringify(data.user));
      localStorage.setItem('ksrtc_token', data.token);
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated Driver Login with ID & Password
  const loginDriver = async (driverId: string, password: string) => {
    await login(driverId, password, 'driver');
  };

  // Google Sign-In for Passengers via Firebase Auth Popup
  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      let result: any = null;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        console.warn('[Google Auth] Popup closed or blocked:', popupErr);
        throw new Error(
          popupErr.code === 'auth/popup-closed-by-user'
            ? 'Google sign-in popup was closed before completing.'
            : 'Google Sign-In popup could not be completed. Please allow popups or use Email sign-in.'
        );
      }

      const firebaseUser = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setWorkspaceAccessToken(credential.accessToken);
      }

      const data = await api.loginWithGoogle({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL
      });

      setUser(data.user);
      setDriver(null);
      setToken(data.token);

      localStorage.setItem('ksrtc_user', JSON.stringify(data.user));
      localStorage.removeItem('ksrtc_driver');
      localStorage.setItem('ksrtc_token', data.token);
    } finally {
      setIsLoading(false);
    }
  };

  // Request authentic 6-digit OTP for Email sign-in
  const requestOtp = async (email: string) => {
    return await api.requestOtp(email);
  };

  // Login with verified Email & OTP
  const loginWithOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const data = await api.verifyOtp(email, otp);
      setUser(data.user);
      setDriver(null);
      setToken(data.token);

      localStorage.setItem('ksrtc_user', JSON.stringify(data.user));
      localStorage.removeItem('ksrtc_driver');
      localStorage.setItem('ksrtc_token', data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, phone?: string, assignedRole: string = 'passenger') => {
    setIsLoading(true);
    try {
      const data = await api.signup(name, email, phone, assignedRole);
      setUser(data.user);
      setToken(data.token);

      localStorage.setItem('ksrtc_user', JSON.stringify(data.user));
      localStorage.setItem('ksrtc_token', data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setWorkspaceAccessToken(null);
    setUser(null);
    setDriver(null);
    setToken(null);
    localStorage.removeItem('ksrtc_user');
    localStorage.removeItem('ksrtc_driver');
    localStorage.removeItem('ksrtc_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        driver,
        role,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginDriver,
        loginWithGoogle,
        loginWithOtp,
        requestOtp,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
