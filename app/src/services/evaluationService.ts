import { databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Evaluation, LeaderboardEntry } from '../types';
import { createNotification } from './notificationService';
import { getEvent } from './eventService';
import { getTeam } from './teamService';
import { updateProfile, getProfileById } from './authService';

// ─── Submit / Update Evaluation ───────────────────────────────────────────────
export async function submitEvaluation(
  judgeId: string,
  submissionId: string,
  eventId: string,
  teamId: string,
  scores: {
    innovation: number;
    execution: number;
    presentation: number;
    impact: number;
  },
  feedback: string
): Promise<Evaluation> {
  const totalScore = Math.round(
    (scores.innovation + scores.execution + scores.presentation + scores.impact) / 4
  );

  // Check for existing evaluation by this judge
  const existing = await databases.listDocuments<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, [
    Query.equal('submissionId', submissionId),
    Query.equal('judgeId', judgeId),
    Query.limit(1),
  ]);

  let evaluation: Evaluation;

  if (existing.documents.length) {
    evaluation = await databases.updateDocument<Evaluation>(
      DB_ID,
      COLLECTIONS.EVALUATIONS,
      existing.documents[0].$id,
      { ...scores, totalScore, feedback }
    );
  } else {
    evaluation = await databases.createDocument<Evaluation>(
      DB_ID,
      COLLECTIONS.EVALUATIONS,
      ID.unique(),
      {
        submissionId,
        eventId,
        teamId,
        judgeId,
        ...scores,
        totalScore,
        feedback,
        isVisible: true,
      }
    );

    // Mark submission as evaluated
    await databases.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId, {
      status: 'evaluated',
    });
  }

  // Recompute leaderboard entry for this team
  await recomputeLeaderboardEntry(eventId, teamId);

  // Notify team leader
  const team = await getTeam(teamId);
  await createNotification(team.leaderId, {
    title: 'Evaluation Received',
    body: `Your project has been evaluated. Score: ${totalScore}/100`,
    type: 'result',
    referenceId: submissionId,
  });

  return evaluation;
}

// ─── Toggle evaluation visibility in leaderboard ─────────────────────────────
export async function toggleEvaluationVisibility(
  evaluationId: string,
  judgeId: string
): Promise<Evaluation> {
  const ev = await databases.getDocument<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, evaluationId);
  if (ev.judgeId !== judgeId) throw new Error('Unauthorized');

  const updated = await databases.updateDocument<Evaluation>(
    DB_ID,
    COLLECTIONS.EVALUATIONS,
    evaluationId,
    { isVisible: !ev.isVisible }
  );

  await recomputeLeaderboardEntry(ev.eventId, ev.teamId);
  return updated;
}

// ─── Recompute average score across all visible evaluations for a team ────────
async function recomputeLeaderboardEntry(eventId: string, teamId: string): Promise<void> {
  const evals = await databases.listDocuments<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, [
    Query.equal('eventId', eventId),
    Query.equal('teamId', teamId),
    Query.equal('isVisible', true),
    Query.limit(20),
  ]);

  if (!evals.documents.length) return;

  const avg = (field: keyof Pick<Evaluation, 'innovation' | 'execution' | 'presentation' | 'impact' | 'totalScore'>) =>
    Math.round(evals.documents.reduce((sum, e) => sum + e[field], 0) / evals.documents.length);

  const team = await getTeam(teamId);
  const memberCount = (
    await databases.listDocuments(DB_ID, COLLECTIONS.TEAM_MEMBERS, [
      Query.equal('teamId', teamId),
      Query.equal('status', 'active'),
      Query.limit(20),
    ])
  ).total;

  // Get submission for project name
  const subRes = await databases.listDocuments(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.equal('teamId', teamId),
    Query.equal('eventId', eventId),
    Query.limit(1),
  ]);
  const projectName = subRes.documents[0]?.projectName || '';

  // Upsert leaderboard entry
  const existing = await databases.listDocuments<LeaderboardEntry>(
    DB_ID,
    COLLECTIONS.LEADERBOARD,
    [Query.equal('eventId', eventId), Query.equal('teamId', teamId), Query.limit(1)]
  );

  const payload = {
    eventId,
    teamId,
    teamName: team.name,
    projectName,
    totalScore: avg('totalScore'),
    innovation: avg('innovation'),
    execution: avg('execution'),
    presentation: avg('presentation'),
    impact: avg('impact'),
    memberCount,
    isVisible: true,
    rank: 0, // recomputed below
  };

  if (existing.documents.length) {
    await databases.updateDocument(DB_ID, COLLECTIONS.LEADERBOARD, existing.documents[0].$id, payload);
  } else {
    await databases.createDocument(DB_ID, COLLECTIONS.LEADERBOARD, ID.unique(), payload);
  }

  // Re-rank all teams in this event
  await reRankEvent(eventId);
}

// ─── Re-rank all leaderboard entries for an event ────────────────────────────
async function reRankEvent(eventId: string): Promise<void> {
  const entries = await databases.listDocuments<LeaderboardEntry>(
    DB_ID,
    COLLECTIONS.LEADERBOARD,
    [Query.equal('eventId', eventId), Query.orderDesc('totalScore'), Query.limit(200)]
  );

  const updates = entries.documents.map((entry, i) =>
    databases.updateDocument(DB_ID, COLLECTIONS.LEADERBOARD, entry.$id, { rank: i + 1 })
  );
  await Promise.all(updates);

  // Award winner — update profile winsCount for rank 1
  if (entries.documents.length > 0) {
    const winner = entries.documents[0];
    const team = await getTeam(winner.teamId);
    const profile = await getProfileById(team.leaderId);
    const event = await getEvent(eventId);
    if (event.resultsPublished) {
      await updateProfile(team.leaderId, { winsCount: (profile.winsCount || 0) + 1 });
    }
  }
}

// ─── Get leaderboard for event ────────────────────────────────────────────────
export async function getLeaderboard(
  eventId?: string,
  visibleOnly = true
): Promise<LeaderboardEntry[]> {
  const queries: string[] = [
    Query.orderAsc('rank'),
    Query.limit(100),
  ];
  if (eventId) queries.push(Query.equal('eventId', eventId));
  if (visibleOnly) queries.push(Query.equal('isVisible', true));

  const res = await databases.listDocuments<LeaderboardEntry>(DB_ID, COLLECTIONS.LEADERBOARD, queries);
  return res.documents;
}

// ─── Get evaluations for a judge ─────────────────────────────────────────────
export async function getJudgeEvaluations(judgeId: string): Promise<Evaluation[]> {
  const res = await databases.listDocuments<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, [
    Query.equal('judgeId', judgeId),
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ]);
  return res.documents;
}

// ─── Get evaluation for a specific submission by judge ────────────────────────
export async function getEvaluationByJudge(
  submissionId: string,
  judgeId: string
): Promise<Evaluation | null> {
  const res = await databases.listDocuments<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, [
    Query.equal('submissionId', submissionId),
    Query.equal('judgeId', judgeId),
    Query.limit(1),
  ]);
  return res.documents[0] || null;
}
