import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Image as ImageIcon,
  Upload,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  Loader2,
  FolderHeart,
  BadgeIndianRupee,
  Info,
  Package,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { LanguageCode, PageTab, PreviousWork, Product } from '../../types';
import { TRANSLATIONS } from '../../utils/translations';
import { SAMPLE_CRAFT_TYPES } from '../../data/mockData';
import { compressDataUrl } from '../../utils/imageCompression';
import { useAuth } from '../../context/AuthContext';
import { savePreviousWorkToDb, deletePreviousWorkFromDb } from '../../services/previousWorkService';

const DEFAULT_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80';

export interface DisplayedWorkItem {
  id: string;
  sourceType: 'product' | 'custom_upload';
  title: string;
  craftType: string;
  category?: string;
  description: string;
  materials: string[];
  imageUrl: string;
  yearCreated: number | string;
  price?: number;
  dimensions?: string;
  craftStory?: string;
  originalProduct?: Product;
}

interface PreviousWorkPageProps {
  products?: Product[];
  allProducts?: Product[];
  previousWorks: PreviousWork[];
  setPreviousWorks: React.Dispatch<React.SetStateAction<PreviousWork[]>>;
  currentLang: LanguageCode;
  setCurrentTab?: (tab: PageTab) => void;
}

export const PreviousWorkPage: React.FC<PreviousWorkPageProps> = ({
  products = [],
  allProducts = [],
  previousWorks = [],
  setPreviousWorks,
  currentLang,
  setCurrentTab,
}) => {
  const { user, artisan } = useAuth();
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<DisplayedWorkItem | null>(null);

  // Form states for manual artwork upload
  const [title, setTitle] = useState('');
  const [craftType, setCraftType] = useState(artisan?.craftType || SAMPLE_CRAFT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState('');
  const [yearCreated, setYearCreated] = useState<string>(new Date().getFullYear().toString());
  const [price, setPrice] = useState<string>('');
  const [craftStory, setCraftStory] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Strict User Data Isolation: Only retrieve products owned by the authenticated artisan
  const currentUserId = user?.uid?.trim();
  const currentArtisanId = artisan?.id?.trim();

  // 1. Existing products owned by this authenticated artisan
  const artisanCatalogProducts = useMemo(() => {
    if (!currentUserId && !currentArtisanId) return [];

    // Use passed products or allProducts
    const source = products.length > 0 ? products : allProducts;

    return source.filter((p) => {
      if (!p) return false;
      const pArtisanId = p.artisanId?.trim();
      const pUserId = p.userId?.trim();

      if (currentUserId && (pArtisanId === currentUserId || pUserId === currentUserId)) {
        return true;
      }
      if (currentArtisanId && (pArtisanId === currentArtisanId || pUserId === currentArtisanId)) {
        return true;
      }
      return false;
    });
  }, [products, allProducts, currentUserId, currentArtisanId]);

  // 2. Standalone custom uploads owned by this authenticated artisan
  const artisanUploadedWorks = useMemo(() => {
    if (!currentUserId && !currentArtisanId) return [];
    return previousWorks.filter((w) => {
      if (!w) return false;
      const wUserId = w.userId?.trim();
      if (currentUserId && wUserId === currentUserId) return true;
      if (currentArtisanId && wUserId === currentArtisanId) return true;
      return false;
    });
  }, [previousWorks, currentUserId, currentArtisanId]);

  // 3. Map existing catalog products into showcased previous work items
  const catalogWorkItems = useMemo<DisplayedWorkItem[]>(() => {
    return artisanCatalogProducts.map((p) => {
      const displayTitle =
        currentLang === 'hi' && p.titleHindi ? p.titleHindi : p.title;
      const displayDesc =
        currentLang === 'hi' && p.descriptionHindi
          ? p.descriptionHindi
          : p.description;

      const img =
        p.enhancedImage ||
        p.originalImage ||
        p.image ||
        p.selectedImageUrl ||
        p.enhancedImageUrl ||
        p.originalImageUrl ||
        DEFAULT_IMAGE_PLACEHOLDER;

      const year = p.createdAt
        ? new Date(p.createdAt).getFullYear()
        : new Date().getFullYear();

      const val =
        p.actualPrice ||
        p.retailPrice ||
        p.suggestedPrice ||
        p.wholesalePrice;

      return {
        id: p.id,
        sourceType: 'product',
        title: displayTitle,
        craftType: p.craftType || p.category || 'Handcrafted Artisan Craft',
        category: p.category,
        description: displayDesc || 'Handcrafted authentic artisan piece.',
        materials: p.materials && p.materials.length > 0 ? p.materials : (p.material ? [p.material] : []),
        imageUrl: img,
        yearCreated: year,
        price: val,
        dimensions: p.dimensions,
        craftStory:
          p.catalogData?.storyBehindCraft ||
          (p.kalaCatalogData as any)?.storyBehindCraft,
        originalProduct: p,
      };
    });
  }, [artisanCatalogProducts, currentLang]);

  // 4. Custom standalone uploaded works
  const customWorkItems = useMemo<DisplayedWorkItem[]>(() => {
    return artisanUploadedWorks.map((w) => ({
      id: w.id,
      sourceType: 'custom_upload',
      title: w.title,
      craftType: w.craftType || 'Heritage Artwork',
      description: w.description || 'Custom commissioned artwork.',
      materials: w.materials || [],
      imageUrl: w.imageUrl || DEFAULT_IMAGE_PLACEHOLDER,
      yearCreated: w.yearCreated || new Date().getFullYear(),
      price: w.price,
      dimensions: w.dimensions,
      craftStory: w.craftStory,
    }));
  }, [artisanUploadedWorks]);

  // 5. Combine without duplicate records
  const displayedWorks = useMemo<DisplayedWorkItem[]>(() => {
    const map = new Map<string, DisplayedWorkItem>();
    catalogWorkItems.forEach((item) => map.set(item.id, item));
    customWorkItems.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [catalogWorkItems, customWorkItems]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setMaterials('');
    setYearCreated(new Date().getFullYear().toString());
    setPrice('');
    setCraftStory('');
    setDimensions('');
    setImagePreview(null);
    setFormError(null);
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUrl = reader.result as string;
      try {
        const compressed = await compressDataUrl(rawDataUrl, 1000, 0.75);
        setImagePreview(compressed);
      } catch {
        setImagePreview(rawDataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a title for this artwork.');
      return;
    }
    if (!imagePreview) {
      setFormError('Please upload an image of your previous artwork.');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const materialsArray = materials
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);

      const userId = user?.uid || artisan?.id || 'guest-artisan';

      const saved = await savePreviousWorkToDb(userId, {
        title: title.trim(),
        craftType,
        description: description.trim() || 'Custom handcrafted heritage artwork.',
        materials: materialsArray.length > 0 ? materialsArray : ['Traditional Natural Materials'],
        imageUrl: imagePreview,
        yearCreated: parseInt(yearCreated, 10) || new Date().getFullYear(),
        price: price ? parseFloat(price) : undefined,
        craftStory: craftStory.trim() || undefined,
        dimensions: dimensions.trim() || undefined,
      });

      setPreviousWorks((prev) => [saved, ...prev.filter((w) => w.id !== saved.id)]);
      resetForm();
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Error saving previous work:', err);
      setFormError('Failed to save previous work. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomWork = async (workId: string) => {
    if (!confirm('Are you sure you want to remove this piece from your previous works portfolio?')) return;
    try {
      await deletePreviousWorkFromDb(workId, user?.uid);
      setPreviousWorks((prev) => prev.filter((w) => w.id !== workId));
      if (selectedWork?.id === workId) {
        setSelectedWork(null);
      }
    } catch (err) {
      console.error('Error deleting previous work:', err);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C25E3E]/10 text-[#C25E3E] border border-[#C25E3E]/20 flex items-center gap-1">
              <FolderHeart className="w-3.5 h-3.5" />
              Artist Portfolio
            </span>
            <span className="text-xs text-stone-500 font-medium">
              {displayedWorks.length} piece{displayedWorks.length === 1 ? '' : 's'} documented
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-serif">
            Previous Work
          </h1>
          <p className="text-sm text-stone-500 mt-1 max-w-xl">
            Showcase your handcrafted creations, completed custom commissions, and master catalog pieces to build trust with buyers.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          id="upload-previous-work-btn"
          className="px-5 py-3 rounded-2xl bg-[#C25E3E] hover:bg-[#a94e32] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-[#C25E3E]/25 transition-colors self-start sm:self-auto shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Upload Previous Artwork</span>
        </button>
      </div>

      {/* Grid of Previous Works */}
      {displayedWorks.length === 0 ? (
        <div
          id="no-previous-work-container"
          className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-12 text-center max-w-xl mx-auto space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#C25E3E]/10 text-[#C25E3E] flex items-center justify-center mx-auto">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 id="empty-previous-work-heading" className="text-lg font-bold text-slate-900">
            No previous work yet.
          </h3>
          <p id="empty-previous-work-subtext" className="text-sm text-stone-500 max-w-md mx-auto">
            Your completed and showcased work will appear here.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#C25E3E] text-white text-sm font-bold hover:bg-[#a94e32] shadow-xs"
            >
              Upload Artwork Piece
            </button>
            {setCurrentTab && (
              <button
                onClick={() => setCurrentTab('wizard')}
                className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-sm font-bold hover:bg-stone-50"
              >
                Create New Product
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedWorks.map((work) => (
            <div
              key={work.id}
              id={`previous-work-card-${work.id}`}
              className="group bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Artwork Image */}
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  <img
                    src={work.imageUrl}
                    alt={work.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-xs">
                      {work.craftType}
                    </span>
                    {work.category && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/90 backdrop-blur-md text-stone-700 border border-stone-200 shadow-2xs self-start">
                        {work.category}
                      </span>
                    )}
                  </div>

                  {work.yearCreated && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-800 border border-stone-200 shadow-xs">
                      {work.yearCreated}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    {work.sourceType === 'product' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                        Catalog Showcase
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base sm:text-lg line-clamp-1 group-hover:text-[#C25E3E] transition-colors">
                    {work.title}
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {work.description}
                  </p>

                  {work.materials && work.materials.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {work.materials.slice(0, 3).map((mat, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-700"
                        >
                          {mat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="px-5 py-3.5 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
                <div>
                  {work.price ? (
                    <span className="text-xs font-bold text-emerald-700 flex items-center">
                      Valued at ₹{work.price.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-400">Custom Artwork</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedWork(work)}
                    id={`view-work-btn-${work.id}`}
                    className="p-1.5 rounded-lg text-stone-600 hover:text-slate-900 hover:bg-stone-200 transition-colors flex items-center gap-1 text-xs font-medium"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>

                  {work.sourceType === 'product' && setCurrentTab && (
                    <button
                      onClick={() => setCurrentTab('catalog')}
                      className="p-1.5 rounded-lg text-[#C25E3E] hover:bg-[#C25E3E]/10 transition-colors"
                      title="View in My Catalog"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}

                  {work.sourceType === 'custom_upload' && (
                    <button
                      onClick={() => handleDeleteCustomWork(work.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Piece"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Previous Work Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Upload Previous Artwork</h2>
                <p className="text-xs text-stone-500">Document your craft history and portfolio pieces</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-slate-900 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveWork} className="space-y-4">
              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Artwork Photo <span className="text-rose-500">*</span>
                </label>

                {imagePreview ? (
                  <div className="relative aspect-16/9 bg-stone-100 rounded-2xl overflow-hidden border border-stone-300">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-stone-300 hover:border-[#C25E3E] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
                    <Upload className="w-8 h-8 text-stone-400 mb-2" />
                    <span className="text-xs font-bold text-slate-800">Click to select photo</span>
                    <span className="text-[11px] text-stone-400 mt-0.5">JPEG, PNG or WebP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Title & Craft Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Artwork Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Royal Peacock Ceramic Urn"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#C25E3E] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Craft Type
                  </label>
                  <select
                    value={craftType}
                    onChange={(e) => setCraftType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#C25E3E] text-sm bg-white"
                  >
                    {SAMPLE_CRAFT_TYPES.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description & Context
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the artwork, who it was made for, or its significance..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#C25E3E] text-sm"
                />
              </div>

              {/* Materials & Year Created */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Materials Used (comma separated)
                  </label>
                  <input
                    type="text"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="e.g. Quartz powder, Cobalt glaze, 24k gold leaf"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#C25E3E] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Year Created
                  </label>
                  <input
                    type="number"
                    value={yearCreated}
                    onChange={(e) => setYearCreated(e.target.value)}
                    placeholder="2025"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#C25E3E] text-sm"
                  />
                </div>
              </div>

              {/* Optional Price & Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estimated Value / Price (₹ Optional)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#C25E3E] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Dimensions (Optional)
                  </label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="e.g. 18 inch Height"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#C25E3E] text-sm"
                  />
                </div>
              </div>

              {/* Story / Craft technique */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Craft Story or Technique Notes (Optional)
                </label>
                <input
                  type="text"
                  value={craftStory}
                  onChange={(e) => setCraftStory(e.target.value)}
                  placeholder="e.g. Fired in wood kiln for 72 hours with GI-tagged mineral glaze."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#C25E3E] text-sm"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-sm font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#C25E3E] text-white text-sm font-bold hover:bg-[#a94e32] shadow-md shadow-[#C25E3E]/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Artwork to Portfolio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedWork && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200 my-auto animate-in zoom-in-95 duration-200">
            <div className="relative aspect-4/3 bg-stone-100">
              <img
                src={selectedWork.imageUrl}
                alt={selectedWork.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedWork(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2">
                <span>{selectedWork.craftType}</span>
                <span>•</span>
                <span>{selectedWork.yearCreated}</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selectedWork.sourceType === 'product' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      Catalog Item
                    </span>
                  )}
                  {selectedWork.category && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                      {selectedWork.category}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900">{selectedWork.title}</h3>
                {selectedWork.price && (
                  <p className="text-sm font-bold text-emerald-700 mt-0.5">
                    Value / Price: ₹{selectedWork.price.toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              <p className="text-sm text-stone-600 leading-relaxed">
                {selectedWork.description}
              </p>

              {selectedWork.materials && selectedWork.materials.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Materials
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedWork.materials.map((m, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 text-stone-800 font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedWork.craftStory && (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold block mb-1">Craftsmanship Story:</span>
                  {selectedWork.craftStory}
                </div>
              )}

              {selectedWork.dimensions && (
                <p className="text-xs text-stone-500">
                  <span className="font-semibold text-slate-700">Dimensions:</span>{' '}
                  {selectedWork.dimensions}
                </p>
              )}

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                {selectedWork.sourceType === 'product' && setCurrentTab ? (
                  <button
                    onClick={() => {
                      setSelectedWork(null);
                      setCurrentTab('catalog');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#C25E3E] hover:bg-[#C25E3E]/10 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View in My Catalog</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  onClick={() => setSelectedWork(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
