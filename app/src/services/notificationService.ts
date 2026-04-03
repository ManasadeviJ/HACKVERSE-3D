import { databases, realtime, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Notification } from '../types';

// ─── Create Notification ──────────────────────────────────────────────────────
export async function createNotification(
  userId: string,
  data: {
    title: string;
    body: string;
    type: Notification['type'];
    referenceId: string;
  }
): Promise<Notification> {
  return databases.createDocument<Notification>(DB_ID, COLLECTIONS.NOTIFICATIONS, ID.unique(), {
    userId,
    ...data,
    isRead: false,
  });
}

// ─── Get User Notifications ───────────────────────────────────────────────────
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const res = await databases.listDocuments<Notification>(DB_ID, COLLECTIONS.NOTIFICATIONS, [
    Query.equal('userId', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(50),
  ]);
  return res.documents;
}

// ─── Mark as Read ─────────────────────────────────────────────────────────────
export async function markNotificationRead(notificationId: string): Promise<void> {
  await databases.updateDocument(DB_ID, COLLECTIONS.NOTIFICATIONS, notificationId, {
    isRead: true,
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const unread = await databases.listDocuments<Notification>(DB_ID, COLLECTIONS.NOTIFICATIONS, [
    Query.equal('userId', userId),
    Query.equal('isRead', false),
    Query.limit(50),
  ]);

  await Promise.all(
    unread.documents.map((n) =>
      databases.updateDocument(DB_ID, COLLECTIONS.NOTIFICATIONS, n.$id, { isRead: true })
    )
  );
}

// ─── Unread Count ─────────────────────────────────────────────────────────────
export async function getUnreadCount(userId: string): Promise<number> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.NOTIFICATIONS, [
    Query.equal('userId', userId),
    Query.equal('isRead', false),
    Query.limit(1),
  ]);
  return res.total;
}

// ─── Subscribe to real-time notifications ────────────────────────────────────
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
): () => void {
  const unsubscribe = realtime.subscribe(
    `databases.${DB_ID}.collections.${COLLECTIONS.NOTIFICATIONS}.documents`,
    (response) => {
      if (
        response.events.includes('databases.*.collections.*.documents.*.create') &&
        (response.payload as Notification).userId === userId
      ) {
        callback(response.payload as Notification);
      }
    }
  );
  return unsubscribe;
}
