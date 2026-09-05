import React from 'react';
import {
  PlusCircle,
  Volume2,
  ShoppingBag,
  Store,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Eye,
  Tag,
  Package,
  ArrowRight,
  TrendingUp,
  FileText,
  Building2,
  ExternalLink,
  ShieldCheck,
  BadgeIndianRupee,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  ArtisanProfile,
  Conversation,
  CustomOrder,
  CustomerRequest,
  LanguageCode,
  PageTab,
  PreviousWork,
  Product,
  B2BQuoteRequest,
} from '../../types';
import { TRANSLATIONS } from '../../utils/translations';
import { speakText } from '../../utils/audioSpeech';
import { BusinessInsightsSection } from '../analytics/BusinessInsightsSection';

interface DashboardProps {
  artisan: ArtisanProfile;
  products: Product[];
  previousWorks: PreviousWork[];
  requests: CustomerRequest[];
  orders: CustomOrder[];
  conversations: Conversation[];
  b2bRequests?: B2BQuoteRequest[];
  setCurrentTab: (tab: PageTab) => void;
  setSelectedProduct: (product: Product | null) => void;
  currentLang: LanguageCode;
}

export const Dashboard: React.FC<DashboardProps> = ({
  artisan,
  products,
  previousWorks,
  requests,
  orders,
  conversations,
  b2bRequests = [],
  setCurrentTab,
  setSelectedProduct,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // 1. Business Overview Data Calculations (Strictly Real Data)
  const totalProductsCount = products.length;
  const activeListingsCount = products.filter((p) => p.status === 'published').length;
  
  // Pending B2B Quote Requests
  const pendingB2BRequests = b2bRequests.filter(
    (r) =>
      r.status === 'New' ||
      r.status === 'Viewed' ||
      r.status === 'pending' ||
      r.status === 'Pending'
  );
  const pendingB2BCount = pendingB2BRequests.length;

  // Inventory & Total Value Calculation (Real Data: price * stock/inventory)
  let calculatedInventoryValue = 0;
  let totalStockUnits = 0;
  products.forEach((p) => {
    const price = p.actualPrice || p.price || p.suggestedPrice || 0;
    const stock = p.inventory ?? p.stock ?? 0;
    calculatedInventoryValue += price * stock;
    totalStockUnits += stock;
  });

  // 2. Actionable "Needs Your Attention" Items
  const lowStockProducts = products.filter((p) => {
    const stock = p.inventory ?? p.stock ?? 0;
    return stock <= 5;
  });

  const incompleteProducts = products.filter(
    (p) =>
      p.status === 'draft' ||
      !p.description?.trim() ||
      !p.materials ||
      p.materials.length === 0
  );

  const pendingCustomerRequests = requests.filter((r) => r.status === 'pending');

  const playDashboardSpeech = () => {
    const text =
      currentLang === 'hi'
        ? `नमस्ते ${artisan.name} जी। कला कनेक्ट कारीगर हब में आपका स्वागत है। आपके पास ${totalProductsCount} उत्पाद हैं, जिनमें से ${activeListingsCount} सक्रिय हैं। ${pendingB2BCount} नए थोक कोटेशन अनुरोध समीक्षा के लिए लंबित हैं।`
        : `Welcome to KalaConnect Artisan Hub, ${artisan.name}. You have ${totalProductsCount} products with ${activeListingsCount} active listings, and ${pendingB2BCount} pending B2B buyer requests.`;
    speakText(text, currentLang);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* 1. HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D1B16] via-[#3D251E] to-[#1E232E] text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-stone-800">
        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#C25E3E]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E07A5F]/20 text-[#E07A5F] border border-[#E07A5F]/30">
                {artisan.craftType || 'Traditional Craft'}
              </span>
              {artisan.location && (
                <span className="text-xs text-stone-300 flex items-center gap-1">
                  📍 {artisan.location}{artisan.state ? `, ${artisan.state}` : ''}
                </span>
              )}
              {artisan.pehchanId && (
                <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Pehchan ID: {artisan.pehchanId}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight font-serif text-white">
                KalaConnect Artisan Hub
              </h1>
              <p className="text-xs sm:text-sm font-medium text-amber-200/90 mt-1">
                Your craft, your business, your marketplace.
              </p>
            </div>

            <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed pt-1">
              {currentLang === 'hi'
                ? `नमस्ते, ${artisan.name} जी। अपने सत्यापित उत्पाद कैटलॉग को प्रबंधित करें, B2B खरीदार कोटेशन का जवाब दें और सीधे ऑर्डर ट्रैक करें।`
                : `Welcome back, ${artisan.name}. Monitor your live listings, fulfill wholesale B2B quote requests, and manage workshop inventory.`}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentTab('add-product')}
              id="artisan-hub-add-product-btn"
              className="px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-[#C25E3E] hover:bg-[#A94B2E] text-white font-extrabold text-sm sm:text-base flex items-center gap-2.5 shadow-xl shadow-[#C25E3E]/30 transition-all hover:scale-105 active:scale-95 group"
            >
              <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>+ Add Product</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={playDashboardSpeech}
              id="artisan-hub-audio-btn"
              className="p-3 sm:p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-stone-200 border border-white/15 transition-colors"
              title="Daily Voice Briefing"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. BUSINESS OVERVIEW CARDS (4 Summary Cards Using Real Data) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* A. Products */}
        <div
          onClick={() => setCurrentTab('catalog')}
          id="hub-stat-products"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center gap-4 cursor-pointer hover:border-[#C25E3E] hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-stone-500 font-medium">Products</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              {totalProductsCount}
            </p>
            <span className="text-[10px] text-stone-500 font-medium truncate block">
              Owned in catalog
            </span>
          </div>
        </div>

        {/* B. Active Listings */}
        <div
          onClick={() => setCurrentTab('catalog')}
          id="hub-stat-active-listings"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center gap-4 cursor-pointer hover:border-[#C25E3E] hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-stone-500 font-medium">Active Listings</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-serif">
              {activeListingsCount}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold truncate block">
              Published & Live
            </span>
          </div>
        </div>

        {/* C. B2B Requests */}
        <div
          onClick={() => setCurrentTab('requests')}
          id="hub-stat-b2b-requests"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center gap-4 cursor-pointer hover:border-[#C25E3E] hover:shadow-md transition-all group relative overflow-hidden"
        >
          {pendingB2BCount > 0 && (
            <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          )}
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Store className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-stone-500 font-medium">B2B Requests</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              {pendingB2BCount}
            </p>
            <span className="text-[10px] text-indigo-600 font-semibold truncate block">
              {pendingB2BCount > 0 ? `${pendingB2BCount} Pending Action` : `${b2bRequests.length} Total RFQs`}
            </span>
          </div>
        </div>

        {/* D. Inventory Value */}
        <div
          onClick={() => setCurrentTab('catalog')}
          id="hub-stat-inventory-val"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center gap-4 cursor-pointer hover:border-[#C25E3E] hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#C25E3E]/10 text-[#C25E3E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BadgeIndianRupee className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-stone-500 font-medium">Inventory Value</p>
            <p className="text-xl sm:text-2xl font-bold text-[#C25E3E] font-serif truncate">
              ₹{calculatedInventoryValue.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-stone-500 font-medium truncate block">
              {totalStockUnits} units in stock
            </span>
          </div>
        </div>

      </section>

      {/* 3. "NEEDS YOUR ATTENTION" SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Needs Your Attention
            </h2>
          </div>
          <span className="text-xs text-stone-500">Actionable Alerts</span>
        </div>

        {/* Action Items List */}
        {pendingB2BCount === 0 &&
        lowStockProducts.length === 0 &&
        incompleteProducts.length === 0 &&
        pendingCustomerRequests.length === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">You're all caught up!</p>
              <p className="text-[11px] text-emerald-700">No urgent alerts or pending actions required right now.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Alert: Pending B2B Quote Requests */}
            {pendingB2BCount > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-950">Pending B2B Quote Requests</h3>
                    <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                      You have {pendingB2BCount} buyer request{pendingB2BCount > 1 ? 's' : ''} waiting for your response.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab('requests')}
                  id="attention-view-b2b-btn"
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>View Requests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Alert: Low Stock Products */}
            {lowStockProducts.length > 0 && (
              <div className="p-4 rounded-2xl bg-orange-50/90 border border-orange-200/90 flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-orange-950">Low Inventory Alert</h3>
                    <p className="text-[11px] text-orange-800 leading-relaxed mt-0.5">
                      {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's have' : ' has'} low inventory (≤ 5 units).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab('catalog')}
                  id="attention-manage-stock-btn"
                  className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Manage Inventory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Alert: Products Needing Catalog Completion */}
            {incompleteProducts.length > 0 && (
              <div className="p-4 rounded-2xl bg-stone-100/90 border border-stone-200 flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-300 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Incomplete Catalog Info</h3>
                    <p className="text-[11px] text-stone-600 leading-relaxed mt-0.5">
                      {incompleteProducts.length} product{incompleteProducts.length > 1 ? 's need' : ' needs'} catalog information completed.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab('catalog')}
                  id="attention-complete-product-btn"
                  className="w-full py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Complete Product</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Alert: Pending Customer Commissions */}
            {pendingCustomerRequests.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-950">Customer Inquiries</h3>
                    <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                      You have {pendingCustomerRequests.length} custom commission request{pendingCustomerRequests.length > 1 ? 's' : ''} to review.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab('requests')}
                  id="attention-view-commissions-btn"
                  className="w-full py-2 px-3 rounded-xl bg-[#C25E3E] hover:bg-[#a94e32] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Review Inquiries</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. BUSINESS INSIGHTS (ARTISAN ANALYTICS DASHBOARD) */}
      <BusinessInsightsSection
        artisan={artisan}
        products={products}
        b2bRequests={b2bRequests}
        orders={orders}
        setCurrentTab={setCurrentTab}
        currentLang={currentLang}
      />

      {/* 5. QUICK ACTIONS */}
      <section className="p-4 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C25E3E]" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Quick Actions
            </h2>
          </div>
          <span className="text-xs text-stone-500">Artisan Tools</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* + Add Product */}
          <button
            onClick={() => setCurrentTab('add-product')}
            id="quick-add-product-btn"
            className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-amber-50/40 hover:border-[#C25E3E] hover:shadow-md transition-all text-left group flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C25E3E]/10 text-[#C25E3E] flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#C25E3E] transition-colors">
                + Add Product
              </h3>
              <p className="text-[10px] text-stone-500 mt-0.5">5-Step AI wizard</p>
            </div>
          </button>

          {/* Manage Catalog */}
          <button
            onClick={() => setCurrentTab('catalog')}
            id="quick-manage-catalog-btn"
            className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-amber-50/40 hover:border-[#C25E3E] hover:shadow-md transition-all text-left group flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#C25E3E] transition-colors">
                Manage Catalog
              </h3>
              <p className="text-[10px] text-stone-500 mt-0.5">{totalProductsCount} total listings</p>
            </div>
          </button>

          {/* View B2B Requests */}
          <button
            onClick={() => setCurrentTab('requests')}
            id="quick-view-b2b-btn"
            className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-amber-50/40 hover:border-[#C25E3E] hover:shadow-md transition-all text-left group flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#C25E3E] transition-colors">
                View B2B Requests
              </h3>
              <p className="text-[10px] text-stone-500 mt-0.5">{pendingB2BCount} waiting quotes</p>
            </div>
          </button>

          {/* Manage Prices */}
          <button
            onClick={() => setCurrentTab('pricing')}
            id="quick-manage-prices-btn"
            className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-amber-50/40 hover:border-[#C25E3E] hover:shadow-md transition-all text-left group flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#C25E3E] transition-colors">
                Manage Prices
              </h3>
              <p className="text-[10px] text-stone-500 mt-0.5">KalaPrice benchmark</p>
            </div>
          </button>
        </div>
      </section>

      {/* 4. PRODUCT PERFORMANCE ("Your Products") */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">
              {currentLang === 'hi' ? 'आपके उत्पाद (Your Products)' : 'Your Products'}
            </h2>
            <p className="text-xs text-stone-500">
              Overview of your craft inventory, live status, and catalog details
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('catalog')}
            id="view-all-products-link"
            className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#C25E3E] hover:underline"
          >
            <span>{t.viewCatalog} ({totalProductsCount})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {products.length === 0 ? (
          /* Empty State for Products */
          <div className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No products yet</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Create your first digital catalog to showcase your traditional craftsmanship to verified buyers.
            </p>
            <button
              onClick={() => setCurrentTab('add-product')}
              id="empty-state-add-product-btn"
              className="px-5 py-2.5 rounded-xl bg-[#C25E3E] text-white text-xs font-bold hover:bg-[#a94e32] shadow-sm transition-all"
            >
              + Create First Product Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.slice(0, 6).map((product) => {
              const statusConfig = {
                published: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Published' },
                ai_ready: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'AI Ready' },
                draft: { bg: 'bg-stone-100 text-stone-700 border-stone-200', label: 'Draft' },
              }[product.status] || { bg: 'bg-stone-100 text-stone-700 border-stone-200', label: 'Draft' };

              const price = product.actualPrice || product.price || product.suggestedPrice || 0;
              const stock = product.inventory ?? product.stock ?? 0;
              const imgSrc =
                product.enhancedImage ||
                product.originalImage ||
                product.image ||
                product.enhancedImageUrl ||
                product.originalImageUrl;

              return (
                <div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Image Header */}
                    <div className="relative h-44 bg-stone-100 overflow-hidden">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={product.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusConfig.bg}`}>
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Price Badge */}
                      <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-white font-extrabold text-xs">
                        ₹{price.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#C25E3E] uppercase tracking-wider truncate">
                          {product.craftType || product.category || 'Handicraft'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            stock > 5
                              ? 'bg-stone-100 text-stone-600'
                              : stock > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {currentLang === 'hi' && product.titleHindi ? product.titleHindi : product.title}
                      </h3>

                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {currentLang === 'hi' && product.descriptionHindi
                          ? product.descriptionHindi
                          : product.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Footer Stats & Action */}
                  <div className="p-4 pt-2 border-t border-stone-100 flex items-center justify-between text-xs mt-1">
                    <span className="text-stone-500 text-[11px]">
                      {typeof product.viewsCount === 'number' && typeof product.salesCount === 'number' ? (
                        <>Views: <strong>{product.viewsCount}</strong> • Sold: <strong>{product.salesCount}</strong></>
                      ) : (
                        <span>Category: <strong>{product.category || 'General'}</strong></span>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setCurrentTab('catalog');
                      }}
                      className="font-bold text-[#C25E3E] hover:underline flex items-center gap-1"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. RECENT B2B ACTIVITY */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">
              {currentLang === 'hi' ? 'हाल की B2B गतिविधि (Recent B2B Activity)' : 'Recent B2B Activity'}
            </h2>
            <p className="text-xs text-stone-500">
              Wholesale quote requests from verified corporate, boutique, and export buyers
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('requests')}
            id="view-all-b2b-link"
            className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#C25E3E] hover:underline"
          >
            <span>View All Requests ({b2bRequests.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {b2bRequests.length === 0 ? (
          /* Empty State for B2B Activity */
          <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No pending requests</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              You're all caught up. When verified buyers request wholesale quotes for your products, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {b2bRequests.slice(0, 4).map((req) => {
              const statusStyles = {
                New: 'bg-amber-100 text-amber-800 border-amber-200',
                Viewed: 'bg-blue-100 text-blue-800 border-blue-200',
                'Offer Sent': 'bg-purple-100 text-purple-800 border-purple-200',
                Accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                Rejected: 'bg-rose-100 text-rose-800 border-rose-200',
                pending: 'bg-amber-100 text-amber-800 border-amber-200',
                Pending: 'bg-amber-100 text-amber-800 border-amber-200',
                accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                rejected: 'bg-rose-100 text-rose-800 border-rose-200',
              }[req.status] || 'bg-stone-100 text-stone-700 border-stone-200';

              const buyerOrg = req.buyerOrganization || req.buyerOrg || req.contactPerson || req.buyerName || 'Verified Buyer';
              const reqProduct = req.productName || req.productTitle || 'Custom Craft Inquiry';
              const targetPrice = req.targetPricePerUnit || req.targetPrice;
              const dateStr = req.createdAt
                ? new Date(req.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={req.id || req.requestId}
                  id={`b2b-activity-row-${req.id || req.requestId}`}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#C25E3E] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{buyerOrg}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusStyles}`}>
                          {req.status}
                        </span>
                        <span className="text-[11px] text-stone-400">• {dateStr}</span>
                      </div>
                      <p className="text-xs text-stone-600 truncate">
                        Product: <strong>{reqProduct}</strong>
                      </p>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span>Quantity: <strong>{req.quantity} units</strong></span>
                        {targetPrice && (
                          <span>Target Price: <strong className="text-emerald-700">₹{targetPrice.toLocaleString('en-IN')}/unit</strong></span>
                        )}
                        {req.deliveryLocation && (
                          <span className="hidden md:inline text-stone-400">📍 {req.deliveryLocation}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => setCurrentTab('requests')}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-[#C25E3E] text-white text-xs font-bold transition-colors"
                    >
                      {req.status === 'New' || req.status === 'Viewed' ? 'Send Offer' : 'View Details'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. LOW STOCK SECTION */}
      {lowStockProducts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                Low Stock Items ({lowStockProducts.length})
              </h2>
            </div>
            <button
              onClick={() => setCurrentTab('catalog')}
              className="text-xs font-bold text-[#C25E3E] hover:underline"
            >
              Update Stock in Catalog →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 3).map((prod) => {
              const stock = prod.inventory ?? prod.stock ?? 0;
              const imgSrc =
                prod.enhancedImage ||
                prod.originalImage ||
                prod.image ||
                prod.enhancedImageUrl ||
                prod.originalImageUrl;

              return (
                <div
                  key={prod.id}
                  className="p-3.5 rounded-2xl bg-white border border-stone-200 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={prod.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-stone-400 m-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {currentLang === 'hi' && prod.titleHindi ? prod.titleHindi : prod.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 truncate">{prod.category || prod.craftType}</p>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                        {stock > 0 ? `Only ${stock} left` : 'Out of stock'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedProduct(prod);
                      setCurrentTab('catalog');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold shrink-0 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};
