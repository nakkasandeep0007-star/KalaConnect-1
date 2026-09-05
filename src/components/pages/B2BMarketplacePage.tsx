import React, { useState, useMemo } from 'react';
import { 
  Store, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  IndianRupee, 
  Package, 
  Boxes, 
  Truck, 
  MapPin, 
  Building2, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Tag, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  X,
  Eye,
  Check,
  Ban,
  RotateCcw,
  ArrowUpDown,
  User,
  BadgeIndianRupee
} from 'lucide-react';
import { Product, B2BQuoteRequest, LanguageCode, PageTab, ArtisanProfile } from '../../types';
import { TRANSLATIONS } from '../../utils/translations';
import { useAuth } from '../../context/AuthContext';
import { isProductOwner } from '../../utils/artisanProfileUtils';

interface B2BMarketplacePageProps {
  products: Product[];
  b2bRequests: B2BQuoteRequest[];
  onOpenRequestQuote: (product: Product) => void;
  onOpenSendOffer?: (request: B2BQuoteRequest) => void;
  onOpenB2BListingModal?: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onViewArtisan?: (artisanId: string) => void;
  onEditPrice?: (product: Product) => void;
  setCurrentTab: (tab: PageTab) => void;
  currentLang?: LanguageCode;
  artisan?: ArtisanProfile | null;
  onUpdateB2BRequestStatus?: (requestId: string, status: any, details?: any) => Promise<void> | void;
}

