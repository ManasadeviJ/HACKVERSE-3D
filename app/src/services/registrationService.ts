import { databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Registration } from '../types';
import { createNotification } from './notificationService';
import { getEvent } from './eventService';
import { updateProfile, getProfileById } from './authService';

export async function registerForEvent(
  eventId: string,
  userId: string,
  teamId: string,
  data: Omit<Registration, '$id' | '$createdAt' | 'eventId' | 'userId' | 'teamId' | 'status'>
): Promise<Registration> {
  // Prevent duplicate registration
  const existing = await databases.listDocuments<Registration>(DB_ID, COLLECTIONS.REGISTRATIONS, [
    Query.equal('eventId', eventId),
    Query.equal('userId', userId),
    Query.limit(1),
  ]);
  if (existing.documents.length) throw new Error('Already registered for this event');

  const reg = await databases.createDocument<Registration>(
    DB_ID,
    COLLECTIONS.REGISTRATIONS,
    ID.unique(),
    { ...data, eventId, userId, teamId, status: 'pending' }
  );

  // Notify organizer
  const event = await getEvent(eventId);
  await createNotification(event.organizerId, {
    title: 'New Registration',
    body: `${data.participantName} registered for ${event.title}`,
    type: 'system',
    referenceId: reg.$id,
  });

  // Increment user hackathon count
  const profile = await getProfileById(userId);
  await updateProfile(userId, { hackathonsCount: (profile.hackathonsCount || 0) + 1 });

  return reg;
}

export async function getUserRegistrations(userId: string): Promise<Registration[]> {
  const res = await databases.listDocuments<Registration>(DB_ID, COLLECTIONS.REGISTRATIONS, [
    Query.equal('userId', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(50),
  ]);
  return res.documents;
}

export async function getEventRegistrations(eventId: string): Promise<Registration[]> {
  const res = await databases.listDocuments<Registration>(DB_ID, COLLECTIONS.REGISTRATIONS, [
    Query.equal('eventId', eventId),
    Query.orderDesc('$createdAt'),
    Query.limit(500),
  ]);
  return res.documents;
}

export async function isRegistered(userId: string, eventId: string): Promise<boolean> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.REGISTRATIONS, [
    Query.equal('userId', userId),
    Query.equal('eventId', eventId),
    Query.limit(1),
  ]);
  return res.documents.length > 0;
}

export async function confirmRegistration(registrationId: string): Promise<Registration> {
  return databases.updateDocument<Registration>(DB_ID, COLLECTIONS.REGISTRATIONS, registrationId, {
    status: 'confirmed',
  });
}

export async function cancelRegistration(registrationId: string): Promise<Registration> {
  return databases.updateDocument<Registration>(DB_ID, COLLECTIONS.REGISTRATIONS, registrationId, {
    status: 'cancelled',
  });
}
