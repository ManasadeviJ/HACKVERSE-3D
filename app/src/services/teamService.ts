import { databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Team, TeamMember, Profile } from '../types';
import { getProfileById, updateProfile } from './authService';
import { createNotification } from './notificationService';

// ─── Generate unique invite code ──────────────────────────────────────────────
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── Create Team ─────────────────────────────────────────────────────────────
export async function createTeam(
  eventId: string,
  leaderId: string,
  name: string,
  description: string,
  maxMembers: number
): Promise<Team> {
  const inviteCode = generateInviteCode();
  const inviteLink = `${window.location.origin}/invite/${inviteCode}`;

  const team = await databases.createDocument<Team>(DB_ID, COLLECTIONS.TEAMS, ID.unique(), {
    eventId,
    leaderId,
    name,
    description,
    maxMembers,
    inviteCode,
    inviteLink,
    status: 'open',
  });

  // Add leader as a team_member record
  await databases.createDocument<TeamMember>(DB_ID, COLLECTIONS.TEAM_MEMBERS, ID.unique(), {
    teamId: team.$id,
    userId: leaderId,
    eventId,
    role: 'leader',
    status: 'active',
    joinedAt: new Date().toISOString(),
  });

  // Update leader's teams count
  const profile = await getProfileById(leaderId);
  await updateProfile(leaderId, { teamsCount: (profile.teamsCount || 0) + 1 });

  // Create invite record
  await databases.createDocument(DB_ID, COLLECTIONS.INVITES, ID.unique(), {
    teamId: team.$id,
    eventId,
    inviterId: leaderId,
    inviterName: profile.name,
    inviteCode,
    inviteLink,
    clicks: 0,
    registrations: 0,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return team;
}

// ─── Get Team by ID ───────────────────────────────────────────────────────────
export async function getTeam(teamId: string): Promise<Team> {
  return databases.getDocument<Team>(DB_ID, COLLECTIONS.TEAMS, teamId);
}

// ─── Get team by invite code ──────────────────────────────────────────────────
export async function getTeamByInviteCode(code: string): Promise<Team | null> {
  const res = await databases.listDocuments<Team>(DB_ID, COLLECTIONS.TEAMS, [
    Query.equal('inviteCode', code),
    Query.limit(1),
  ]);
  if (!res.documents.length) return null;

  // Bump click count on invite
  const inviteRes = await databases.listDocuments(DB_ID, COLLECTIONS.INVITES, [
    Query.equal('inviteCode', code),
    Query.limit(1),
  ]);
  if (inviteRes.documents.length) {
    const inv = inviteRes.documents[0];
    await databases.updateDocument(DB_ID, COLLECTIONS.INVITES, inv.$id, {
      clicks: (inv.clicks || 0) + 1,
    });
  }

  return res.documents[0];
}

// ─── Join Team via Invite Code ────────────────────────────────────────────────
export async function joinTeamByCode(code: string, userId: string): Promise<TeamMember> {
  const team = await getTeamByInviteCode(code);
  if (!team) throw new Error('Invalid invite code');
  if (team.status === 'closed') throw new Error('Team is full or closed');

  // Check user not already in team
  const existing = await databases.listDocuments<TeamMember>(DB_ID, COLLECTIONS.TEAM_MEMBERS, [
    Query.equal('teamId', team.$id),
    Query.equal('userId', userId),
    Query.limit(1),
  ]);
  if (existing.documents.length) throw new Error('Already a member of this team');

  // Check team size
  const members = await getTeamMembers(team.$id);
  if (members.length >= team.maxMembers) {
    await databases.updateDocument(DB_ID, COLLECTIONS.TEAMS, team.$id, { status: 'closed' });
    throw new Error('Team is full');
  }

  const member = await databases.createDocument<TeamMember>(
    DB_ID,
    COLLECTIONS.TEAM_MEMBERS,
    ID.unique(),
    {
      teamId: team.$id,
      userId,
      eventId: team.eventId,
      role: 'member',
      status: 'active',
      joinedAt: new Date().toISOString(),
    }
  );

  // Update invite stats
  const inviteRes = await databases.listDocuments(DB_ID, COLLECTIONS.INVITES, [
    Query.equal('teamId', team.$id),
    Query.limit(1),
  ]);
  if (inviteRes.documents.length) {
    const inv = inviteRes.documents[0];
    await databases.updateDocument(DB_ID, COLLECTIONS.INVITES, inv.$id, {
      registrations: (inv.registrations || 0) + 1,
    });
  }

  // Notify leader
  const profile = await getProfileById(userId);
  await createNotification(team.leaderId, {
    title: 'New team member!',
    body: `${profile.name} joined your team "${team.name}"`,
    type: 'invite',
    referenceId: team.$id,
  });

  // Update user's teams count
  const joinerProfile = await getProfileById(userId);
  await updateProfile(userId, { teamsCount: (joinerProfile.teamsCount || 0) + 1 });

  // If team is now full, close it
  if (members.length + 1 >= team.maxMembers) {
    await databases.updateDocument(DB_ID, COLLECTIONS.TEAMS, team.$id, { status: 'closed' });
  }

  return member;
}

// ─── Get all members of a team ────────────────────────────────────────────────
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const res = await databases.listDocuments<TeamMember>(DB_ID, COLLECTIONS.TEAM_MEMBERS, [
    Query.equal('teamId', teamId),
    Query.equal('status', 'active'),
    Query.limit(20),
  ]);
  return res.documents;
}

// ─── Get teams for a user ─────────────────────────────────────────────────────
export async function getUserTeams(userId: string): Promise<Team[]> {
  const memberships = await databases.listDocuments<TeamMember>(
    DB_ID,
    COLLECTIONS.TEAM_MEMBERS,
    [Query.equal('userId', userId), Query.equal('status', 'active'), Query.limit(20)]
  );

  if (!memberships.documents.length) return [];

  const teamIds = memberships.documents.map((m) => m.teamId);
  const res = await databases.listDocuments<Team>(DB_ID, COLLECTIONS.TEAMS, [
    Query.equal('$id', teamIds),
    Query.limit(20),
  ]);
  return res.documents;
}

// ─── Get user's team for a specific event ─────────────────────────────────────
export async function getUserTeamForEvent(userId: string, eventId: string): Promise<Team | null> {
  const membership = await databases.listDocuments<TeamMember>(
    DB_ID,
    COLLECTIONS.TEAM_MEMBERS,
    [
      Query.equal('userId', userId),
      Query.equal('eventId', eventId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]
  );
  if (!membership.documents.length) return null;
  return getTeam(membership.documents[0].teamId);
}

// ─── Leave Team ───────────────────────────────────────────────────────────────
export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const memberships = await databases.listDocuments<TeamMember>(DB_ID, COLLECTIONS.TEAM_MEMBERS, [
    Query.equal('teamId', teamId),
    Query.equal('userId', userId),
    Query.limit(1),
  ]);
  if (!memberships.documents.length) return;

  await databases.updateDocument(DB_ID, COLLECTIONS.TEAM_MEMBERS, memberships.documents[0].$id, {
    status: 'rejected',
  });

  // Re-open team if it was closed
  const team = await getTeam(teamId);
  if (team.status === 'closed') {
    await databases.updateDocument(DB_ID, COLLECTIONS.TEAMS, teamId, { status: 'open' });
  }
}

// ─── Remove member (leader only) ─────────────────────────────────────────────
export async function removeMember(teamId: string, targetUserId: string, requesterId: string): Promise<void> {
  const team = await getTeam(teamId);
  if (team.leaderId !== requesterId) throw new Error('Only the team leader can remove members');

  await leaveTeam(teamId, targetUserId);
  await createNotification(targetUserId, {
    title: 'Removed from team',
    body: `You have been removed from team "${team.name}"`,
    type: 'invite',
    referenceId: teamId,
  });
}

// ─── Get all teams for an event (organizer view) ──────────────────────────────
export async function getEventTeams(eventId: string): Promise<Team[]> {
  const res = await databases.listDocuments<Team>(DB_ID, COLLECTIONS.TEAMS, [
    Query.equal('eventId', eventId),
    Query.orderAsc('name'),
    Query.limit(200),
  ]);
  return res.documents;
}

// ─── Get invite stats ─────────────────────────────────────────────────────────
export async function getInviteStats(teamId: string) {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.INVITES, [
    Query.equal('teamId', teamId),
    Query.limit(1),
  ]);
  return res.documents[0] || null;
}
