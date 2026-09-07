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
 * User-scoped localStorage key generator to isolate private notification data
 */
function getUserScopedKey(userId: string): string {
  return `${LOCAL_NOTIFS_KEY}_${userId}`;
}

/**
 * Get all notifications cached in global localStorage (legacy fallback)
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
 * Get notifications cached for a specific authenticated user.
 * Reads user-scoped storage and legacy storage filtered strictly by recipientUserId === userId.
 */
function getUserLocalNotifications(userId: string): AppNotification[] {
  if (!userId) return [];
  const results: AppNotification[] = [];
  const seenIds = new Set<string>();

  // 1. Read from user-scoped storage
  try {
    const rawScoped = localStorage.getItem(getUserScopedKey(userId));
    if (rawScoped) {
      const parsed = JSON.parse(rawScoped);
      if (Array.isArray(parsed)) {
        parsed.forEach((n: AppNotification) => {
          if (n && n.recipientUserId === userId && !seenIds.has(n.notificationId)) {
            seenIds.add(n.notificationId);
            results.push(n);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to read user-scoped notification storage:', err);
  }

  // 2. Read from legacy global cache strictly filtered by recipientUserId === userId
  try {
    const rawGlobal = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (rawGlobal) {
      const parsed = JSON.parse(rawGlobal);
      if (Array.isArray(parsed)) {
        parsed.forEach((n: AppNotification) => {
          if (n && n.recipientUserId === userId && !seenIds.has(n.notificationId)) {
            seenIds.add(n.notificationId);
            results.push(n);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Failed to read global notification cache:', err);
  }

  return results;
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
 * Save notification list to user-scoped storage
 */
function saveUserScopedNotifications(userId: string, list: AppNotification[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(getUserScopedKey(userId), JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to write user-scoped notification cache:', err);
  }
}

/**
 * Persist a notification to both Firestore and user-scoped localStorage.
 * Deduplicates by notificationId.
 */
export async function saveNotification(
  notification: AppNotification
): Promise<AppNotification> {
  if (!notification || !notification.notificationId || !notification.recipientUserId) {
    return notification;
  }

  // 1. Update user-scoped cache
  const userNotifs = getUserLocalNotifications(notification.recipientUserId);
  const existingUserIdx = userNotifs.findIndex((n) => n.notificationId === notification.notificationId);
  if (existingUserIdx >= 0) {
    userNotifs[existingUserIdx] = notification;
  } else {
    userNotifs.unshift(notification);
  }
  saveUserScopedNotifications(notification.recipientUserId, userNotifs);

  // 2. Update legacy global cache for backward compatibility
  const cached = getLocalNotifications();
  const existingIndex = cached.findIndex((n) => n.notificationId === notification.notificationId);
  if (existingIndex >= 0) {
    cached[existingIndex] = notification;
    saveLocalNotifications(cached);
  } else {
    saveLocalNotifications([notification, ...cached]);
  }

  // 3. Persist to Firestore
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
 * Strictly isolates data to the authenticated user ID.
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

  // Strict ownership: The authenticated user's ID is the absolute source of truth.
  // Never add unauthenticated demo fallback IDs to another user's session.
  const userIdsToQuery = [userId];
  if (
    alternateUserId &&
    alternateUserId !== userId &&
    !['sample-artist', 'sample-buyer-1', 'sample-buyer-2'].includes(alternateUserId)
  ) {
    userIdsToQuery.push(alternateUserId);
  }

  // 1. Read from Firestore with strict recipientUserId filtering
  try {
    for (const id of userIdsToQuery) {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientUserId', '==', id)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((d) => {
        const data = d.data() as AppNotification;
        if (data.notificationId && userIdsToQuery.includes(data.recipientUserId)) {
          notifMap.set(data.notificationId, data);
        }
      });
    }
  } catch (err) {
    console.warn('Firestore notifications fetch notice (using cache):', err);
  }

  // 2. Merge with local user-scoped cache (strictly filtered by recipientUserId)
  for (const id of userIdsToQuery) {
    const cachedForUser = getUserLocalNotifications(id);
    cachedForUser.forEach((n) => {
      if (userIdsToQuery.includes(n.recipientUserId)) {
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
  }

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

  // 4. Absolute User Data Isolation Verification
  list = list.filter((n) => userIdsToQuery.includes(n.recipientUserId));

  // 5. Sort descending by createdAt
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Mark a single notification as read.
 * Enforces ownership: only the recipient user can mark their notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  if (!notificationId || !userId) return;

  // 1. Update user-scoped local cache
  try {
    const userKey = getUserScopedKey(userId);
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const parsed: AppNotification[] = JSON.parse(raw);
      const updated = parsed.map((n) =>
        n.notificationId === notificationId && n.recipientUserId === userId
          ? { ...n, read: true }
          : n
      );
      localStorage.setItem(userKey, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to mark read in user scoped storage:', err);
  }

  // 2. Update legacy global cache (strictly if recipient matches authenticated user)
  try {
    const cached = getLocalNotifications();
    const updatedCache = cached.map((n) =>
      n.notificationId === notificationId && n.recipientUserId === userId
        ? { ...n, read: true }
        : n
    );
    saveLocalNotifications(updatedCache);
  } catch (err) {
    console.warn('Failed to mark read in global cache:', err);
  }

  // 3. Update Firestore (strictly validating ownership)
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    // Query to verify that document recipientUserId matches authenticated user
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('notificationId', '==', notificationId),
      where('recipientUserId', '==', userId)
    );
    const docSnap = await getDocs(q);
    if (!docSnap.empty) {
      await updateDoc(docRef, {
        read: true,
        dbUpdatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Firestore mark notification read notice:', err);
  }
}

/**
 * Mark all notifications for the authenticated user as read.
 * Enforces ownership: affects ONLY the authenticated user's notifications.
 */
export async function markAllNotificationsAsRead(
  userId: string,
  alternateUserId?: string
): Promise<void> {
  if (!userId) return;
  const userIds = [userId];
  if (
    alternateUserId &&
    alternateUserId !== userId &&
    !['sample-artist', 'sample-buyer-1', 'sample-buyer-2'].includes(alternateUserId)
  ) {
    userIds.push(alternateUserId);
  }

  // 1. Update user-scoped caches
  userIds.forEach((id) => {
    try {
      const userKey = getUserScopedKey(id);
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const parsed: AppNotification[] = JSON.parse(raw);
        const updated = parsed.map((n) =>
          userIds.includes(n.recipientUserId) ? { ...n, read: true } : n
        );
        localStorage.setItem(userKey, JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Failed to mark all read in user cache:', err);
    }
  });

  // 2. Update legacy global cache strictly for matching userIds
  try {
    const cached = getLocalNotifications();
    const updatedCache = cached.map((n) =>
      userIds.includes(n.recipientUserId) ? { ...n, read: true } : n
    );
    saveLocalNotifications(updatedCache);
  } catch (err) {
    console.warn('Failed to mark all read in global cache:', err);
  }

  // 3. Update Firestore in background
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
