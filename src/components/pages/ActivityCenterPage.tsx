import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Package,
  FileText,
  BadgeIndianRupee,
  Check,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { AppNotification, PageTab } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

interface ActivityCenterPageProps {
  setCurrentTab: (tab: PageTab) => void;
  onSelectOrder?: (orderId: string) => void;
  onSelectQuoteRequest?: (requestId: string) => void;
}

export const ActivityCenterPage: React.FC<ActivityCenterPageProps> = ({
  setCurrentTab,
  onSelectOrder,
  onSelectQuoteRequest,
}) => {
  const { user, role } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, formatTimeAgo } =
    useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Strict User Data Isolation: Only show activities where recipientUserId === user.uid
  const userNotifications = notifications.filter(
    (n) => Boolean(user?.uid && n.recipientUserId === user.uid)
  );

  const filteredNotifications = userNotifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleNotificationClick = async (notif: AppNotification) => {
    // Strict ownership verification: activity must belong to the authenticated user
    if (!user?.uid || notif.recipientUserId !== user.uid) {
      console.warn('Unauthorized activity interaction blocked');
      return;
    }

    if (!notif.read) {
      await markAsRead(notif.notificationId);
    }

    const targetRequestId =
      notif.requestId ||
      (notif.relatedType === 'RFQ' || notif.relatedType === 'COUNTER_OFFER'
        ? notif.relatedId
        : undefined);
    const targetOrderId =
      notif.relatedType === 'ORDER' ||
      notif.relatedId?.startsWith('kc-ord') ||
      notif.relatedId?.startsWith('ord-') ||
      notif.relatedId?.startsWith('b2b_ord')
        ? notif.relatedId
        : undefined;

    switch (notif.type) {
      case 'NEW_RFQ':
      case 'NEW_COUNTER_OFFER':
      case 'OFFER_DECLINED':
      case 'RFQ_DECLINED':
        if (targetRequestId && onSelectQuoteRequest) {
          onSelectQuoteRequest(targetRequestId);
        }
        setCurrentTab('requests');
        break;

      case 'OFFER_ACCEPTED':
      case 'RFQ_ACCEPTED':
      case 'ORDER_PLACED':
      case 'ORDER_PROCESSING':
      case 'ORDER_SHIPPED':
      case 'ORDER_DELIVERED':
      case 'ORDER_COMPLETED':
        if (targetOrderId && onSelectOrder) {
          onSelectOrder(targetOrderId);
          setCurrentTab('orders');
        } else if (targetRequestId && onSelectQuoteRequest) {
          onSelectQuoteRequest(targetRequestId);
          setCurrentTab('requests');
        } else {
          setCurrentTab('requests');
        }
        break;

      default:
        if (targetOrderId && onSelectOrder) {
          onSelectOrder(targetOrderId);
          setCurrentTab('orders');
        } else if (targetRequestId && onSelectQuoteRequest) {
          onSelectQuoteRequest(targetRequestId);
          setCurrentTab('requests');
        } else {
          setCurrentTab('requests');
        }
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_RFQ':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'NEW_COUNTER_OFFER':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#C25E3E]/15 text-[#C25E3E] flex items-center justify-center shrink-0">
            <BadgeIndianRupee className="w-5 h-5" />
          </div>
        );
      case 'OFFER_ACCEPTED':
      case 'RFQ_ACCEPTED':
      case 'ORDER_PLACED':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'OFFER_DECLINED':
      case 'RFQ_DECLINED':
        return (
          <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        );
      case 'ORDER_PROCESSING':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        );
      case 'ORDER_SHIPPED':
        return (
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        );
      case 'ORDER_DELIVERED':
      case 'ORDER_COMPLETED':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C25E3E]/10 text-[#C25E3E] border border-[#C25E3E]/20 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              Notifications & Updates
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#C25E3E] text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-serif">
            Activity Center
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {role === 'buyer'
              ? 'Real-time updates on your quotation requests, artisan offers, and orders'
              : 'Real-time updates on incoming RFQs, accepted deals, and order milestones'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            id="activity-mark-all-read-btn"
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          All Activity ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === 'unread'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/80 space-y-3">
            <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-stone-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800">You&apos;re all caught up.</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {filter === 'unread'
                ? 'No unread notifications right now. Great job!'
                : 'No new activity yet. You will see updates when quotes and orders progress.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.notificationId}
              id={`activity-card-${notif.notificationId}`}
              onClick={() => handleNotificationClick(notif)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                notif.read
                  ? 'bg-white border-stone-200 hover:border-stone-300 shadow-2xs'
                  : 'bg-amber-50/50 border-amber-200 hover:border-amber-300 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-4">
                {getNotificationIcon(notif.type)}

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`text-sm ${
                        notif.read ? 'font-semibold text-slate-800' : 'font-bold text-slate-950'
                      }`}
                    >
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C25E3E] text-white">
                        NEW
                      </span>
                    )}
                    <span className="text-xs text-stone-400">
                      • {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                    {notif.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <span className="text-xs font-bold text-[#C25E3E] flex items-center gap-1 group">
                  Open Details
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
