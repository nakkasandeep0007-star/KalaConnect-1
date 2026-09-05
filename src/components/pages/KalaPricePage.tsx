import React, { useState, useEffect, useRef } from 'react';
import {
  BadgeIndianRupee,
  Sparkles,
  CheckCircle2,
  Volume2,
  ArrowRight,
  Calculator,
  RefreshCw,
  Layers,
  ShoppingBag,
  Package,
  Clock,
  Hammer,
  Truck,
  TrendingUp,
  ShieldCheck,
  Check,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Info,
  DollarSign,
  Palette,
  Tag,
  Wand2,
  Pencil,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';
import { LanguageCode, PageTab, PricingInputs, KalaPricingResult, Product, KalaPricingData } from '../../types';
import { speakText } from '../../utils/audioSpeech';
import { useProductDraft } from '../../context/ProductDraftContext';
import { useAuth } from '../../context/AuthContext';
import { calculateKalaPrice, fetchGeminiPriceExplanation } from '../../utils/pricingEngine';
import { saveProductToDb } from '../../services/productService';

interface KalaPricePageProps {
  setCurrentTab: (tab: PageTab) => void;
  currentLang: LanguageCode;
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  initialProductId?: string | null;
}

export const KalaPricePage: React.FC<KalaPricePageProps> = ({
  setCurrentTab,
  currentLang: initialLang,
  products = [],
  setProducts,
  initialProductId,
}) => {
  const { draft, updateDraft } = useProductDraft();
  
  // Local language toggle for KalaPrice (English / Hindi)
  const [activeLang, setActiveLang] = useState<'en' | 'hi'>(initialLang === 'hi' ? 'hi' : 'en');

  // Sync with initialLang if parent changes
  useEffect(() => {
    if (initialLang === 'hi' || initialLang === 'en') {
      setActiveLang(initialLang);
    }
  }, [initialLang]);

  // Selected product from catalog or active draft
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (initialProductId && products.some(p => p.id === initialProductId)) {
      return initialProductId;
    }
    return 'draft';
  });

  // Sync selectedProductId if initialProductId changes
  useEffect(() => {
    if (initialProductId && products.some(p => p.id === initialProductId)) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId, products]);

  // Input states with robust defaults
  const [materialCost, setMaterialCost] = useState<number>(draft.rawMaterialCost || 400);
  const [labourRate, setLabourRate] = useState<number>(draft.labourRatePerHour || 100);
  const [hoursRequired, setHoursRequired] = useState<number>(draft.labourHours || 6);
  const [packagingCost, setPackagingCost] = useState<number>(50);
  const [shippingCost, setShippingCost] = useState<number>(100);
  const [additionalExpenses, setAdditionalExpenses] = useState<number>(draft.otherCosts || 50);
  const [profitMargin, setProfitMargin] = useState<number>(draft.profitMarginPercent || 25);

  // Active product metadata for calculation
  const [productName, setProductName] = useState<string>(draft.title || 'Handcrafted Heritage Item');
  const [category, setCategory] = useState<string>(draft.category || 'Handloom textiles');
  const [material, setMaterial] = useState<string>(draft.material || 'Natural Handloom Cotton / Silk');
  const [craftTechnique, setCraftTechnique] = useState<string>(draft.craftType || 'Traditional Weaving');
  const [craftComplexity, setCraftComplexity] = useState<string>('Skilled Artisan');
  const [colors, setColors] = useState<string>(draft.colors?.join(', ') || 'Natural Indigo, Madder Red, Earth Ochre');
  const [productImage, setProductImage] = useState<string | undefined>(draft.enhancedImage || draft.originalImage);

  // Calculation Results
  const [pricingResult, setPricingResult] = useState<KalaPricingResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<'cost_recovery' | 'recommended' | 'premium' | 'custom'>('recommended');
  const [chosenPrice, setChosenPrice] = useState<number>(1499);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [geminiExplanation, setGeminiExplanation] = useState<{
    explanationEnglish?: string;
    explanationHindi?: string;
    reasonsEnglish?: string[];
    reasonsHindi?: string[];
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const costsSectionRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  // Synchronize when active draft changes or when a product is selected from dropdown
  useEffect(() => {
    if (selectedProductId === 'draft') {
      if (draft.title) setProductName(draft.title);
      if (draft.category) setCategory(draft.category);
      if (draft.material) setMaterial(draft.material);
      if (draft.craftType) setCraftTechnique(draft.craftType);
      if (draft.enhancedImage || draft.originalImage) {
        setProductImage(draft.enhancedImage || draft.originalImage);
      }
      setMaterialCost(draft.rawMaterialCost ?? (draft.pricingInputs?.materialCost ?? 0));
      setHoursRequired(draft.labourHours ?? (draft.pricingInputs?.hoursRequired ?? (draft.pricingInputs?.labourHours ?? 0)));
      setLabourRate(draft.labourRatePerHour ?? (draft.pricingInputs?.labourRate ?? 100));
      setPackagingCost(draft.pricingInputs?.packagingCost ?? 50);
      setShippingCost(draft.pricingInputs?.shippingCost ?? 100);
      setAdditionalExpenses(draft.otherCosts ?? (draft.pricingInputs?.additionalExpenses ?? (draft.pricingInputs?.otherCosts ?? 0)));
      setProfitMargin(draft.profitMarginPercent ?? (draft.pricingInputs?.profitMargin ?? 25));
    } else {
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod) {
        setProductName(prod.title || prod.titleHindi || 'Artisan Product');
        setCategory(prod.category || 'Handicrafts');
        setMaterial(prod.material || (prod.materials && prod.materials.length > 0 ? prod.materials.join(', ') : 'Handmade'));
        setCraftTechnique(prod.craftType || 'Traditional Craft');
        setColors(prod.colors?.join(', ') || 'Natural');
        setProductImage(prod.enhancedImage || prod.originalImage || prod.image);
        
        // Priority: stored pricingInputs > direct properties > empty/zero
        setMaterialCost(prod.pricingInputs?.materialCost ?? prod.rawMaterialCost ?? 0);
        setHoursRequired(prod.pricingInputs?.hoursRequired ?? prod.pricingInputs?.labourHours ?? prod.labourHours ?? 0);
        setLabourRate(prod.pricingInputs?.labourRate ?? prod.labourRatePerHour ?? 100);
        setPackagingCost(prod.pricingInputs?.packagingCost ?? 50);
        setShippingCost(prod.pricingInputs?.shippingCost ?? 100);
        setAdditionalExpenses(prod.pricingInputs?.additionalExpenses ?? prod.pricingInputs?.otherCosts ?? prod.otherCosts ?? 0);
        setProfitMargin(prod.pricingInputs?.profitMargin ?? prod.profitMarginPercent ?? 25);
      }
    }
  }, [selectedProductId, draft, products]);

  // Main Calculation Function
  const runCalculation = async () => {
    // Validation check
    if (
      materialCost < 0 ||
      labourRate < 0 ||
      hoursRequired < 0 ||
      packagingCost < 0 ||
      shippingCost < 0 ||
      additionalExpenses < 0 ||
      profitMargin < 0
    ) {
      setInputError('Some information is missing or invalid. Please review the cost inputs.');
      return;
    }
    setInputError(null);
    setIsCalculating(true);

    const inputs: PricingInputs = {
      materialCost: Number(materialCost) || 0,
      labourRate: Number(labourRate) || 0,
      hoursRequired: Number(hoursRequired) || 0,
      packagingCost: Number(packagingCost) || 0,
      shippingCost: Number(shippingCost) || 0,
      additionalExpenses: Number(additionalExpenses) || 0,
      profitMargin: Number(profitMargin) || 0,
      craftComplexity,
      category,
      productType: productName,
      material,
      craftTechnique,
    };

    try {
      const res = await calculateKalaPrice(inputs);
      setPricingResult(res);
      
      // Set initial chosen price
      if (selectedOption === 'cost_recovery') {
        setChosenPrice(res.minimumPrice);
      } else if (selectedOption === 'premium') {
        setChosenPrice(res.premiumPrice);
      } else {
        setChosenPrice(res.recommendedPrice);
      }

      // Fetch Gemini AI Explanation in background for rich context
      setIsGeminiLoading(true);
      fetchGeminiPriceExplanation({
        productName,
        category,
        material,
        craftTechnique,
        craftComplexity,
        materialCost: Number(materialCost),
        labourCost: res.calculationSteps.labourCost,
        hoursRequired: Number(hoursRequired),
        labourRate: Number(labourRate),
        packagingCost: Number(packagingCost),
        shippingCost: Number(shippingCost),
        additionalExpenses: Number(additionalExpenses),
        productionCost: res.productionCost,
        profitMargin: Number(profitMargin),
        basePrice: res.calculationSteps.baseSellingPrice,
        recommendedPrice: res.recommendedPrice,
        marketLow: res.benchmark?.minPrice || Math.round(res.productionCost * 1.1),
        marketMedian: res.benchmark?.medianPrice || res.recommendedPrice,
        marketHigh: res.benchmark?.maxPrice || Math.round(res.recommendedPrice * 1.3),
      }).then((geminiData) => {
        if (geminiData) {
          setGeminiExplanation(geminiData);
        }
        setIsGeminiLoading(false);
      });
    } catch (e) {
      console.error('Calculation error:', e);
    } finally {
      setIsCalculating(false);
    }
  };

  // Run initial calculation once on mount or when key product info loads
  useEffect(() => {
    runCalculation();
  }, [
    materialCost,
    labourRate,
    hoursRequired,
    packagingCost,
    shippingCost,
    additionalExpenses,
    profitMargin,
    craftComplexity,
    category,
    productName,
  ]);

  // Handle Option selection
  const handleSelectOption = (opt: 'cost_recovery' | 'recommended' | 'premium') => {
    setSelectedOption(opt);
    if (!pricingResult) return;
    if (opt === 'cost_recovery') {
      setChosenPrice(pricingResult.minimumPrice);
    } else if (opt === 'recommended') {
      setChosenPrice(pricingResult.recommendedPrice);
    } else if (opt === 'premium') {
      setChosenPrice(pricingResult.premiumPrice);
    }
  };

  // Save selected price to product draft and existing product
  const handleUseThisPrice = async (overridePrice?: number) => {
    if (!pricingResult) return;
    const finalPrice = overridePrice !== undefined ? overridePrice : (chosenPrice || pricingResult.recommendedPrice);

    // 1. Update ProductDraftContext (active draft)
    const currentPricingInputs: PricingInputs = {
      materialCost: Number(materialCost) || 0,
      labourRate: Number(labourRate) || 0,
      hoursRequired: Number(hoursRequired) || 0,
      labourHours: Number(hoursRequired) || 0,
      packagingCost: Number(packagingCost) || 0,
      shippingCost: Number(shippingCost) || 0,
      additionalExpenses: Number(additionalExpenses) || 0,
      otherCosts: Number(additionalExpenses) || 0,
      profitMargin: Number(profitMargin) || 0,
      craftComplexity,
      category,
      productType: productName,
      material,
      craftTechnique,
    };

    updateDraft({
      rawMaterialCost: Number(materialCost),
      labourHours: Number(hoursRequired),
      labourRatePerHour: Number(labourRate),
      otherCosts: Number(additionalExpenses),
      profitMarginPercent: Number(profitMargin),
      suggestedPrice: pricingResult.recommendedPrice,
      actualPrice: finalPrice,
      pricingInputs: currentPricingInputs,
      pricingData: pricingResult,
    });

    // 2. If an existing product was selected, update it in DB and state
    if (selectedProductId !== 'draft' && setProducts) {
      const target = products.find((p) => p.id === selectedProductId);
      if (target) {
        const updatedProduct: Product = {
          ...target,
          rawMaterialCost: Number(materialCost),
          labourHours: Number(hoursRequired),
          labourRatePerHour: Number(labourRate),
          otherCosts: Number(additionalExpenses),
          profitMarginPercent: Number(profitMargin),
          suggestedPrice: pricingResult.recommendedPrice,
          actualPrice: finalPrice,
          price: finalPrice,
          pricingInputs: currentPricingInputs,
          pricingData: pricingResult,
          marketRangeMin: pricingResult.benchmark?.minPrice || target.marketRangeMin || 0,
          marketRangeMax: pricingResult.benchmark?.maxPrice || target.marketRangeMax || 0,
          pricingReasoning: geminiExplanation?.explanationEnglish || pricingResult.explanation || target.pricingReasoning || '',
          pricingReasoningHindi: geminiExplanation?.explanationHindi || pricingResult.explanationHindi || target.pricingReasoningHindi || '',
        };

        try {
          await saveProductToDb(target.userId || user?.uid || 'guest-artisan', updatedProduct);
          setProducts((prev) =>
            prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
          );
        } catch (err) {
          console.warn('Failed to update product in database:', err);
        }
      }
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      // Seamlessly navigate to catalog or product preview if desired
    }, 2000);
  };

  // Voice speech readout
  const handleVoiceSpeak = () => {
    if (!pricingResult) return;
    const priceToSpeak = chosenPrice || pricingResult.recommendedPrice;
    const prodCost = pricingResult.productionCost;
    
    let speech = '';
    if (activeLang === 'hi') {
      speech = `नमस्ते। आपके हस्तशिल्प उत्पाद ${productName} के लिए, अनुमानित उत्पादन लागत ₹${prodCost} है जिसमें कच्चा माल ₹${materialCost}, कारीगरी मजदूरी ₹${pricingResult.calculationSteps.labourCost}, पैकेजिंग ₹${packagingCost} और डिलीवरी ₹${shippingCost} शामिल है। ${profitMargin}% लाभ के साथ आपका अनुशंसित उचित विक्रय मूल्य ₹${priceToSpeak} है। यह मूल्य प्रोटोटाइप बाजार बेंचमार्क के दायरे में है।`;
    } else {
      speech = `Hello artisan. For your handcrafted ${productName}, the estimated production cost is ₹${prodCost}, which includes material ₹${materialCost}, ${hoursRequired} hours of artisan labour at ₹${labourRate} per hour, packaging ₹${packagingCost}, and shipping ₹${shippingCost}. With your ${profitMargin}% profit margin, your recommended fair selling price is ₹${priceToSpeak}. This falls within the prototype market benchmark.`;
    }

    speakText(speech, activeLang);
  };

  const { user, role, artisan } = useAuth();
  const isBuyer = role === 'buyer';

  // Find the selected product if not in draft mode
  const selectedProduct = selectedProductId !== 'draft' ? products.find((p) => p.id === selectedProductId) : null;

  // Determine if user owns the selected item
  const isOwner = Boolean(
    role === 'artisan' &&
    (
      selectedProductId === 'draft' ||
      (user?.uid && (selectedProduct?.userId === user.uid || selectedProduct?.artisanId === user.uid)) ||
      (artisan?.id && (selectedProduct?.userId === artisan.id || selectedProduct?.artisanId === artisan.id)) ||
      (artisan?.name && selectedProduct?.artisanName && selectedProduct.artisanName === artisan.name) ||
      (!selectedProduct?.userId && !selectedProduct?.artisanId) // Default/guest sample product in current session
    )
  );

  // Edit price state
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');

  const currentPrice = selectedProduct
    ? (selectedProduct.actualPrice || selectedProduct.price || 0)
    : (selectedProductId === 'draft' ? (draft.actualPrice || draft.suggestedPrice || 0) : 0);

  const suggestedFairPrice = pricingResult?.recommendedPrice || 0;

  // Deterministic Recommended Range:
  // Lower bound: Suggested price - 10% (never below actual production cost), rounded to nearest ₹50 in INR
  // Upper bound: Suggested price + 15%, rounded to nearest ₹50 in INR
  const productionCost = pricingResult?.productionCost || 0;
  const rangeMin = suggestedFairPrice > 0
    ? Math.max(productionCost, Math.round((suggestedFairPrice * 0.9) / 50) * 50)
    : 0;
  const rangeMax = suggestedFairPrice > 0
    ? Math.round((suggestedFairPrice * 1.15) / 50) * 50
    : 0;

  // Difference between current price and suggested price
  const priceDifference = currentPrice > 0 ? currentPrice - suggestedFairPrice : 0;

  // Price Status & Explanation
  let priceStatus: 'below' | 'within' | 'above' | 'unset' = 'unset';
  let statusLabel = activeLang === 'hi' ? 'कीमत तय नहीं है' : 'Price not set';
  let statusExplanation = activeLang === 'hi'
    ? 'इस उत्पाद के लिए कोई वर्तमान मूल्य निर्धारित नहीं है। उचित मूल्य का उपयोग करें।'
    : 'No current price is set for this product. Use the suggested fair price to establish a sustainable selling price.';
  let statusBadgeClass = 'bg-stone-100 text-stone-700 border-stone-200';

  if (currentPrice > 0 && suggestedFairPrice > 0) {
    if (currentPrice < rangeMin) {
      priceStatus = 'below';
      statusLabel = activeLang === 'hi' ? 'अनुशंसित दायरे से कम' : 'Below recommended range';
      statusExplanation = activeLang === 'hi'
        ? 'आपकी वर्तमान कीमत अनुशंसित दायरे से कम है। आप अपने काम का कम मूल्य आंक रहे हैं।'
        : 'Your current price is below the recommended range. You may be underpricing your work.';
      statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
    } else if (currentPrice > rangeMax) {
      priceStatus = 'above';
      statusLabel = activeLang === 'hi' ? 'अनुशंसित दायरे से अधिक' : 'Above recommended range';
      statusExplanation = activeLang === 'hi'
        ? 'आपकी वर्तमान कीमत अनुशंसित दायरे से अधिक है। सुनिश्चित करें कि उच्च कीमत उत्पाद की कारीगरी, सामग्री या स्थिति से समर्थित है।'
        : 'Your current price is above the recommended range. Make sure the higher price is supported by the product\'s craftsmanship, materials, or positioning.';
      statusBadgeClass = 'bg-purple-100 text-purple-900 border-purple-300';
    } else {
      priceStatus = 'within';
      statusLabel = activeLang === 'hi' ? 'अनुशंसित दायरे के भीतर' : 'Within recommended range';
      statusExplanation = activeLang === 'hi'
        ? 'आपकी वर्तमान कीमत अनुशंसित दायरे के भीतर है।'
        : 'Your current price is within the recommended range.';
      statusBadgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  }

  const steps = pricingResult?.calculationSteps;
  const benchmark = pricingResult?.benchmark;
  const profitAmount = steps
    ? Math.round(steps.productionCost * (Number(profitMargin) / 100))
    : 0;

  // Dynamic explanation generated from actual inputs
  const mainCostDriver = steps && steps.labourCost >= steps.materialCost
    ? (activeLang === 'hi' ? 'कारीगरी श्रम' : 'artisan labor')
    : (activeLang === 'hi' ? 'कच्चा माल' : 'material cost');

  const mainDriverAmount = steps && steps.labourCost >= steps.materialCost
    ? steps.labourCost
    : steps?.materialCost || 0;

  const dynamicExplanation = activeLang === 'hi'
    ? `आपकी अनुशंसित कीमत ₹${suggestedFairPrice.toLocaleString('en-IN')} मुख्य रूप से ${mainCostDriver} (₹${mainDriverAmount.toLocaleString('en-IN')}), कच्चे माल की लागत (₹${(steps?.materialCost || Number(materialCost) || 0).toLocaleString('en-IN')}), पैकेजिंग व शिपिंग (₹${(((steps?.packagingCost || Number(packagingCost) || 0)) + ((steps?.shippingCost || Number(shippingCost) || 0))).toLocaleString('en-IN')}), और आपके ${profitMargin}% लक्षित लाभ मार्जिन (₹${profitAmount.toLocaleString('en-IN')}) पर आधारित है।`
    : `Your recommendation is mainly influenced by ${mainCostDriver} (₹${mainDriverAmount.toLocaleString('en-IN')}), material cost (₹${(steps?.materialCost || Number(materialCost) || 0).toLocaleString('en-IN')}), packaging & shipping (₹${(((steps?.packagingCost || Number(packagingCost) || 0)) + ((steps?.shippingCost || Number(shippingCost) || 0))).toLocaleString('en-IN')}), and your ${profitMargin}% target margin (₹${profitAmount.toLocaleString('en-IN')}).`;

  const isMissingData = (Number(materialCost) || 0) === 0 && (Number(labourRate) || 0) === 0 && (Number(hoursRequired) || 0) === 0;

  const handleUseSuggestedPrice = async () => {
    if (!isOwner || isBuyer || !pricingResult) return;
    setChosenPrice(pricingResult.recommendedPrice);
    await handleUseThisPrice(pricingResult.recommendedPrice);
  };

  const handleStartEditPrice = () => {
    if (!isOwner || isBuyer) return;
    setCustomPriceInput(String(currentPrice > 0 ? currentPrice : suggestedFairPrice));
    setIsEditingPrice(true);
  };

  const handleSaveCustomPrice = async () => {
    if (!isOwner || isBuyer || !pricingResult) return;
    const num = Math.round(Number(customPriceInput));
    if (!num || num <= 0) {
      setInputError('Please enter a valid positive price amount.');
      return;
    }
    setInputError(null);
    setChosenPrice(num);
    await handleUseThisPrice(num);
    setIsEditingPrice(false);
  };

  const displayExplanation =
    activeLang === 'hi'
      ? (geminiExplanation?.explanationHindi || pricingResult?.explanationHindi || pricingResult?.explanation)
      : (geminiExplanation?.explanationEnglish || pricingResult?.explanation);

  const displayReasons =
    activeLang === 'hi'
      ? (geminiExplanation?.reasonsHindi || pricingResult?.pricingData?.reasonsHindi || [
          `आपकी कुल उत्पादन लागत ₹${pricingResult?.productionCost || 1200} को पूरी तरह कवर करता है`,
          `आपके चुने हुए ${profitMargin}% लाभ को जोड़ता है`,
          `कारीगर के ${hoursRequired} घंटे के हस्तनिर्मित श्रम का सम्मान करता है`,
          `प्रोटोटाइप बाजार बेंचमार्क के दायरे में है`,
          `मार्केटप्लेस में उचित मूल्य पर बिक्री के लिए उपयुक्त है`,
        ])
      : (geminiExplanation?.reasonsEnglish || pricingResult?.pricingData?.reasonsEnglish || [
          `Covers your estimated production cost of ₹${pricingResult?.productionCost || 1200}`,
          `Includes your selected ${profitMargin}% profit margin`,
          `Considers handmade craftsmanship and ${hoursRequired} hours of artisan labour`,
          `Falls within the prototype market benchmark`,
          `Suitable for marketplace selling`,
        ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-200 text-slate-800">
      
      {/* 1. Header with Language Toggle & Voice Helper */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <BadgeIndianRupee className="w-6 h-6 text-[#C25E3E]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif tracking-tight">
                KALAPRICE
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {activeLang === 'hi' ? 'एआई उचित मूल्य सहायक' : 'Your AI Pricing Assistant'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {activeLang === 'hi'
                ? 'पारदर्शी लागत गणना • कारीगरी का सम्मान • प्रोटोटाइप बाजार बेंचमार्क'
                : 'Transparent Cost Calculation • Fair Artisan Wage • Prototype Market Benchmark'}
            </p>
          </div>
        </div>

        {/* Right Header Controls: Language Toggle & Voice */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Language Toggle: English | हिंदी */}
          <div className="bg-stone-100 p-1 rounded-2xl border border-stone-200 flex items-center text-xs font-bold">
            <button
              onClick={() => setActiveLang('en')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeLang === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-stone-500 hover:text-slate-800'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveLang('hi')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeLang === 'hi'
                  ? 'bg-white text-[#C25E3E] shadow-xs'
                  : 'text-stone-500 hover:text-slate-800'
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* Voice Readout Button */}
          <button
            onClick={handleVoiceSpeak}
            className="px-3.5 py-2 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 transition-colors shadow-2xs"
            title="Listen to pricing explanation aloud"
          >
            <Volume2 className="w-4 h-4 text-[#C25E3E]" />
            <span>{activeLang === 'hi' ? 'बोलकर सुनें' : 'Listen Aloud'}</span>
          </button>
        </div>
      </div>

      {/* Voice-Ready Input Guidance Banner */}
      <div className="bg-[#FAF6F0] p-3.5 rounded-2xl border border-[#E9DFCE] flex items-center justify-between gap-3 text-xs text-stone-700">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🎤</span>
          <p className="font-medium text-stone-800">
            <strong className="text-[#C25E3E]">
              {activeLang === 'hi' ? 'ध्वनि निर्देश (Voice Hint): ' : 'Voice-Ready Hint: '}
            </strong>
            {activeLang === 'hi'
              ? 'जैसे "कच्चा माल चार सौ रुपये, मेहनत छह घंटे"'
              : '"Material cost is four hundred rupees, labour six hours"'}
          </p>
        </div>
        <span className="text-[11px] bg-white text-stone-600 font-semibold px-2.5 py-1 rounded-xl border border-stone-200 shrink-0">
          {activeLang === 'hi' ? 'कम डिजिटल साक्षरता के लिए सरल' : 'Low-Literacy Friendly'}
        </span>
      </div>

      {/* 2. Analyzed Product Summary Card (Automatically Retrieved) */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C25E3E]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              {activeLang === 'hi' ? 'विश्लेषित उत्पाद सारांश' : 'Analyzed Product Summary'}
            </h2>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              {activeLang === 'hi' ? 'स्वचालित प्राप्त' : 'Auto-Retrieved'}
            </span>
          </div>

          {/* Product Switcher Dropdown (Draft or Catalog Product) */}
          {products.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500 font-medium">{activeLang === 'hi' ? 'उत्पाद चुनें:' : 'Select Product:'}</span>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-300 font-bold text-slate-900 focus:outline-none focus:border-[#C25E3E]"
              >
                <option value="draft">
                  ✨ {activeLang === 'hi' ? 'सक्रिय ड्राफ्ट उत्पाद' : 'Active Draft Product'} ({draft.title || 'Untitled'})
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.title || p.titleHindi || 'Product'} (₹{p.price || p.suggestedPrice || 0})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Product Attributes Grid */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {productImage && (
            <img
              src={productImage}
              alt={productName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-stone-200 shadow-2xs shrink-0 bg-stone-100"
            />
          )}

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs w-full">
            <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase block mb-0.5">
                {activeLang === 'hi' ? 'उत्पाद नाम' : 'Product Name'}
              </span>
              <span className="font-bold text-slate-900 line-clamp-1">{productName}</span>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase block mb-0.5">
                {activeLang === 'hi' ? 'श्रेणी (Category)' : 'Category'}
              </span>
              <span className="font-bold text-slate-900 line-clamp-1">{category}</span>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase block mb-0.5">
                {activeLang === 'hi' ? 'कच्चा माल' : 'Material'}
              </span>
              <span className="font-bold text-slate-900 line-clamp-1">{material}</span>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase block mb-0.5">
                {activeLang === 'hi' ? 'कारीगरी तकनीक' : 'Craft Technique'}
              </span>
              <span className="font-bold text-slate-900 line-clamp-1">{craftTechnique}</span>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase block mb-0.5">
                {activeLang === 'hi' ? 'कारीगरी जटिलता' : 'Estimated Complexity'}
              </span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block">
                {craftComplexity}
              </span>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
              <span className="text-[10px] font-bold text-stone-400 uppercase block mb-0.5">
                {activeLang === 'hi' ? 'रंग (Colors)' : 'Colors'}
              </span>
              <span className="font-medium text-stone-700 line-clamp-1">{colors}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Error Alert if any */}
      {inputError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-bold animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{inputError}</span>
        </div>
      )}

      {/* 3. Main Two-Column Layout: YOUR COSTS vs RESULT SCREEN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: YOUR COSTS Input Form */}
        <div ref={costsSectionRef} className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#C25E3E]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  {activeLang === 'hi' ? 'आपकी लागत विवरण (YOUR COSTS)' : 'YOUR COSTS & WAGES'}
                </h2>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                {activeLang === 'hi' ? 'सभी फ़ील्ड संपादन योग्य हैं' : 'All inputs editable'}
              </span>
            </div>

            {/* 1. Material Cost */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                <label htmlFor="material-cost-input" className="flex items-center gap-1.5">
                  <Hammer className="w-3.5 h-3.5 text-[#C25E3E]" />
                  <span>{activeLang === 'hi' ? '1. कच्चे माल की लागत (Material Cost):' : '1. Material Cost:'}</span>
                </label>
                <span className="font-serif font-bold text-[#C25E3E] text-sm">₹{materialCost}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">₹</span>
                <input
                  id="material-cost-input"
                  type="number"
                  min={0}
                  step={10}
                  value={materialCost}
                  onChange={(e) => setMaterialCost(Number(e.target.value) || 0)}
                  className="w-full bg-stone-50 pl-8 pr-4 py-2.5 rounded-2xl border border-stone-300 font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-[#C25E3E]"
                  placeholder="e.g. 400"
                />
              </div>
              <div className="flex gap-2 mt-1.5">
                {[200, 400, 800, 1500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMaterialCost(v)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600"
                  >
                    ₹{v}
                  </button>
                ))}
              </div>
            </div>

            {/* 2 & 3. Labour Rate & Hours Required */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <label htmlFor="labour-rate-input" className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{activeLang === 'hi' ? '2. मजदूरी दर (Rate):' : '2. Labour Rate / hr:'}</span>
                  </label>
                  <span className="font-serif font-bold text-indigo-700 text-xs">₹{labourRate}/hr</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">₹</span>
                  <input
                    id="labour-rate-input"
                    type="number"
                    min={0}
                    step={10}
                    value={labourRate}
                    onChange={(e) => setLabourRate(Number(e.target.value) || 0)}
                    className="w-full bg-stone-50 pl-8 pr-4 py-2.5 rounded-2xl border border-stone-300 font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-indigo-600"
                    placeholder="100"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  {activeLang === 'hi' ? 'प्रति घंटा उचित मजदूरी' : 'Fair hourly artisan wage'}
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <label htmlFor="hours-required-input" className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{activeLang === 'hi' ? '3. आवश्यक घंटे (Hours):' : '3. Hours Required:'}</span>
                  </label>
                  <span className="font-serif font-bold text-indigo-700 text-xs">{hoursRequired} hrs</span>
                </div>
                <input
                  id="hours-required-input"
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={hoursRequired}
                  onChange={(e) => setHoursRequired(Number(e.target.value) || 0)}
                  className="w-full bg-stone-50 px-4 py-2.5 rounded-2xl border border-stone-300 font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-indigo-600"
                  placeholder="6"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  {activeLang === 'hi' ? 'श्रम लागत: ₹' + Math.round(labourRate * hoursRequired) : `Total Labour: ₹${Math.round(labourRate * hoursRequired)}`}
                </p>
              </div>
            </div>

            {/* 4 & 5. Packaging & Shipping Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <label htmlFor="packaging-cost-input" className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>{activeLang === 'hi' ? '4. पैकेजिंग (Packaging):' : '4. Packaging Cost:'}</span>
                  </label>
                  <span className="font-serif font-bold text-amber-700 text-xs">₹{packagingCost}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">₹</span>
                  <input
                    id="packaging-cost-input"
                    type="number"
                    min={0}
                    step={5}
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(Number(e.target.value) || 0)}
                    className="w-full bg-stone-50 pl-8 pr-4 py-2.5 rounded-2xl border border-stone-300 font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-amber-600"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <label htmlFor="shipping-cost-input" className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    <span>{activeLang === 'hi' ? '5. शिपिंग / कूरियर:' : '5. Shipping Cost:'}</span>
                  </label>
                  <span className="font-serif font-bold text-amber-700 text-xs">₹{shippingCost}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">₹</span>
                  <input
                    id="shipping-cost-input"
                    type="number"
                    min={0}
                    step={10}
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                    className="w-full bg-stone-50 pl-8 pr-4 py-2.5 rounded-2xl border border-stone-300 font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-amber-600"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>

            {/* 6. Additional Expenses & 7. Desired Profit Margin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <label htmlFor="additional-expenses-input">
                    <span>{activeLang === 'hi' ? '6. अन्य खर्च (Other):' : '6. Other Expenses:'}</span>
                  </label>
                  <span className="font-serif font-bold text-stone-700 text-xs">₹{additionalExpenses}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">₹</span>
                  <input
                    id="additional-expenses-input"
                    type="number"
                    min={0}
                    step={5}
                    value={additionalExpenses}
                    onChange={(e) => setAdditionalExpenses(Number(e.target.value) || 0)}
                    className="w-full bg-stone-50 pl-8 pr-4 py-2.5 rounded-2xl border border-stone-300 font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-stone-600"
                    placeholder="50"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  {activeLang === 'hi' ? 'पॉलिश, रंग, बिजली आदि' : 'Consumables, fuel, polish'}
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <label htmlFor="profit-margin-input" className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{activeLang === 'hi' ? '7. लाभ मार्जिन (Margin):' : '7. Profit Margin (%):'}</span>
                  </label>
                  <span className="font-serif font-bold text-emerald-700 text-xs">{profitMargin}%</span>
                </div>
                <div className="relative">
                  <input
                    id="profit-margin-input"
                    type="number"
                    min={5}
                    max={100}
                    step={1}
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(Number(e.target.value) || 0)}
                    className="w-full bg-stone-50 px-4 py-2.5 rounded-2xl border border-stone-300 font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                    placeholder="25"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">%</span>
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  {[15, 20, 25, 35].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setProfitMargin(m)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                        profitMargin === m
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                      }`}
                    >
                      {m}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recalculate Button */}
            <button
              onClick={runCalculation}
              disabled={isCalculating}
              className="w-full py-3.5 rounded-2xl bg-stone-900 hover:bg-black text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
              <span>{activeLang === 'hi' ? 'उचित मूल्य की पुनर्गणना करें (Recalculate)' : 'Calculate Fair Price'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: KALAPRICE INTELLIGENCE & PRICE EXPLORATION */}
        <div ref={resultsSectionRef} className="lg:col-span-6 space-y-4">

          {/* 1. Missing / Empty Data Alert */}
          {isMissingData && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-between text-xs text-amber-900 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold">
                  {activeLang === 'hi'
                    ? 'इस अनुशंसा को बेहतर बनाने के लिए छूटी हुई लागत जानकारी जोड़ें।'
                    : 'Add the missing cost information to improve this recommendation.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => costsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="font-bold underline text-amber-950 hover:text-amber-800 shrink-0 cursor-pointer ml-2"
              >
                {activeLang === 'hi' ? 'लागत जोड़ें' : 'Add Cost Info'}
              </button>
            </div>
          )}

          {/* 2. Role Restriction / Read-Only Banner */}
          {isBuyer ? (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-3xl flex items-center gap-2.5 text-xs text-blue-900 shadow-2xs">
              <Lock className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold block">
                  {activeLang === 'hi' ? 'क्रेता दृश्य (केवल देखने योग्य)' : 'Buyer View (Read-Only)'}
                </span>
                <span className="text-blue-700">
                  {activeLang === 'hi'
                    ? 'पारदर्शिता के लिए मूल्य बुद्धिमत्ता और लागत विवरण प्रदर्शित है। केवल सत्यापित कारीगर ही मूल्य संशोधित कर सकते हैं।'
                    : 'Pricing intelligence is shown for fair-trade transparency. Price editing is reserved for the artisan owner.'}
                </span>
              </div>
            </div>
          ) : !isOwner ? (
            <div className="p-3.5 bg-stone-100 border border-stone-300 rounded-3xl flex items-center gap-2.5 text-xs text-stone-800 shadow-2xs">
              <Lock className="w-4 h-4 text-stone-600 shrink-0" />
              <div>
                <span className="font-bold block">
                  {activeLang === 'hi' ? 'कारीगर स्वामित्व प्रतिबंध' : 'Product Owner Restriction'}
                </span>
                <span className="text-stone-600">
                  {activeLang === 'hi'
                    ? 'आप किसी अन्य कारीगर के उत्पाद का विवरण देख रहे हैं। मूल्य संशोधन केवल उत्पाद के स्वामी कारीगर द्वारा ही संभव है।'
                    : 'Viewing another artisan\'s product in read-only mode. Only the verified product owner can modify prices.'}
                </span>
              </div>
            </div>
          ) : null}

          {/* 3. KALAPRICE INTELLIGENCE PANEL */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
            {/* Panel Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#C25E3E]/10 text-[#C25E3E] flex items-center justify-center border border-[#C25E3E]/20">
                  <Sparkles className="w-4 h-4 text-[#C25E3E]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                    <span>KalaPrice Intelligence</span>
                    <span className="text-[10px] font-bold bg-[#C25E3E]/10 text-[#C25E3E] px-2 py-0.5 rounded-full">
                      {activeLang === 'hi' ? 'स्मार्ट फेयर प्राइसिंग' : 'Fair Price Engine'}
                    </span>
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    {activeLang === 'hi' ? 'पारदर्शी कारीगर मूल्य निर्धारण व लागत विश्लेषण' : 'Transparent artisan pricing & cost intelligence'}
                  </p>
                </div>
              </div>

              {/* Prototype Label */}
              <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200 self-start sm:self-center">
                Prototype estimate based on entered costs and pricing factors
              </span>
            </div>

            {/* Step 1: Suggested Fair Price */}
            <div className="p-5 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-stone-300 font-bold uppercase tracking-wider text-[11px]">
                  {activeLang === 'hi' ? 'अनुशंसित उचित मूल्य' : 'Suggested Fair Price'}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  100% Cost Recovery
                </span>
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold font-serif text-white tracking-tight my-1">
                ₹{suggestedFairPrice.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-stone-300">
                {activeLang === 'hi'
                  ? `कुल उत्पादन लागत ₹${productionCost.toLocaleString('en-IN')} + ${profitMargin}% कारीगर लाभ मार्जिन`
                  : `Full production cost (₹${productionCost.toLocaleString('en-IN')}) + ${profitMargin}% artisan margin`}
              </p>
            </div>

            {/* Step 2: Recommended Price Range */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-bold block mb-0.5">
                  {activeLang === 'hi' ? 'अनुशंसित मूल्य दायरा' : 'Recommended Range'}
                </span>
                <span className="text-base font-bold font-serif text-slate-900">
                  ₹{rangeMin.toLocaleString('en-IN')} – ₹{rangeMax.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 block">
                  {activeLang === 'hi' ? 'टिकाऊ विक्रय बैंड' : 'Sustainable Corridor'}
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                  ±10–15% Deterministic Band
                </span>
              </div>
            </div>

            {/* Step 3: Current Price Comparison & Status */}
            <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#E8DFC8] space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-bold block">
                    {activeLang === 'hi' ? 'आपका वर्तमान मूल्य' : "Artisan's Current Price"}
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-bold font-serif text-slate-900">
                      {currentPrice > 0 ? `₹${currentPrice.toLocaleString('en-IN')}` : (activeLang === 'hi' ? 'तय नहीं' : 'Not set')}
                    </span>
                    {currentPrice > 0 && (
                      <span className="text-xs text-stone-600 font-medium">
                        ({priceDifference < 0
                          ? `-₹${Math.abs(priceDifference).toLocaleString('en-IN')} (₹${Math.abs(priceDifference).toLocaleString('en-IN')} below suggested)`
                          : priceDifference > 0
                          ? `+₹${priceDifference.toLocaleString('en-IN')} (₹${priceDifference.toLocaleString('en-IN')} above suggested)`
                          : 'Matches suggested price'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* Short Helpful Status Explanation */}
              <p className="text-stone-700 leading-relaxed text-[11px] pt-1.5 border-t border-[#E8DFC8]">
                {statusExplanation}
              </p>
            </div>

            {/* Step 4: Price Factor Breakdown */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#C25E3E]" />
                  {activeLang === 'hi' ? 'मूल्य कारक विवरण' : 'Price Factor Breakdown'}
                </span>
                <span className="text-[10px] text-stone-400 font-medium">
                  {activeLang === 'hi' ? 'वास्तविक गणना' : 'Actual calculations'}
                </span>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                <div className="flex justify-between py-1.5">
                  <span className="text-stone-600">{activeLang === 'hi' ? 'कच्चा माल' : 'Material Cost'}</span>
                  <span className="font-bold text-slate-900">₹{(steps?.materialCost ?? Number(materialCost) ?? 0).toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <div>
                    <span className="text-stone-600 block">{activeLang === 'hi' ? 'कारीगर श्रम' : 'Artisan Labor'}</span>
                    <span className="text-[10px] text-stone-400">
                      {hoursRequired} hrs @ ₹{labourRate}/hr
                    </span>
                  </div>
                  <span className="font-bold text-indigo-700 font-mono">
                    ₹{(steps?.labourCost ?? (Number(labourRate) * Number(hoursRequired))).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-stone-600">{activeLang === 'hi' ? 'पैकेजिंग' : 'Packaging Cost'}</span>
                  <span className="font-bold text-slate-900">₹{(steps?.packagingCost ?? Number(packagingCost) ?? 0).toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-stone-600">{activeLang === 'hi' ? 'शिपिंग' : 'Shipping Cost'}</span>
                  <span className="font-bold text-slate-900">₹{(steps?.shippingCost ?? Number(shippingCost) ?? 0).toLocaleString('en-IN')}</span>
                </div>

                {Boolean((steps?.additionalExpenses ?? Number(additionalExpenses)) > 0) && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-stone-600">{activeLang === 'hi' ? 'अन्य खर्च' : 'Other Expenses'}</span>
                    <span className="font-bold text-slate-900">₹{(steps?.additionalExpenses ?? Number(additionalExpenses) ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 bg-emerald-50/60 px-2 rounded-lg">
                  <div>
                    <span className="text-emerald-900 font-semibold block">{activeLang === 'hi' ? 'कारीगर लाभ मार्जिन' : 'Artisan Margin'}</span>
                    <span className="text-[10px] text-emerald-700">
                      {profitMargin}% margin on production cost
                    </span>
                  </div>
                  <span className="font-bold text-emerald-800">₹{profitAmount.toLocaleString('en-IN')}</span>
                </div>

                {Boolean(steps?.craftsmanshipAdjustment && steps.craftsmanshipAdjustment > 0) && (
                  <div className="flex justify-between py-1.5 bg-purple-50/60 px-2 rounded-lg">
                    <div>
                      <span className="text-purple-900 font-semibold block">{activeLang === 'hi' ? 'कारीगरी मान' : 'Craftsmanship Factor'}</span>
                      <span className="text-[10px] text-purple-700">{craftComplexity}</span>
                    </div>
                    <span className="font-bold text-purple-800">+₹{steps.craftsmanshipAdjustment.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {/* Suggested Price Total Line */}
                <div className="flex justify-between py-2 pt-2.5 font-bold text-slate-900 border-t-2 border-stone-200">
                  <span className="text-sm font-bold text-slate-900">{activeLang === 'hi' ? 'सुझाया गया मूल्य' : 'Suggested Price'}</span>
                  <span className="text-base font-serif text-[#C25E3E]">₹{suggestedFairPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <p className="text-[10px] text-stone-400 italic text-right pt-0.5">
                Prototype estimate based on entered costs and pricing factors
              </p>
            </div>

            {/* Step 5: Why is this price recommended? */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5 text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                {activeLang === 'hi' ? 'यह मूल्य क्यों अनुशंसित है?' : 'Why is this price recommended?'}
              </span>
              <p className="text-stone-700 leading-relaxed text-[11px]">
                {dynamicExplanation}
              </p>
            </div>

            {/* Step 6: Actions - Use Suggested Price & Edit Price (Strictly only for authenticated artisan owner) */}
            {isOwner && (
              <div className="space-y-3 pt-2 border-t border-stone-100">
                {isEditingPrice ? (
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-300 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label htmlFor="custom-price-edit-input" className="text-xs font-bold text-slate-900">
                        {activeLang === 'hi' ? 'अपना कस्टम मूल्य दर्ज करें:' : 'Enter Your Custom Price:'}
                      </label>
                      <span className="text-[10px] text-stone-500">
                        {activeLang === 'hi' ? 'रुपये में (INR)' : 'in INR (₹)'}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">₹</span>
                      <input
                        id="custom-price-edit-input"
                        type="number"
                        min={1}
                        step={10}
                        value={customPriceInput}
                        onChange={(e) => setCustomPriceInput(e.target.value)}
                        className="w-full bg-white pl-8 pr-4 py-2.5 rounded-xl border border-stone-300 font-bold text-slate-900 text-sm focus:outline-none focus:border-[#C25E3E]"
                        placeholder={String(suggestedFairPrice)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="save-custom-price-btn"
                        onClick={handleSaveCustomPrice}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        {activeLang === 'hi' ? 'मूल्य सहेजें (Save Price)' : 'Save Price'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingPrice(false)}
                        className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        {activeLang === 'hi' ? 'रद्द करें' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                      type="button"
                      id="use-suggested-price-btn"
                      onClick={handleUseSuggestedPrice}
                      className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                      <span>
                        {activeLang === 'hi'
                          ? `सुझाया गया मूल्य लागू करें (₹${suggestedFairPrice.toLocaleString('en-IN')})`
                          : `Use Suggested Price (₹${suggestedFairPrice.toLocaleString('en-IN')})`}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="edit-price-btn"
                      onClick={handleStartEditPrice}
                      className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-stone-300 hover:bg-stone-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-stone-500" />
                      <span>{activeLang === 'hi' ? 'मूल्य संपादित करें' : 'Edit Price'}</span>
                    </button>
                  </div>
                )}

                {/* Save Confirmation Toast */}
                {saveSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {activeLang === 'hi'
                        ? `सफलता! उत्पाद मूल्य ₹${chosenPrice.toLocaleString('en-IN')} सहेज दिया गया है।`
                        : `Success! Product price updated to ₹${chosenPrice.toLocaleString('en-IN')}.`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Advanced Tier Options & Prototype Market Benchmark (Preserved for Deep-Dive) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C25E3E]" />
                {activeLang === 'hi' ? 'वैकल्पिक मूल्य स्तर (Pricing Tiers)' : 'Alternative Pricing Tiers'}
              </span>
              <span className="text-[10px] text-stone-400 font-medium">
                {activeLang === 'hi' ? 'प्रोटोटाइप अनुमान' : 'Prototype estimate'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* 1. Cost Recovery */}
              <button
                type="button"
                onClick={() => handleSelectOption('cost_recovery')}
                className={`p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                  selectedOption === 'cost_recovery'
                    ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-xs ring-1 ring-amber-400'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="text-[9px] font-bold uppercase block text-amber-700">Cost Recovery</span>
                <span className="text-base font-bold font-serif text-slate-900 block my-0.5">
                  ₹{(pricingResult?.minimumPrice || 1350).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-stone-400 block leading-tight">
                  {activeLang === 'hi' ? 'न्यूनतम टिकाऊ' : 'Breakeven floor'}
                </span>
              </button>

              {/* 2. Recommended (Default) */}
              <button
                type="button"
                onClick={() => handleSelectOption('recommended')}
                className={`p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                  selectedOption === 'recommended'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs ring-2 ring-emerald-400/40'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="text-[9px] font-bold uppercase block text-emerald-700">⭐ Recommended</span>
                <span className="text-base font-bold font-serif text-slate-900 block my-0.5">
                  ₹{(pricingResult?.recommendedPrice || 1499).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-stone-400 block leading-tight">
                  {activeLang === 'hi' ? 'संतुलित लाभ' : 'Fair trade sweetspot'}
                </span>
              </button>

              {/* 3. Premium */}
              <button
                type="button"
                onClick={() => handleSelectOption('premium')}
                className={`p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                  selectedOption === 'premium'
                    ? 'bg-purple-50 border-purple-400 text-slate-900 shadow-xs ring-1 ring-purple-400'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="text-[9px] font-bold uppercase block text-purple-700">Premium</span>
                <span className="text-base font-bold font-serif text-slate-900 block my-0.5">
                  ₹{(pricingResult?.premiumPrice || 1699).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-stone-400 block leading-tight">
                  {activeLang === 'hi' ? 'विशिष्ट शिल्प' : 'Heritage position'}
                </span>
              </button>
            </div>
          </div>

          {/* 5. AI Explanation & Checklist */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {activeLang === 'hi' ? 'एआई संदर्भ विवरण' : 'Contextual Pricing Checklist'}
                </h3>
              </div>
              {isGeminiLoading && (
                <span className="text-[10px] text-purple-600 animate-pulse font-medium">
                  {activeLang === 'hi' ? 'एआई व्याख्या तैयार हो रही है...' : 'AI generating context...'}
                </span>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-2 pt-1">
              {displayReasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-stone-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Controls & Navigation */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                costsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 rounded-2xl border border-stone-300 hover:bg-stone-100 text-xs font-bold text-stone-700 transition-colors"
            >
              ← {activeLang === 'hi' ? 'लागत समायोजित करें (Adjust Costs)' : 'Adjust Costs'}
            </button>

            <button
              onClick={() => setCurrentTab('catalog')}
              className="px-4 py-2.5 rounded-2xl bg-[#C25E3E] hover:bg-[#A94B2E] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{activeLang === 'hi' ? 'कैटलॉग में देखें' : 'View in My Catalog'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
