import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeLocalStorage } from '@/lib/ssr-safe';

const TRACKED_ORDERS_KEY = 'bazar_tracked_orders';

export interface TrackedOrderSummary {
  orderCode: string;
  orderId?: string;
  type: 'online' | 'reservation';
  total: number;
  createdAt: string; // ISO string
  itemsCount: number;
  customerName: string;
  customerPhone?: string;
  status: string;
  customerArrived?: boolean;
}

/**
 * Generates a distinct, readable 6-character code (e.g. BZ-849201)
 */
export function generateOrderTrackingCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `BZ-${digits}`;
}

/**
 * Retrieve recent tracked orders from localStorage
 */
export function getTrackedOrders(): TrackedOrderSummary[] {
  const raw = safeLocalStorage.getItem(TRACKED_ORDERS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to parse tracked orders from localStorage:', err);
    return [];
  }
}

/**
 * Save or update an order in localStorage (keeps max 15 most recent)
 */
export function saveTrackedOrder(order: TrackedOrderSummary): void {
  try {
    const current = getTrackedOrders();
    // Remove if already exists to put it at the top
    const filtered = current.filter(
      (o) => o.orderCode.trim().toUpperCase() !== order.orderCode.trim().toUpperCase()
    );
    const updated = [order, ...filtered].slice(0, 15);
    safeLocalStorage.setItem(TRACKED_ORDERS_KEY, JSON.stringify(updated));

    // Dispatch a custom event so Navbar badge can update reactively
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bazar_tracked_orders_updated'));
    }
  } catch (err) {
    console.error('Failed to save tracked order to localStorage:', err);
  }
}

/**
 * Update the status of a stored order in localStorage
 */
export function updateTrackedOrderStatus(
  orderCode: string,
  newStatus: string,
  extra?: { customerArrived?: boolean }
): void {
  try {
    const current = getTrackedOrders();
    const updated = current.map((item) => {
      if (item.orderCode.trim().toUpperCase() === orderCode.trim().toUpperCase()) {
        return {
          ...item,
          status: newStatus,
          ...(extra?.customerArrived !== undefined ? { customerArrived: extra.customerArrived } : {}),
        };
      }
      return item;
    });
    safeLocalStorage.setItem(TRACKED_ORDERS_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bazar_tracked_orders_updated'));
    }
  } catch (err) {
    console.error('Failed to update tracked order in localStorage:', err);
  }
}

/**
 * Remove an order from localStorage history
 */
export function removeTrackedOrder(orderCode: string): void {
  try {
    const current = getTrackedOrders();
    const filtered = current.filter(
      (o) => o.orderCode.trim().toUpperCase() !== orderCode.trim().toUpperCase()
    );
    safeLocalStorage.setItem(TRACKED_ORDERS_KEY, JSON.stringify(filtered));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bazar_tracked_orders_updated'));
    }
  } catch (err) {
    console.error('Failed to remove tracked order from localStorage:', err);
  }
}

/**
 * Fetch an order from Firestore by either its unique `orderCode` or its Firestore document `id`
 */
