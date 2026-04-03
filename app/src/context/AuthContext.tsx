import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
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
import { setAvailability } from '../services/chatService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  completeOAuth: (role?: UserRole) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (userId: string, secret: string, password: string) => Promise<void>;
  changePassword: (oldPwd: string, newPwd: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  // Profile actions
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  getAvatarUrl: (fileId: string) => string;
  // Computed helpers
  isParticipant: boolean;
  isJudge: boolean;
  isOrganizer: boolean;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Boot: restore session ──────────────────────────────────────────────────
  useEffect(() => {
    getAccountOrNull()
      .then((p) => {
        setProfile(p);
      })
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Real-time notification badge ──────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    // Initial unread count loaded by Notifications page; here we just listen for new ones
    const unsub = subscribeToNotifications(profile.$id, () => {
      setUnreadCount((c) => c + 1);
    });
    return unsub;
  }, [profile?.$id]);

  // ── Auto online/offline presence ─────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    // Mark online on focus, offline on blur/unload
    const onFocus = () => {
      // presence is per-team; handled in chat pages
    };
    const onBlur = () => {
      // handled in chat pages
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [profile]);

  // ─── Auth actions ─────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const p = await authSignIn(email, password);
    setProfile(p);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    const p = await authSignUp(name, email, password, role);
    setProfile(p);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setProfile(null);
    setUnreadCount(0);
  }, []);

  const signInWithGoogle = useCallback(() => authGoogle(), []);
  const signInWithGithub = useCallback(() => authGithub(), []);

  const completeOAuth = useCallback(async (role: UserRole = 'participant') => {
    const p = await handleOAuthCallback(role);
    setProfile(p);
  }, []);

  const forgotPassword = useCallback((email: string) => sendPasswordRecovery(email), []);

  const resetPassword = useCallback(
    (userId: string, secret: string, password: string) =>
      confirmPasswordRecovery(userId, secret, password),
    []
  );

  const changePassword = useCallback(
    (oldPwd: string, newPwd: string) => authChangePassword(oldPwd, newPwd),
    []
  );

  const verifyEmail = useCallback(() => sendEmailVerification(), []);

  // ─── Profile actions ──────────────────────────────────────────────────────
  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!profile) return;
      const updated = await authUpdateProfile(profile.$id, data);
      setProfile(updated);
    },
    [profile]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!profile) return;
      await authUploadAvatar(profile.$id, file);
      // Refresh profile to get new avatarFileId
      const refreshed = await getAccountOrNull();
      if (refreshed) setProfile(refreshed);
    },
    [profile]
  );

  // ─── Computed ─────────────────────────────────────────────────────────────
  const isParticipant = profile?.role === 'participant';
  const isJudge = profile?.role === 'judge';
  const isOrganizer = profile?.role === 'organizer';

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        isAuthenticated: !!profile,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        signInWithGithub,
        completeOAuth,
        forgotPassword,
        resetPassword,
        changePassword,
        verifyEmail,
        updateProfile,
        uploadAvatar,
        getAvatarUrl,
        isParticipant,
        isJudge,
        isOrganizer,
        unreadCount,
        setUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
