import { db, productsService } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { DEFAULT_BAZAR_SUPPLIER } from '@/constants/store';
import { invalidateSuppliersCache } from '@/lib/suppliersCache';

export interface TargetSupplierData {
  id: string;
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  logo?: string;
}

/**
 * Transfers all products of an archived supplier to "bazar fashion" (default merchant),
 * while preserving the original supplier details so they can be restored when the supplier returns.
 */
export async function transferSupplierProductsToBazar(supplier: TargetSupplierData): Promise<number> {
  try {
    const targetName = (supplier.name || '').trim().toLowerCase();
    const targetSlug = (supplier.slug || '').trim().toLowerCase();
    const targetId = supplier.id;

    if (!targetName && !targetSlug && !targetId) return 0;

    const prodsSnap = await getDocs(collection(db, 'products'));

    const matchingDocs = prodsSnap.docs.filter((pDoc) => {
      const pData = pDoc.data();
      const pSupName = (pData.wholesaleInfo?.supplierName || '').trim().toLowerCase();
      const pSupSlug = (pData.supplierSlug || pData.wholesaleInfo?.supplierSlug || '').trim().toLowerCase();
      const pOrigName = (pData.originalSupplierName || '').trim().toLowerCase();
      const pOrigSlug = (pData.originalSupplierSlug || '').trim().toLowerCase();
      const pOrigId = pData.originalSupplierId || '';

      return (
        (targetName && pSupName === targetName) ||
        (targetSlug && pSupSlug === targetSlug) ||
        (targetName && pOrigName === targetName) ||
        (targetSlug && pOrigSlug === targetSlug) ||
        (targetId && pOrigId === targetId)
      );
    });

    if (matchingDocs.length === 0) return 0;

    for (let i = 0; i < matchingDocs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = matchingDocs.slice(i, i + 400);

      for (const pDoc of chunk) {
        const pData = pDoc.data();

        // Preserve original supplier info if not already saved
        const origName = pData.originalSupplierName || pData.wholesaleInfo?.supplierName || supplier.name;
        const origSlug = pData.originalSupplierSlug || pData.supplierSlug || supplier.slug || '';
        const origAddress = pData.originalSupplierAddress !== undefined ? pData.originalSupplierAddress : (pData.wholesaleInfo?.supplierAddress || supplier.address || '');
        const origPhone = pData.originalSupplierPhone !== undefined ? pData.originalSupplierPhone : (pData.wholesaleInfo?.supplierPhone || supplier.phone || '');
        const origLogo = pData.originalSupplierLogo !== undefined ? pData.originalSupplierLogo : (pData.wholesaleInfo?.supplierLogo || supplier.logo || '');
        const origWholesale = pData.originalWholesaleInfo || pData.wholesaleInfo || null;

        batch.set(
          doc(db, 'products', pDoc.id),
          {
            supplierSlug: DEFAULT_BAZAR_SUPPLIER.slug,
            wholesaleInfo: {
              ...(pData.wholesaleInfo || {}),
              supplierName: DEFAULT_BAZAR_SUPPLIER.name,
              supplierSlug: DEFAULT_BAZAR_SUPPLIER.slug,
              supplierAddress: DEFAULT_BAZAR_SUPPLIER.address,
              supplierPhone: DEFAULT_BAZAR_SUPPLIER.phone,
              supplierLogo: DEFAULT_BAZAR_SUPPLIER.logo,
            },
            transferredToBazarDueToArchive: true,
            originalSupplierId: targetId,
            originalSupplierName: origName,
            originalSupplierSlug: origSlug,
            originalSupplierAddress: origAddress,
            originalSupplierPhone: origPhone,
            originalSupplierLogo: origLogo,
            originalWholesaleInfo: origWholesale,
          },
          { merge: true }
        );
      }

      await batch.commit();
    }

    invalidateSuppliersCache();
    productsService.invalidateProductsCache();
    productsService.updateCatalogVersion().catch(() => { });

    return matchingDocs.length;
  } catch (error) {
    console.error('Error transferring supplier products to bazar:', error);
    throw error;
  }
}

/**
 * Restores products back to their original supplier when that supplier is unarchived / returned.
 */
export async function restoreSupplierProductsFromBazar(supplier: TargetSupplierData): Promise<number> {
  try {
    const targetName = (supplier.name || '').trim().toLowerCase();
    const targetSlug = (supplier.slug || '').trim().toLowerCase();
    const targetId = supplier.id;

    if (!targetName && !targetSlug && !targetId) return 0;

    const prodsSnap = await getDocs(collection(db, 'products'));

    const matchingDocs = prodsSnap.docs.filter((pDoc) => {
      const pData = pDoc.data();
      const pOrigName = (pData.originalSupplierName || '').trim().toLowerCase();
      const pOrigSlug = (pData.originalSupplierSlug || '').trim().toLowerCase();
      const pOrigId = pData.originalSupplierId || '';
      const isTransferred = pData.transferredToBazarDueToArchive === true;

      return (
        (targetId && pOrigId === targetId) ||
        (targetSlug && pOrigSlug === targetSlug) ||
        (targetName && pOrigName === targetName) ||
        (isTransferred && (
          (targetName && (pData.wholesaleInfo?.supplierName || '').trim().toLowerCase() === targetName) ||
          (targetSlug && (pData.supplierSlug || '').trim().toLowerCase() === targetSlug)
        ))
      );
    });

    if (matchingDocs.length === 0) return 0;

    for (let i = 0; i < matchingDocs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = matchingDocs.slice(i, i + 400);

      for (const pDoc of chunk) {
        const pData = pDoc.data();

        const restoredName = pData.originalSupplierName || supplier.name;
        const restoredSlug = pData.originalSupplierSlug || supplier.slug || targetSlug;
        const restoredAddress = pData.originalSupplierAddress !== undefined ? pData.originalSupplierAddress : (supplier.address || '');
        const restoredPhone = pData.originalSupplierPhone !== undefined ? pData.originalSupplierPhone : (supplier.phone || '');
        const restoredLogo = pData.originalSupplierLogo !== undefined ? pData.originalSupplierLogo : (supplier.logo || '');

        batch.set(
          doc(db, 'products', pDoc.id),
          {
            supplierSlug: restoredSlug,
            wholesaleInfo: {
              ...(pData.wholesaleInfo || {}),
              supplierName: restoredName,
              supplierSlug: restoredSlug,
              supplierAddress: restoredAddress,
              supplierPhone: restoredPhone,
              supplierLogo: restoredLogo,
            },
            transferredToBazarDueToArchive: false,
          },
          { merge: true }
        );
      }

      await batch.commit();
    }

    invalidateSuppliersCache();
    productsService.invalidateProductsCache();
    productsService.updateCatalogVersion().catch(() => { });

    return matchingDocs.length;
  } catch (error) {
    console.error('Error restoring supplier products from bazar:', error);
    throw error;
  }
}
