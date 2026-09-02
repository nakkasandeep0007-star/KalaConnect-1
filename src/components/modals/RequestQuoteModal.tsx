import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  IndianRupee, 
  Package, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  CheckCircle2, 
  User, 
  Building, 
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Product, B2BQuoteRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface RequestQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit?: (quoteData: any) => Promise<any> | any;
  onSubmitQuote?: (quoteData: any) => Promise<any> | any;
}

interface SubmittedQuoteSummary {
  productTitle: string;
  buyerOrganization: string;
  contactPerson: string;
  quantity: number;
  targetPricePerUnit: number;
  deliveryLocation: string;
  requiredByDate: string;
  status: string;
  requestId: string;
}

export const RequestQuoteModal: React.FC<RequestQuoteModalProps> = ({
  isOpen,
  onClose,
  product,
  onSubmit,
  onSubmitQuote,
}) => {
  const { user, buyerProfile, role } = useAuth();

  // Form State
  const [buyerOrganization, setBuyerOrganization] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [quantity, setQuantity] = useState<number | string>('50');
  const [targetPricePerUnit, setTargetPricePerUnit] = useState<number | string>('');
  const [deliveryLocation, setDeliveryLocation] = useState<string>('');
  const [requiredByDate, setRequiredByDate] = useState<string>('');
  const [message, setMessage] = useState<string>('Interested in bulk purchase for retail & corporate gifting.');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedQuoteSummary | null>(null);

  // Initialize and synchronize state when modal opens
  useEffect(() => {
    if (isOpen && product) {
      setBuyerOrganization(buyerProfile?.businessName || (user?.name ? `${user.name}'s Enterprise` : 'ABC Handicrafts Pvt Ltd'));
      setContactPerson(buyerProfile?.contactPerson || user?.name || 'Procurement Team');
      setDeliveryLocation(buyerProfile?.cityState || 'Delhi, India');
      
      const defaultWholesale = product.b2bWholesalePrice || product.wholesalePrice || Math.round((product.actualPrice || 1000) * 0.75);
      setTargetPricePerUnit(String(defaultWholesale));
      setQuantity(String(product.b2bMOQ || product.wholesaleMOQ || 50));
      
      // Default required by date: 14 days from today
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      setRequiredByDate(defaultDate.toISOString().split('T')[0]);
      
      setFieldErrors({});
      setGeneralError('');
      setSubmittedSummary(null);
      setIsSubmitting(false);
    }
  }, [isOpen, product, buyerProfile, user]);

  if (!isOpen || !product) return null;

  const retailPrice = product.actualPrice || product.suggestedPrice || 0;
  const wholesalePrice = product.b2bWholesalePrice || product.wholesalePrice || Math.round(retailPrice * 0.75);
  const moq = product.b2bMOQ || product.wholesaleMOQ || 5;
  const stock = product.b2bStock || product.inventory || 20;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Buyer Organization
    if (!buyerOrganization.trim()) {
      errors.buyerOrganization = 'Buyer Organization / Business Name is required.';
    }

    // 2. Contact Person
    if (!contactPerson.trim()) {
      errors.contactPerson = 'Contact Person Name is required.';
    }

    // 3. Quantity
    const numQty = Number(quantity);
    if (!quantity || isNaN(numQty) || numQty <= 0) {
      errors.quantity = 'Quantity must be a positive number greater than 0.';
    }

    // 4. Target Price Per Unit
    const numPrice = Number(targetPricePerUnit);
    if (targetPricePerUnit === '' || isNaN(numPrice) || numPrice < 0) {
      errors.targetPricePerUnit = 'Target price per unit must be 0 or greater.';
    }

    // 5. Delivery Location
    if (!deliveryLocation.trim()) {
      errors.deliveryLocation = 'Delivery location (City / State) is required.';
    }

    // 6. Required By Date
    if (!requiredByDate.trim()) {
      errors.requiredByDate = 'Required by date is required.';
    }

    // 7. Product ID
    if (!product.id) {
      errors.product = 'Selected product identifier is missing.';
    }

    // 8. Artisan ID
    const effectiveArtisanId = product.artisanId || product.userId || 'sample-artist';
    if (!effectiveArtisanId) {
      errors.artisan = 'Artisan identifier for this product is missing.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (isSubmitting) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract Identifiers
      const effectiveBuyerId = user?.uid || buyerProfile?.id || `buyer_${Date.now()}`;
      const effectiveArtisanId = product.artisanId || product.userId || 'sample-artist';
      const uniqueRequestId = `b2b_rfq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toISOString();

      const numQuantity = Math.max(1, Number(quantity));
      const numTargetPrice = Math.max(0, Number(targetPricePerUnit));

      // Canonical RFQ Object
      const canonicalRFQ = {
        id: uniqueRequestId,
        requestId: uniqueRequestId,
        buyerId: effectiveBuyerId,
        artisanId: effectiveArtisanId,
        productId: product.id,
        buyerOrganization: buyerOrganization.trim(),
        buyerOrg: buyerOrganization.trim(),
        contactPerson: contactPerson.trim(),
        buyerName: contactPerson.trim(),
        quantity: numQuantity,
        targetPricePerUnit: numTargetPrice,
        targetPrice: numTargetPrice,
        deliveryLocation: deliveryLocation.trim(),
        buyerLocation: deliveryLocation.trim(),
        requiredByDate: requiredByDate.trim(),
        requiredBy: requiredByDate.trim(),
        message: message.trim() || 'Interested in bulk purchase.',
        status: 'pending' as const,
        createdAt: timestamp,
        updatedAt: timestamp,

        // Product Details for rich presentation
        productName: product.title,
        productTitle: product.title,
        productImage: product.enhancedImage || product.originalImage || '',
        category: product.category || 'Handicrafts',
        craftType: product.craftType || 'Traditional Craft',
        artisanName: product.artisanName || 'Master Artisan',
        artisanLocation: product.originRegion || product.artisanLocation || 'Jaipur, Rajasthan',
      };

      // Call handler (support both onSubmit and onSubmitQuote)
      const submitFn = onSubmitQuote || onSubmit;
      if (typeof submitFn === 'function') {
        await submitFn(canonicalRFQ);
      }

      // Display Success Summary
      setSubmittedSummary({
        productTitle: product.title,
        buyerOrganization: buyerOrganization.trim(),
        contactPerson: contactPerson.trim(),
        quantity: numQuantity,
        targetPricePerUnit: numTargetPrice,
        deliveryLocation: deliveryLocation.trim(),
        requiredByDate: requiredByDate.trim(),
        status: 'Pending',
        requestId: uniqueRequestId,
      });

    } catch (err: any) {
      console.error('Submission error:', err);
      setGeneralError(err.message || 'An unexpected error occurred while sending the quote request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      id="request-quote-modal-overlay"
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
        id="request-quote-modal-content"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C25E3E] text-white flex items-center justify-center shadow-inner font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight font-serif text-amber-100">
                  Request Wholesale Quotation
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Direct RFQ
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Direct wholesale request to master artisan • Zero middleman markup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            id="close-request-quote-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Product Summary Banner */}
        <div className="bg-amber-50/70 border-b border-amber-200/70 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={product.enhancedImage || product.originalImage || 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80'}
              alt={product.title}
              className="w-14 h-14 rounded-2xl object-cover border border-amber-200 shadow-xs shrink-0"
            />
            <div>
              <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                {product.craftType || 'Authentic Craft'}
              </p>
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-sm">
                {product.title}
              </h3>
              <p className="text-xs text-stone-600">
                Artisan: <strong className="text-slate-800">{product.artisanName || 'Master Craftsman'}</strong> ({product.originRegion || product.artisanLocation || 'Jaipur'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 bg-white px-3.5 py-2 rounded-xl border border-amber-200/80 shadow-2xs self-start sm:self-auto text-xs">
            <div>
              <p className="text-[10px] text-stone-500 font-medium">Retail Price</p>
              <p className="font-semibold text-stone-700">₹{retailPrice}</p>
            </div>
            <div className="w-px h-6 bg-stone-200" />
            <div>
              <p className="text-[10px] text-stone-500 font-medium">Artisan Wholesale</p>
              <p className="font-bold text-[#C25E3E]">₹{wholesalePrice}</p>
            </div>
            <div className="w-px h-6 bg-stone-200" />
            <div>
              <p className="text-[10px] text-stone-500 font-medium">MOQ / Stock</p>
              <p className="font-semibold text-stone-800">{moq} / {stock} units</p>
            </div>
          </div>
        </div>

        {/* Modal Body: Success Screen OR Form */}
        {submittedSummary ? (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200" id="quote-success-view">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-serif text-slate-900">
                Quote request sent successfully!
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Your Request for Quotation (RFQ) has been logged and sent directly to the master artisan.
              </p>
            </div>

            {/* Structured Summary Card */}
            <div className="bg-stone-50 rounded-2xl border border-stone-200/90 p-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="text-stone-500 font-medium">Product:</span>
                <strong className="text-slate-900 font-bold text-right max-w-xs truncate">
                  {submittedSummary.productTitle}
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Buyer Organization:</span>
                <strong className="text-slate-900 font-bold">{submittedSummary.buyerOrganization}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Contact Person:</span>
                <strong className="text-slate-900 font-bold">{submittedSummary.contactPerson}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Quantity:</span>
                <strong className="text-slate-900 font-bold">{submittedSummary.quantity} units</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Target price:</span>
                <strong className="text-[#C25E3E] font-bold">₹{submittedSummary.targetPricePerUnit} / unit</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Delivery Location:</span>
                <strong className="text-slate-800 font-semibold">{submittedSummary.deliveryLocation}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Required By:</span>
                <strong className="text-slate-800 font-semibold">{submittedSummary.requiredByDate}</strong>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                <span className="text-stone-500 font-medium">Status:</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {submittedSummary.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                id="rfq-success-close-btn"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Done</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[calc(85vh-200px)] overflow-y-auto" id="rfq-submission-form">
            
            {/* General Banner Error */}
            {generalError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{generalError}</span>
              </div>
            )}

            {/* Buyer Organization & Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Buyer Organization *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={buyerOrganization}
                    onChange={(e) => {
                      setBuyerOrganization(e.target.value);
                      if (fieldErrors.buyerOrganization) {
                        setFieldErrors((prev) => ({ ...prev, buyerOrganization: '' }));
                      }
                    }}
                    placeholder="e.g. ABC Handicrafts Pvt Ltd"
                    id="rfq-buyer-org-input"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 bg-white transition-all outline-hidden ${
                      fieldErrors.buyerOrganization
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-stone-300 focus:border-[#C25E3E] focus:ring-2 focus:ring-[#C25E3E]/20'
                    }`}
                  />
                </div>
                {fieldErrors.buyerOrganization && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.buyerOrganization}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Contact Person *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => {
                      setContactPerson(e.target.value);
                      if (fieldErrors.contactPerson) {
                        setFieldErrors((prev) => ({ ...prev, contactPerson: '' }));
                      }
                    }}
                    placeholder="e.g. Rahul Verma"
                    id="rfq-contact-person-input"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 bg-white transition-all outline-hidden ${
                      fieldErrors.contactPerson
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-stone-300 focus:border-[#C25E3E] focus:ring-2 focus:ring-[#C25E3E]/20'
                    }`}
                  />
                </div>
                {fieldErrors.contactPerson && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.contactPerson}
                  </p>
                )}
              </div>
            </div>

            {/* Quantity & Target Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Required Quantity (Units) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Package className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      if (fieldErrors.quantity) {
                        setFieldErrors((prev) => ({ ...prev, quantity: '' }));
                      }
                    }}
                    placeholder="e.g. 50"
                    id="rfq-quantity-input"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 bg-white transition-all outline-hidden ${
                      fieldErrors.quantity
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-stone-300 focus:border-[#C25E3E] focus:ring-2 focus:ring-[#C25E3E]/20'
                    }`}
                  />
                </div>
                {fieldErrors.quantity ? (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.quantity}
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-500 mt-1">
                    MOQ for this item is {moq} units. Available stock: {stock} units.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Target Price / Unit (₹) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={targetPricePerUnit}
                    onChange={(e) => {
                      setTargetPricePerUnit(e.target.value);
                      if (fieldErrors.targetPricePerUnit) {
                        setFieldErrors((prev) => ({ ...prev, targetPricePerUnit: '' }));
                      }
                    }}
                    placeholder="e.g. 320"
                    id="rfq-target-price-input"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 bg-white transition-all outline-hidden ${
                      fieldErrors.targetPricePerUnit
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-stone-300 focus:border-[#C25E3E] focus:ring-2 focus:ring-[#C25E3E]/20'
                    }`}
                  />
                </div>
                {fieldErrors.targetPricePerUnit ? (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.targetPricePerUnit}
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-500 mt-1">
                    Artisan wholesale base price is ₹{wholesalePrice}.
                  </p>
                )}
              </div>
            </div>

            {/* Delivery Location & Required By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Delivery Location (City / State) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => {
                      setDeliveryLocation(e.target.value);
                      if (fieldErrors.deliveryLocation) {
                        setFieldErrors((prev) => ({ ...prev, deliveryLocation: '' }));
                      }
                    }}
                    placeholder="e.g. Delhi, NCR"
                    id="rfq-delivery-location-input"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 bg-white transition-all outline-hidden ${
                      fieldErrors.deliveryLocation
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-stone-300 focus:border-[#C25E3E] focus:ring-2 focus:ring-[#C25E3E]/20'
                    }`}
                  />
                </div>
                {fieldErrors.deliveryLocation && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.deliveryLocation}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                  Required By (Target Date) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    value={requiredByDate}
                    onChange={(e) => {
                      setRequiredByDate(e.target.value);
                      if (fieldErrors.requiredByDate) {
                        setFieldErrors((prev) => ({ ...prev, requiredByDate: '' }));
                      }
                    }}
                    id="rfq-required-by-input"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 bg-white transition-all outline-hidden ${
                      fieldErrors.requiredByDate
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-stone-300 focus:border-[#C25E3E] focus:ring-2 focus:ring-[#C25E3E]/20'
                    }`}
                  />
                </div>
                {fieldErrors.requiredByDate && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.requiredByDate}
                  </p>
                )}
              </div>
            </div>

            {/* Message / Details */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                Message / Custom Packaging & Spec Details
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-stone-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mention custom logo engraving, export packing, or batch delivery schedules..."
                  id="rfq-message-textarea"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-[#C25E3E] focus:ring-2 focus:ring-[#C25E3E]/20 text-xs sm:text-sm text-slate-900 bg-white outline-hidden"
                />
              </div>
            </div>

            {/* Estimated Total Summary */}
            {Number(quantity) > 0 && Number(targetPricePerUnit) >= 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs">
                <span className="text-stone-700 font-medium">Estimated Bulk Order Value (Target):</span>
                <span className="text-base font-extrabold text-slate-900 font-serif">
                  ₹{(Number(quantity) * Number(targetPricePerUnit)).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                id="cancel-quote-request-btn"
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                id="submit-quote-request-btn"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C25E3E] to-[#9E3E20] hover:from-[#B14E2E] hover:to-[#8E2E10] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#C25E3E]/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending RFQ...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
