import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Award,
  Package,
  Sparkles,
  Search,
  Eye,
  Send,
  Building2,
  Clock,
  Layers,
  FileText,
  User,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Truck,
  Briefcase,
  BadgeIndianRupee
} from 'lucide-react';
import { ArtisanProfile, LanguageCode, PageTab, Product, UserRole } from '../../types';
import { resolveArtisanData, isProductOwner } from '../../utils/artisanProfileUtils';

interface ArtisanProfilePageProps {
  artisanId: string;
  products: Product[];
  currentArtisan?: ArtisanProfile | null;
  currentRole?: UserRole | null;
  currentUserId?: string | null;
  onSelectProduct?: (product: Product) => void;
  onOpenRequestQuote?: (product: Product) => void;
  onEditPrice?: (product: Product) => void;
  setCurrentTab: (tab: PageTab) => void;
  currentLang?: LanguageCode;
}

export const ArtisanProfilePage: React.FC<ArtisanProfilePageProps> = ({
  artisanId,
  products,
  currentArtisan,
  currentRole,
  currentUserId,
  onSelectProduct,
  onOpenRequestQuote,
  onEditPrice,
  setCurrentTab,
  currentLang = 'en',
}) => {
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Resolve artisan details and their products from authoritative data
  const resolved = useMemo(() => {
    return resolveArtisanData(artisanId, products, currentArtisan, currentUserId);
  }, [artisanId, products, currentArtisan, currentUserId]);

  const {
    artisan,
    artisanProducts,
    uniqueMaterials,
    uniqueCrafts,
    hasGiTag,
    giCraftName,
    isVerified,
    verificationSource,
    hasB2BListings,
    minMoq,
  } = resolved;

  // Check if current user is viewing their own profile
  const isOwnProfile = Boolean(
    currentArtisan &&
      currentRole === 'artisan' &&
      ((currentUserId && (artisanId === currentUserId || artisan.id === currentUserId)) ||
        (currentArtisan.name && artisan.name && currentArtisan.name.toLowerCase() === artisan.name.toLowerCase()))
  );

  // Filter products by search and category
  const categories = useMemo(() => {
    const cats = Array.from(new Set(artisanProducts.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [artisanProducts]);

  const filteredProducts = useMemo(() => {
    return artisanProducts.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = productSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.titleHindi && p.titleHindi.toLowerCase().includes(q)) ||
        (p.craftType && p.craftType.toLowerCase().includes(q)) ||
        (p.materials && p.materials.some((m) => m.toLowerCase().includes(q)));
      return matchCat && matchSearch;
    });
  }, [artisanProducts, selectedCategory, productSearch]);

  // Safe fallback avatar if missing
  const defaultAvatar =
    'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80';
  const avatarSrc = artisan.avatarUrl || defaultAvatar;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* 1. Top Navigation / Breadcrumb Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => setCurrentTab('b2b-marketplace')}
          id="back-to-marketplace-btn"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-slate-900 bg-white hover:bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#C25E3E]" />
          <span>Back to Marketplace</span>
        </button>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <button
              onClick={() => setCurrentTab('profile')}
              id="edit-own-profile-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors"
            >
              <span>Edit Your Profile</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#C25E3E]" />
            </button>
          )}

          <span className="text-xs text-stone-500 font-medium px-3 py-1.5 bg-stone-100 rounded-xl">
            {artisanProducts.length} {artisanProducts.length === 1 ? 'Product' : 'Products'} Listed
          </span>
        </div>
      </div>

      {/* 2. ARTISAN HEADER & IDENTITY CARD */}
      <div className="bg-gradient-to-br from-[#2D1810] via-[#201C1B] to-[#1A1E24] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-stone-800 relative overflow-hidden">
        {/* Subtle decorative accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C25E3E] via-amber-500 to-[#10B981]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Profile Avatar / Photo */}
            <div className="relative shrink-0 self-start sm:self-auto">
              <img
                src={avatarSrc}
                alt={artisan.name || 'Master Artisan'}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white/15 shadow-md bg-stone-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultAvatar;
                }}
              />
              {isVerified && (
                <span
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-2 border-[#201C1B] flex items-center justify-center text-white text-xs shadow-sm"
                  title={verificationSource || 'Verified Artisan'}
                >
                  <ShieldCheck className="w-4 h-4" />
                </span>
              )}
            </div>

            {/* Name, Location, Craft & Business Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                  {artisan.name || 'Master Artisan'}
                </h1>
                {isVerified && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}
                {hasGiTag && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>GI Tagged Craft</span>
                  </span>
                )}
              </div>

              {artisan.businessName && (
                <p className="text-xs font-semibold text-amber-200">
                  {artisan.businessName}
                </p>
              )}

              {/* Primary Craft / Technique */}
              <p className="text-sm text-stone-200 font-medium">
                {artisan.craftType || 'Traditional Handcrafted Art'}
              </p>

              {/* Location (only show if exists) */}
              {(artisan.location || artisan.state) && (
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C25E3E] shrink-0" />
                  <span>
                    {[artisan.location, artisan.state].filter(Boolean).join(', ')}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Trust Highlights Capsule */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-2 self-start md:self-auto min-w-[200px]">
            <div className="text-[10px] text-stone-300 uppercase tracking-wider font-semibold">
              KalaConnect Identity
            </div>
            {artisan.pehchanId ? (
              <div>
                <span className="text-[10px] text-emerald-300 font-mono block">MINISTRY OF TEXTILES</span>
                <p className="text-xs font-bold text-white font-mono">{artisan.pehchanId}</p>
              </div>
            ) : isVerified ? (
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Craft Authenticated</span>
              </div>
            ) : (
              <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" />
                <span>Direct Artisan Seller</span>
              </div>
            )}

            {hasB2BListings && (
              <div className="text-[11px] text-amber-200 border-t border-white/10 pt-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-300" />
                <span>B2B Wholesale Available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. ABOUT THE ARTISAN & CRAFT EXPERTISE (2-Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: About the Artisan Story */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
              <span>About the Artisan</span>
            </h2>
            {artisan.experienceYears && artisan.experienceYears > 0 ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                {artisan.experienceYears} Years of Practice
              </span>
            ) : null}
          </div>

          {/* Real Bio or Empty State */}
          {artisan.bio && artisan.bio.trim().length > 0 ? (
            <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
              {artisan.bio}
            </p>
          ) : (
            <div className="p-4 rounded-2xl bg-stone-50 border border-dashed border-stone-200 text-stone-500 text-xs text-center py-6">
              <FileText className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
              <p className="font-semibold text-stone-600">This artisan has not added a story yet.</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Explore their handcrafted catalog below to view authentic creations and specifications.
              </p>
            </div>
          )}

          {/* Craft Specialization if provided */}
          {artisan.specialization && (
            <div className="p-4 rounded-2xl bg-[#C25E3E]/5 border border-[#C25E3E]/20 text-xs text-stone-700">
              <span className="font-bold text-[#C25E3E] uppercase tracking-wider text-[10px] block mb-1">
                Artisan Specialization
              </span>
              <p className="font-medium text-slate-800">{artisan.specialization}</p>
            </div>
          )}
        </div>

        {/* Right 1 Col: Craft & Trust Transparency Panel */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Craft & Trust</span>
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Verified details directly from artisan records
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Metric 1: Products Listed */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4 text-[#C25E3E]" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    {artisanProducts.length} {artisanProducts.length === 1 ? 'Product' : 'Products'}
                  </span>
                  <span className="text-[10px] text-stone-500">Active on KalaConnect</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Verified
              </span>
            </div>

            {/* Metric 2: GI Tag / Authenticity if present */}
            {hasGiTag && (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5">
                <Award className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950 block text-xs">
                    Geographical Indication (GI)
                  </span>
                  <span className="text-[11px] text-amber-800 leading-snug block mt-0.5">
                    {giCraftName || 'Heritage craft authenticated to regional origin'}
                  </span>
                </div>
              </div>
            )}

            {/* Metric 3: Real verification if present */}
            {isVerified && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 block text-xs">
                    Craft Certification
                  </span>
                  <span className="text-[11px] text-emerald-800 leading-snug block mt-0.5">
                    {verificationSource || 'Verified Artisan on KalaConnect'}
                  </span>
                </div>
              </div>
            )}

            {/* Metric 4: B2B Wholesale Capability */}
            {hasB2BListings && (
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-purple-950 block text-xs">
                    Wholesale Supplier
                  </span>
                  <span className="text-[11px] text-purple-800 leading-snug block mt-0.5">
                    Accepts B2B quotes {minMoq ? `• MOQ starts at ${minMoq} pcs` : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Metric 5: Profile Transparency */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Profile Information
              </span>
              <div className="space-y-1 text-[11px] text-stone-600">
                <div className="flex items-center justify-between">
                  <span>Location confirmed</span>
                  <span className="text-emerald-600 font-bold">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Story provided</span>
                  <span className={artisan.bio ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                    {artisan.bio ? '✓' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Direct quote requests</span>
                  <span className="text-emerald-600 font-bold">✓ Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CRAFT & EXPERTISE (Real materials and techniques) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900 font-serif">
            Craft & Expertise
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Techniques and materials practiced across this artisan's products
          </p>
        </div>

        {uniqueCrafts.length > 0 || uniqueMaterials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Craft Types / Traditions */}
            {uniqueCrafts.length > 0 && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  CRAFT TRADITIONS & TECHNIQUES
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueCrafts.map((craft, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-slate-800 font-semibold text-xs shadow-2xs"
                    >
                      {craft}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Materials Used in Real Products */}
            {uniqueMaterials.length > 0 && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  RAW MATERIALS EMPLOYED
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueMaterials.map((mat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 font-semibold text-xs"
                    >
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-stone-50 border border-dashed border-stone-200 text-stone-500 text-xs text-center py-4">
            Craft information not available.
          </div>
        )}
      </div>

      {/* 5. PRODUCTS BY THIS ARTISAN */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif flex items-center gap-2">
              <span>Products by this Artisan</span>
              <span className="text-sm font-sans font-bold px-2.5 py-0.5 rounded-full bg-[#C25E3E]/10 text-[#C25E3E]">
                {artisanProducts.length}
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Browse authentic items handcrafted directly by {artisan.name || 'this artisan'}
            </p>
          </div>

          <button
            onClick={() => setCurrentTab('b2b-marketplace')}
            className="text-xs font-bold text-[#C25E3E] hover:text-[#9C3D1F] hover:underline self-start sm:self-auto flex items-center gap-1"
          >
            <span>View All Products in Marketplace</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        {artisanProducts.length > 0 && (
          <div className="bg-white rounded-2xl p-3 border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search this artisan's items..."
                id="artisan-product-search-input"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:border-[#C25E3E] outline-hidden"
              />
            </div>

            {categories.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#C25E3E] text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Grid */}
        {artisanProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-dashed border-stone-300 text-center space-y-3">
            <Package className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 font-serif">
              This artisan has not listed any products yet.
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Check back soon as new handcrafted pieces are published to KalaConnect.
            </p>
            <button
              onClick={() => setCurrentTab('b2b-marketplace')}
              className="px-5 py-2.5 rounded-xl bg-[#C25E3E] text-white text-xs font-bold shadow-xs hover:bg-[#A94C2E] transition-colors inline-block mt-2"
            >
              Browse All Marketplace Products
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-2">
            <p className="text-sm font-bold text-slate-800">
              No products found matching "{productSearch}"
            </p>
            <button
              onClick={() => {
                setProductSearch('');
                setSelectedCategory('All');
              }}
              className="text-xs font-bold text-[#C25E3E] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => {
              const imageToShow = prod.enhancedImage || prod.originalImage;
              const hasWholesale = Boolean(prod.wholesalePrice || prod.b2bWholesalePrice);
              const wholesalePrice = prod.wholesalePrice || prod.b2bWholesalePrice || prod.actualPrice;
              const moq = prod.wholesaleMOQ || prod.b2bMOQ || prod.moq || 5;

              return (
                <div
                  key={prod.id}
                  id={`artisan-product-card-${prod.id}`}
                  className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Card Image */}
                  <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                    <img
                      src={imageToShow}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-[#C25E3E] shadow-xs">
                        {prod.craftType}
                      </span>
                    </div>

                    {prod.inventory !== undefined && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white">
                          {prod.inventory} in stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 font-serif text-sm sm:text-base line-clamp-2 leading-snug group-hover:text-[#C25E3E] transition-colors">
                        {currentLang === 'hi' ? prod.titleHindi || prod.title : prod.title}
                      </h3>

                      <p className="text-xs text-stone-500 line-clamp-2">
                        {prod.description}
                      </p>
                    </div>

                    {/* Pricing & MOQ */}
                    <div className="pt-2 border-t border-stone-100 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 font-bold uppercase block">
                            B2B Wholesale
                          </span>
                          <span className="text-lg font-bold font-serif text-[#C25E3E]">
                            ₹{wholesalePrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-stone-500 ml-1">/ unit</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 font-bold uppercase block">
                            Min Order
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {moq} pcs
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons: View Details & Request Quote / Edit Price */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onSelectProduct?.(prod)}
                          id={`view-detail-btn-${prod.id}`}
                          className="flex-1 py-2 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-500" />
                          <span>View Product</span>
                        </button>

                        {(() => {
                          const isOwnProduct = isProductOwner(
                            prod,
                            currentRole,
                            currentUserId ? { uid: currentUserId } : null,
                            currentArtisan
                          );

                          if (isOwnProduct) {
                            return onEditPrice ? (
                              <button
                                type="button"
                                onClick={() => onEditPrice(prod)}
                                id={`edit-price-btn-${prod.id}`}
                                className="flex-1 py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                title="Edit Price with KalaPrice"
                              >
                                <BadgeIndianRupee className="w-3.5 h-3.5 text-[#C25E3E]" />
                                <span>Edit Price</span>
                              </button>
                            ) : null;
                          }

                          // If authenticated user is an artisan viewing another artisan's profile, do not show Request Quote
                          if (currentRole === 'artisan') {
                            return null;
                          }

                          // Buyers and external marketplace visitors
                          return (
                            <button
                              type="button"
                              onClick={() => onOpenRequestQuote?.(prod)}
                              id={`request-quote-btn-${prod.id}`}
                              className="flex-1 py-2 px-3 rounded-xl bg-[#C25E3E] hover:bg-[#A94C2E] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Request Quote</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
