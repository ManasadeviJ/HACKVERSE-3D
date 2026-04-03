import {
  account,
  databases,
  avatars,
  storage,
  DB_ID,
  COLLECTIONS,
  BUCKETS,
} from '../lib/appwrite';
import { ID, OAuthProvider, Query } from 'appwrite';
import type { Profile, UserRole } from '../types';

// // ─── Sign Up ──────────────────────────────────────────────────────────────────
// export async function signUp(
//   name: string,
//   email: string,
//   password: string,
//   role: UserRole
// ): Promise<Profile> {
//   // 1. Create Appwrite account
//   const newAccount = await account.create(ID.unique(), email, password, name);

//   // 2. Create email session immediately
//   await account.createEmailPasswordSession(email, password);

//   // 3. Update account preferences to store role
//   await account.updatePrefs({ role });

//   // 4. Create profile document
//   const profile = await databases.createDocument<Profile>(
//     DB_ID,
//     COLLECTIONS.PROFILES,
//     newAccount.$id, // use same ID as auth
//     {
//       userId: newAccount.$id,
//       name,
//       email,
//       role,
//       bio: '',
//       location: '',
//       website: '',
//       github: '',
//       linkedin: '',
//       twitter: '',
//       skills: '[]',
//       avatarFileId: '',
//       hackathonsCount: 0,
//       projectsCount: 0,
//       winsCount: 0,
//       teamsCount: 0,
//       onboardingComplete: false,
//     }
//   );

//   return profile;
// }

export async function signUp(
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<Profile> {
  // 1. Create Appwrite account
  const newAccount = await account.create(ID.unique(), email, password, name);

  // 2. Update account preferences to store role
  await account.updatePrefs({ role });

  // 3. Create profile document
  const profile = await databases.createDocument<Profile>(
    DB_ID,
    COLLECTIONS.PROFILES,
    newAccount.$id,
    {
      userId: newAccount.$id,
      name,
      email,
      role,
      bio: '',
      location: '',
      website: '',
      github: '',
      linkedin: '',
      twitter: '',
      skills: '[]',
      avatarFileId: '',
      hackathonsCount: 0,
      projectsCount: 0,
      winsCount: 0,
      teamsCount: 0,
      onboardingComplete: false,
    }
  );

  return profile;
}


// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string): Promise<Profile> {
  await account.createEmailPasswordSession(email, password);
  return getCurrentProfile();
}

// ─── OAuth Sign In ────────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<void> {
  account.createOAuth2Session(
    OAuthProvider.Google,
    `${window.location.origin}/auth/callback`,
    `${window.location.origin}/auth/signin`
  );
}

export async function signInWithGithub(): Promise<void> {
  account.createOAuth2Session(
    OAuthProvider.Github,
    `${window.location.origin}/auth/callback`,
    `${window.location.origin}/auth/signin`
  );
}

// ─── OAuth Callback - ensure profile exists ───────────────────────────────────
export async function handleOAuthCallback(role: UserRole = 'participant'): Promise<Profile> {
  const user = await account.get();

  // Try to fetch existing profile
  try {
    const existing = await databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, user.$id);
    return existing;
  } catch {
    // Profile not found – create it
    await account.updatePrefs({ role });
    return databases.createDocument<Profile>(
      DB_ID,
      COLLECTIONS.PROFILES,
      user.$id,
      {
        userId: user.$id,
        name: user.name,
        email: user.email,
        role,
        bio: '',
        location: '',
        website: '',
        github: '',
        linkedin: '',
        twitter: '',
        skills: '[]',
        avatarFileId: '',
        hackathonsCount: 0,
        projectsCount: 0,
        winsCount: 0,
        teamsCount: 0,
        onboardingComplete: false,
      }
    );
  }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await account.deleteSession('current');
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
export async function sendPasswordRecovery(email: string): Promise<void> {
  await account.createRecovery(email, `${window.location.origin}/auth/reset-password`);
}

export async function confirmPasswordRecovery(
  userId: string,
  secret: string,
  newPassword: string
): Promise<void> {
  await account.updateRecovery(userId, secret, newPassword);
}

// ─── Get Current Account + Profile ───────────────────────────────────────────
export async function getCurrentProfile(): Promise<Profile> {
  const user = await account.get();
  const profile = await databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, user.$id);
  return profile;
}

export async function getAccountOrNull(): Promise<Profile | null> {
  try {
    return await getCurrentProfile();
  } catch {
    return null;
  }
}

// ─── Update Profile ───────────────────────────────────────────────────────────
export async function updateProfile(
  userId: string,
  data: Partial<Omit<Profile, '$id' | '$createdAt' | '$updatedAt' | 'userId' | 'email' | 'role'>>
): Promise<Profile> {
  // Handle skills as JSON
  const payload: Record<string, unknown> = { ...data };
  if (Array.isArray(data.skills)) {
    payload.skills = JSON.stringify(data.skills);
  }

  const updated = await databases.updateDocument<Profile>(
    DB_ID,
    COLLECTIONS.PROFILES,
    userId,
    payload
  );

  // Also update display name on auth account if changed
  if (data.name) {
    await account.updateName(data.name);
  }

  return updated;
}

// ─── Upload Avatar ────────────────────────────────────────────────────────────
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Delete old avatar if exists
  const profile = await databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, userId);
  if (profile.avatarFileId) {
    try {
      await storage.deleteFile(BUCKETS.AVATARS, profile.avatarFileId);
    } catch {
      // ignore if already deleted
    }
  }

  const uploaded = await storage.createFile(BUCKETS.AVATARS, ID.unique(), file);
  await databases.updateDocument(DB_ID, COLLECTIONS.PROFILES, userId, {
    avatarFileId: uploaded.$id,
  });

  return uploaded.$id;
}

export function getAvatarUrl(fileId: string): string {
  if (!fileId) return '';
  return storage.getFilePreview(BUCKETS.AVATARS, fileId, 200, 200).toString();
}

export function getAvatarInitials(name: string): string {
  return avatars.getInitials(name).toString();
}

// ─── Change Password ──────────────────────────────────────────────────────────
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await account.updatePassword(newPassword, oldPassword);
}

// ─── Verify Email ─────────────────────────────────────────────────────────────
export async function sendEmailVerification(): Promise<void> {
  await account.createVerification(`${window.location.origin}/auth/verify`);
}

export async function confirmEmailVerification(userId: string, secret: string): Promise<void> {
  await account.updateVerification(userId, secret);
}

// ─── Fetch any public profile ─────────────────────────────────────────────────
export async function getProfileById(userId: string): Promise<Profile> {
  return databases.getDocument<Profile>(DB_ID, COLLECTIONS.PROFILES, userId);
}

// ─── Search users (for invite / team search) ──────────────────────────────────
export async function searchProfiles(query: string): Promise<Profile[]> {
  const res = await databases.listDocuments<Profile>(DB_ID, COLLECTIONS.PROFILES, [
    Query.search('name', query),
    Query.limit(10),
  ]);
  return res.documents;
}
