import {
  account, databases, storage, avatars,
  DB_ID, COLLECTIONS, BUCKETS,
} from '../lib/appwrite';
import { ID, OAuthProvider, Query } from 'appwrite';
import type { Profile, UserRole } from '../types';

// ─── Sign Up ──────────────────────────────────────────────────────────────────
export async function signUp(
  name: string, email: string, password: string, role: UserRole
): Promise<Profile> {
  const newAcc = await account.create(ID.unique(), email, password, name);
  await account.createEmailPasswordSession(email, password);
  // Store role in prefs (no server API key needed)
  await account.updatePrefs({ role });
  return databases.createDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, newAcc.$id, {
    userId: newAcc.$id, name, email, role,
    bio: '', location: '', website: '',
    github: '', linkedin: '', twitter: '',
    skills: '[]', avatarFileId: '',
    hackathonsCount: 0, projectsCount: 0,
    winsCount: 0, teamsCount: 0,
    onboardingComplete: false,
  });
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string): Promise<Profile> {
  await account.createEmailPasswordSession(email, password);
  return getCurrentProfile();
}

// ─── OAuth ────────────────────────────────────────────────────────────────────
export function signInWithGoogle(): void {
  account.createOAuth2Session(
    OAuthProvider.Google,
    `${window.location.origin}/auth/callback`,
    `${window.location.origin}/auth/signin`
  );
}

export function signInWithGithub(): void {
  account.createOAuth2Session(
    OAuthProvider.Github,
    `${window.location.origin}/auth/callback`,
    `${window.location.origin}/auth/signin`
  );
}

// ─── OAuth Callback ───────────────────────────────────────────────────────────
/**
 * ROOT CAUSE of "User (role: guests) missing scopes (["account"])":
 *
 * After OAuth redirect, Appwrite sets a session cookie automatically.
 * BUT on the /auth/callback page, `account.get()` may be called before
 * the browser has fully processed the session cookie from the OAuth provider.
 *
 * FIX: Retry account.get() with exponential backoff (up to 3 attempts).
 * Also wrap createDocument in try/catch to handle duplicate profile gracefully.
 */
export async function handleOAuthCallback(role: UserRole = 'participant'): Promise<Profile> {
  // Retry account.get() up to 3 times with delay
  let user: Awaited<ReturnType<typeof account.get>> | null = null;
  let lastErr: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const u = await account.get();
      // Appwrite returns a guest object (email = '') when not logged in
      if (!u.$id || u.email === '') {
        throw new Error('Guest session — OAuth not yet established');
      }
      user = u;
      break;
    } catch (err) {
      lastErr = err;
      // Wait before retry: 500ms, 1000ms, 2000ms
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }

  if (!user) {
    throw lastErr || new Error('OAuth session could not be established');
  }

  // Try to load existing profile
  try {
    const existing = await databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, user.$id);
    return existing;
  } catch {
    // Profile doesn't exist — first OAuth login
  }

  // Store role in prefs (no server scope needed)
  try {
    await account.updatePrefs({ role });
  } catch { /* non-critical */ }

  // Create profile document
  return databases.createDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, user.$id, {
    userId: user.$id,
    name: user.name || user.email.split('@')[0] || 'New User',
    email: user.email,
    role,
    bio: '', location: '', website: '',
    github: '', linkedin: '', twitter: '',
    skills: '[]', avatarFileId: '',
    hackathonsCount: 0, projectsCount: 0,
    winsCount: 0, teamsCount: 0,
    onboardingComplete: false,
  });
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  try { await account.deleteSession('current'); } catch { /* already gone */ }
}

// ─── Get current profile ──────────────────────────────────────────────────────
export async function getCurrentProfile(): Promise<Profile> {
  const user = await account.get();
  return databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, user.$id);
}

/**
 * Boot-time session restore. Returns null for guests/unauthenticated.
 * Guards against Appwrite guest objects (email === '').
 */
