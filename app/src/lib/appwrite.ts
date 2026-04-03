import { Client, Account, Databases, Storage, Realtime, Functions, Avatars } from 'appwrite';

// ─── Appwrite Client ───────────────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export const realtime = new Realtime(client);
export const functions = new Functions(client);

export default client;

// ─── Database & Collection IDs ─────────────────────────────────────────────────
export const DB_ID = import.meta.env.VITE_APPWRITE_PROJECT_NAME; // "Hackverse"

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

export const BUCKETS = {
  AVATARS: 'avatars',
  SUBMISSIONS: 'submission_files',
  EVENT_BANNERS: '69cfbce80030c48f5a3c',
} as const;
