import React from 'react';
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
  ExternalLink,
} from 'lucide-react';
import { AppNotification, PageTab } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  setCurrentTab?: (tab: PageTab) => void;
  onNavigateToTab?: (tab: PageTab) => void;
  onSelectOrder?: (orderId: string) => void;
  onSelectQuoteRequest?: (requestId: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  setCurrentTab,
  onNavigateToTab,
  onSelectOrder,
  onSelectQuoteRequest,
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, formatTimeAgo } =
    useNotifications();

  if (!isOpen) return null;

  const navigateTab = (tab: PageTab) => {
    if (setCurrentTab) setCurrentTab(tab);
    if (onNavigateToTab) onNavigateToTab(tab);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    // 1. Mark as read
    if (!notif.read) {
      await markAsRead(notif.notificationId);
    }

    // 2. Close dropdown
    onClose();

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

    // 3. Navigate to appropriate screen
    switch (notif.type) {
      case 'NEW_RFQ':
      case 'NEW_COUNTER_OFFER':
      case 'OFFER_DECLINED':
      case 'RFQ_DECLINED':
        if (targetRequestId && onSelectQuoteRequest) {
          onSelectQuoteRequest(targetRequestId);
        }
        navigateTab('requests');
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
          navigateTab('orders');
        } else if (targetRequestId && onSelectQuoteRequest) {
          onSelectQuoteRequest(targetRequestId);
          navigateTab('requests');
        } else {
          navigateTab('requests');
        }
        break;

      default:
        if (targetOrderId && onSelectOrder) {
          onSelectOrder(targetOrderId);
          navigateTab('orders');
        } else if (targetRequestId && onSelectQuoteRequest) {
          onSelectQuoteRequest(targetRequestId);
          navigateTab('requests');
        } else {
          navigateTab('requests');
        }
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_RFQ':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'NEW_COUNTER_OFFER':
        return (
          <div className="w-8 h-8 rounded-full bg-[#C25E3E]/15 text-[#C25E3E] flex items-center justify-center shrink-0">
            <BadgeIndianRupee className="w-4 h-4" />
          </div>
        );
      case 'OFFER_ACCEPTED':
      case 'RFQ_ACCEPTED':
      case 'ORDER_PLACED':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'OFFER_DECLINED':
      case 'RFQ_DECLINED':
        return (
          <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      case 'ORDER_PROCESSING':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'ORDER_SHIPPED':
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
        );
      case 'ORDER_DELIVERED':
      case 'ORDER_COMPLETED':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <>
      {/* Invisible backdrop for closing on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown Panel Container */}
      <div
        id="notifications-panel-dropdown"
        className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[#C25E3E]" />
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#C25E3E] text-white">
                {unreadCount} new
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              id="mark-all-read-btn"
              className="text-xs font-semibold text-stone-600 hover:text-[#C25E3E] transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List Body */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100">
          {notifications.length === 0 ? (
            /* Empty State */
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-stone-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">You&apos;re all caught up.</h4>
              <p className="text-xs text-stone-500">No new activity yet.</p>
            </div>
          ) : (
            notifications.slice(0, 10).map((notif) => (
              <div
                key={notif.notificationId}
                id={`notification-item-${notif.notificationId}`}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                  notif.read
                    ? 'bg-white hover:bg-stone-50/80 text-stone-600'
                    : 'bg-amber-50/40 hover:bg-amber-50/70 text-slate-900'
                }`}
              >
                {getNotificationIcon(notif.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h5
                      className={`text-xs truncate ${
                        notif.read ? 'font-medium text-slate-800' : 'font-bold text-slate-950'
                      }`}
                    >
                      {notif.title}
                    </h5>
                    <span className="text-[10px] text-stone-400 shrink-0 font-medium">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-[#C25E3E] font-medium hover:underline inline-flex items-center gap-0.5">
                      View details <ArrowRight className="w-3 h-3 inline" />
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#C25E3E] shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onClose();
              setCurrentTab('activity');
            }}
            id="view-activity-center-btn"
            className="w-full text-center py-1.5 font-bold text-slate-800 hover:text-[#C25E3E] transition-colors"
          >
            View All in Activity Center &rarr;
          </button>
        </div>
      </div>
    </>
  );
};
