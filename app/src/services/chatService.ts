import { databases, storage, realtime, DB_ID, COLLECTIONS, BUCKETS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Message, Availability } from '../types';

// ─── Send Message ─────────────────────────────────────────────────────────────
export async function sendMessage(
  teamId: string,
  senderId: string,
  senderName: string,
  content: string
): Promise<Message> {
  return databases.createDocument<Message>(DB_ID, COLLECTIONS.MESSAGES, ID.unique(), {
    teamId,
    senderId,
    senderName,
    content,
    type: 'text',
    fileName: '',
    fileId: '',
    fileSize: '',
    status: 'sent',
  });
}

// ─── Send File Message ────────────────────────────────────────────────────────
export async function sendFileMessage(
  teamId: string,
  senderId: string,
  senderName: string,
  file: File
): Promise<Message> {
  const uploaded = await storage.createFile(BUCKETS.SUBMISSIONS, ID.unique(), file);
  const fileSize = `${(uploaded.sizeOriginal / 1024).toFixed(0)} KB`;

  return databases.createDocument<Message>(DB_ID, COLLECTIONS.MESSAGES, ID.unique(), {
    teamId,
    senderId,
    senderName,
    content: '',
    type: 'file',
    fileName: file.name,
    fileId: uploaded.$id,
    fileSize,
    status: 'sent',
  });
}

// ─── Get Team Messages ────────────────────────────────────────────────────────
export async function getTeamMessages(teamId: string, limit = 50): Promise<Message[]> {
  const res = await databases.listDocuments<Message>(DB_ID, COLLECTIONS.MESSAGES, [
    Query.equal('teamId', teamId),
    Query.orderAsc('$createdAt'),
    Query.limit(limit),
  ]);
  return res.documents;
}

// ─── Mark messages as delivered / read ───────────────────────────────────────
export async function markMessagesRead(teamId: string, currentUserId: string): Promise<void> {
  const unread = await databases.listDocuments<Message>(DB_ID, COLLECTIONS.MESSAGES, [
    Query.equal('teamId', teamId),
    Query.notEqual('senderId', currentUserId),
    Query.notEqual('status', 'read'),
    Query.limit(50),
  ]);
  await Promise.all(
    unread.documents.map((m) =>
      databases.updateDocument(DB_ID, COLLECTIONS.MESSAGES, m.$id, { status: 'read' })
    )
  );
}

// ─── Subscribe to real-time messages ─────────────────────────────────────────
export function subscribeToMessages(
  teamId: string,
  callback: (message: Message) => void
): () => void {
  const unsubscribe = realtime.subscribe(
    `databases.${DB_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
    (response) => {
      const msg = response.payload as Message;
      if (
        response.events.includes('databases.*.collections.*.documents.*.create') &&
        msg.teamId === teamId
      ) {
        callback(msg);
      }
    }
  );
  return unsubscribe;
}

// ─── Availability ─────────────────────────────────────────────────────────────
export async function setAvailability(
  userId: string,
  teamId: string,
  status: Availability['status'],
  customMessage = ''
): Promise<Availability> {
  const existing = await databases.listDocuments<Availability>(DB_ID, COLLECTIONS.AVAILABILITY, [
    Query.equal('userId', userId),
    Query.equal('teamId', teamId),
    Query.limit(1),
  ]);

  const payload = {
    userId,
    teamId,
    status,
    lastSeen: new Date().toISOString(),
    customMessage,
  };

  if (existing.documents.length) {
    return databases.updateDocument<Availability>(
      DB_ID,
      COLLECTIONS.AVAILABILITY,
      existing.documents[0].$id,
      payload
    );
  }

  return databases.createDocument<Availability>(DB_ID, COLLECTIONS.AVAILABILITY, ID.unique(), payload);
}

export async function getTeamAvailability(teamId: string): Promise<Availability[]> {
  const res = await databases.listDocuments<Availability>(DB_ID, COLLECTIONS.AVAILABILITY, [
    Query.equal('teamId', teamId),
    Query.limit(20),
  ]);
  return res.documents;
}

export function subscribeToAvailability(
  teamId: string,
  callback: (av: Availability) => void
): () => void {
  return realtime.subscribe(
    `databases.${DB_ID}.collections.${COLLECTIONS.AVAILABILITY}.documents`,
    (response) => {
      const av = response.payload as Availability;
      if (av.teamId === teamId) callback(av);
    }
  );
}

// ─── Set user offline on disconnect ──────────────────────────────────────────
export async function setOffline(userId: string, teamId: string): Promise<void> {
  await setAvailability(userId, teamId, 'offline');
}