export async function getAccountOrNull(): Promise<Profile | null> {
  try {
    const user = await account.get();
    // Guest user: $id exists but no email
    if (!user.$id || user.email === '' || !user.email) return null;
    return await databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, user.$id);
  } catch {
    return null;
  }
}

// ─── Password recovery ────────────────────────────────────────────────────────
export async function sendPasswordRecovery(email: string): Promise<void> {
  await account.createRecovery(email, `${window.location.origin}/auth/reset-password`);
}
export async function confirmPasswordRecovery(
  userId: string, secret: string, newPassword: string
): Promise<void> {
  await account.updateRecovery(userId, secret, newPassword);
}

// ─── Update profile ───────────────────────────────────────────────────────────
export async function updateProfile(
  userId: string,
  data: Partial<Omit<Profile, '$id' | '$createdAt' | '$updatedAt' | 'userId' | 'email' | 'role'>>
): Promise<Profile> {
  const payload: Record<string, unknown> = { ...data };
  if (Array.isArray(data.skills)) payload.skills = JSON.stringify(data.skills);
  const updated = await databases.updateDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, userId, payload);
  if (data.name) { try { await account.updateName(data.name); } catch { /* ignore */ } }
  return updated;
}

// ─── Avatar upload ────────────────────────────────────────────────────────────
/**
 * FIX: Uses BUCKETS.AVATARS which is now '69cfbccb002df152ba94' (real ID).
 * The 404 was caused by using the string 'avatars' instead of the actual bucket ID.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const profile = await databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, userId);
  if (profile.avatarFileId) {
    try { await storage.deleteFile(BUCKETS.AVATARS, profile.avatarFileId); } catch { /* ignore */ }
  }
  const uploaded = await storage.createFile(BUCKETS.AVATARS, ID.unique(), file);
  await databases.updateDocument(DB_ID, COLLECTIONS.PROFILES, userId, {
    avatarFileId: uploaded.$id,
  });
  return uploaded.$id;
}

export function getAvatarUrl(fileId: string): string {
  if (!fileId) return '';
  // Returns a preview URL using the real bucket ID
  return storage.getFilePreview(BUCKETS.AVATARS, fileId, 200, 200).toString();
}

export function getAvatarInitials(name: string): string {
  return avatars.getInitials(name).toString();
}

// ─── Change password ──────────────────────────────────────────────────────────
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await account.updatePassword(newPassword, oldPassword);
}

// ─── Email verification ───────────────────────────────────────────────────────
export async function sendEmailVerification(): Promise<void> {
  await account.createVerification(`${window.location.origin}/auth/verify`);
}

// ─── Fetch any profile by ID ──────────────────────────────────────────────────
export async function getProfileById(userId: string): Promise<Profile> {
  return databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, userId);
}

// ─── Search profiles by role ──────────────────────────────────────────────────
/**
 * FIX for empty judge search results:
 *
 * Query.search('name', query) requires a FULLTEXT INDEX on the 'name' attribute
 * in Appwrite. Without it, search returns no results.
 *
 * Instead: list ALL profiles with the given role and filter by name client-side.
 * This is reliable and requires no index.
 *
 * For large deployments: create a fulltext index on 'name' in Appwrite console
 * (Collections → profiles → Indexes → Create Index → type: fulltext, attribute: name)
 * then switch back to Query.search.
 */
export async function searchProfilesByRole(role: UserRole, nameQuery?: string): Promise<Profile[]> {
  const res = await databases.listDocuments<Profile>(DB_ID, COLLECTIONS.PROFILES, [
    Query.equal('role', role),
    Query.limit(100),
  ]);

  if (!nameQuery?.trim()) return res.documents;

  const q = nameQuery.toLowerCase().trim();
  return res.documents.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
  );
}

// Keep old searchProfiles for any existing callers
export async function searchProfiles(query: string): Promise<Profile[]> {
  if (!query.trim()) return [];
  const res = await databases.listDocuments<Profile>(DB_ID, COLLECTIONS.PROFILES, [
    Query.limit(200),
  ]);
  const q = query.toLowerCase();
  return res.documents.filter(
    (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );
}
