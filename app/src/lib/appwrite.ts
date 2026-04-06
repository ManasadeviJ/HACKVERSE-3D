import { Client, Account, Databases, Storage, Realtime, Avatars } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)    // https://sgp.cloud.appwrite.io/v1
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);  // 69cd5240001829f7ebfc

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export const realtime = new Realtime(client);
export default client;

// ─── Database ─────────────────────────────────────────────────────────────────
// Hardcoded to match exactly what you named it in Appwrite console
export const DB_ID = 'Hackversedb';

// ─── Collections ──────────────────────────────────────────────────────────────
export const COLLECTIONS = {
  PROFILES: 'profiles',
  EVENTS: 'events',
  EVENT_DETAILS: 'event_details',
  TEAMS: 'teams',
  TEAM_MEMBERS: 'team_members',
  REGISTRATIONS: 'registrations',
  SUBMISSIONS: 'submissions',
  EVALUATIONS: 'evaluations',
  LEADERBOARD: 'leaderboard',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  INVITES: 'invites',
  ANNOUNCEMENTS: 'announcements',
  AVAILABILITY: 'availability',
} as const;

// ─── Storage Buckets — USE THE REAL IDs FROM YOUR APPWRITE CONSOLE ────────────
// Go to Storage in Appwrite console and copy the exact Bucket ID shown under each name.
// Screenshot shows: avatars = 69cfbccb002df152ba94
export const BUCKETS = {
  AVATARS: '69cfbccb002df152ba94',   // Storage > avatars
  SUBMISSIONS: '69cfbcd70032e67ac17a',   // Storage > submission_files
  EVENT_BANNERS: '69cfbce80030c48f5a3c',   // Storage > event_banners
} as const;
