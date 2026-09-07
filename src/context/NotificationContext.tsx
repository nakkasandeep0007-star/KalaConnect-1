import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppNotification, NotificationRelatedType } from '../types';
import { useAuth } from './AuthContext';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotificationSafe,
  ARTISAN_NOTIFICATION_TYPES,
  BUYER_NOTIFICATION_TYPES,
} from '../services/notificationService';

export function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'Just now';

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  unreadNotifications: AppNotification[];
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  createNotification: (params: {
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
  }) => Promise<AppNotification | null>;
  formatTimeAgo: (isoString: string) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, artisan, buyerProfile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Active user ID (primary uid or role profile id)
  const currentUserId = user?.uid || '';
  const alternateUserId = role === 'buyer' ? buyerProfile?.id : artisan?.id;

  // Immediately clear notification state whenever the authenticated user changes or logs out.
  // This completely eliminates stale cache flash, cross-account contamination, or memory retention.
  useEffect(() => {
    setNotifications([]);
  }, [user?.uid]);

  const fetchUserNotifs = useCallback(async () => {
    if (!currentUserId) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const list = await getUserNotifications(currentUserId, role, alternateUserId);
      // Double check that user hasn't switched while awaiting
      setNotifications(list.filter((n) => n.recipientUserId === currentUserId));
    } catch (err) {
      console.warn('Failed to fetch user notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, role, alternateUserId]);

  useEffect(() => {
    fetchUserNotifs();
  }, [fetchUserNotifs]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUserId) return;

    // Optimistic local update strictly for current user
    setNotifications((prev) =>
      prev.map((n) =>
        n.notificationId === notificationId && n.recipientUserId === currentUserId
          ? { ...n, read: true }
          : n
      )
    );

    try {
      await markNotificationAsRead(notificationId, currentUserId);
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUserId) return;

    // Optimistic local update strictly for current user's notifications
    setNotifications((prev) =>
      prev.map((n) => (n.recipientUserId === currentUserId ? { ...n, read: true } : n))
    );

    try {
      await markAllNotificationsAsRead(currentUserId, alternateUserId);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  };

  const handleCreateNotification = async (params: {
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
  }) => {
    try {
      const created = await createNotificationSafe(params);
      if (created) {
        // ONLY append to in-memory state if the authenticated user is the actual recipient!
        const isForCurrentUser = Boolean(currentUserId && created.recipientUserId === currentUserId);

        if (isForCurrentUser) {
          // Strictly ensure role constraints before adding to visible context
          const allowed =
            role === 'buyer'
              ? !ARTISAN_NOTIFICATION_TYPES.includes(created.type as any)
              : role === 'artisan'
              ? !BUYER_NOTIFICATION_TYPES.includes(created.type as any)
              : true;

          if (allowed) {
            setNotifications((prev) => {
              if (prev.some((n) => n.notificationId === created.notificationId)) {
                return prev;
              }
              return [created, ...prev];
            });
          }
        }
      }
      return created;
    } catch (err) {
      console.warn('Error in handleCreateNotification (safe fallback):', err);
      return null;
    }
  };

  // Strictly compute unread notifications only for the authenticated user
  const unreadNotifications = notifications.filter(
    (n) => !n.read && Boolean(currentUserId && n.recipientUserId === currentUserId)
  );
  const unreadCount = currentUserId ? unreadNotifications.length : 0;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadNotifications,
        loading,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        refreshNotifications: fetchUserNotifs,
        createNotification: handleCreateNotification,
        formatTimeAgo,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
