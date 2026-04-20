import { databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Evaluation, LeaderboardEntry, Submission, Team } from '../types';

// ─── Submit / Update Evaluation ───────────────────────────────────────────────
export async function submitEvaluation(
  judgeId: string,
  submissionId: string,
  eventId: string,
  teamId: string,
  scores: { innovation: number; execution: number; presentation: number; impact: number },
  feedback: string
): Promise<Evaluation> {
  const totalScore = Math.round(
    (scores.innovation + scores.execution + scores.presentation + scores.impact) / 4
  );

  // Check for existing evaluation by this judge for this submission
  const existing = await databases.listDocuments<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, [
    Query.equal('submissionId', submissionId),
    Query.equal('judgeId', judgeId),
    Query.limit(1),
  ]);

  let evaluation: Evaluation;

  if (existing.documents.length) {
    evaluation = await databases.updateDocument<Evaluation>(
      DB_ID, COLLECTIONS.EVALUATIONS, existing.documents[0].$id,
      { ...scores, totalScore, feedback }
    );
  } else {
    evaluation = await databases.createDocument<Evaluation>(
      DB_ID, COLLECTIONS.EVALUATIONS, ID.unique(),
      { submissionId, eventId, teamId, judgeId, ...scores, totalScore, feedback, isVisible: true }
    );
    // Mark submission as evaluated
    await databases.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId, { status: 'evaluated' });
  }

  // Always recompute leaderboard after evaluation
  await recomputeLeaderboardEntry(eventId, teamId);

  // In-app notification to team leader
  try {
    const teamDoc = await databases.getDocument<Team>(DB_ID, COLLECTIONS.TEAMS, teamId);
    await databases.createDocument(DB_ID, COLLECTIONS.NOTIFICATIONS, ID.unique(), {
      userId: teamDoc.leaderId,
      title: '🏆 Evaluation Received',
      body: `Your project has been evaluated. Score: ${totalScore}/100. Check the leaderboard once results are published.`,
      type: 'result',
      referenceId: submissionId,
      isRead: false,
    });
  } catch { /* notification is non-critical */ }

  return evaluation;
}

// ─── Toggle evaluation visibility ────────────────────────────────────────────
export async function toggleEvaluationVisibility(
  evaluationId: string,
  judgeId: string
): Promise<Evaluation> {
  const ev = await databases.getDocument<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, evaluationId);
  if (ev.judgeId !== judgeId) throw new Error('Unauthorized');
  const updated = await databases.updateDocument<Evaluation>(
    DB_ID, COLLECTIONS.EVALUATIONS, evaluationId, { isVisible: !ev.isVisible }
  );
  await recomputeLeaderboardEntry(ev.eventId, ev.teamId);
  return updated;
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

// ─── Get evaluation by judge for a submission ─────────────────────────────────
export async function getEvaluationByJudge(
  submissionId: string, judgeId: string
): Promise<Evaluation | null> {
  const res = await databases.listDocuments<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, [
    Query.equal('submissionId', submissionId),
    Query.equal('judgeId', judgeId),
    Query.limit(1),
  ]);
  return res.documents[0] || null;
}

// ─── Recompute leaderboard entry from evaluations ────────────────────────────
/**
 * FIX: This function now always upserts the leaderboard entry regardless of
 * resultsPublished state. resultsPublished only controls DISPLAY, not storage.
 * This means scores accumulate as judges evaluate, and the display is gated
 * by resultsPublished flag on the frontend.
 */
async function recomputeLeaderboardEntry(eventId: string, teamId: string): Promise<void> {
  // Get all visible evaluations for this team in this event
  const evalsRes = await databases.listDocuments<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, [
    Query.equal('eventId', eventId),
    Query.equal('teamId', teamId),
    Query.equal('isVisible', true),
    Query.limit(50),
  ]);

  if (!evalsRes.documents.length) return;

  const evals = evalsRes.documents;
  const avg = (field: 'innovation' | 'execution' | 'presentation' | 'impact' | 'totalScore') =>
    Math.round(evals.reduce((s, e) => s + e[field], 0) / evals.length);

  // Get team info
  const team = await databases.getDocument<Team>(DB_ID, COLLECTIONS.TEAMS, teamId);

  // Get member count
  const memRes = await databases.listDocuments(DB_ID, COLLECTIONS.TEAM_MEMBERS, [
    Query.equal('teamId', teamId),
    Query.equal('status', 'active'),
    Query.limit(20),
  ]);

  // Get project name from submission
  const subRes = await databases.listDocuments<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.equal('teamId', teamId),
    Query.equal('eventId', eventId),
    Query.limit(1),
  ]);
  const projectName = subRes.documents[0]?.projectName || team.name;

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
    memberCount: memRes.total || memRes.documents.length,
    isVisible: true,
    rank: 0,
  };

  // Upsert: find existing entry for this team+event
  const existing = await databases.listDocuments<LeaderboardEntry>(DB_ID, COLLECTIONS.LEADERBOARD, [
    Query.equal('eventId', eventId),
    Query.equal('teamId', teamId),
    Query.limit(1),
  ]);

  if (existing.documents.length) {
    await databases.updateDocument(DB_ID, COLLECTIONS.LEADERBOARD, existing.documents[0].$id, payload);
  } else {
    await databases.createDocument(DB_ID, COLLECTIONS.LEADERBOARD, ID.unique(), payload);
  }

  // Re-rank ALL teams in this event
  await reRankEvent(eventId);
}

