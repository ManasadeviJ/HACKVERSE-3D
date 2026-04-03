import { databases, storage, DB_ID, COLLECTIONS, BUCKETS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { HackEvent, EventDetails, FullEvent } from '../types';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Merge a HackEvent + EventDetails into one FullEvent object */
function merge(ev: HackEvent, det: EventDetails): FullEvent {
  return {
    // from events
    ...ev,
    // from event_details (all except its own $id/$createdAt/$updatedAt)
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

/** Fetch event_details row for a given eventId */
async function fetchDetails(eventId: string): Promise<EventDetails | null> {
  const res = await databases.listDocuments<EventDetails>(
    DB_ID, COLLECTIONS.EVENT_DETAILS,
    [Query.equal('eventId', eventId), Query.limit(1)]
  );
  return res.documents[0] ?? null;
}

// ─── Upload banner to Storage ─────────────────────────────────────────────────
export async function uploadEventBanner(file: File): Promise<string> {
  const uploaded = await storage.createFile(BUCKETS.EVENT_BANNERS, ID.unique(), file);
  return uploaded.$id;
}

export function getEventBannerUrl(fileId: string): string {
  if (!fileId) return '';
  // Use the real bucket ID from appwrite.ts
  return storage.getFilePreview(BUCKETS.EVENT_BANNERS, fileId, 800, 400).toString();
}

// ─── Create Event (writes to BOTH collections) ───────────────────────────────
export async function createEvent(
  organizerId: string,
  form: {
    title: string;
    shortDescription: string;
    description: string;
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    maxParticipants: number;
    teamSizeMin: number;
    teamSizeMax: number;
    category: string;
    location: string;
    prizes: { place: string; amount: string; description: string }[];
    rules: string[];
    eligibility: string[];
  },
  bannerFile?: File
): Promise<FullEvent> {

  // 1. Upload banner first (if provided)
  let bannerFileId = '';
  if (bannerFile) {
    bannerFileId = await uploadEventBanner(bannerFile);
  }

  // 2. Write core fields to `events` collection
  //    Only the columns that exist in your events table!
  const eventDoc = await databases.createDocument<HackEvent>(
    DB_ID,
    COLLECTIONS.EVENTS,
    ID.unique(),
    {
      organizerId,
      title: form.title,
      shortDescription: form.shortDescription,
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

  // 3. Write rich fields to `event_details` collection
  const detailsDoc = await databases.createDocument<EventDetails>(
    DB_ID,
    COLLECTIONS.EVENT_DETAILS,
    ID.unique(),
    {
      eventId: eventDoc.$id,
      description: form.description,
      bannerFileId,
      prizes: JSON.stringify(form.prizes.filter((p) => p.amount)),
      rules: JSON.stringify(form.rules.filter(Boolean)),
      eligibility: JSON.stringify(form.eligibility.filter(Boolean)),
      judgeIds: '[]',
    }
  );

  return merge(eventDoc, detailsDoc);
}

// ─── Get one event (merged) ───────────────────────────────────────────────────
export async function getEvent(eventId: string): Promise<FullEvent> {
  const [ev, det] = await Promise.all([
    databases.getDocument<HackEvent>(DB_ID, COLLECTIONS.EVENTS, eventId),
    fetchDetails(eventId),
  ]);

  // If event_details row doesn't exist yet, return with defaults
  const details: EventDetails = det ?? {
    $id: '', $createdAt: '', $updatedAt: '',
    eventId, description: '', bannerFileId: '',
    prizes: '[]', rules: '[]', eligibility: '[]', judgeIds: '[]',
  };

  return merge(ev, details);
}

// ─── List published events (merged) ──────────────────────────────────────────
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
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ]);
  return enrichMany(evRes.documents);
}

/** For judge: events where judgeIds contains the judgeId (search in event_details) */
export async function listJudgeEvents(judgeId: string): Promise<FullEvent[]> {
  const detRes = await databases.listDocuments<EventDetails>(DB_ID, COLLECTIONS.EVENT_DETAILS, [
    Query.search('judgeIds', judgeId),
    Query.limit(50),
  ]);
  if (!detRes.documents.length) return [];

  const eventIds = detRes.documents.map((d) => d.eventId);
  const evRes = await databases.listDocuments<HackEvent>(DB_ID, COLLECTIONS.EVENTS, [
    Query.equal('$id', eventIds),
    Query.limit(50),
  ]);

  // Merge in order
  return evRes.documents.map((ev) => {
    const det = detRes.documents.find((d) => d.eventId === ev.$id)!;
    return merge(ev, det);
  });
}

// ─── Batch enrich: fetch details for multiple events ─────────────────────────
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

// ─── Update Event core ────────────────────────────────────────────────────────
export async function updateEventCore(
  eventId: string,
  data: Partial<Pick<HackEvent, 'title' | 'shortDescription' | 'startDate' | 'endDate' | 'registrationDeadline' | 'maxParticipants' | 'teamSizeMin' | 'teamSizeMax' | 'category' | 'location' | 'status' | 'resultsPublished'>>
): Promise<HackEvent> {
  return databases.updateDocument<HackEvent>(DB_ID, COLLECTIONS.EVENTS, eventId, data);
}

// ─── Update Event details ─────────────────────────────────────────────────────
export async function updateEventDetails(
  detailsId: string,
  data: Partial<Pick<EventDetails, 'description' | 'bannerFileId' | 'prizes' | 'rules' | 'eligibility' | 'judgeIds'>>
): Promise<EventDetails> {
  return databases.updateDocument<EventDetails>(DB_ID, COLLECTIONS.EVENT_DETAILS, detailsId, data);
}

// ─── Publish event ────────────────────────────────────────────────────────────
export async function publishEvent(eventId: string): Promise<void> {
  await databases.updateDocument(DB_ID, COLLECTIONS.EVENTS, eventId, { status: 'published' });
}

// ─── Publish results ──────────────────────────────────────────────────────────
export async function publishResults(eventId: string): Promise<void> {
  await databases.updateDocument(DB_ID, COLLECTIONS.EVENTS, eventId, {
    resultsPublished: true,
    status: 'completed',
  });
}

// ─── Assign / remove judge (writes to event_details.judgeIds) ─────────────────
export async function assignJudge(detailsId: string, currentJudgeIds: string, judgeId: string): Promise<EventDetails> {
  const ids: string[] = JSON.parse(currentJudgeIds || '[]');
  if (!ids.includes(judgeId)) ids.push(judgeId);
  return databases.updateDocument<EventDetails>(DB_ID, COLLECTIONS.EVENT_DETAILS, detailsId, {
    judgeIds: JSON.stringify(ids),
  });
}

export async function removeJudge(detailsId: string, currentJudgeIds: string, judgeId: string): Promise<EventDetails> {
  const ids: string[] = JSON.parse(currentJudgeIds || '[]').filter((id: string) => id !== judgeId);
  return databases.updateDocument<EventDetails>(DB_ID, COLLECTIONS.EVENT_DETAILS, detailsId, {
    judgeIds: JSON.stringify(ids),
  });
}
