import { databases, storage, DB_ID, COLLECTIONS, BUCKETS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Submission } from '../types';
import { createNotification } from './notificationService';
import { getEvent } from './eventService';
import { updateProfile, getProfileById } from './authService';

// ─── Create / Update Submission ───────────────────────────────────────────────
export async function upsertSubmission(
  eventId: string,
  teamId: string,
  leaderId: string,
  data: {
    projectName: string;
    description: string;
    techStack: string[];
    githubUrl: string;
    demoUrl: string;
    videoUrl: string;
    presentationUrl: string;
  }
): Promise<Submission> {
  // Check if submission already exists for this team + event
  const existing = await databases.listDocuments<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.equal('teamId', teamId),
    Query.equal('eventId', eventId),
    Query.limit(1),
  ]);

  const payload = {
    eventId,
    teamId,
    leaderId,
    ...data,
    techStack: JSON.stringify(data.techStack),
    status: 'draft',
  };

  if (existing.documents.length) {
    return databases.updateDocument<Submission>(
      DB_ID,
      COLLECTIONS.SUBMISSIONS,
      existing.documents[0].$id,
      payload
    );
  }

  return databases.createDocument<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, ID.unique(), {
    ...payload,
    fileIds: '[]',
    submittedAt: '',
  });
}

// ─── Upload Submission File ───────────────────────────────────────────────────
export async function uploadSubmissionFile(
  submissionId: string,
  file: File
): Promise<{ fileId: string; fileName: string; fileSize: string }> {
  const uploaded = await storage.createFile(BUCKETS.SUBMISSIONS, ID.unique(), file);

  // Append file ID to submission
  const submission = await databases.getDocument<Submission>(
    DB_ID,
    COLLECTIONS.SUBMISSIONS,
    submissionId
  );
  const fileIds: string[] = JSON.parse(submission.fileIds || '[]');
  fileIds.push(uploaded.$id);

  await databases.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId, {
    fileIds: JSON.stringify(fileIds),
  });

  return {
    fileId: uploaded.$id,
    fileName: uploaded.name,
    fileSize: `${(uploaded.sizeOriginal / 1024 / 1024).toFixed(1)} MB`,
  };
}

// ─── Remove Submission File ───────────────────────────────────────────────────
export async function removeSubmissionFile(submissionId: string, fileId: string): Promise<void> {
  await storage.deleteFile(BUCKETS.SUBMISSIONS, fileId);
  const submission = await databases.getDocument<Submission>(
    DB_ID,
    COLLECTIONS.SUBMISSIONS,
    submissionId
  );
  const fileIds: string[] = JSON.parse(submission.fileIds || '[]').filter((id: string) => id !== fileId);
  await databases.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId, {
    fileIds: JSON.stringify(fileIds),
  });
}

// ─── Submit (finalize) ────────────────────────────────────────────────────────
export async function finalizeSubmission(submissionId: string, leaderId: string): Promise<Submission> {
  const submission = await databases.updateDocument<Submission>(
    DB_ID,
    COLLECTIONS.SUBMISSIONS,
    submissionId,
    {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    }
  );

  // Notify organizer
  const event = await getEvent(submission.eventId);
  await createNotification(event.organizerId, {
    title: 'New Submission',
    body: `Team submitted "${submission.projectName}" for ${event.title}`,
    type: 'submission',
    referenceId: submissionId,
  });

  // Update participant stats
  const profile = await getProfileById(leaderId);
  await updateProfile(leaderId, { projectsCount: (profile.projectsCount || 0) + 1 });

  return submission;
}

// ─── Get submission for team ──────────────────────────────────────────────────
export async function getTeamSubmission(teamId: string, eventId: string): Promise<Submission | null> {
  const res = await databases.listDocuments<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.equal('teamId', teamId),
    Query.equal('eventId', eventId),
    Query.limit(1),
  ]);
  return res.documents[0] || null;
}

// ─── Get all submissions for an event (judge/organizer) ───────────────────────
export async function getEventSubmissions(eventId: string): Promise<Submission[]> {
  const res = await databases.listDocuments<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.equal('eventId', eventId),
    Query.equal('status', ['submitted', 'under_review', 'evaluated']),
    Query.orderDesc('$createdAt'),
    Query.limit(200),
  ]);
  return res.documents;
}

// ─── Get submission file preview URL ─────────────────────────────────────────
export function getSubmissionFileUrl(fileId: string): string {
  return storage.getFileView(BUCKETS.SUBMISSIONS, fileId).toString();
}