// ─── Re-rank all entries for an event ────────────────────────────────────────
export async function reRankEvent(eventId: string): Promise<void> {
  const entries = await databases.listDocuments<LeaderboardEntry>(DB_ID, COLLECTIONS.LEADERBOARD, [
    Query.equal('eventId', eventId),
    Query.orderDesc('totalScore'),
    Query.limit(500),
  ]);
  if (!entries.documents.length) return;

  await Promise.all(
    entries.documents.map((entry, i) =>
      databases.updateDocument(DB_ID, COLLECTIONS.LEADERBOARD, entry.$id, { rank: i + 1 })
    )
  );
}

// ─── Get leaderboard for a specific event ────────────────────────────────────
/**
 * FIX: Always requires eventId. No cross-event mixing.
 * resultsPublished check is done by the caller (frontend).
 * visibleOnly filters isVisible flag set by judges.
 */
export async function getLeaderboard(
  eventId: string,
  visibleOnly = true
): Promise<LeaderboardEntry[]> {
  const queries = [
    Query.equal('eventId', eventId),   // ALWAYS per-event
    Query.orderAsc('rank'),
    Query.limit(200),
  ];
  if (visibleOnly) queries.push(Query.equal('isVisible', true));

  const res = await databases.listDocuments<LeaderboardEntry>(DB_ID, COLLECTIONS.LEADERBOARD, queries);
  return res.documents;
}

/**
 * Compute leaderboard on-the-fly from evaluations if no leaderboard entries exist.
 * Used as a fallback for organizers to preview before publishing.
 */
export async function computeLeaderboardFromEvals(eventId: string): Promise<LeaderboardEntry[]> {
  // Get all evaluations for this event
  const evalsRes = await databases.listDocuments<Evaluation>(DB_ID, COLLECTIONS.EVALUATIONS, [
    Query.equal('eventId', eventId),
    Query.equal('isVisible', true),
    Query.limit(500),
  ]);

  if (!evalsRes.documents.length) return [];

  // Group by teamId
  const byTeam: Record<string, Evaluation[]> = {};
  for (const ev of evalsRes.documents) {
    if (!byTeam[ev.teamId]) byTeam[ev.teamId] = [];
    byTeam[ev.teamId].push(ev);
  }

  // Build entry per team
  const entries: LeaderboardEntry[] = await Promise.all(
    Object.entries(byTeam).map(async ([teamId, evals]) => {
      const avg = (f: 'innovation' | 'execution' | 'presentation' | 'impact' | 'totalScore') =>
        Math.round(evals.reduce((s, e) => s + e[f], 0) / evals.length);

      let teamName = teamId;
      let projectName = '';
      let memberCount = 1;

      try {
        const team = await databases.getDocument<Team>(DB_ID, COLLECTIONS.TEAMS, teamId);
        teamName = team.name;
      } catch { /* ignore */ }

      try {
        const sub = await databases.listDocuments<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, [
          Query.equal('teamId', teamId), Query.equal('eventId', eventId), Query.limit(1),
        ]);
        projectName = sub.documents[0]?.projectName || '';
      } catch { /* ignore */ }

      return {
        $id: `computed-${teamId}`,
        $updatedAt: new Date().toISOString(),
        eventId,
        teamId,
        teamName,
        projectName,
        rank: 0,
        totalScore: avg('totalScore'),
        innovation: avg('innovation'),
        execution: avg('execution'),
        presentation: avg('presentation'),
        impact: avg('impact'),
        memberCount,
        isVisible: true,
      } as LeaderboardEntry;
    })
  );

  // Sort by score
  return entries
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}
