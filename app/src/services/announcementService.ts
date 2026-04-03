import { databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Announcement } from '../types';
import { createNotification } from './notificationService';
import { getEventRegistrations } from './registrationService';

export async function createAnnouncement(
  eventId: string,
  organizerId: string,
  data: {
    title: string;
    content: string;
    type: Announcement['type'];
    targetAudience: Announcement['targetAudience'];
    isPinned: boolean;
  }
): Promise<Announcement> {
  const ann = await databases.createDocument<Announcement>(
    DB_ID,
    COLLECTIONS.ANNOUNCEMENTS,
    ID.unique(),
    { ...data, eventId, organizerId }
  );

  // Fan-out notifications to all registered participants
  const registrations = await getEventRegistrations(eventId);
  const targets =
    data.targetAudience === 'all'
      ? registrations
      : data.targetAudience === 'participants'
      ? registrations.filter((r) => r.status === 'confirmed')
      : registrations;

  // batch — fire and forget, no await to avoid slow UI
  targets.forEach((r) =>
    createNotification(r.userId, {
      title: data.title,
      body: data.content.slice(0, 120),
      type: 'announcement',
      referenceId: ann.$id,
    }).catch(() => {})
  );

  return ann;
}

export async function getEventAnnouncements(eventId: string): Promise<Announcement[]> {
  const res = await databases.listDocuments<Announcement>(DB_ID, COLLECTIONS.ANNOUNCEMENTS, [
    Query.equal('eventId', eventId),
    Query.orderDesc('$createdAt'),
    Query.limit(50),
  ]);
  return res.documents;
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  await databases.deleteDocument(DB_ID, COLLECTIONS.ANNOUNCEMENTS, announcementId);
}

export async function pinAnnouncement(announcementId: string, pinned: boolean): Promise<Announcement> {
  return databases.updateDocument<Announcement>(DB_ID, COLLECTIONS.ANNOUNCEMENTS, announcementId, {
    isPinned: pinned,
  });
}

export async function getOrganizerAnnouncements(organizerId: string): Promise<Announcement[]> {
  const res = await databases.listDocuments<Announcement>(DB_ID, COLLECTIONS.ANNOUNCEMENTS, [
    Query.equal('organizerId', organizerId),
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ]);
  return res.documents;
}
