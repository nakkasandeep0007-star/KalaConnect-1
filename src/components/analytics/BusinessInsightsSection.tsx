import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  ShoppingBag,
  Store,
  CheckCircle2,
  Clock,
  Truck,
  BadgeIndianRupee,
  ArrowRight,
  Calendar,
  Sparkles,
  AlertCircle,
  Package,
  Layers,
  ChevronRight,
  Info,
  XCircle,
} from 'lucide-react';
import {
  ArtisanProfile,
  Product,
  B2BQuoteRequest,
  CustomOrder,
  LanguageCode,
  PageTab,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface BusinessInsightsSectionProps {
  artisan: ArtisanProfile;
  products: Product[];
  b2bRequests?: B2BQuoteRequest[];
  orders?: CustomOrder[];
  setCurrentTab: (tab: PageTab) => void;
  currentLang: LanguageCode;
}

type TimePeriod = 'all' | '30days' | '90days';

export const BusinessInsightsSection: React.FC<BusinessInsightsSectionProps> = ({
  artisan,
  products,
  b2bRequests = [],
  orders = [],
  setCurrentTab,
  currentLang,
}) => {
  const { user } = useAuth();
  const { notifications } = useNotifications();

  // 1. Date Filter State
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

  // 2. Strict Artisan-Specific Filtering (Data Ownership Enforcement)
  const currentArtisanId = artisan.id || user?.uid || 'sample-artist';
  const currentArtisanName = artisan.name || user?.name || '';

  // Filter products owned by authenticated artisan
  const artisanProducts = useMemo(() => {
    return products.filter((p) => {
      if (artisan.id && (p.artisanId === artisan.id || p.userId === artisan.id)) return true;
      if (user?.uid && (p.artisanId === user.uid || p.userId === user.uid)) return true;
      if (currentArtisanName && p.artisanName && p.artisanName.toLowerCase() === currentArtisanName.toLowerCase()) {
        return true;
      }
      if (currentArtisanId === 'sample-artist' && (!p.artisanId || p.artisanId === 'sample-artist')) {
        return true;
      }
      return false;
    });
  }, [products, artisan.id, user?.uid, currentArtisanName, currentArtisanId]);

  // Filter RFQs belonging to authenticated artisan
  const artisanRFQs = useMemo(() => {
    return b2bRequests.filter((r) => {
      if (artisan.id && r.artisanId === artisan.id) return true;
      if (user?.uid && r.artisanId === user.uid) return true;
      if (currentArtisanName && r.artisanName && r.artisanName.toLowerCase() === currentArtisanName.toLowerCase()) {
        return true;
      }
      if (currentArtisanId === 'sample-artist' && (!r.artisanId || r.artisanId === 'sample-artist')) {
        return true;
      }
      return false;
    });
  }, [b2bRequests, artisan.id, user?.uid, currentArtisanName, currentArtisanId]);

  // Filter Orders assigned to authenticated artisan
  const artisanOrders = useMemo(() => {
    return orders.filter((o) => {
      if (artisan.id && o.artistId === artisan.id) return true;
      if (user?.uid && o.artistId === user.uid) return true;
      if (currentArtisanId === 'sample-artist' && (!o.artistId || o.artistId === 'sample-artist')) {
        return true;
      }
      return false;
    });
  }, [orders, artisan.id, user?.uid, currentArtisanId]);

  // Helper for Date Window Filtering
  const isWithinPeriod = (dateStr?: string, period: TimePeriod = 'all'): boolean => {
    if (period === 'all') return true;
    if (!dateStr) return true;
    const itemDate = new Date(dateStr).getTime();
    if (isNaN(itemDate)) return true;
    const now = Date.now();
    const days = period === '30days' ? 30 : 90;
    const cutoff = now - days * 24 * 3600 * 1000;
    return itemDate >= cutoff;
  };

  // 3. Derived Metrics within Time Window
  const periodProducts = useMemo(() => {
    return artisanProducts.filter((p) => isWithinPeriod(p.createdAt, timePeriod));
  }, [artisanProducts, timePeriod]);

  const periodRFQs = useMemo(() => {
    return artisanRFQs.filter((r) => isWithinPeriod(r.createdAt, timePeriod));
  }, [artisanRFQs, timePeriod]);

  const periodOrders = useMemo(() => {
    return artisanOrders.filter((o) => isWithinPeriod(o.createdAt, timePeriod));
  }, [artisanOrders, timePeriod]);

  // Metric 1: Total Products & Catalog Distribution
  const totalProducts = periodProducts.length;
  const publishedProducts = periodProducts.filter((p) => p.status === 'published').length;
  const draftProducts = periodProducts.filter((p) => p.status === 'draft' || p.status === 'ai_ready').length;

  // Metric 2: RFQs Breakdown
  const totalRFQs = periodRFQs.length;
  const pendingRFQs = periodRFQs.filter(
    (r) =>
      r.status === 'pending' ||
      r.status === 'Pending' ||
      r.status === 'New' ||
      r.status === 'Viewed'
  ).length;
  const counterOffers = periodRFQs.filter((r) => r.status === 'Offer Sent').length;
  const acceptedDeals = periodRFQs.filter(
    (r) => r.status === 'Accepted' || r.status === 'accepted'
  ).length;
  const rejectedRFQs = periodRFQs.filter(
    (r) => r.status === 'Rejected' || r.status === 'rejected'
  ).length;
  // Active RFQs are pending + counter-offers awaiting decision
  const activeRFQs = pendingRFQs + counterOffers;

  // Metric 3: Orders Breakdown
  const totalOrders = periodOrders.length;
  const activeOrderStatuses = [
    'accepted',
    'in_progress',
    'processing',
    'progress_update',
    'ready_for_delivery',
    'delivery_in_progress',
    'shipped',
    'delivered',
  ];
  const activeOrders = periodOrders.filter((o) =>
    activeOrderStatuses.includes(o.status.toLowerCase())
  ).length;
  const completedOrders = periodOrders.filter(
    (o) => o.status.toLowerCase() === 'completed'
  ).length;
  const cancelledOrders = periodOrders.filter(
    (o) => o.status.toLowerCase() === 'cancelled'
  ).length;

  // Detailed Order Stages
  const confirmedOrders = periodOrders.filter((o) =>
    ['accepted', 'requirements_confirmed', 'advance_paid', 'advance_pending', 'requested'].includes(
      o.status.toLowerCase()
    )
  ).length;
  const processingOrders = periodOrders.filter((o) =>
    ['processing', 'in_progress', 'progress_update'].includes(o.status.toLowerCase())
  ).length;
  const shippedOrders = periodOrders.filter((o) =>
    ['shipped', 'ready_for_delivery', 'delivery_in_progress'].includes(o.status.toLowerCase())
  ).length;
  const deliveredOrders = periodOrders.filter(
    (o) => o.status.toLowerCase() === 'delivered'
  ).length;

  // Metric 4: Order Value (agreedPrice * quantity from confirmed orders)
  // Strictly real data: CustomOrder.totalPrice is computed as agreedPrice * quantity upon order creation
  const totalAcceptedOrderValue = useMemo(() => {
    return periodOrders
      .filter((o) => o.status.toLowerCase() !== 'cancelled')
      .reduce((sum, o) => {
        const val = typeof o.totalPrice === 'number' && !isNaN(o.totalPrice) && o.totalPrice > 0
          ? o.totalPrice
          : 0;
        return sum + val;
      }, 0);
  }, [periodOrders]);

  // Metric 5: Safe Conversion Rates (Denominator > 0 protection)
  const rfqAcceptanceRate =
    totalRFQs > 0 ? `${Math.round((acceptedDeals / totalRFQs) * 100)}%` : '—';
  const orderCompletionRate =
    totalOrders > 0 ? `${Math.round((completedOrders / totalOrders) * 100)}%` : '—';

  // Metric 6: Top Products by RFQ / Order Activity (Ranked by actual activity)
  const topProducts = useMemo(() => {
    const activityMap = new Map<
      string,
      { product: Product; rfqCount: number; orderCount: number }
    >();

    artisanProducts.forEach((p) => {
      activityMap.set(p.id, { product: p, rfqCount: 0, orderCount: 0 });
    });

    periodRFQs.forEach((r) => {
      const entry = activityMap.get(r.productId);
      if (entry) {
        entry.rfqCount += 1;
      } else {
        const found = artisanProducts.find(
          (p) => p.title === (r.productTitle || r.productName)
        );
        if (found) {
          const e = activityMap.get(found.id);
          if (e) e.rfqCount += 1;
        }
      }
    });

    periodOrders.forEach((o) => {
      const found = artisanProducts.find((p) => p.title === o.artworkTitle);
      if (found) {
        const e = activityMap.get(found.id);
        if (e) e.orderCount += 1;
      }
    });

    return Array.from(activityMap.values())
      .map((item) => ({
        ...item,
        totalActivity: item.rfqCount + item.orderCount,
      }))
      .filter((item) => item.totalActivity > 0)
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, 4);
  }, [artisanProducts, periodRFQs, periodOrders]);

  // Metric 7: Dynamic Business Insights Messages (Ground in real data)
  const dynamicInsights = useMemo(() => {
    const list: string[] = [];

    if (activeRFQs > 0) {
      list.push(
        currentLang === 'hi'
          ? `आपके पास समीक्षा या कार्रवाई के लिए ${activeRFQs} सक्रिय B2B थोक अनुरोध प्रतीक्षारत हैं।`
          : `You have ${activeRFQs} active wholesale RFQ${activeRFQs > 1 ? 's' : ''} awaiting action or negotiation.`
      );
    }

    if (activeOrders > 0) {
      list.push(
        currentLang === 'hi'
          ? `${activeOrders} उत्पादन आदेश वर्तमान में प्रगति और पूर्ति में हैं।`
          : `${activeOrders} production order${activeOrders > 1 ? 's are' : ' is'} currently in progress or fulfillment.`
      );
    }

    if (topProducts.length > 0) {
      const best = topProducts[0];
      list.push(
        currentLang === 'hi'
          ? `आपका सबसे अधिक अनुरोधित उत्पाद "${best.product.title}" है (${best.rfqCount} पूछताछ)।`
          : `Your most requested product is "${best.product.title}" with ${best.rfqCount} quotation inquiries.`
      );
    }

    if (acceptedDeals > 0) {
      list.push(
        currentLang === 'hi'
          ? `आपने अब तक ${acceptedDeals} थोक सौदे सफलतापूर्वक स्वीकार किए हैं।`
          : `You have successfully finalized ${acceptedDeals} wholesale bulk deal${acceptedDeals > 1 ? 's' : ''}.`
      );
    }

    if (list.length === 0) {
      list.push(
        currentLang === 'hi'
          ? 'अपने व्यावसायिक रुझानों को अनलॉक करने के लिए नए उत्पाद जोड़ें और खरीदारों के कोटेशन अनुरोधों का उत्तर दें।'
          : 'Keep listing products and responding to RFQs to build your business insights.'
      );
    }

    return list;
  }, [activeRFQs, activeOrders, topProducts, acceptedDeals, currentLang]);

  // Metric 8: Recent Business Activity (Using real existing notifications/events, max 5)
  const recentActivities = useMemo(() => {
    // Collect from notifications where recipient matches artisan
    const artisanNotifs = notifications
      .filter(
        (n) =>
          n.recipientUserId === currentArtisanId ||
          n.recipientUserId === artisan.id ||
          n.recipientUserId === user?.uid
      )
      .slice(0, 5);

    if (artisanNotifs.length > 0) {
      return artisanNotifs.map((n) => ({
        id: n.notificationId,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        type: n.type,
      }));
    }

    // Fallback: derive from latest RFQs or Orders if no notification records exist
    const events: { id: string; title: string; message: string; createdAt: string; type: string }[] = [];
    artisanRFQs.slice(0, 3).forEach((r) => {
      events.push({
        id: r.id || r.requestId,
        title: `RFQ: ${r.status}`,
        message: `${r.buyerOrganization || r.contactPerson || 'Buyer'} requested quote for "${r.productTitle || r.productName}" (${r.quantity} units).`,
        createdAt: r.updatedAt || r.createdAt,
        type: 'RFQ',
      });
    });

    artisanOrders.slice(0, 2).forEach((o) => {
      events.push({
        id: o.id,
        title: `Order #${o.orderNumber || o.id.slice(-6)}: ${o.status}`,
        message: `Order for "${o.artworkTitle}" with ${o.customerName}. Value: ₹${o.totalPrice?.toLocaleString('en-IN') || 0}.`,
        createdAt: o.createdAt,
        type: 'ORDER',
      });
    });

    return events
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [notifications, currentArtisanId, artisan.id, user?.uid, artisanRFQs, artisanOrders]);

  return (
    <section id="artisan-business-insights" className="space-y-6">
      
      {/* 1. SECTION HEADER & PERIOD FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#C25E3E]" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              {currentLang === 'hi' ? 'व्यावसायिक अंतर्दृष्टि (Business Insights)' : 'Business Insights'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {currentLang === 'hi'
              ? 'एक नज़र में अपने हस्तशिल्प व्यवसाय के प्रदर्शन को समझें।'
              : 'Understand your craft business performance at a glance.'}
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100 border border-stone-200 self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setTimePeriod('all')}
            id="insights-filter-all"
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timePeriod === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {currentLang === 'hi' ? 'सभी समय' : 'All Time'}
          </button>
          <button
            onClick={() => setTimePeriod('30days')}
            id="insights-filter-30d"
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timePeriod === '30days'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {currentLang === 'hi' ? 'पिछले 30 दिन' : 'Last 30 Days'}
          </button>
          <button
            onClick={() => setTimePeriod('90days')}
            id="insights-filter-90d"
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timePeriod === '90days'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {currentLang === 'hi' ? 'पिछले 90 दिन' : 'Last 90 Days'}
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC BUSINESS INSIGHTS BANNER */}
      {dynamicInsights.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#C25E3E]" />
            <span>{currentLang === 'hi' ? 'प्रमुख अंतर्दृष्टि' : 'Operational Highlights'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-950">
            {dynamicInsights.map((msg, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-amber-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C25E3E] mt-1.5 shrink-0" />
                <span className="font-medium leading-relaxed">{msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 6 SUMMARY CARDS (STRICTLY REAL DATA) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
        
        {/* 1. Total Products */}
        <div
          onClick={() => setCurrentTab('catalog')}
          id="insights-card-total-products"
          className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#C25E3E] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-500 font-medium truncate">
              {currentLang === 'hi' ? 'कुल उत्पाद' : 'Total Products'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
              {totalProducts}
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5 truncate">
              {publishedProducts} live • {draftProducts} drafts
            </p>
          </div>
        </div>

        {/* 2. Active RFQs */}
        <div
          onClick={() => setCurrentTab('requests')}
          id="insights-card-active-rfqs"
          className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#C25E3E] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-500 font-medium truncate">
              {currentLang === 'hi' ? 'सक्रिय RFQ' : 'Active RFQs'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
              {activeRFQs}
            </p>
            <p className="text-[10px] text-indigo-700 font-medium mt-0.5 truncate">
              {pendingRFQs} pending • {counterOffers} offers
            </p>
          </div>
        </div>

        {/* 3. Accepted Deals */}
        <div
          onClick={() => setCurrentTab('requests')}
          id="insights-card-accepted-deals"
          className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#C25E3E] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-500 font-medium truncate">
              {currentLang === 'hi' ? 'स्वीकृत सौदे' : 'Accepted Deals'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 font-serif">
              {acceptedDeals}
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5 truncate">
              Rate: <strong className="text-emerald-700">{rfqAcceptanceRate}</strong>
            </p>
          </div>
        </div>

        {/* 4. Active Orders */}
        <div
          onClick={() => setCurrentTab('orders')}
          id="insights-card-active-orders"
          className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#C25E3E] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-500 font-medium truncate">
              {currentLang === 'hi' ? 'सक्रिय ऑर्डर' : 'Active Orders'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-700 font-serif">
              {activeOrders}
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5 truncate">
              {processingOrders} in production
            </p>
          </div>
        </div>

        {/* 5. Completed Orders */}
        <div
          onClick={() => setCurrentTab('orders')}
          id="insights-card-completed-orders"
          className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#C25E3E] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-500 font-medium truncate">
              {currentLang === 'hi' ? 'पूर्ण ऑर्डर' : 'Completed Orders'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
              {completedOrders}
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5 truncate">
              {totalOrders > 0 ? `${orderCompletionRate} completed` : '0 delivered'}
            </p>
          </div>
        </div>

        {/* 6. Accepted Order Value (Explicitly NOT labeled as Revenue) */}
        <div
          onClick={() => setCurrentTab('orders')}
          id="insights-card-order-value"
          className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#C25E3E] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-500 font-medium truncate">
              {currentLang === 'hi' ? 'ऑर्डर मूल्य' : 'Accepted Order Value'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#C25E3E]/10 text-[#C25E3E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BadgeIndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-[#C25E3E] font-serif truncate">
              ₹{totalAcceptedOrderValue.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-stone-500 mt-0.5 truncate">
              Agreed price × quantity
            </p>
          </div>
        </div>

      </div>

      {/* 4. RFQ FUNNEL & ORDER STATUS BREAKDOWN (2-COLUMN GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* A. RFQ Funnel */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C25E3E]" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-serif">
                {currentLang === 'hi' ? 'RFQ सौदा फ़नल (RFQ Funnel)' : 'Wholesale RFQ Funnel'}
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-stone-500">
              {totalRFQs} Total Requests
            </span>
          </div>

          {totalRFQs === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <Store className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No RFQ activity yet</p>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                When wholesale buyers send quotation requests for your products, the conversion funnel will track each stage here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Stage 1: RFQs */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[10px]">
                    1
                  </span>
                  <span className="font-semibold text-slate-900">Total RFQs Received</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 text-sm">{totalRFQs}</span>
                  <span className="text-[10px] text-stone-400">100%</span>
                </div>
              </div>

              {/* Stage 2: Counter Offers */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">
                    2
                  </span>
                  <span className="font-semibold text-slate-900">Counter-Offers Sent</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 text-sm">{counterOffers}</span>
                  <span className="text-[10px] text-stone-500">
                    {totalRFQs > 0 ? `${Math.round((counterOffers / totalRFQs) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Stage 3: Accepted Deals */}
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                    3
                  </span>
                  <span className="font-semibold text-emerald-950">Accepted Deals</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-800 text-sm">{acceptedDeals}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {rfqAcceptanceRate}
                  </span>
                </div>
              </div>

              {/* Stage 4: Production Orders */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                    4
                  </span>
                  <span className="font-semibold text-slate-900">Orders Created</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 text-sm">{totalOrders}</span>
                  <span className="text-[10px] text-stone-500">
                    {totalRFQs > 0 ? `${Math.round((totalOrders / totalRFQs) * 100)}%` : '—'}
                  </span>
                </div>
              </div>

              {/* Stage 5: Completed Orders */}
              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px]">
                    5
                  </span>
                  <span className="font-semibold text-teal-950">Completed & Delivered</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-teal-800 text-sm">{completedOrders}</span>
                  <span className="text-[10px] text-teal-700 font-semibold">
                    {totalOrders > 0 ? orderCompletionRate : '0%'}
                  </span>
                </div>
              </div>

              {rejectedRFQs > 0 && (
                <p className="text-[11px] text-stone-400 text-right pr-1">
                  * {rejectedRFQs} RFQ{rejectedRFQs > 1 ? 's' : ''} declined or closed without deal
                </p>
              )}
            </div>
          )}
        </div>

        {/* B. Order Status Overview */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C25E3E]" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-serif">
                {currentLang === 'hi' ? 'ऑर्डर स्थिति अवलोकन' : 'Order Status Breakdown'}
              </h3>
            </div>
            <button
              onClick={() => setCurrentTab('orders')}
              className="text-xs font-bold text-[#C25E3E] hover:underline flex items-center gap-1"
            >
              <span>View Orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {totalOrders === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <Package className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No orders yet</p>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                Orders created when buyers accept your quotes or place commissions will be categorized here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                {/* Confirmed / Accepted */}
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between">
                  <span className="text-[11px] text-stone-500 font-medium">Confirmed</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">{confirmedOrders}</p>
                  <span className="text-[10px] text-amber-700 font-semibold mt-0.5">Queued</span>
                </div>

                {/* Processing */}
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
                  <span className="text-[11px] text-blue-700 font-medium">In Production</span>
                  <p className="text-lg font-bold text-blue-900 mt-1">{processingOrders}</p>
                  <span className="text-[10px] text-blue-600 font-semibold mt-0.5">Workshop</span>
                </div>

                {/* Shipped */}
                <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between">
                  <span className="text-[11px] text-purple-700 font-medium">Shipped</span>
                  <p className="text-lg font-bold text-purple-900 mt-1">{shippedOrders}</p>
                  <span className="text-[10px] text-purple-600 font-semibold mt-0.5">In Transit</span>
                </div>

                {/* Delivered / Completed */}
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-700 font-medium">Completed</span>
                  <p className="text-lg font-bold text-emerald-900 mt-1">{completedOrders + deliveredOrders}</p>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Fulfilled</span>
                </div>

              </div>

              {cancelledOrders > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <XCircle className="w-4 h-4 text-rose-600" /> Cancelled Orders
                  </span>
                  <span className="font-bold">{cancelledOrders}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-stone-50/80 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                <span>Total Active Orders: <strong>{activeOrders}</strong></span>
                <span>Active Order Value: <strong className="text-[#C25E3E]">₹{totalAcceptedOrderValue.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 5. TOP PRODUCTS BY RFQ ACTIVITY & RECENT BUSINESS ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* A. Top Products by RFQ Activity */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#C25E3E]" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-serif">
                {currentLang === 'hi' ? 'सर्वाधिक अनुरोधित उत्पाद' : 'Top Products by RFQ Activity'}
              </h3>
            </div>
            <span className="text-[11px] text-stone-500 font-medium">Demand Ranking</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <ShoppingBag className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Not enough activity data yet</p>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                As buyers discover your catalog and submit quotation requests, your most popular craft products will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((item, idx) => {
                const p = item.product;
                const imgSrc =
                  p.enhancedImage ||
                  p.originalImage ||
                  p.image ||
                  p.enhancedImageUrl ||
                  p.originalImageUrl;
                const price = p.actualPrice || p.price || p.suggestedPrice || 0;

                return (
                  <div
                    key={p.id}
                    id={`top-product-row-${p.id}`}
                    className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-3 hover:border-[#C25E3E] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#C25E3E]/10 text-[#C25E3E] font-bold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="w-11 h-11 rounded-xl bg-stone-200 overflow-hidden shrink-0">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={p.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{p.title}</h4>
                        <p className="text-[11px] text-stone-500 truncate">
                          {p.category || p.craftType || 'Handicraft'} • ₹{price.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs">
                        {item.rfqCount} RFQ{item.rfqCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* B. Recent Business Activity (Reusing existing notification & event data) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C25E3E]" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-serif">
                {currentLang === 'hi' ? 'हाल की व्यावसायिक गतिविधि' : 'Recent Business Activity'}
              </h3>
            </div>
            <button
              onClick={() => setCurrentTab('activity')}
              className="text-xs font-bold text-[#C25E3E] hover:underline flex items-center gap-1"
            >
              <span>Activity Center</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <Layers className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No recent activity recorded yet</p>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                Actions such as new RFQs, counter-offers, order confirmations, and shipment updates will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map((act) => {
                const dateFormatted = act.createdAt
                  ? new Date(act.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <div
                    key={act.id}
                    id={`recent-act-${act.id}`}
                    className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{act.title}</span>
                        <span className="text-[10px] text-stone-400">• {dateFormatted}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                        {act.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </section>
  );
};