export async function fetchOrderByTrackingCode(rawCode: string): Promise<any | null> {
  const code = (rawCode || '').trim();
  if (!code) return null;

  const ordersRef = collection(db, 'orders');

  // 1. Try querying by orderCode exactly as formatted (e.g. BZ-123456)
  const qUpper = query(ordersRef, where('orderCode', '==', code.toUpperCase()));
  const snapUpper = await getDocs(qUpper);
  if (!snapUpper.empty) {
    const d = snapUpper.docs[0];
    return { id: d.id, ...d.data() };
  }

  // 2. Try querying by lowercase or original orderCode
  const qOrig = query(ordersRef, where('orderCode', '==', code));
  const snapOrig = await getDocs(qOrig);
  if (!snapOrig.empty) {
    const d = snapOrig.docs[0];
    return { id: d.id, ...d.data() };
  }

  // 3. If user entered just numbers (e.g. 123456), try with "BZ-" prefix
  if (/^\d{5,7}$/.test(code)) {
    const qPrefixed = query(ordersRef, where('orderCode', '==', `BZ-${code}`));
    const snapPrefixed = await getDocs(qPrefixed);
    if (!snapPrefixed.empty) {
      const d = snapPrefixed.docs[0];
      return { id: d.id, ...d.data() };
    }
  }

  // 4. Try as direct Firestore Document ID
  try {
    const docRef = doc(db, 'orders', code);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch {
    // If not a valid doc path, ignore
  }

  return null;
}

/**
 * Searches orders by tracking code, document ID, OR customer phone number.
 * Returns an array of matching orders (sorted from newest to oldest).
 */
export async function searchOrdersByCodeOrPhone(rawQuery: string): Promise<any[]> {
  const queryText = (rawQuery || '').trim();
  if (!queryText) return [];

  const ordersRef = collection(db, 'orders');
  const resultsMap = new Map<string, any>();

  // 1. First attempt: check as unique tracking code or document ID
  try {
    const singleOrder = await fetchOrderByTrackingCode(queryText);
    if (singleOrder) {
      resultsMap.set(singleOrder.id, singleOrder);
    }
  } catch (err) {
    console.warn('Tracking code lookup error:', err);
  }

  // 2. Second attempt: search by phone number if the query contains digits
  const cleanDigits = queryText.replace(/\D/g, '');
  if (cleanDigits.length >= 7) {
    const variants = new Set<string>();
    variants.add(queryText);
    variants.add(cleanDigits);

    if (cleanDigits.startsWith('0')) {
      const without0 = cleanDigits.substring(1);
      variants.add(without0);
      variants.add(`20${without0}`);
      variants.add(`+20${without0}`);
    } else if (cleanDigits.startsWith('20') && cleanDigits.length >= 11) {
      const without20 = cleanDigits.substring(2);
      variants.add(`0${without20}`);
      variants.add(without20);
      variants.add(`+${cleanDigits}`);
    } else if (cleanDigits.length === 10) {
      variants.add(`0${cleanDigits}`);
      variants.add(`20${cleanDigits}`);
      variants.add(`+20${cleanDigits}`);
    }

    const variantsList = Array.from(variants).slice(0, 10);

    // Query 1: deliveryInfo.phoneNumber
    try {
      const qDelivery = query(ordersRef, where('deliveryInfo.phoneNumber', 'in', variantsList));
      const snapDelivery = await getDocs(qDelivery);
      snapDelivery.forEach((doc) => {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.warn('Error querying deliveryInfo.phoneNumber:', err);
    }

    // Query 2: reservationInfo.phoneNumber
    try {
      const qReservation = query(ordersRef, where('reservationInfo.phoneNumber', 'in', variantsList));
      const snapReservation = await getDocs(qReservation);
      snapReservation.forEach((doc) => {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.warn('Error querying reservationInfo.phoneNumber:', err);
    }

    // Query 3: customerPhone (if legacy structure)
    try {
      const qCustPhone = query(ordersRef, where('customerPhone', 'in', variantsList));
      const snapCustPhone = await getDocs(qCustPhone);
      snapCustPhone.forEach((doc) => {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.warn('Error querying customerPhone:', err);
    }
  }

  // Convert map to array and sort by createdAt descending (newest first)
  const orders = Array.from(resultsMap.values());
  orders.sort((a, b) => {
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return orders;
}

/**
 * Customer confirms they are on the way to the physical store
 */
export async function confirmOnTheWay(
  orderId: string,
  orderCode?: string
): Promise<{ success: boolean; onTheWayAt: Date; error?: string }> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const now = new Date();
    await updateDoc(orderRef, {
      status: 'on_the_way',
      onTheWayAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (orderCode) {
      updateTrackedOrderStatus(orderCode, 'on_the_way');
    }

    return { success: true, onTheWayAt: now };
  } catch (error: any) {
    console.error('Error confirming on the way:', error);
    return { success: false, onTheWayAt: new Date(), error: error?.message || 'فشل تحديث الحالة' };
  }
}

/**
 * Customer confirms arrival at the physical store for their reservation
 */
export async function confirmStoreArrival(
  orderId: string,
  orderCode?: string
): Promise<{ success: boolean; arrivedAt: Date; error?: string }> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const now = new Date();
    await updateDoc(orderRef, {
      status: 'arrived',
      customerArrived: true,
      arrivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (orderCode) {
      updateTrackedOrderStatus(orderCode, 'arrived', { customerArrived: true });
    }

    return { success: true, arrivedAt: now };
  } catch (error: any) {
    console.error('Error confirming store arrival:', error);
    return { success: false, arrivedAt: new Date(), error: error?.message || 'فشل تأكيد الوصول' };
  }
}

/**
 * Customer confirms purchase at the store which activates the warranty starting from this moment
 */
export async function confirmPurchase(
  orderId: string,
  orderCode?: string
): Promise<{ success: boolean; purchasedAt: Date; error?: string }> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const now = new Date();
    await updateDoc(orderRef, {
      status: 'delivered',
      purchasedAt: serverTimestamp(),
      warrantyActivated: true,
      warrantyStartDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (orderCode) {
      updateTrackedOrderStatus(orderCode, 'delivered');
    }

    return { success: true, purchasedAt: now };
  } catch (error: any) {
    console.error('Error confirming purchase:', error);
    return { success: false, purchasedAt: new Date(), error: error?.message || 'فشل تأكيد الشراء' };
  }
}
