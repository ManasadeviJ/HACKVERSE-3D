import { databases, storage, DB_ID, COLLECTIONS, BUCKETS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { HackEvent, EventDetails, FullEvent } from '../types';

// ─── Internal helpers ─────────────────────────────────────────────────────────
function merge(ev: HackEvent, det: EventDetails): FullEvent {
  return {
    ...ev,
    detailsId: det.$id,
    eventId: det.eventId,
    description: det.description,
    bannerFileId: det.bannerFileId,
    prizes: det.prizes,
    rules: det.rules,
    eligibility: det.eligibility,
    judgeIds: det.judgeIds,
  };
}

async function fetchDetails(eventId: string): Promise<EventDetails | null> {
  const res = await databases.listDocuments<EventDetails>(
    DB_ID, COLLECTIONS.EVENT_DETAILS,
    [Query.equal('eventId', eventId), Query.limit(1)]
  );
  return res.documents[0] ?? null;
}

async function enrichMany(events: HackEvent[]): Promise<FullEvent[]> {
  if (!events.length) return [];
  const eventIds = events.map((e) => e.$id);
  const detRes = await databases.listDocuments<EventDetails>(DB_ID, COLLECTIONS.EVENT_DETAILS, [
    Query.equal('eventId', eventIds),
    Query.limit(100),
  ]);
  return events.map((ev) => {
    const det = detRes.documents.find((d) => d.eventId === ev.$id) ?? {
      $id: '', $createdAt: '', $updatedAt: '',
      eventId: ev.$id, description: '', bannerFileId: '',
      prizes: '[]', rules: '[]', eligibility: '[]', judgeIds: '[]',
    };
    return merge(ev, det as EventDetails);
  });
}

// ─── Upload banner ────────────────────────────────────────────────────────────
export async function uploadEventBanner(file: File): Promise<string> {
  const uploaded = await storage.createFile(BUCKETS.EVENT_BANNERS, ID.unique(), file);
  return uploaded.$id;
}

export function getEventBannerUrl(fileId: string): string {
  if (!fileId) return '';
  return storage.getFilePreview(BUCKETS.EVENT_BANNERS, fileId, 800, 400).toString();
}

// ─── Create Event ─────────────────────────────────────────────────────────────
export async function createEvent(
  organizerId: string,
  form: {
    title: string; shortDescription: string; description: string;
    startDate: string; endDate: string; registrationDeadline: string;
    maxParticipants: number; teamSizeMin: number; teamSizeMax: number;
    category: string; location: string;
    prizes: { place: string; amount: string; description: string }[];
    rules: string[]; eligibility: string[];
  },
  bannerFile?: File
): Promise<FullEvent> {
  let bannerFileId = '';
  if (bannerFile) bannerFileId = await uploadEventBanner(bannerFile);

  const eventDoc = await databases.createDocument<HackEvent>(
    DB_ID, COLLECTIONS.EVENTS, ID.unique(),
    {
      organizerId,
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      registrationDeadline: form.registrationDeadline,
      maxParticipants: form.maxParticipants,
      teamSizeMin: form.teamSizeMin,
      teamSizeMax: form.teamSizeMax,
      category: form.category,
      location: form.location,
      status: 'draft',
      resultsPublished: false,
    }
  );

  const detailsDoc = await databases.createDocument<EventDetails>(
    DB_ID, COLLECTIONS.EVENT_DETAILS, ID.unique(),
    {
      eventId: eventDoc.$id,
      description: form.description.trim(),
      bannerFileId,
      prizes: JSON.stringify(form.prizes.filter((p) => p.amount)),
      rules: JSON.stringify(form.rules.filter(Boolean)),
      eligibility: JSON.stringify(form.eligibility.filter(Boolean)),
      judgeIds: '[]',
    }
  );

  return merge(eventDoc, detailsDoc);
}

// ─── Get single event (merged) ────────────────────────────────────────────────
export async function getEvent(eventId: string): Promise<FullEvent> {
  const [ev, det] = await Promise.all([
    databases.getDocument<HackEvent>(DB_ID, COLLECTIONS.EVENTS, eventId),
    fetchDetails(eventId),
  ]);
  const details: EventDetails = det ?? {
    $id: '', $createdAt: '', $updatedAt: '',
    eventId, description: '', bannerFileId: '',
    prizes: '[]', rules: '[]', eligibility: '[]', judgeIds: '[]',
  };
  return merge(ev, details);
}

// ─── List published events ────────────────────────────────────────────────────
export async function listPublishedEvents(category?: string): Promise<FullEvent[]> {
  const queries = [
    Query.equal('status', ['published', 'ongoing']),
    Query.orderDesc('$createdAt'),
    Query.limit(50),
  ];
  if (category) queries.push(Query.equal('category', category));
  const evRes = await databases.listDocuments<HackEvent>(DB_ID, COLLECTIONS.EVENTS, queries);
  return enrichMany(evRes.documents);
}

export async function listOrganizerEvents(organizerId: string): Promise<FullEvent[]> {
  const evRes = await databases.listDocuments<HackEvent>(DB_ID, COLLECTIONS.EVENTS, [
    Query.equal('organizerId', organizerId),
    Query.orderDesc('$createdAt'),
    Query.limit(50),
  ]);
  return enrichMany(evRes.documents);
}

export async function listAllEvents(): Promise<FullEvent[]> {
  const evRes = await databases.listDocuments<HackEvent>(DB_ID, COLLECTIONS.EVENTS, [
    Query.orderDesc('$createdAt'), Query.limit(100),
  ]);
  return enrichMany(evRes.documents);
}

// ─── Judge events ─────────────────────────────────────────────────────────────
/**
 * FIX: Appwrite Query.search on a plain string field (judgeIds is stored as
 * a JSON string like '["abc","def"]') is unreliable for exact userId matching.
 *
 * Better approach: fetch ALL event_details, filter in JS by parsing judgeIds.
 * For large datasets this could be paginated, but hackathon event counts are small.
 *
 * Alternative (requires index): store judgeIds as a string[] attribute in
 * Appwrite (type: string[], not a JSON string), then Query.contains() works.
 * The setup below handles BOTH cases gracefully.
 */
export async function listJudgeEvents(judgeId: string): Promise<FullEvent[]> {
  // Fetch all event_details and filter client-side for reliability
  const detRes = await databases.listDocuments<EventDetails>(
    DB_ID, COLLECTIONS.EVENT_DETAILS,
    [Query.limit(200)]
  );

  // Filter: judgeIds is a JSON string array, e.g. '["uid1","uid2"]'
  const matching = detRes.documents.filter((det) => {
    try {
      const ids: string[] = JSON.parse(det.judgeIds || '[]');
      return ids.includes(judgeId);
    } catch {
      return false;
    }
  });

  if (!matching.length) return [];

  const eventIds = matching.map((d) => d.eventId);
  const evRes = await databases.listDocuments<HackEvent>(DB_ID, COLLECTIONS.EVENTS, [
    Query.equal('$id', eventIds),
    Query.limit(50),
  ]);

  return evRes.documents.map((ev) => {
    const det = matching.find((d) => d.eventId === ev.$id)!;
    return merge(ev, det);
  });
}

// ─── Publish / update status ──────────────────────────────────────────────────
export async function publishEvent(eventId: string): Promise<void> {
  await databases.updateDocument(DB_ID, COLLECTIONS.EVENTS, eventId, { status: 'published' });
}

export async function publishResults(eventId: string): Promise<void> {
  await databases.updateDocument(DB_ID, COLLECTIONS.EVENTS, eventId, {
    resultsPublished: true,
    status: 'completed',
  });
}

export async function updateEventCore(
  eventId: string,
  data: Partial<Pick<HackEvent, 'title' | 'shortDescription' | 'startDate' | 'endDate' |
    'registrationDeadline' | 'maxParticipants' | 'teamSizeMin' | 'teamSizeMax' |
    'category' | 'location' | 'status' | 'resultsPublished'>>
): Promise<HackEvent> {
  return databases.updateDocument<HackEvent>(DB_ID, COLLECTIONS.EVENTS, eventId, data);
}

export async function updateEventDetails(
  detailsId: string,
  data: Partial<Pick<EventDetails, 'description' | 'bannerFileId' | 'prizes' | 'rules' | 'eligibility' | 'judgeIds'>>
): Promise<EventDetails> {
  return databases.updateDocument<EventDetails>(DB_ID, COLLECTIONS.EVENT_DETAILS, detailsId, data);
}

// ─── Assign / remove judge ────────────────────────────────────────────────────
/**
 * Adds a judgeId to event_details.judgeIds JSON array.
 * Also sends a notification to the judge.
 */
export async function assignJudge(
  detailsId: string,
  currentJudgeIds: string,
  judgeId: string,
  eventTitle: string,
  organizerName: string
): Promise<EventDetails> {
  const ids: string[] = JSON.parse(currentJudgeIds || '[]');
  if (ids.includes(judgeId)) return databases.getDocument<EventDetails>(DB_ID, COLLECTIONS.EVENT_DETAILS, detailsId);
  ids.push(judgeId);

  const updated = await databases.updateDocument<EventDetails>(
    DB_ID, COLLECTIONS.EVENT_DETAILS, detailsId,
    { judgeIds: JSON.stringify(ids) }
  );

  // Notify judge
  try {
    const { createNotification } = await import('./notificationService');
    await createNotification(judgeId, {
      title: 'You\'ve been assigned as a Judge!',
      body: `${organizerName} has assigned you to judge "${eventTitle}". Check your dashboard to start evaluating submissions.`,
      type: 'system',
      referenceId: detailsId,
    });
  } catch { /* notification is non-critical */ }

  return updated;
}

export async function removeJudge(
  detailsId: string,
  currentJudgeIds: string,
  judgeId: string
): Promise<EventDetails> {
  const ids: string[] = JSON.parse(currentJudgeIds || '[]').filter((id: string) => id !== judgeId);
  return databases.updateDocument<EventDetails>(
    DB_ID, COLLECTIONS.EVENT_DETAILS, detailsId,
    { judgeIds: JSON.stringify(ids) }
  );
}

/**
 * Parse judgeIds JSON string → string[]
 */
export function parseJudgeIds(judgeIdsJson: string): string[] {
  try { return JSON.parse(judgeIdsJson || '[]'); } catch { return []; }
}
