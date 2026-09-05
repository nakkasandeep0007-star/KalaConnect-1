import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { B2BQuoteRequest, B2BRequestStatus } from '../types';

const B2B_REQUESTS_COLLECTION = 'b2bQuoteRequests';
const LOCAL_B2B_REQUESTS_KEY = 'kalaconnect_b2b_requests_cache';

export const INITIAL_SAMPLE_B2B_REQUESTS: B2BQuoteRequest[] = [
  {
    id: 'b2b-req-001',
    requestId: 'b2b-req-001',
    productId: 'prod-002',
    productName: 'Handcrafted Terracotta Decorative Pot',
    productTitle: 'Handcrafted Terracotta Decorative Pot',
    productImage: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
    category: 'Kitchenware & Living',
    craftType: 'Traditional Terracotta',
    artisanId: 'sample-artist',
    artisanName: 'Rameshwar Lal Kumhar',
    artisanLocation: 'Sanganer, Jaipur',
    buyerId: 'sample-buyer-1',
    buyerOrganization: 'ABC Handicrafts Pvt Ltd',
    buyerOrg: 'ABC Handicrafts Pvt Ltd',
    contactPerson: 'Rahul Verma',
    buyerName: 'Rahul Verma',
    buyerLocation: 'Delhi',
    quantity: 50,
    targetPricePerUnit: 320,
    targetPrice: 320,
    deliveryLocation: 'Delhi',
    requiredByDate: '2026-09-20',
    requiredBy: '2026-09-20',
    message: 'Interested in bulk purchase for our festive corporate gifting order.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  },
  {
    id: 'b2b-req-002',
    requestId: 'b2b-req-002',
    productId: 'prod-001',
    productName: 'Handcrafted Jaipur Blue Pottery Floral Peacock Vase (10 inch)',
    productTitle: 'Handcrafted Jaipur Blue Pottery Floral Peacock Vase (10 inch)',
    productImage: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    category: 'Home Decor & Pottery',
    craftType: 'Jaipur Blue Pottery (GI Tagged)',
    artisanId: 'sample-artist',
    artisanName: 'Rameshwar Lal Kumhar',
    artisanLocation: 'Sanganer, Jaipur',
    buyerId: 'sample-buyer-2',
    buyerOrganization: 'FabIndia Ltd',
    buyerOrg: 'FabIndia Ltd',
    contactPerson: 'Priya Sharma',
    buyerName: 'Priya Sharma',
    buyerLocation: 'Bengaluru',
    quantity: 40,
    targetPricePerUnit: 1100,
    targetPrice: 1100,
    deliveryLocation: 'Bengaluru Distribution Hub',
    requiredByDate: '2026-10-01',
    requiredBy: '2026-10-01',
    message: 'Curating flagship retail showcase for authentic Blue Pottery.',
    status: 'Offer Sent',
    offeredPrice: 1150,
    offeredDeliveryDays: 12,
    artisanOfferMessage: 'We can supply 40 export-grade packed vases within 12 days at ₹1,150/unit.',
    offeredAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
  }
];

export async function saveB2BRequestToDb(
  requestData: Partial<B2BQuoteRequest> & {
    productId: string;
    artisanId: string;
    buyerId: string;
    buyerOrganization: string;
    contactPerson: string;
    quantity: number;
    targetPricePerUnit: number;
    deliveryLocation: string;
    requiredByDate: string;
    message: string;
  }
): Promise<B2BQuoteRequest> {
  const reqId = requestData.id || requestData.requestId || `b2b_rfq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = requestData.createdAt || new Date().toISOString();

  const fullReq: B2BQuoteRequest = {
    id: reqId,
    requestId: reqId,
    productId: requestData.productId,
    artisanId: requestData.artisanId,
    buyerId: requestData.buyerId,
    buyerOrganization: requestData.buyerOrganization || requestData.buyerOrg || 'Wholesale Buyer',
    buyerOrg: requestData.buyerOrganization || requestData.buyerOrg || 'Wholesale Buyer',
    contactPerson: requestData.contactPerson || requestData.buyerName || 'Contact Person',
    buyerName: requestData.contactPerson || requestData.buyerName || 'Contact Person',
    quantity: Number(requestData.quantity) || 1,
    targetPricePerUnit: Number(requestData.targetPricePerUnit ?? requestData.targetPrice) || 0,
    targetPrice: Number(requestData.targetPricePerUnit ?? requestData.targetPrice) || 0,
    deliveryLocation: requestData.deliveryLocation || 'India',
    requiredByDate: requestData.requiredByDate || requestData.requiredBy || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    requiredBy: requestData.requiredByDate || requestData.requiredBy || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    message: requestData.message || '',
    status: requestData.status || 'pending',
    createdAt: now,
    updatedAt: now,
    productName: requestData.productName || requestData.productTitle || 'Artisan Product',
    productTitle: requestData.productTitle || requestData.productName || 'Artisan Product',
    productImage: requestData.productImage || '',
    category: requestData.category || 'Handicrafts',
    craftType: requestData.craftType || 'Traditional Craft',
    artisanName: requestData.artisanName || 'Master Artisan',
    artisanLocation: requestData.artisanLocation || 'Jaipur, Rajasthan',
    buyerLocation: requestData.buyerLocation || requestData.deliveryLocation || 'India',
  };

  // 1. Local cache persistence (guaranteed immediate)
  try {
    const raw = localStorage.getItem(LOCAL_B2B_REQUESTS_KEY);
    const existing: B2BQuoteRequest[] = raw ? JSON.parse(raw) : INITIAL_SAMPLE_B2B_REQUESTS;
    const filtered = existing.filter((r) => r.id !== reqId && r.requestId !== reqId);
    const updated = [fullReq, ...filtered];
    localStorage.setItem(LOCAL_B2B_REQUESTS_KEY, JSON.stringify(updated));
  } catch (cacheErr) {
    console.warn('Local cache B2B request write notice:', cacheErr);
  }

  // 2. Firestore persistence
  try {
    const docRef = doc(db, B2B_REQUESTS_COLLECTION, reqId);
    await setDoc(docRef, {
      ...fullReq,
      dbCreatedAt: serverTimestamp(),
      dbUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore B2B request save notice (cached locally):', err);
  }

  return fullReq;
}

export async function getB2BRequests(userId?: string): Promise<B2BQuoteRequest[]> {
  const map = new Map<string, B2BQuoteRequest>();

  // 1. Initialize with sample requests
  INITIAL_SAMPLE_B2B_REQUESTS.forEach((r) => {
    map.set(r.id, {
      ...r,
      buyerOrganization: r.buyerOrganization || r.buyerOrg || '',
      contactPerson: r.contactPerson || r.buyerName || '',
      targetPricePerUnit: r.targetPricePerUnit ?? r.targetPrice ?? 0,
      requiredByDate: r.requiredByDate || r.requiredBy || '',
      productName: r.productName || r.productTitle || '',
      productTitle: r.productTitle || r.productName || '',
    });
  });

  // 2. Local cache
  try {
    const raw = localStorage.getItem(LOCAL_B2B_REQUESTS_KEY);
    if (raw) {
      const cached: B2BQuoteRequest[] = JSON.parse(raw);
      cached.forEach((r) => {
        const canonical: B2BQuoteRequest = {
          ...r,
          id: r.id || r.requestId,
          requestId: r.requestId || r.id,
          buyerOrganization: r.buyerOrganization || r.buyerOrg || '',
          buyerOrg: r.buyerOrg || r.buyerOrganization || '',
          contactPerson: r.contactPerson || r.buyerName || '',
          buyerName: r.buyerName || r.contactPerson || '',
          targetPricePerUnit: r.targetPricePerUnit ?? r.targetPrice ?? 0,
          targetPrice: r.targetPrice ?? r.targetPricePerUnit ?? 0,
          requiredByDate: r.requiredByDate || r.requiredBy || '',
          requiredBy: r.requiredBy || r.requiredByDate || '',
          productName: r.productName || r.productTitle || '',
          productTitle: r.productTitle || r.productName || '',
        };
        map.set(canonical.id, canonical);
      });
    } else {
      localStorage.setItem(LOCAL_B2B_REQUESTS_KEY, JSON.stringify(INITIAL_SAMPLE_B2B_REQUESTS));
    }
  } catch (cacheErr) {
    console.warn('Local cache B2B request read notice:', cacheErr);
  }

  // 3. Firestore
  try {
    const colRef = collection(db, B2B_REQUESTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    snapshot.forEach((d) => {
      const data = d.data() as B2BQuoteRequest;
      const id = data.id || data.requestId || d.id;
      const canonical: B2BQuoteRequest = {
        ...data,
        id,
        requestId: id,
        buyerOrganization: data.buyerOrganization || data.buyerOrg || '',
        buyerOrg: data.buyerOrg || data.buyerOrganization || '',
        contactPerson: data.contactPerson || data.buyerName || '',
        buyerName: data.buyerName || data.contactPerson || '',
        targetPricePerUnit: data.targetPricePerUnit ?? data.targetPrice ?? 0,
        targetPrice: data.targetPrice ?? data.targetPricePerUnit ?? 0,
        requiredByDate: data.requiredByDate || data.requiredBy || '',
        requiredBy: data.requiredBy || data.requiredByDate || '',
        productName: data.productName || data.productTitle || '',
        productTitle: data.productTitle || data.productName || '',
      };
      map.set(id, canonical);
    });
  } catch (err) {
    console.warn('Firestore B2B requests fetch notice:', err);
  }

  const list = Array.from(map.values());
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateB2BRequestStatusInDb(
  requestId: string,
  status: B2BRequestStatus,
  offerDetails?: {
    offeredPrice?: number;
    offeredDeliveryDays?: number;
    artisanOfferMessage?: string;
    rejectionReason?: string;
    acceptedPrice?: number;
    totalAmount?: number;
    acceptedAt?: string;
    orderId?: string;
    [key: string]: any;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const updatePayload: Partial<B2BQuoteRequest> & { updatedAt?: any } = {
    status,
    ...(offerDetails?.offeredPrice !== undefined ? { offeredPrice: offerDetails.offeredPrice } : {}),
    ...(offerDetails?.offeredDeliveryDays !== undefined ? { offeredDeliveryDays: offerDetails.offeredDeliveryDays } : {}),
    ...(offerDetails?.artisanOfferMessage ? { artisanOfferMessage: offerDetails.artisanOfferMessage } : {}),
    ...(offerDetails?.rejectionReason ? { rejectionReason: offerDetails.rejectionReason } : {}),
    ...(offerDetails?.acceptedPrice !== undefined ? { acceptedPrice: offerDetails.acceptedPrice } : {}),
    ...(offerDetails?.totalAmount !== undefined ? { totalAmount: offerDetails.totalAmount } : {}),
    ...(offerDetails?.orderId ? { orderId: offerDetails.orderId } : {}),
    ...(status === 'Offer Sent' ? { offeredAt: now } : {}),
    ...(status === 'Accepted' ? { acceptedAt: offerDetails?.acceptedAt || now } : {}),
    updatedAt: now,
  };

  // 1. Local cache update
  try {
    const raw = localStorage.getItem(LOCAL_B2B_REQUESTS_KEY);
    const cached: B2BQuoteRequest[] = raw ? JSON.parse(raw) : INITIAL_SAMPLE_B2B_REQUESTS;
    const exists = cached.some((r) => r.id === requestId || r.requestId === requestId);
    const updated = exists
      ? cached.map((r) =>
          r.id === requestId || r.requestId === requestId
            ? {
                ...r,
                ...updatePayload,
              }
            : r
        )
      : [
          ...cached,
          {
            id: requestId,
            requestId,
            status,
            ...updatePayload,
          } as B2BQuoteRequest,
        ];
    localStorage.setItem(LOCAL_B2B_REQUESTS_KEY, JSON.stringify(updated));
  } catch (cacheErr) {
    console.warn('Local cache update B2B request status notice:', cacheErr);
  }

  // 2. Firestore update (use setDoc with merge: true so non-seeded or newly synced documents succeed)
  try {
    const docRef = doc(db, B2B_REQUESTS_COLLECTION, requestId);
    await setDoc(
      docRef,
      {
        ...updatePayload,
        dbUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore update B2B request status notice:', err);
  }
}
