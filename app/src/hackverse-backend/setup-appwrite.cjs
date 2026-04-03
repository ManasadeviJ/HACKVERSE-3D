#!/usr/bin/env node
/**
 * HACKVERSE — Appwrite Database Setup Script
 * Run: node setup-appwrite.js
 * Requires: npm install node-appwrite
 * Set env vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
 */

const { Client, Databases, IndexType, Permission, Role } = require('node-appwrite');

// const client = new Client()
//   .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
//   .setProject(process.env.APPWRITE_PROJECT_ID || '69cfa6fe0018cd5bf7ca')
//   .setKey(process.env.APPWRITE_API_KEY || 'standard_0ba1ec2740b81551833cd3790e4ccd1d06f1884abea0d86c188346817b6b13c07410d359dcba9c92b9d698e17a21b6447322c3d064bc8901074d8f8a809aa9828e3c5b5c91dac6665ee1eba335d10f23433598305ca08c1452726a48c12712e6dab1cbce1f444dae43e9261650272d22aa3287c820b7245a27f02c110edf5f14');


if (!process.env.APPWRITE_API_KEY) {
  throw new Error("APPWRITE_API_KEY is missing");
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69cfa6fe0018cd5bf7ca')
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DB_ID = 'Hackversedb';

const allPermissions = [
  Permission.read(Role.any()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

async function createStr(colId, key, size = 255, required = false, def = null) {
  try {
    await db.createStringAttribute(DB_ID, colId, key, size, required, def);
    process.stdout.write('.');
  } catch (e) { if (!e.message.includes('already exists')) throw e; }
}

async function createInt(colId, key, required = false, def = null, min = null, max = null) {
  try {
    await db.createIntegerAttribute(DB_ID, colId, key, required, min, max, def);
    process.stdout.write('.');
  } catch (e) { if (!e.message.includes('already exists')) throw e; }
}

async function createBool(colId, key, required = false, def = false) {
  try {
    await db.createBooleanAttribute(DB_ID, colId, key, required, def);
    process.stdout.write('.');
  } catch (e) { if (!e.message.includes('already exists')) throw e; }
}

async function createEnum(colId, key, values, required = false, def = null) {
  try {
    await db.createEnumAttribute(DB_ID, colId, key, values, required, def);
    process.stdout.write('.');
  } catch (e) { if (!e.message.includes('already exists')) throw e; }
}

async function createCollection(id, name) {
  try {
    await db.createCollection(DB_ID, id, name, allPermissions);
    console.log(`\n✓ Created collection: ${id}`);
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log(`\n~ Exists: ${id}`);
    } else throw e;
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Setting up Hackverse Appwrite database...\n');

  // ── profiles ──────────────────────────────────────────────────────────────
  await createCollection('profiles', 'profiles');
  await createStr('profiles', 'userId', 36, true);
  await createStr('profiles', 'name', 255, true);
  await createStr('profiles', 'email', 255, true);
  await createEnum('profiles', 'role', ['participant', 'judge', 'organizer'], false, 'participant'); await createStr('profiles', 'bio', 2000, false, '');
  await createStr('profiles', 'location', 255, false, '');
  await createStr('profiles', 'website', 500, false, '');
  await createStr('profiles', 'github', 255, false, '');
  await createStr('profiles', 'linkedin', 255, false, '');
  await createStr('profiles', 'twitter', 255, false, '');
  await createStr('profiles', 'skills', 2000, false, '[]');
  await createStr('profiles', 'avatarFileId', 36, false, '');
  await createInt('profiles', 'hackathonsCount', false, 0);
  await createInt('profiles', 'projectsCount', false, 0);
  await createInt('profiles', 'winsCount', false, 0);
  await createInt('profiles', 'teamsCount', false, 0);
  await createBool('profiles', 'onboardingComplete', false, false);
  await sleep(500);

  // // ── events ────────────────────────────────────────────────────────────────
  // await createCollection('events', 'events');
  // await createStr('events', 'organizerId', 36, true);
  // await createStr('events', 'title', 500, true);
  // await createStr('events', 'description', 1000, false, '');
  // await createStr('events', 'shortDescription', 100, false, '');
  // await createStr('events', 'bannerFileId', 36, false, '');
  // await createStr('events', 'startDate', 50, true);
  // await createStr('events', 'endDate', 50, true);
  // await createStr('events', 'registrationDeadline', 50, true);
  // await createInt('events', 'maxParticipants', false, 500);
  // await createInt('events', 'teamSizeMin', false, 2);
  // await createInt('events', 'teamSizeMax', false, 4);
  // await createStr('events', 'category', 100, false, '');
  // await createStr('events', 'location', 255, false, 'Online');
  // await createStr('events', 'prizes', 500, false, '[]');
  // await createStr('events', 'rules', 500, false, '[]');
  // await createStr('events', 'eligibility', 500, false, '[]');
  // await createEnum('events', 'status', ['draft', 'published', 'ongoing', 'completed', 'cancelled'], false, 'draft');
  // await createBool('events', 'resultsPublished', false, false);
  // await createStr('events', 'judgeIds', 500, false, '[]');
  // await sleep(500);

  // ── events ────────────────────────────────────────────────────────────────
  await createCollection('events', 'events');
  await createStr('events', 'organizerId', 36, true);
  await createStr('events', 'title', 255, true);
  await createStr('events', 'shortDescription', 255, false, '');
  await createStr('events', 'startDate', 50, true);
  await createStr('events', 'endDate', 50, true);
  await createStr('events', 'registrationDeadline', 50, true);
  await createInt('events', 'maxParticipants', false, 500);
  await createInt('events', 'teamSizeMin', false, 2);
  await createInt('events', 'teamSizeMax', false, 4);
  await createStr('events', 'category', 100, false, '');
  await createStr('events', 'location', 255, false, 'Online');
  await createEnum('events', 'status', ['draft', 'published', 'ongoing', 'completed', 'cancelled'], false, 'draft');
  await createBool('events', 'resultsPublished', false, false);
  await sleep(500);

  // ── event_details ─────────────────────────────────────────────────────────
  await createCollection('event_details', 'event_details');
  await createStr('event_details', 'eventId', 36, true);
  await createStr('event_details', 'description', 2000, false, '');
  await createStr('event_details', 'bannerFileId', 36, false, '');
  await createStr('event_details', 'prizes', 1000, false, '[]');
  await createStr('event_details', 'rules', 1000, false, '[]');
  await createStr('event_details', 'eligibility', 1000, false, '[]');
  await createStr('event_details', 'judgeIds', 1000, false, '[]');
  await sleep(500);

  // ── teams ─────────────────────────────────────────────────────────────────
  await createCollection('teams', 'teams');
  await createStr('teams', 'eventId', 36, true);
  await createStr('teams', 'leaderId', 36, true);
  await createStr('teams', 'name', 255, true);
  await createStr('teams', 'description', 2000, false, '');
  await createInt('teams', 'maxMembers', false, 4);
  await createStr('teams', 'inviteCode', 20, true);
  await createStr('teams', 'inviteLink', 500, false, '');
  await createEnum('teams', 'status', ['open', 'closed', 'submitted'], false, 'open');
  await sleep(500);

  // ── team_members ──────────────────────────────────────────────────────────
  await createCollection('team_members', 'team_members');
  await createStr('team_members', 'teamId', 36, true);
  await createStr('team_members', 'userId', 36, true);
  await createStr('team_members', 'eventId', 36, true);
  await createEnum('team_members', 'role', ['leader', 'member'], false, 'member'); await createEnum('team_members', 'status', ['active', 'pending', 'rejected'], false, 'active');
  await createStr('team_members', 'joinedAt', 50, false, '');
  await sleep(500);

  // ── registrations ─────────────────────────────────────────────────────────
  await createCollection('registrations', 'registrations');
  await createStr('registrations', 'eventId', 36, true);
  await createStr('registrations', 'userId', 36, true);
  await createStr('registrations', 'teamId', 36, false, '');
  await createStr('registrations', 'participantName', 255, true);
  await createStr('registrations', 'participantEmail', 255, true);
  await createStr('registrations', 'collegeName', 500, false, '');
  await createStr('registrations', 'yearOfStudy', 50, false, '');
  await createStr('registrations', 'phone', 20, false, '');
  await createStr('registrations', 'tShirtSize', 10, false, 'M');
  await createStr('registrations', 'dietaryRequirements', 500, false, '');
  await createStr('registrations', 'emergencyContact', 255, false, '');
  await createStr('registrations', 'emergencyPhone', 20, false, '');
  await createStr('registrations', 'linkedinUrl', 500, false, '');
  await createStr('registrations', 'githubUrl', 500, false, '');
  await createEnum('registrations', 'experienceLevel', ['beginner', 'intermediate', 'advanced'], false, 'beginner');
  await createStr('registrations', 'motivation', 3000, false, '');
  await createStr('registrations', 'projectIdea', 3000, false, '');
  await createEnum('registrations', 'status', ['pending', 'confirmed', 'waitlisted', 'cancelled'], false, 'pending');
  await sleep(500);

  // ── submissions ───────────────────────────────────────────────────────────
  await createCollection('submissions', 'submissions');
  await createStr('submissions', 'eventId', 36, true);
  await createStr('submissions', 'teamId', 36, true);
  await createStr('submissions', 'leaderId', 36, true);
  await createStr('submissions', 'projectName', 255, false, '');
  await createStr('submissions', 'description', 5000, false, '');
  await createStr('submissions', 'techStack', 2000, false, '[]');
  await createStr('submissions', 'githubUrl', 500, false, '');
  await createStr('submissions', 'demoUrl', 500, false, '');
  await createStr('submissions', 'videoUrl', 500, false, '');
  await createStr('submissions', 'presentationUrl', 500, false, '');
  await createStr('submissions', 'fileIds', 2000, false, '[]');
  await createEnum('submissions', 'status', ['draft', 'submitted', 'under_review', 'evaluated'], false, 'draft');
  await createStr('submissions', 'submittedAt', 50, false, '');
  await sleep(500);

  // ── evaluations ───────────────────────────────────────────────────────────
  await createCollection('evaluations', 'evaluations');
  await createStr('evaluations', 'submissionId', 36, true);
  await createStr('evaluations', 'eventId', 36, true);
  await createStr('evaluations', 'teamId', 36, true);
  await createStr('evaluations', 'judgeId', 36, true);
  await createInt('evaluations', 'innovation', false, 0, 0, 100);
  await createInt('evaluations', 'execution', false, 0, 0, 100);
  await createInt('evaluations', 'presentation', false, 0, 0, 100);
  await createInt('evaluations', 'impact', false, 0, 0, 100);
  await createInt('evaluations', 'totalScore', false, 0, 0, 100);
  await createStr('evaluations', 'feedback', 5000, false, '');
  await createBool('evaluations', 'isVisible', false, true);
  await sleep(500);

  // ── leaderboard ───────────────────────────────────────────────────────────
  await createCollection('leaderboard', 'leaderboard');
  await createStr('leaderboard', 'eventId', 36, true);
  await createStr('leaderboard', 'teamId', 36, true);
  await createStr('leaderboard', 'teamName', 255, false, '');
  await createStr('leaderboard', 'projectName', 255, false, '');
  await createInt('leaderboard', 'rank', false, 0);
  await createInt('leaderboard', 'totalScore', false, 0, 0, 100);
  await createInt('leaderboard', 'innovation', false, 0, 0, 100);
  await createInt('leaderboard', 'execution', false, 0, 0, 100);
  await createInt('leaderboard', 'presentation', false, 0, 0, 100);
  await createInt('leaderboard', 'impact', false, 0, 0, 100);
  await createInt('leaderboard', 'memberCount', false, 0);
  await createBool('leaderboard', 'isVisible', false, true);
  await sleep(500);

  // ── messages ──────────────────────────────────────────────────────────────
  await createCollection('messages', 'messages');
  await createStr('messages', 'teamId', 36, true);
  await createStr('messages', 'senderId', 36, true);
  await createStr('messages', 'senderName', 255, false, '');
  await createStr('messages', 'content', 5000, false, '');
  await createEnum('messages', 'type', ['text', 'file'], false, 'text');
  await createStr('messages', 'fileName', 255, false, '');
  await createStr('messages', 'fileId', 36, false, '');
  await createStr('messages', 'fileSize', 50, false, '');
  await createEnum('messages', 'status', ['sent', 'delivered', 'read'], false, 'sent');
  await sleep(500);

  // ── notifications ─────────────────────────────────────────────────────────
  await createCollection('notifications', 'notifications');
  await createStr('notifications', 'userId', 36, true);
  await createStr('notifications', 'title', 255, true);
  await createStr('notifications', 'body', 1000, false, '');
  await createEnum('notifications', 'type', ['invite', 'submission', 'result', 'announcement', 'system'], false, 'system');
  await createStr('notifications', 'referenceId', 36, false, '');
  await createBool('notifications', 'isRead', false, false);
  await sleep(500);

  // ── invites ───────────────────────────────────────────────────────────────
  await createCollection('invites', 'invites');
  await createStr('invites', 'teamId', 36, true);
  await createStr('invites', 'eventId', 36, true);
  await createStr('invites', 'inviterId', 36, true);
  await createStr('invites', 'inviterName', 255, false, '');
  await createStr('invites', 'inviteCode', 20, true);
  await createStr('invites', 'inviteLink', 500, false, '');
  await createInt('invites', 'clicks', false, 0);
  await createInt('invites', 'registrations', false, 0);
  await createStr('invites', 'expiresAt', 50, false, '');
  await sleep(500);

  // ── announcements ─────────────────────────────────────────────────────────
  await createCollection('announcements', 'announcements');
  await createStr('announcements', 'eventId', 36, true);
  await createStr('announcements', 'organizerId', 36, true);
  await createStr('announcements', 'title', 255, true);
  await createStr('announcements', 'content', 5000, true);
  await createEnum('announcements', 'type', ['general', 'urgent', 'result', 'schedule'], false, 'general');
  await createEnum('announcements', 'targetAudience', ['all', 'participants', 'judges'], false, 'all');
  await createBool('announcements', 'isPinned', false, false);
  await sleep(500);

  // ── availability ──────────────────────────────────────────────────────────
  await createCollection('availability', 'availability');
  await createStr('availability', 'userId', 36, true);
  await createStr('availability', 'teamId', 36, true);
  await createEnum('availability', 'status', ['online', 'offline', 'away', 'busy'], false, 'offline');
  await createStr('availability', 'lastSeen', 50, false, '');
  await createStr('availability', 'customMessage', 255, false, '');

  console.log('\n\n✅ All collections created successfully!');
  console.log('\nNext steps:');
  console.log('1. Go to Appwrite Console → Storage');
  console.log('2. Create 3 buckets: avatars, submission_files, event_banners');
  console.log('3. Set bucket permissions: read=any, write=users');
  console.log('4. Copy .env.example to .env and fill in your credentials');
  console.log('5. Run: npm install && npm run dev\n');
}

main().catch((e) => {
  console.error('\n❌ Setup failed:', e.message);
  process.exit(1);
});
