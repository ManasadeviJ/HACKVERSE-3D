import {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, type ReactNode
} from 'react';
import {
  getAccountOrNull,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  signInWithGoogle as authGoogle,
  signInWithGithub as authGithub,
  handleOAuthCallback,
  sendPasswordRecovery,
  confirmPasswordRecovery,
  updateProfile as authUpdateProfile,
  uploadAvatar as authUploadAvatar,
  getAvatarUrl,
  changePassword as authChangePassword,
  sendEmailVerification,
} from '../services/authService';
import type { Profile, UserRole } from '../types';
import { subscribeToNotifications } from '../services/notificationService';

interface AuthContextValue {
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => void;
  signInWithGithub: () => void;
  completeOAuth: (role?: UserRole) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (userId: string, secret: string, password: string) => Promise<void>;
  changePassword: (oldPwd: string, newPwd: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  getAvatarUrl: (fileId: string) => string;
  refreshProfile: () => Promise<void>;
  isParticipant: boolean;
  isJudge: boolean;
  isOrganizer: boolean;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Store unsub function in a plain ref (not typed as a hook return)
  const unsubNotifRef = useRef<null | (() => void)>(null);

  // ── Safe cleanup helper ───────────────────────────────────────────────────
  const cleanupNotifSub = () => {
    if (unsubNotifRef.current && typeof unsubNotifRef.current === 'function') {
      try { unsubNotifRef.current(); } catch { /* ignore */ }
      unsubNotifRef.current = null;
    }
  };

  // ── Boot ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    getAccountOrNull()
      .then((p) => setProfile(p))
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Realtime notification badge ───────────────────────────────────────────
  useEffect(() => {
    cleanupNotifSub();
    if (!profile?.$id) return;

    try {
      const unsub = subscribeToNotifications(profile.$id, () => {
        setUnreadCount((c) => c + 1);
      });
      // Verify it's actually a function before storing
      if (typeof unsub === 'function') {
        unsubNotifRef.current = unsub;
      }
    } catch { /* subscription optional */ }

    return () => cleanupNotifSub();
  }, [profile?.$id]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const p = await authSignIn(email, password);
    setProfile(p);
  }, []);

  const signUp = useCallback(async (
    name: string, email: string, password: string, role: UserRole
  ) => {
    const p = await authSignUp(name, email, password, role);
    setProfile(p);
  }, []);

  /**
   * FIX: signOut crash "notifUnsubRef.current is not a function"
   * The Appwrite realtime.subscribe() return value is not always a plain function.
   * We guard with typeof check in cleanupNotifSub(). After cleanup, clear state
   * and navigate to landing page via window.location (avoids stale React router state).
   */
  const signOut = useCallback(async () => {
    cleanupNotifSub();
    try { await authSignOut(); } catch { /* ignore */ }
    setProfile(null);
    setUnreadCount(0);
    // Hard navigate — clears all stale component state, goes to landing
    window.location.href = '/';
  }, []);

  const signInWithGoogle = useCallback(() => authGoogle(), []);
  const signInWithGithub = useCallback(() => authGithub(), []);

  const completeOAuth = useCallback(async (role: UserRole = 'participant') => {
    const p = await handleOAuthCallback(role);
    setProfile(p);
  }, []);

  const forgotPassword = useCallback(
    (email: string) => sendPasswordRecovery(email), []
  );
  const resetPassword = useCallback(
    (userId: string, secret: string, password: string) =>
      confirmPasswordRecovery(userId, secret, password), []
  );
  const changePassword = useCallback(
    (old: string, next: string) => authChangePassword(old, next), []
  );
  const verifyEmail = useCallback(() => sendEmailVerification(), []);

  // ── Profile actions ───────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const p = await getAccountOrNull();
    setProfile(p);
  }, []);

  const updateProfile = useCallback(async (data: Partial<Profile>) => {
    if (!profile) return;
    const updated = await authUpdateProfile(profile.$id, data);
    setProfile(updated);
  }, [profile]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!profile) return;
    await authUploadAvatar(profile.$id, file);
    await refreshProfile();
  }, [profile, refreshProfile]);

  return (
    <AuthContext.Provider value={{
      profile, isLoading,
      isAuthenticated: !!profile,
      signIn, signUp, signOut,
      signInWithGoogle, signInWithGithub, completeOAuth,
      forgotPassword, resetPassword, changePassword, verifyEmail,
      updateProfile, uploadAvatar, getAvatarUrl, refreshProfile,
      isParticipant: profile?.role === 'participant',
      isJudge: profile?.role === 'judge',
      isOrganizer: profile?.role === 'organizer',
      unreadCount, setUnreadCount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
