import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification, NotificationRelatedType } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';
const LOCAL_NOTIFS_KEY = 'kalaconnect_notifications_cache';

// Role-specific notification types
export const ARTISAN_NOTIFICATION_TYPES = [
  'NEW_RFQ',
  'OFFER_ACCEPTED',
  'OFFER_DECLINED',
  'ORDER_COMPLETED',
] as const;

export const BUYER_NOTIFICATION_TYPES = [
  'NEW_COUNTER_OFFER',
  'RFQ_ACCEPTED',
  'RFQ_DECLINED',
  'ORDER_PROCESSING',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_PLACED',
] as const;

/**
 * Get all notifications cached in localStorage
 */
function getLocalNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read local notifications cache:', err);
    return [];
  }
}

/**
 * Save notifications list to localStorage
 */
function saveLocalNotifications(list: AppNotification[]): void {
  try {
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to write local notifications cache:', err);
  }
}

/**
 * Persist a notification to both Firestore and localStorage.
 * Deduplicates by notificationId.
 */
export async function saveNotification(
  notification: AppNotification
): Promise<AppNotification> {
  // Check local cache first for instant deduplication
  const cached = getLocalNotifications();
  const existingIndex = cached.findIndex((n) => n.notificationId === notification.notificationId);

  if (existingIndex >= 0) {
    // Already exists — return without duplicating
    return cached[existingIndex];
  }

  // Update local cache
  const updatedCache = [notification, ...cached];
  saveLocalNotifications(updatedCache);

  // Persist to Firestore
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notification.notificationId);
    await setDoc(
      docRef,
      {
        ...notification,
        dbCreatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore notification save notice (offline fallback active):', err);
  }

  return notification;
}

/**
 * Create a notification safely with deterministic duplicate prevention.
 * Never throws an error that could block the caller.
 */
export async function createNotificationSafe(params: {
  notificationId: string;
  recipientUserId: string;
  senderUserId?: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: NotificationRelatedType;
  requestId?: string;
  productId?: string;
}): Promise<AppNotification | null> {
  if (!params.recipientUserId || !params.notificationId) {
    return null;
  }

  const notification: AppNotification = {
    notificationId: params.notificationId,
    recipientUserId: params.recipientUserId,
    senderUserId: params.senderUserId,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedId: params.relatedId,
    relatedType: params.relatedType,
    requestId: params.requestId,
    productId: params.productId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  try {
    return await saveNotification(notification);
  } catch (err) {
    console.warn('Notification creation notice (handled silently):', err);
    return null;
  }
}

/**
 * Retrieve notifications for a specific authenticated user.
 * Enforces role security:
 * - Buyers only see buyer notifications.
 * - Artisans only see artisan notifications.
 */
export async function getUserNotifications(
  userId: string,
  role?: 'artisan' | 'buyer' | null,
  alternateUserId?: string
): Promise<AppNotification[]> {
  if (!userId) return [];

  const notifMap = new Map<string, AppNotification>();

  // Determine all acceptable recipient IDs for this user
  const userIdsToQuery = [userId];
  if (alternateUserId && alternateUserId !== userId) {
    userIdsToQuery.push(alternateUserId);
  }
  // Include demo fallback IDs based on role
  if (role === 'artisan' && !userIdsToQuery.includes('sample-artist')) {
    userIdsToQuery.push('sample-artist');
  } else if (role === 'buyer') {
    if (!userIdsToQuery.includes('sample-buyer-1')) userIdsToQuery.push('sample-buyer-1');
    if (!userIdsToQuery.includes('sample-buyer-2')) userIdsToQuery.push('sample-buyer-2');
  }

  // 1. Read from Firestore
  try {
    for (const id of userIdsToQuery) {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientUserId', '==', id)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((d) => {
        const data = d.data() as AppNotification;
        if (data.notificationId) {
          notifMap.set(data.notificationId, data);
        }
      });
    }
  } catch (err) {
    console.warn('Firestore notifications fetch notice (using cache):', err);
  }

  // 2. Merge with local cache
  const cached = getLocalNotifications();
  cached.forEach((n) => {
    const matchesUser = userIdsToQuery.includes(n.recipientUserId);

    if (matchesUser) {
      if (!notifMap.has(n.notificationId)) {
        notifMap.set(n.notificationId, n);
      } else {
        // If local has read=true, respect the latest read status
        const remote = notifMap.get(n.notificationId)!;
        if (n.read && !remote.read) {
          notifMap.set(n.notificationId, { ...remote, read: true });
        }
      }
    }
  });

  // Convert to array
  let list = Array.from(notifMap.values());

  // 3. Strict Role Security Filtering
  if (role === 'buyer') {
    // A buyer must NEVER receive artisan-only notifications
    list = list.filter((n) => !ARTISAN_NOTIFICATION_TYPES.includes(n.type as any));
  } else if (role === 'artisan') {
    // An artisan must NEVER receive buyer-only notifications
    list = list.filter((n) => !BUYER_NOTIFICATION_TYPES.includes(n.type as any));
  }

  // 4. Sort descending by createdAt
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  // Update local cache
  const cached = getLocalNotifications();
  const updatedCache = cached.map((n) =>
    n.notificationId === notificationId && n.recipientUserId === userId
      ? { ...n, read: true }
      : n
  );
  saveLocalNotifications(updatedCache);

  // Update Firestore
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, {
      read: true,
      dbUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore mark notification read notice:', err);
  }
}

/**
 * Mark all notifications for the authenticated user as read
 */
export async function markAllNotificationsAsRead(
  userId: string,
  alternateUserId?: string
): Promise<void> {
  const cached = getLocalNotifications();
  const userIds = [userId];
  if (alternateUserId && alternateUserId !== userId) {
    userIds.push(alternateUserId);
  }

  const updatedCache = cached.map((n) =>
    userIds.includes(n.recipientUserId) ? { ...n, read: true } : n
  );
  saveLocalNotifications(updatedCache);

  // Update Firestore in background
  try {
    for (const uid of userIds) {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientUserId', '==', uid),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        try {
          await updateDoc(docSnap.ref, {
            read: true,
            dbUpdatedAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      });
    }
  } catch (err) {
    console.warn('Firestore mark all read notice:', err);
  }
}
