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

  const fetchUserNotifs = useCallback(async () => {
    if (!currentUserId) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const list = await getUserNotifications(currentUserId, role, alternateUserId);
      setNotifications(list);
    } catch (err) {
      console.warn('Failed to fetch user notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, role, alternateUserId]);

  useEffect(() => {
    fetchUserNotifs();
  }, [fetchUserNotifs]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUserId) return;

    // Optimistic local update
    setNotifications((prev) =>
      prev.map((n) => (n.notificationId === notificationId ? { ...n, read: true } : n))
    );

    try {
      await markNotificationAsRead(notificationId, currentUserId);
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUserId) return;

    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

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
        // If the notification happens to be for the currently logged in user, add it to state
        const userIdsToMatch = [currentUserId];
        if (alternateUserId) userIdsToMatch.push(alternateUserId);
        if (role === 'artisan') userIdsToMatch.push('sample-artist');
        if (role === 'buyer') userIdsToMatch.push('sample-buyer-1', 'sample-buyer-2');

        const isForCurrentUser = userIdsToMatch.includes(created.recipientUserId);

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

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;

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