export const B2BMarketplacePage: React.FC<B2BMarketplacePageProps> = ({
  products,
  b2bRequests,
  onOpenRequestQuote,
  onOpenSendOffer,
  onOpenB2BListingModal,
  onSelectProduct,
  onViewArtisan,
  onEditPrice,
  setCurrentTab,
  currentLang = 'en',
  artisan,
  onUpdateB2BRequestStatus,
}) => {
  const { role, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'marketplace' | 'buyer_requests' | 'artisan_overview'>('marketplace');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedTechnique, setSelectedTechnique] = useState<string>('All Crafts / Techniques');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'price_asc' | 'price_desc' | 'name_asc'>('newest');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Baseline products eligible for B2B Wholesale Marketplace
  const marketplaceBaseProducts = useMemo(() => {
    return products.filter((p) => {
      const isPublished = p.status === 'published' || p.status === undefined;
      const isB2B = p.publishedToB2B === true || p.isB2BListed === true || (p.wholesalePrice !== undefined && p.wholesalePrice > 0);
      return isPublished && isB2B;
    });
  }, [products]);

  // Extract unique categories dynamically from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    marketplaceBaseProducts.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['All Categories', ...Array.from(set).sort()];
  }, [marketplaceBaseProducts]);

  // Extract unique craft / technique facets dynamically from products
  const craftTechniques = useMemo(() => {
    const set = new Set<string>();
    marketplaceBaseProducts.forEach((p) => {
      if (p.craftType && p.craftType.trim()) {
        set.add(p.craftType.trim());
      }
    });
    return ['All Crafts / Techniques', ...Array.from(set).sort()];
  }, [marketplaceBaseProducts]);

  // Check if reliable inventory/stock data exists across products
  const hasInventoryData = useMemo(() => {
    return marketplaceBaseProducts.some((p) => {
      const stock = p.b2bStock ?? p.stock ?? p.inventory;
      return stock !== undefined && stock !== null;
    });
  }, [marketplaceBaseProducts]);

  // Price range definitions using Indian Rupee ₹
  const PRICE_RANGES = useMemo(() => [
    { id: 'all', label: 'All Prices' },
    { id: 'under_1000', label: 'Under ₹1,000' },
    { id: '1000_5000', label: '₹1,000 – ₹5,000' },
    { id: '5000_10000', label: '₹5,000 – ₹10,000' },
    { id: 'above_10000', label: 'Above ₹10,000' },
  ], []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = marketplaceBaseProducts.filter((p) => {
      // 1. Search Query across relevant product fields
      if (query) {
        const titleMatch = (p.title || '').toLowerCase().includes(query);
        const titleHindiMatch = (p.titleHindi || '').toLowerCase().includes(query);
        const catMatch = (p.category || '').toLowerCase().includes(query);
        const craftMatch = (p.craftType || '').toLowerCase().includes(query);
        const techMatch = (p.imageAnalysis?.technique || '').toLowerCase().includes(query);
        
        // GI tag detection
        const isGIQuery = query.includes('gi') || query.includes('tag');
        const giMatch = isGIQuery && (
          (p.craftType || '').toLowerCase().includes('gi') ||
          (p.keywords || []).some((k) => k.toLowerCase().includes('gi'))
        );

        // Keywords
        const keywordsMatch = (p.keywords || []).some((k) => k.toLowerCase().includes(query));

        // Raw materials
        const materialsMatch = (p.materials || []).some((m) => m.toLowerCase().includes(query)) ||
          (p.material || '').toLowerCase().includes(query);

        // Description
        const descMatch = (p.description || '').toLowerCase().includes(query) ||
          (p.descriptionHindi || '').toLowerCase().includes(query) ||
          (p.b2bDescription || '').toLowerCase().includes(query);

        // Artisan & Origin location
        const artisanMatch = (p.artisanName || '').toLowerCase().includes(query) ||
          (p.originRegion || '').toLowerCase().includes(query) ||
          (p.artisanLocation || '').toLowerCase().includes(query);

        const hasMatch = titleMatch || titleHindiMatch || catMatch || craftMatch ||
          techMatch || giMatch || keywordsMatch || materialsMatch || descMatch || artisanMatch;

        if (!hasMatch) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'All Categories' && p.category !== selectedCategory) {
        return false;
      }

      // 3. Craft / Technique Filter
      if (selectedTechnique !== 'All Crafts / Techniques' && p.craftType !== selectedTechnique) {
        return false;
      }

      // 4. Price Range Filter
      const price = p.b2bWholesalePrice || p.wholesalePrice || p.actualPrice || p.suggestedPrice || p.price || 0;
      if (selectedPriceRange === 'under_1000' && price >= 1000) return false;
      if (selectedPriceRange === '1000_5000' && (price < 1000 || price > 5000)) return false;
      if (selectedPriceRange === '5000_10000' && (price < 5000 || price > 10000)) return false;
      if (selectedPriceRange === 'above_10000' && price <= 10000) return false;

      // 5. Availability Filter
      if (hasInventoryData && selectedAvailability !== 'all') {
        const stock = p.b2bStock ?? p.stock ?? p.inventory;
        if (selectedAvailability === 'in_stock') {
          // Do not assume in stock if inventory info is missing
          if (stock === undefined || stock === null || stock <= 0) return false;
        } else if (selectedAvailability === 'out_of_stock') {
          if (stock === undefined || stock === null || stock > 0) return false;
        }
      }

      return true;
    });

    // 6. Sorting
    return [...filtered].sort((a, b) => {
      const priceA = a.b2bWholesalePrice || a.wholesalePrice || a.actualPrice || a.suggestedPrice || a.price || 0;
      const priceB = b.b2bWholesalePrice || b.wholesalePrice || b.actualPrice || b.suggestedPrice || b.price || 0;

      switch (sortOption) {
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'name_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'newest':
        default: {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
      }
    });
  }, [
    marketplaceBaseProducts,
    searchQuery,
    selectedCategory,
    selectedTechnique,
    selectedPriceRange,
    selectedAvailability,
    sortOption,
    hasInventoryData
  ]);

  // Handler to clear search and all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedTechnique('All Crafts / Techniques');
    setSelectedPriceRange('all');
    setSelectedAvailability('all');
    setSortOption('newest');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedCategory !== 'All Categories' ||
    selectedTechnique !== 'All Crafts / Techniques' ||
    selectedPriceRange !== 'all' ||
    selectedAvailability !== 'all' ||
    sortOption !== 'newest'
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'All Categories') count++;
    if (selectedTechnique !== 'All Crafts / Techniques') count++;
    if (selectedPriceRange !== 'all') count++;
    if (selectedAvailability !== 'all') count++;
    if (sortOption !== 'newest') count++;
    return count;
  }, [searchQuery, selectedCategory, selectedTechnique, selectedPriceRange, selectedAvailability, sortOption]);

  // Statistics for Artisan / Marketplace Overview
  const activeB2BListingsCount = products.filter(
    (p) => (p.status === 'published' || p.status === undefined) && (p.publishedToB2B === true || p.isB2BListed === true || (p.wholesalePrice && p.wholesalePrice > 0))
  ).length;
  const totalB2BRequestsCount = b2bRequests.length;
  const newB2BRequestsCount = b2bRequests.filter((r) => r.status === 'New').length;
  const offersSentCount = b2bRequests.filter((r) => r.status === 'Offer Sent').length;
  const acceptedDealsCount = b2bRequests.filter((r) => r.status === 'Accepted').length;

  const handleBuyerAcceptOffer = async (req: B2BQuoteRequest) => {
    if (onUpdateB2BRequestStatus) {
      await onUpdateB2BRequestStatus(req.id || req.requestId, 'Accepted');
    }
  };

  const handleBuyerRejectOffer = async (req: B2BQuoteRequest) => {
    if (onUpdateB2BRequestStatus) {
      await onUpdateB2BRequestStatus(req.id || req.requestId, 'Rejected', { rejectionReason: 'Declined by buyer' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="b2b-marketplace-page">
      
      {/* Top Banner & Mode Selector */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#C25E3E]/30 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C25E3E] text-white flex items-center gap-1.5 shadow-xs">
                <Store className="w-3.5 h-3.5" />
                B2B Wholesale Marketplace
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Direct-from-Artisan Sourcing
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-amber-100">
              Bulk Artisanal Commerce & Direct Quotations
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Connect retail chains, boutique curators, hotels, and corporate gifting buyers directly with verified Indian master artisans. Verified craft authenticity, fair wholesale rates, and transparent RFQs.
            </p>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 bg-stone-800/80 p-1.5 rounded-2xl border border-stone-700/80 self-start md:self-auto backdrop-blur-xs flex-wrap">
            <button
              onClick={() => setActiveSubTab('marketplace')}
              id="subtab-browse-marketplace-btn"
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'marketplace'
                  ? 'bg-[#C25E3E] text-white shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Browse Marketplace ({filteredProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('buyer_requests')}
              id="subtab-buyer-requests-btn"
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 relative ${
                activeSubTab === 'buyer_requests'
                  ? 'bg-[#C25E3E] text-white shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Buyer RFQs & Quotes</span>
              {b2bRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950">
                  {b2bRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('artisan_overview')}
              id="subtab-artisan-overview-btn"
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'artisan_overview'
                  ? 'bg-[#C25E3E] text-white shadow-md'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>B2B Sales Stats</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-stone-800">
          <div className="bg-stone-800/60 p-3 rounded-2xl border border-stone-700/60">
            <p className="text-[11px] text-stone-400 font-medium">Active B2B Products</p>
            <p className="text-xl font-bold text-white mt-0.5">{activeB2BListingsCount} listings</p>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-2xl border border-stone-700/60">
            <p className="text-[11px] text-stone-400 font-medium">B2B Quotation RFQs</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{totalB2BRequestsCount} inquiries</p>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-2xl border border-stone-700/60">
            <p className="text-[11px] text-stone-400 font-medium">Active Offers Sent</p>
            <p className="text-xl font-bold text-[#C25E3E] mt-0.5">{offersSentCount} live offers</p>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-2xl border border-stone-700/60">
            <p className="text-[11px] text-stone-400 font-medium">Accepted Bulk Deals</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{acceptedDealsCount} completed</p>
          </div>
        </div>
      </div>

      {/* TAB 1: BROWSE MARKETPLACE */}
      {activeSubTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Buyer Discovery & Search Bar and Filters */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            {/* Prominent Search Bar */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, crafts, techniques..."
                id="b2b-marketplace-search-input"
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-stone-300 focus:border-[#C25E3E] focus:ring-2 focus:ring-[#C25E3E]/20 text-sm sm:text-base font-medium text-slate-900 bg-stone-50/60 placeholder:text-stone-400 shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  id="clear-search-query-btn"
                  title="Clear search text"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop Filters Row */}
            <div className="hidden md:flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100">
              {/* Category Filter */}
              <div className="min-w-[170px] flex-1">
                <label htmlFor="filter-category-select" className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  id="filter-category-select"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800 focus:border-[#C25E3E] focus:ring-1 focus:ring-[#C25E3E]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Craft / Technique Filter (Gracefully omitted if no crafts exist) */}
              {craftTechniques.length > 1 && (
                <div className="min-w-[170px] flex-1">
                  <label htmlFor="filter-craft-select" className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Craft / Technique
                  </label>
                  <select
                    value={selectedTechnique}
                    onChange={(e) => setSelectedTechnique(e.target.value)}
                    id="filter-craft-select"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800 focus:border-[#C25E3E] focus:ring-1 focus:ring-[#C25E3E]"
                  >
                    {craftTechniques.map((craft) => (
                      <option key={craft} value={craft}>{craft}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Range Filter */}
              <div className="min-w-[150px] flex-1">
                <label htmlFor="filter-price-select" className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Price Range
                </label>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  id="filter-price-select"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800 focus:border-[#C25E3E] focus:ring-1 focus:ring-[#C25E3E]"
                >
                  {PRICE_RANGES.map((rng) => (
                    <option key={rng.id} value={rng.id}>{rng.label}</option>
                  ))}
                </select>
              </div>

              {/* Availability Filter (Shown if reliable inventory data exists) */}
              {hasInventoryData && (
                <div className="min-w-[130px] flex-1">
                  <label htmlFor="filter-availability-select" className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Availability
                  </label>
                  <select
                    value={selectedAvailability}
                    onChange={(e) => setSelectedAvailability(e.target.value)}
                    id="filter-availability-select"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800 focus:border-[#C25E3E] focus:ring-1 focus:ring-[#C25E3E]"
                  >
                    <option value="all">All</option>
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              )}

              {/* Sort By Control */}
              <div className="min-w-[160px] flex-1">
                <label htmlFor="filter-sort-select" className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Sort By
                </label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  id="filter-sort-select"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800 focus:border-[#C25E3E] focus:ring-1 focus:ring-[#C25E3E]"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                </select>
              </div>

              {/* Clear Filters Action button */}
              {hasActiveFilters && (
                <div className="flex items-end self-end pb-0.5">
                  <button
                    onClick={handleClearFilters}
                    id="desktop-clear-filters-btn"
                    className="px-3 py-2 rounded-xl text-xs font-bold text-[#C25E3E] hover:bg-amber-50 border border-amber-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Filter & Sort Controls */}
            <div className="md:hidden flex items-center gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                id="toggle-filters-btn"
                className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  showMobileFilters || activeFiltersCount > 0
                    ? 'border-[#C25E3E] bg-amber-50/60 text-[#C25E3E]'
                    : 'border-stone-300 bg-stone-50 text-stone-700'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#C25E3E] text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="flex-1">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  id="mobile-sort-select"
                  className="w-full text-xs py-2.5 px-3 rounded-xl border border-stone-300 bg-stone-50 font-medium text-slate-800"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Mobile Expandable Filter Panel */}
            {showMobileFilters && (
              <div className="md:hidden pt-4 pb-2 border-t border-stone-200 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    id="mobile-category-select"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {craftTechniques.length > 1 && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Craft / Technique</label>
                    <select
                      value={selectedTechnique}
                      onChange={(e) => setSelectedTechnique(e.target.value)}
                      id="mobile-craft-select"
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800"
                    >
                      {craftTechniques.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Price Range</label>
                  <select
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    id="mobile-price-select"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800"
                  >
                    {PRICE_RANGES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {hasInventoryData && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Availability</label>
                    <select
                      value={selectedAvailability}
                      onChange={(e) => setSelectedAvailability(e.target.value)}
                      id="mobile-availability-select"
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-stone-300 bg-white font-medium text-slate-800"
                    >
                      <option value="all">All</option>
                      <option value="in_stock">In Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    id="apply-filters-btn"
                    className="flex-1 py-2.5 rounded-xl bg-[#C25E3E] text-white text-xs font-bold shadow-xs hover:bg-[#A94B2E] transition-colors text-center"
                  >
                    Apply Filters
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        handleClearFilters();
                        setShowMobileFilters(false);
                      }}
                      id="mobile-clear-filters-btn"
                      className="px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Count & Active Filter Tags Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif" id="marketplace-results-count">
                {filteredProducts.length === 0
                  ? 'No products found'
                  : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'} found`}
              </h2>
              {hasActiveFilters && marketplaceBaseProducts.length > 0 && (
                <span className="text-xs text-stone-500 font-medium">
                  (filtered from {marketplaceBaseProducts.length} listings)
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                id="results-clear-filters-btn"
                className="text-xs font-bold text-[#C25E3E] hover:text-[#9E3E20] hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-stone-400 font-medium text-[11px]">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-medium">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedCategory !== 'All Categories' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-medium">
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('All Categories')} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedTechnique !== 'All Crafts / Techniques' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-medium">
                  Craft: {selectedTechnique}
                  <button onClick={() => setSelectedTechnique('All Crafts / Techniques')} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedPriceRange !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-medium">
                  Price: {PRICE_RANGES.find(p => p.id === selectedPriceRange)?.label}
                  <button onClick={() => setSelectedPriceRange('all')} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedAvailability !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-medium">
                  Availability: {selectedAvailability === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                  <button onClick={() => setSelectedAvailability('all')} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Product Cards Grid or Helpful Empty States */}
          {filteredProducts.length === 0 ? (
            marketplaceBaseProducts.length === 0 ? (
              /* State A: Zero products in the marketplace catalog overall */
              <div className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#C25E3E] flex items-center justify-center mx-auto">
                  <Store className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No products available yet.</h3>
                <p className="text-xs sm:text-sm text-stone-500">
                  Wholesale artisan products will appear here once listed on the marketplace.
                </p>
              </div>
            ) : searchQuery.trim() !== '' ? (
              /* State B: Search term returned zero results */
              <div className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#C25E3E] flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No products found.</h3>
                <p className="text-xs sm:text-sm text-stone-500">
                  Try changing your search or filters.
                </p>
                <button
                  onClick={handleClearFilters}
                  id="clear-filters-empty-btn"
                  className="px-5 py-2.5 rounded-xl bg-[#C25E3E] hover:bg-[#A94B2E] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              /* State C: Filters applied returned zero results */
              <div className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#C25E3E] flex items-center justify-center mx-auto">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No products match your selected filters.</h3>
                <p className="text-xs sm:text-sm text-stone-500">
                  Try changing your search or filters.
                </p>
                <button
                  onClick={handleClearFilters}
                  id="clear-filters-empty-btn"
                  className="px-5 py-2.5 rounded-xl bg-[#C25E3E] hover:bg-[#A94B2E] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Clear Filters
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => {
                const fallbackImg = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80';
                const retailPrice = prod.actualPrice || prod.suggestedPrice || 0;
                const wholesalePrice = prod.b2bWholesalePrice || prod.wholesalePrice || Math.round(retailPrice * 0.75);
                const moq = prod.b2bMOQ || prod.wholesaleMOQ || 5;
                const stock = prod.b2bStock || prod.inventory || 15;
                const deliveryDays = prod.b2bDeliveryDays || 7;
                const marginDiscount = retailPrice > 0 
                  ? Math.round(((retailPrice - wholesalePrice) / retailPrice) * 100)
                  : 0;

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                    id={`b2b-product-card-${prod.id}`}
                  >
                    <div>
                      {/* Image Header with Wholesale Badges */}
                      <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                        <img
                          src={prod.enhancedImage || prod.originalImage || prod.image || fallbackImg}
                          alt={prod.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = fallbackImg;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Top Left: GI / Craft Badge */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-md text-amber-300 border border-amber-400/40 shadow-xs">
                            {prod.craftType || 'Authentic Craft'}
                          </span>
                        </div>

                        {/* Top Right: Wholesale Discount Badge */}
                        {marginDiscount > 0 && (
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#C25E3E] text-white shadow-md">
                            {marginDiscount}% Bulk Off
                          </div>
                        )}

                        {/* Bottom Bar on Image: Artisan & Location */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white flex items-center justify-between text-xs">
                          {onViewArtisan ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewArtisan(prod.artisanId || prod.userId || prod.artisanName || 'sample-artist');
                              }}
                              id={`marketplace-card-artisan-${prod.id}`}
                              className="flex items-center gap-1.5 truncate hover:text-amber-200 transition-colors text-left group/artisan"
                              title="View Artisan Profile"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="font-semibold truncate underline decoration-white/40 group-hover/artisan:decoration-amber-200">
                                {prod.artisanName || 'Master Artisan'}
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 truncate">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="font-semibold truncate">{prod.artisanName || 'Master Artisan'}</span>
                            </div>
                          )}
                          <span className="text-[11px] text-stone-300 shrink-0 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-300" />
                            {prod.originRegion || prod.artisanLocation || 'Jaipur'}
                          </span>
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="p-5 space-y-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#C25E3E]">
                            {prod.category}
                          </p>
                          <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-[#C25E3E] transition-colors mt-0.5">
                            {prod.title}
                          </h3>
                          <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                            {prod.b2bDescription || prod.description}
                          </p>
                        </div>

                        {/* Materials Tag */}
                        {prod.materials && prod.materials.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-stone-400 font-semibold">Materials:</span>
                            {prod.materials.slice(0, 3).map((m) => (
                              <span key={m} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-700">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Key Wholesale Specs Box */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-center">
                          <div>
                            <p className="text-[10px] text-stone-500 font-medium">Wholesale</p>
                            <p className="text-sm font-extrabold text-[#C25E3E] font-serif">
                              ₹{wholesalePrice}
                            </p>
                            <span className="text-[9px] text-stone-400 line-through">₹{retailPrice}</span>
                          </div>
                          <div className="border-x border-amber-200/80">
                            <p className="text-[10px] text-stone-500 font-medium">MOQ</p>
                            <p className="text-sm font-bold text-slate-900">
                              {moq} pcs
                            </p>
                            <span className="text-[9px] text-stone-500">Min. order</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-stone-500 font-medium">Stock / Lead</p>
                            <p className="text-sm font-bold text-slate-900">
                              {stock} units
                            </p>
                            <span className="text-[9px] text-stone-500">{deliveryDays}d dispatch</span>
                          </div>
                        </div>

                        {/* Buyer types tags */}
                        {prod.b2bBuyerTypes && prod.b2bBuyerTypes.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {prod.b2bBuyerTypes.map((b) => (
                              <span key={b} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-stone-100 text-stone-600">
                                • {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 pt-0 flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (onSelectProduct) onSelectProduct(prod);
                        }}
                        className="p-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {onViewArtisan && (
                        <button
                          type="button"
                          onClick={() => onViewArtisan(prod.artisanId || prod.userId || prod.artisanName || 'sample-artist')}
                          id={`view-artisan-btn-${prod.id}`}
                          className="px-2.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:text-[#C25E3E] hover:border-amber-300 hover:bg-amber-50/50 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                          title="View Artisan Profile"
                        >
                          <User className="w-3.5 h-3.5 text-[#C25E3E]" />
                          <span className="text-[11px] hidden sm:inline">Artisan</span>
                        </button>
                      )}

                      {/* Check if current user is the artisan who owns this product */}
                      {(() => {
                        const isOwnProduct = isProductOwner(prod, role, user, artisan);

                        if (isOwnProduct) {
                          return (
                            <div className="flex-1 flex items-center gap-1.5">
                              <span className="px-2 py-1 rounded-xl text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                Your Listing
                              </span>
                              {onEditPrice && (
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(prod)}
                                  id={`edit-price-btn-${prod.id}`}
                                  className="flex-1 py-2 px-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1"
                                  title="Edit Price with KalaPrice"
                                >
                                  <BadgeIndianRupee className="w-3.5 h-3.5 text-[#C25E3E]" />
                                  <span>Edit Price</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setActiveSubTab('buyer_requests')}
                                id={`view-buyer-requests-btn-${prod.id}`}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1"
                                title="View Buyer Inquiries"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Buyer Requests</span>
                              </button>
                            </div>
                          );
                        }

                        return (
                          /* Request Quote Button for Buyers and external visitors */
                          <button
                            type="button"
                            onClick={() => onOpenRequestQuote(prod)}
                            id={`request-quote-btn-${prod.id}`}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C25E3E] to-[#9E3E20] hover:from-[#B14E2E] hover:to-[#8E2E10] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Request Quote</span>
                          </button>
                        );
                      })()}

                      {/* Artisan Configure B2B Action (Hidden for buyers) */}
                      {role !== 'buyer' && onOpenB2BListingModal && (
                        <button
                          onClick={() => onOpenB2BListingModal(prod)}
                          className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#C25E3E] border border-amber-200 text-xs font-bold transition-colors"
                          title="Configure Wholesale Listing Terms"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BUYER RFQs & RECEIVED QUOTES */}
      {activeSubTab === 'buyer_requests' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-serif">
                  B2B Quotation Requests & Artisan Offers
                </h2>
                <p className="text-xs text-stone-500">
                  Track bulk order negotiation with master artisans across India
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('marketplace')}
                className="px-4 py-2 rounded-xl bg-[#C25E3E] text-white text-xs font-bold hover:bg-[#A94B2E] transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs"
              >
                <Store className="w-4 h-4" />
                <span>+ Request New Quotation</span>
              </button>
            </div>

            {b2bRequests.length === 0 ? (
              <div className="py-12 text-center max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">No Quotation Requests Yet</h3>
                <p className="text-xs text-stone-500">
                  Browse products in the marketplace and click &quot;Request Quote&quot; to begin direct bulk inquiries with artisans.
                </p>
                <button
                  onClick={() => setActiveSubTab('marketplace')}
                  className="px-4 py-2 rounded-xl bg-[#C25E3E] text-white text-xs font-bold"
                >
                  Explore Wholesale Catalog
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 mt-4 space-y-4">
                {b2bRequests.map((req) => {
                  const isOfferSent = req.status === 'Offer Sent';
                  const isAccepted = req.status === 'Accepted';
                  const isRejected = req.status === 'Rejected';

                  return (
                    <div
                      key={req.id || req.requestId}
                      className="pt-4 first:pt-0 bg-stone-50/70 p-4 sm:p-5 rounded-2xl border border-stone-200/80 space-y-4"
                      id={`b2b-rfq-item-${req.id || req.requestId}`}
                    >
                      {/* Top status & header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-stone-500 font-mono">
                            RFQ #{req.requestId || req.id}
                          </span>
                          <span className="text-stone-300">•</span>
                          <span className="text-xs text-stone-600">
                            {new Date(req.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {req.status === 'New' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              Status: New RFQ
                            </span>
                          )}
                          {req.status === 'Viewed' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Status: Viewed by Artisan
                            </span>
                          )}
                          {req.status === 'Offer Sent' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 animate-pulse">
                              Status: Offer Sent by Artisan
                            </span>
                          )}
                          {req.status === 'Accepted' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Status: Deal Accepted
                            </span>
                          )}
                          {req.status === 'Rejected' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Status: Request Declined
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Request and Product Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3.5 rounded-xl border border-stone-200 text-xs">
                        {/* Product Info */}
                        <div className="flex items-center gap-3">
                          {req.productImage && (
                            <img
                              src={req.productImage}
                              alt={req.productName}
                              className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-[#C25E3E] uppercase">{req.craftType || req.category}</p>
                            <h4 className="font-bold text-slate-900 truncate">{req.productName}</h4>
                            <p className="text-stone-500 text-[11px]">
                              Artisan: <strong>{req.artisanName || 'Master Artisan'}</strong> ({req.artisanLocation || 'Jaipur'})
                            </p>
                          </div>
                        </div>

                        {/* Request Terms */}
                        <div className="space-y-1">
                          <p className="text-stone-500 font-medium">Buyer Requirements:</p>
                          <p className="text-slate-800 font-bold">
                            {req.quantity} units @ ₹{req.targetPrice}/unit
                          </p>
                          <p className="text-stone-600 text-[11px]">
                            Delivery: <strong>{req.deliveryLocation}</strong>
                          </p>
                          <p className="text-stone-500 text-[11px]">
                            Required By: {req.requiredBy}
                          </p>
                        </div>

                        {/* Buyer Info & Message */}
                        <div className="space-y-1">
                          <p className="text-stone-500 font-medium">Buyer Organization:</p>
                          <p className="text-slate-900 font-bold">{req.buyerOrg || req.buyerName}</p>
                          <p className="text-stone-600 italic line-clamp-2">&quot;{req.message}&quot;</p>
                        </div>
                      </div>

                      {/* Artisan Offer Box if Offer Sent */}
                      {isOfferSent && (
                        <div className="bg-purple-50/90 border border-purple-200 p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-700" />
                              <span className="font-bold text-purple-950 text-xs">
                                Artisan Counter-Offer Received:
                              </span>
                            </div>
                            <span className="text-[11px] text-purple-700">
                              Offered {req.offeredAt ? new Date(req.offeredAt).toLocaleDateString() : 'recently'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-purple-100 text-xs">
                            <div>
                              <p className="text-[10px] text-stone-500">Offered Price</p>
                              <p className="text-sm font-extrabold text-purple-900 font-serif">
                                ₹{req.offeredPrice}/unit
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-500">Lead Time</p>
                              <p className="text-sm font-bold text-slate-800">
                                {req.offeredDeliveryDays || 7} working days
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-500">Total Order Value</p>
                              <p className="text-sm font-bold text-emerald-700 font-serif">
                                ₹{((req.offeredPrice || req.targetPrice) * req.quantity).toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>

                          {req.artisanOfferMessage && (
                            <p className="text-xs text-purple-900 italic bg-white/60 p-2.5 rounded-lg border border-purple-100">
                              &quot;{req.artisanOfferMessage}&quot;
                            </p>
                          )}

                          {/* Buyer Actions for Offer */}
                          <div className="flex items-center justify-end gap-3 pt-1">
                            <button
                              onClick={() => handleBuyerRejectOffer(req)}
                              id={`reject-offer-${req.id || req.requestId}`}
                              className="px-4 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors"
                            >
                              Decline Offer
                            </button>
                            <button
                              onClick={() => handleBuyerAcceptOffer(req)}
                              id={`accept-offer-${req.id || req.requestId}`}
                              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              <span>Accept Offer & Proceed</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Artisan Controls on this page for testing convenience */}
                      {onOpenSendOffer && !isAccepted && !isRejected && (
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() => onOpenSendOffer(req)}
                            id={`send-offer-action-btn-${req.id || req.requestId}`}
                            className="px-4 py-2 rounded-xl bg-[#C25E3E] hover:bg-[#A94B2E] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isOfferSent ? 'Update Offer' : 'Send Offer as Artisan'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ARTISAN B2B OVERVIEW */}
      {activeSubTab === 'artisan_overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Col: B2B Overview & Benefits */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Artisan B2B Wholesale Pipeline
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Wholesale enables predictable recurring revenue without packaging individual single-retail parcels. By setting clear MOQs and wholesale lead times, corporate buyers and boutique curators can place bulk orders directly with you.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-[#C25E3E]" />
                      <span>Zero Intermediary Commissions</span>
                    </div>
                    <p className="text-[11px] text-stone-600">
                      You receive 100% of the agreed unit wholesale price directly to your Pehchan UPI/Bank account.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>GI Tag & CraftMark Trust</span>
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Wholesale buyers filter for verified regional craftsmanship to stock in luxury airport lounges and boutique chains.
                    </p>
                  </div>
                </div>
              </div>

              {/* Your B2B Listed Products */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Your Current B2B Catalog ({activeB2BListingsCount})
                  </h3>
                  <button
                    onClick={() => setCurrentTab('catalog')}
                    className="text-xs font-bold text-[#C25E3E] hover:underline"
                  >
                    Manage in My Catalog &rarr;
                  </button>
                </div>

                <div className="divide-y divide-stone-100">
                  {products.filter((p) => p.isB2BListed || p.wholesalePrice).map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.enhancedImage || p.originalImage}
                          alt={p.title}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 truncate max-w-xs">{p.title}</p>
                          <p className="text-stone-500 text-[11px]">
                            Wholesale: <strong className="text-[#C25E3E]">₹{p.b2bWholesalePrice || p.wholesalePrice}</strong> • MOQ: <strong>{p.b2bMOQ || p.wholesaleMOQ || 5} pcs</strong>
                          </p>
                        </div>
                      </div>

                      {onOpenB2BListingModal && (
                        <button
                          onClick={() => onOpenB2BListingModal(p)}
                          className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 font-bold text-stone-700"
                        >
                          Edit B2B
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Quick Actions & Help */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-amber-500/10 to-[#C25E3E]/10 rounded-3xl p-6 border border-[#C25E3E]/20 space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-[#C25E3E] text-white flex items-center justify-center shadow-md">
                  <Package className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Want to list more items for B2B?
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Go to <strong>My Catalog</strong>, find any existing product, and click <strong>[ List for B2B ]</strong> to set wholesale prices and minimum order limits.
                </p>
                <button
                  onClick={() => setCurrentTab('catalog')}
                  className="w-full py-2.5 rounded-xl bg-[#C25E3E] hover:bg-[#A94B2E] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Open My Catalog
                </button>
              </div>

              <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl space-y-3">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Upcoming Buyer Inquiries
                </p>
                <p className="text-xs text-stone-300">
                  You have <strong>{newB2BRequestsCount} new quotation requests</strong> pending response. Fast responses within 24 hours increase deal conversion by 70%.
                </p>
                <button
                  onClick={() => setActiveSubTab('buyer_requests')}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                >
                  View RFQ Inquiries
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
