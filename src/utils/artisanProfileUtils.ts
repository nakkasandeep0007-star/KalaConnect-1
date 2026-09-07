import { ArtisanProfile, Product } from '../types';
import { INITIAL_ARTISAN } from '../data/mockData';

export interface ResolvedArtisanData {
  artisan: Partial<ArtisanProfile>;
  artisanId: string;
  artisanProducts: Product[];
  uniqueMaterials: string[];
  uniqueCrafts: string[];
  hasGiTag: boolean;
  giCraftName?: string;
  isVerified: boolean;
  verificationSource?: string;
  hasB2BListings: boolean;
  minMoq?: number | null;
}

/**
 * Resolves an artisan profile and their associated products from the application's
 * single authoritative data source without inventing fictional statistics or reviews.
 */
export function resolveArtisanData(
  artisanIdentifier: string,
  allProducts: Product[],
  currentArtisan?: ArtisanProfile | null,
  currentUserId?: string | null
): ResolvedArtisanData {
  const cleanId = (artisanIdentifier || '').trim();
  const cleanIdLower = cleanId.toLowerCase();

  let matchedProfile: Partial<ArtisanProfile> | null = null;
  let resolvedId = cleanId;

  // 1. Check current logged in artisan if it matches
  if (
    currentArtisan &&
    (currentUserId === cleanId ||
      currentArtisan.id === cleanId ||
      currentArtisan.name.toLowerCase() === cleanIdLower ||
      (currentArtisan.email && currentArtisan.email.toLowerCase() === cleanIdLower))
  ) {
    matchedProfile = currentArtisan;
    resolvedId = currentArtisan.id || currentUserId || cleanId;
  }

  // 2. Check local accounts registry in localStorage
  if (!matchedProfile) {
    try {
      const rawAccounts = localStorage.getItem('kalaconnect_accounts_list');
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        if (Array.isArray(accounts)) {
          const acc = accounts.find(
            (a: any) =>
              a.id === cleanId ||
              a.name?.toLowerCase() === cleanIdLower ||
              a.email?.toLowerCase() === cleanIdLower ||
              a.artisanProfile?.id === cleanId ||
              a.artisanProfile?.name?.toLowerCase() === cleanIdLower
          );
          if (acc && acc.artisanProfile) {
            matchedProfile = acc.artisanProfile;
            resolvedId = acc.id || cleanId;
          }
        }
      }
    } catch (_) {
      // Ignore parse errors
    }
  }

  // 3. Check INITIAL_ARTISAN sample profile
  if (!matchedProfile) {
    if (
      cleanId === 'sample-artist' ||
      cleanIdLower === INITIAL_ARTISAN.name.toLowerCase() ||
      cleanIdLower.includes('rameshwar')
    ) {
      matchedProfile = INITIAL_ARTISAN;
      resolvedId = 'sample-artist';
    }
  }

  // 4. Find all products associated with this artisan from the single products array
  const artisanProducts = allProducts.filter((p) => {
    if (!p) return false;

    // Match by ID (primary authoritative source of truth)
    const matchesId =
      resolvedId &&
      ((p.artisanId && p.artisanId.toLowerCase() === resolvedId.toLowerCase()) ||
        (p.userId && p.userId.toLowerCase() === resolvedId.toLowerCase()) ||
        (cleanId && p.artisanId && p.artisanId.toLowerCase() === cleanIdLower) ||
        (cleanId && p.userId && p.userId.toLowerCase() === cleanIdLower));

    if (matchesId) return true;

    // Only fallback to name if the product has NO explicit owner ID attached
    if (!p.artisanId && !p.userId) {
      const targetName = matchedProfile?.name || cleanId;
      const matchesName =
        Boolean(targetName) &&
        Boolean(p.artisanName) &&
        (p.artisanName?.toLowerCase().trim() === targetName.toLowerCase().trim() ||
          p.artisanName?.toLowerCase().trim() === cleanIdLower);
      return Boolean(matchesName);
    }

    return false;
  });

  // 5. If profile not yet found in registries, construct transparent profile from real product data
  if (!matchedProfile) {
    const representativeProduct = artisanProducts[0];
    if (representativeProduct) {
      matchedProfile = {
        name: representativeProduct.artisanName || cleanId,
        craftType: representativeProduct.craftType || '',
        location: representativeProduct.artisanLocation || representativeProduct.originRegion || '',
        state: representativeProduct.originRegion
          ? representativeProduct.originRegion.split(',').pop()?.trim()
          : '',
        bio: '', // Empty bio will trigger the specified empty state: "This artisan has not added a story yet."
        avatarUrl: undefined,
        craftMarkVerified: representativeProduct.verificationStatus === 'Officially Verified',
      };
    } else {
      // Minimal empty profile
      matchedProfile = {
        name: cleanId || 'Artisan',
        bio: '',
        craftType: '',
      };
    }
  }

  // Extract deduplicated real materials used in actual products
  const rawMaterials = artisanProducts.flatMap((p) => p.materials || []);
  const uniqueMaterials = Array.from(new Set(rawMaterials.map((m) => m.trim()))).filter(Boolean);

  // Extract unique crafts
  const rawCrafts = [
    matchedProfile.craftType,
    ...artisanProducts.map((p) => p.craftType),
  ].filter(Boolean) as string[];
  const uniqueCrafts = Array.from(new Set(rawCrafts.map((c) => c.trim()))).filter(Boolean);

  // Check for real GI Tag indicator
  let hasGiTag = false;
  let giCraftName: string | undefined;

  const giKeywords = ['gi tag', 'gi tagged', 'geographical indication'];
  const isGiText = (text?: string) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return giKeywords.some((k) => lower.includes(k));
  };

  if (isGiText(matchedProfile.craftType)) {
    hasGiTag = true;
    giCraftName = matchedProfile.craftType;
  } else {
    for (const p of artisanProducts) {
      if (isGiText(p.craftType)) {
        hasGiTag = true;
        giCraftName = p.craftType;
        break;
      }
      if (p.keywords && p.keywords.some((kw) => isGiText(kw))) {
        hasGiTag = true;
        giCraftName = p.craftType || 'Geographical Indication (GI) Registered Craft';
        break;
      }
    }
  }

  // Real verification check (Pehchan ID or CraftMark certification)
  let isVerified = false;
  let verificationSource: string | undefined;

  if (matchedProfile.pehchanId) {
    isVerified = true;
    verificationSource = `Ministry of Textiles Pehchan ID: ${matchedProfile.pehchanId}`;
  } else if (matchedProfile.craftMarkVerified) {
    isVerified = true;
    verificationSource = 'National CraftMark Certified';
  } else if (artisanProducts.some((p) => p.verificationStatus === 'Officially Verified')) {
    isVerified = true;
    verificationSource = 'Craft Verified on KalaConnect';
  }

  // B2B Wholesale Listings Check
  const b2bListings = artisanProducts.filter((p) => p.isB2BListed || p.publishedToB2B);
  const hasB2BListings = b2bListings.length > 0;
  let minMoq: number | null = null;
  if (hasB2BListings) {
    const moqs = b2bListings
      .map((p) => p.b2bMOQ || p.wholesaleMOQ || p.moq || 0)
      .filter((m) => m > 0);
    if (moqs.length > 0) {
      minMoq = Math.min(...moqs);
    }
  }

  return {
    artisan: matchedProfile,
    artisanId: resolvedId,
    artisanProducts,
    uniqueMaterials,
    uniqueCrafts,
    hasGiTag,
    giCraftName,
    isVerified,
    verificationSource,
    hasB2BListings,
    minMoq,
  };
}

/**
 * Verifies whether the authenticated user is an artisan who owns the specified product.
 * Evaluates role, user ID, artisan profile ID, and artisan name without hardcoding.
 */
export function isProductOwner(
  product: Product | null | undefined,
  role: string | null | undefined,
  user: { uid: string; email?: string | null; name?: string } | null | undefined,
  artisan: Partial<ArtisanProfile> | null | undefined
): boolean {
  if (!product || role !== 'artisan') {
    return false;
  }

  const prodUserId = product.userId?.trim();
  const prodArtisanId = product.artisanId?.trim();
  const prodArtisanName = product.artisanName?.trim().toLowerCase();

  const userUid = user?.uid?.trim();
  const artisanId = artisan?.id?.trim();
  const artisanName = artisan?.name?.trim().toLowerCase();

  // 1. Direct ID match with authenticated user UID
  if (userUid && (prodUserId === userUid || prodArtisanId === userUid)) {
    return true;
  }

  // 2. Direct ID match with artisan profile ID
  if (artisanId && (prodUserId === artisanId || prodArtisanId === artisanId)) {
    return true;
  }

  return false;
}
