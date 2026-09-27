'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { getDashboardSession } from '@/lib/dashboardAuth';
import {
  Store, Plus, Pencil, Trash2, Archive, ArchiveRestore,
  X, Loader2, ArrowLeft, ExternalLink, Tag, Phone, MapPin,
  Facebook, Instagram, Youtube, Hash, Save, Calendar, Clock, ShieldAlert, ArrowRightLeft,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { productsService } from '@/lib/firebase';
import { registerSupplierSlug } from '@/utils/url';
import { FaWhatsapp, FaTiktok } from 'react-icons/fa';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { invalidateSuppliersCache } from "@/lib/suppliersCache";
import { transferSupplierProductsToBazar, restoreSupplierProductsFromBazar } from "@/utils/supplierProductTransfer";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SupplierFull {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  isPhonePublic?: boolean;
  address?: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  tags?: string[];
  displayOrder?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionExpiredAction?: 'none' | 'archive_supplier' | 'transfer_to_bazar';
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    tiktok?: string;
    youtube?: string;
  };
  isArchived?: boolean;
  createdAt?: any;
}

const emptyForm = (): Omit<SupplierFull, 'id' | 'createdAt'> => ({
  name: '',
  slug: '',
  phone: '',
  isPhonePublic: true,
  address: '',
  logo: '',
  coverImage: '',
  description: '',
  tags: [],
  displayOrder: 0,
  subscriptionStartDate: '',
  subscriptionEndDate: '',
  subscriptionExpiredAction: 'archive_supplier',
  socialLinks: { facebook: '', instagram: '', whatsapp: '', tiktok: '', youtube: '' },
  isArchived: false,
});

function slugify(str: string) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function cleanSlugInput(str: string) {
  return str
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
    .toLowerCase();
}

export default function SuppliersManager() {
  const navigate = useNavigate();
  const [activeSuppliers, setActiveSuppliers] = useState<SupplierFull[]>([]);
  const [archivedSuppliers, setArchivedSuppliers] = useState<SupplierFull[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [hasFetchedArchived, setHasFetchedArchived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalSupplier, setOriginalSupplier] = useState<SupplierFull | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [tagInput, setTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // ── Modern Confirmation Modals State ──
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierFull | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [supplierToArchive, setSupplierToArchive] = useState<SupplierFull | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Auth check
  useEffect(() => {
    const session = getDashboardSession();
    if (!session) { navigate('/dashboard'); return; }
    if (!session.permissions.includes('suppliers') && !session.permissions.includes('superadmin')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const processExpiredSubscriptions = async (list: SupplierFull[]) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const sup of list) {
      if (!sup.subscriptionEndDate) continue;
      const endDate = new Date(sup.subscriptionEndDate);
      endDate.setHours(23, 59, 59, 999);

      if (endDate < now) {
        const action = sup.subscriptionExpiredAction || 'archive_supplier';

        if (action === 'archive_supplier' && !sup.isArchived) {
          try {
            await setDoc(doc(db, 'suppliers', sup.id), { isArchived: true }, { merge: true });
            sup.isArchived = true;
            const transferredCount = await transferSupplierProductsToBazar(sup);
            if (transferredCount > 0) {
              toast.info(`انتهى اشتراك التاجر "${sup.name}" وتم أرشفته وتحويل ${transferredCount} منتج إلى "bazar fashion"`);
            } else {
              toast.info(`انتهى اشتراك التاجر "${sup.name}" وتم أرشفته تلقائياً`);
            }
          } catch (e) {
            console.error('Failed to auto-archive supplier:', e);
          }
        } else if (action === 'transfer_to_bazar' && (!sup.isArchived || !(sup as any).transferredToBazar)) {
          try {
            await setDoc(doc(db, 'suppliers', sup.id), { isArchived: true, transferredToBazar: true }, { merge: true });
            sup.isArchived = true;
            const transferredCount = await transferSupplierProductsToBazar(sup);
            toast.info(`انتهى اشتراك "${sup.name}" — تم أرشفته ونقل ${transferredCount} منتج إلى "bazar fashion"`);
          } catch (e) {
            console.error('Failed to transfer products:', e);
          }
        }
      }
    }
  };

  // ── Fetch active suppliers ONLY on mount (0 reads for archived suppliers) ──
  const fetchActiveSuppliers = useCallback(async () => {
    setLoadingActive(true);
    try {
      const q = query(
        collection(db, 'suppliers'),
        where('isArchived', '==', false)
      );
      const snap = await getDocs(q);
      const list: SupplierFull[] = snap.docs.map(d => {
        const data = d.data() as any;
        const computedSlug = data.slug || slugify(data.name || '') || d.id;
        if (!data.slug && data.name) {
          setDoc(doc(db, 'suppliers', d.id), { slug: computedSlug }, { merge: true }).catch(() => { });
        }
        return { id: d.id, ...data, slug: computedSlug, isArchived: false };
      });
      list.sort((a, b) => {
        const oa = a.displayOrder && a.displayOrder > 0 ? a.displayOrder : 999999;
        const ob = b.displayOrder && b.displayOrder > 0 ? b.displayOrder : 999999;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name, 'ar');
      });

      setActiveSuppliers(list);
      await processExpiredSubscriptions(list);
    } catch { toast.error('فشل في تحميل التجار النشطين'); }
    finally { setLoadingActive(false); }
  }, []);

  useEffect(() => { fetchActiveSuppliers(); }, [fetchActiveSuppliers]);

  // ── Fetch archived suppliers ONLY when user toggles "عرض المؤرشفين" ──────
  const fetchArchivedSuppliers = async () => {
    setLoadingArchived(true);
    try {
      const q = query(
        collection(db, 'suppliers'),
        where('isArchived', '==', true)
      );
      const snap = await getDocs(q);
      const list: SupplierFull[] = snap.docs.map(d => {
        const data = d.data() as any;
        const computedSlug = data.slug || slugify(data.name || '') || d.id;
        if (!data.slug && data.name) {
          setDoc(doc(db, 'suppliers', d.id), { slug: computedSlug }, { merge: true }).catch(() => { });
        }
        return { id: d.id, ...data, slug: computedSlug, isArchived: true };
      });
      list.sort((a, b) => {
        const oa = a.displayOrder && a.displayOrder > 0 ? a.displayOrder : 999999;
        const ob = b.displayOrder && b.displayOrder > 0 ? b.displayOrder : 999999;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name, 'ar');
      });

      setArchivedSuppliers(list);
      setHasFetchedArchived(true);
    } catch {
      toast.error('فشل في تحميل التجار المؤرشفين');
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleToggleShowArchived = (checked: boolean) => {
    setShowArchived(checked);
    if (checked && !hasFetchedArchived) {
      fetchArchivedSuppliers();
    }
  };

  const handleNameChange = (name: string) =>
    setForm(f => ({ ...f, name, slug: editingId ? f.slug : slugify(name) }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) setForm(f => ({ ...f, tags: [...(f.tags || []), t] }));
    setTagInput('');
  };
  const removeTag = (tag: string) =>
    setForm(f => ({ ...f, tags: (f.tags || []).filter(t => t !== tag) }));

  const openNew = () => {
    setEditingId(null);
    setOriginalSupplier(null);
    setForm(emptyForm());
    setTagInput('');
    setShowForm(true);
  };

  const openEdit = (s: SupplierFull) => {
    setEditingId(s.id);
    setOriginalSupplier(s);
    setForm({
      name: s.name || '',
      slug: s.slug || slugify(s.name || '') || '',
      phone: s.phone || '',
      isPhonePublic: s.isPhonePublic !== undefined ? s.isPhonePublic : true,
      address: s.address || '',
      logo: s.logo || '',
      coverImage: s.coverImage || '',
      description: s.description || '',
      tags: s.tags || [],
      displayOrder: s.displayOrder ?? 0,
      subscriptionStartDate: s.subscriptionStartDate || '',
      subscriptionEndDate: s.subscriptionEndDate || '',
      subscriptionExpiredAction: s.subscriptionExpiredAction || 'archive_supplier',
      socialLinks: {
        facebook: s.socialLinks?.facebook || '',
        instagram: s.socialLinks?.instagram || '',
        whatsapp: s.socialLinks?.whatsapp || '',
        tiktok: s.socialLinks?.tiktok || '',
        youtube: s.socialLinks?.youtube || '',
      },
      isArchived: s.isArchived || false,
    });
    setTagInput('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setOriginalSupplier(null);
    setForm(emptyForm());
    setTagInput('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('يرجى إدخال الاسم والـ Slug');
      return;
    }

    const cleanTargetSlug = form.slug.trim().toLowerCase().replace(/^-+|-+$/g, '');
    if (!cleanTargetSlug) {
      toast.error('يرجى إدخال Slug صالح للمتجر');
      return;
    }

    // Check duplicate slug among other suppliers
    const duplicate = [...activeSuppliers, ...archivedSuppliers].find(
      s => s.id !== editingId && (s.slug || '').toLowerCase() === cleanTargetSlug
    );
    if (duplicate) {
      toast.error(`رابط المتجر (Slug) "${cleanTargetSlug}" مستخدم بالفعل مع التاجر "${duplicate.name}". يرجى اختيار رابط آخر.`);
      return;
    }

    setSaving(true);
    try {
      const id = editingId || cleanTargetSlug || crypto.randomUUID();
      const isArchived = form.isArchived || false;
      const data: any = {
        name: form.name.trim(),
        slug: cleanTargetSlug,
        phone: form.phone?.trim() || null,
        isPhonePublic: form.isPhonePublic ?? true,
        address: form.address?.trim() || null,
        logo: form.logo?.trim() || null,
        coverImage: form.coverImage?.trim() || null,
        description: form.description?.trim() || null,
        tags: form.tags || [],
        displayOrder: Number(form.displayOrder ?? 0),
        subscriptionStartDate: form.subscriptionStartDate?.trim() || null,
        subscriptionEndDate: form.subscriptionEndDate?.trim() || null,
        subscriptionExpiredAction: form.subscriptionExpiredAction || 'archive_supplier',
        socialLinks: {
          facebook: form.socialLinks?.facebook?.trim() || null,
          instagram: form.socialLinks?.instagram?.trim() || null,
          whatsapp: form.socialLinks?.whatsapp?.trim() || null,
          tiktok: form.socialLinks?.tiktok?.trim() || null,
          youtube: form.socialLinks?.youtube?.trim() || null,
        },
        isArchived,
      };

      if (!editingId) data.createdAt = serverTimestamp();
      await setDoc(doc(db, 'suppliers', id), data, { merge: true });

      // Update associated products in Firestore if slug or name changed
      const oldSlug = originalSupplier?.slug?.trim();
      const oldName = originalSupplier?.name?.trim();
      const newSlug = cleanTargetSlug;
      const newName = form.name.trim();
      let updatedProductCount = 0;

      if (editingId && (oldSlug !== newSlug || oldName !== newName)) {
        try {
          const prodsSnap = await getDocs(collection(db, 'products'));
          const matchingDocs = prodsSnap.docs.filter(pDoc => {
            const pData = pDoc.data();
            return (
              (oldName && pData.wholesaleInfo?.supplierName === oldName) ||
              (oldSlug && pData.supplierSlug === oldSlug) ||
              (oldSlug && pData.wholesaleInfo?.supplierSlug === oldSlug) ||
              (originalSupplier?.id && pData.supplierSlug === originalSupplier.id) ||
              (newName && pData.wholesaleInfo?.supplierName === newName)
            );
          });

          if (matchingDocs.length > 0) {
            for (let i = 0; i < matchingDocs.length; i += 400) {
              const batch = writeBatch(db);
              const chunk = matchingDocs.slice(i, i + 400);
              for (const pDoc of chunk) {
                const pData = pDoc.data();
                batch.set(doc(db, 'products', pDoc.id), {
                  supplierSlug: newSlug,
                  wholesaleInfo: {
                    ...(pData.wholesaleInfo || {}),
                    supplierName: newName,
                    supplierSlug: newSlug,
                    ...(form.phone ? { supplierPhone: form.phone.trim() } : {}),
                    ...(form.address ? { supplierAddress: form.address.trim() } : {}),
                    ...(form.logo ? { supplierLogo: form.logo.trim() } : {}),
                  },
                }, { merge: true });
              }
              await batch.commit();
            }
            updatedProductCount = matchingDocs.length;
          }
        } catch (err) {
          console.error('Failed to sync products on supplier update:', err);
        }
      }

      // Update in-memory URL routing map
      registerSupplierSlug(newName, newSlug);
      if (oldName) registerSupplierSlug(oldName, newSlug);
      if (oldSlug) registerSupplierSlug(oldSlug, newSlug);

      invalidateSuppliersCache();
      productsService.invalidateProductsCache();
      productsService.updateCatalogVersion().catch(() => { });

      // Check if archive status changed via form
      if (editingId && originalSupplier) {
        if (!originalSupplier.isArchived && isArchived) {
          // Transitioned to archived -> transfer products to bazar fashion
          try {
            const count = await transferSupplierProductsToBazar({
              id,
              name: form.name.trim(),
              slug: cleanTargetSlug,
              address: form.address,
              phone: form.phone,
              logo: form.logo,
            });
            if (count > 0) {
              toast.info(`تم تحويل ${count} منتج إلى "bazar fashion" بسبب أرشفة التاجر`);
            }
          } catch (err) {
            console.error('Failed to transfer products on archive save:', err);
          }
        } else if (originalSupplier.isArchived && !isArchived) {
          // Transitioned to active (unarchived) -> restore products back to merchant
          try {
            const count = await restoreSupplierProductsFromBazar({
              id,
              name: form.name.trim(),
              slug: cleanTargetSlug,
              address: form.address,
              phone: form.phone,
              logo: form.logo,
            });
            if (count > 0) {
              toast.info(`تمت استعادة ${count} منتج إلى التاجر "${form.name.trim()}"`);
            }
          } catch (err) {
            console.error('Failed to restore products on unarchive save:', err);
          }
        }
      }

      if (updatedProductCount > 0) {
        toast.success(`تم تحديث بيانات التاجر وتحديث الرابط (Slug) في ${updatedProductCount} منتج مرتبط به`);
      } else {
        toast.success(editingId ? 'تم تحديث بيانات التاجر بنجاح' : 'تمت إضافة التاجر بنجاح');
      }

      const savedItem: SupplierFull = { id, ...data, slug: cleanTargetSlug };
      if (isArchived) {
        setActiveSuppliers(prev => prev.filter(item => item.id !== id));
        if (hasFetchedArchived) {
          setArchivedSuppliers(prev => [...prev.filter(item => item.id !== id), savedItem]);
        }
      } else {
        setArchivedSuppliers(prev => prev.filter(item => item.id !== id));
        setActiveSuppliers(prev => {
          const list = [...prev.filter(item => item.id !== id), savedItem];
          list.sort((a, b) => {
            const oa = a.displayOrder && a.displayOrder > 0 ? a.displayOrder : 999999;
            const ob = b.displayOrder && b.displayOrder > 0 ? b.displayOrder : 999999;
            if (oa !== ob) return oa - ob;
            return a.name.localeCompare(b.name, 'ar');
          });
          return list;
        });
      }
      closeForm();
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // ── Sync All Products with Merchant Slugs ──
  const handleSyncAllProducts = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      toast.info('جاري فحص ومزامنة روابط المنتجات مع التجار...');
      const [prodsSnap, suppliersSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'suppliers')),
      ]);

      const supplierMap = new Map<string, { slug: string; name: string; phone?: string; address?: string; logo?: string }>();
      suppliersSnap.docs.forEach(d => {
        const data = d.data();
        const slug = data.slug || slugify(data.name || '') || d.id;
        if (data.name) {
          supplierMap.set(data.name.trim().toLowerCase(), {
            slug,
            name: data.name.trim(),
            phone: data.phone,
            address: data.address,
            logo: data.logo,
          });
        }
        supplierMap.set(slug.toLowerCase(), {
          slug,
          name: data.name || slug,
          phone: data.phone,
          address: data.address,
          logo: data.logo,
        });
        registerSupplierSlug(data.name, slug);
      });

      const toUpdate: { id: string; supplierSlug: string; wholesaleInfo: any }[] = [];
      prodsSnap.docs.forEach(pDoc => {
        const pData = pDoc.data();
        const supName = (pData.wholesaleInfo?.supplierName || '').trim().toLowerCase();
        const existingSlug = (pData.supplierSlug || pData.wholesaleInfo?.supplierSlug || '').toLowerCase();
        const matched = (supName && supplierMap.get(supName)) || (existingSlug && supplierMap.get(existingSlug));

        if (matched && (pData.supplierSlug !== matched.slug || pData.wholesaleInfo?.supplierSlug !== matched.slug)) {
          toUpdate.push({
            id: pDoc.id,
            supplierSlug: matched.slug,
            wholesaleInfo: {
              ...(pData.wholesaleInfo || {}),
              supplierName: matched.name,
              supplierSlug: matched.slug,
              ...(matched.phone ? { supplierPhone: matched.phone } : {}),
              ...(matched.address ? { supplierAddress: matched.address } : {}),
              ...(matched.logo ? { supplierLogo: matched.logo } : {}),
            },
          });
        }
      });

      if (toUpdate.length === 0) {
        toast.success('جميع المنتجات متزامنة بالفعل مع روابط التجار الصحيحة!');
      } else {
        for (let i = 0; i < toUpdate.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = toUpdate.slice(i, i + 400);
          chunk.forEach(item => {
            batch.set(doc(db, 'products', item.id), {
              supplierSlug: item.supplierSlug,
              wholesaleInfo: item.wholesaleInfo,
            }, { merge: true });
          });
          await batch.commit();
        }
        invalidateSuppliersCache();
        productsService.invalidateProductsCache();
        productsService.updateCatalogVersion().catch(() => { });
        toast.success(`تمت مزامنة وتحديث روابط ${toUpdate.length} منتج بنجاح!`);
      }
    } catch (e) {
      console.error('Failed to sync all products:', e);
      toast.error('حدث خطأ أثناء مزامنة المنتجات');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!supplierToArchive) return;
    setIsArchiving(true);
    const target = supplierToArchive;
    const newArchived = !target.isArchived;
    try {
      await setDoc(doc(db, 'suppliers', target.id), { isArchived: newArchived }, { merge: true });

      if (newArchived) {
        // Archiving supplier: transfer all their products to "bazar fashion"
        try {
          const transferredCount = await transferSupplierProductsToBazar(target);
          if (transferredCount > 0) {
            toast.success(`تم أرشفة التاجر "${target.name}" وتحويل ${transferredCount} منتج إلى "bazar fashion" بنجاح`);
          } else {
            toast.success(`تم أرشفة التاجر "${target.name}" بنجاح`);
          }
        } catch (err) {
          console.error('Failed to transfer products on archive:', err);
          toast.warning(`تم أرشفة التاجر، ولكن حدث خطأ أثناء تحويل بعض المنتجات`);
        }
      } else {
        // Unarchiving / returning supplier: restore all their products back to them
        try {
          const restoredCount = await restoreSupplierProductsFromBazar(target);
          if (restoredCount > 0) {
            toast.success(`تم إلغاء أرشفة التاجر "${target.name}" واستعادة ${restoredCount} منتج إليه بنجاح`);
          } else {
            toast.success(`تم إلغاء أرشفة التاجر "${target.name}" بنجاح`);
          }
        } catch (err) {
          console.error('Failed to restore products on unarchive:', err);
          toast.warning(`تم إلغاء أرشفة التاجر، ولكن حدث خطأ أثناء استعادة بعض المنتجات`);
        }
      }

      if (newArchived) {
        setActiveSuppliers(prev => prev.filter(item => item.id !== target.id));
        if (hasFetchedArchived) {
          setArchivedSuppliers(prev => [...prev, { ...target, isArchived: true }]);
        }
      } else {
        setArchivedSuppliers(prev => prev.filter(item => item.id !== target.id));
        setActiveSuppliers(prev => {
          const updated = [...prev, { ...target, isArchived: false }];
          updated.sort((a, b) => {
            const oa = a.displayOrder && a.displayOrder > 0 ? a.displayOrder : 999999;
            const ob = b.displayOrder && b.displayOrder > 0 ? b.displayOrder : 999999;
            if (oa !== ob) return oa - ob;
            return a.name.localeCompare(b.name, 'ar');
          });
          return updated;
        });
      }
      invalidateSuppliersCache();
      setSupplierToArchive(null);
    } catch {
      toast.error('حدث خطأ أثناء تغيير حالة الأرشفة');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'suppliers', supplierToDelete.id));
      toast.success(`تم حذف التاجر "${supplierToDelete.name}" نهائياً`);
      setActiveSuppliers(prev => prev.filter(item => item.id !== supplierToDelete.id));
      setArchivedSuppliers(prev => prev.filter(item => item.id !== supplierToDelete.id));
      invalidateSuppliersCache();
      setSupplierToDelete(null);
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentList = showArchived ? archivedSuppliers : activeSuppliers;
  const isCurrentLoading = showArchived ? loadingArchived : loadingActive;

  const filteredSuppliers = currentList.filter(s => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q);
    }
    return true;
  });

  const socialIcons: Record<string, React.ReactNode> = {
    whatsapp: <FaWhatsapp className="text-green-500 h-4 w-4" />,
    facebook: <Facebook className="text-blue-600 h-4 w-4" />,
    instagram: <Instagram className="text-pink-500 h-4 w-4" />,
    tiktok: <FaTiktok className="text-gray-900 h-4 w-4" />,
    youtube: <Youtube className="text-red-600 h-4 w-4" />,
  };
  const socialPlaceholders: Record<string, string> = {
    whatsapp: 'https://wa.me/201012345678',
    facebook: 'https://facebook.com/page',
    instagram: 'https://instagram.com/page',
    tiktok: 'https://tiktok.com/@page',
    youtube: 'https://youtube.com/@channel',
  };
  const socialLabels: Record<string, string> = {
    whatsapp: 'واتساب', facebook: 'فيسبوك', instagram: 'انستغرام',
    tiktok: 'تيك توك', youtube: 'يوتيوب',
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <Helmet>
        <title>إدارة التجار - لوحة التحكم</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> لوحة التحكم
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Store className="h-7 w-7 text-primary" /> إدارة التجار
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">إضافة وتعديل وأرشفة التجار</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAllProducts}
              disabled={isSyncing}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'جاري المزامنة...' : 'مزامنة روابط المنتجات مع التجار'}
            </Button>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> إضافة تاجر جديد
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="ابحث باسم أو Slug..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pr-9" />
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border">
            <Switch id="show-archived" checked={showArchived} onCheckedChange={handleToggleShowArchived} />
            <Label htmlFor="show-archived" className="text-sm cursor-pointer select-none">
              عرض المؤرشفين {hasFetchedArchived ? `(${archivedSuppliers.length})` : '(جلب عند النقر)'}
            </Label>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'التجار النشطين', value: activeSuppliers.length, cls: 'bg-green-50 text-green-700' },
            { label: 'المؤرشفين', value: hasFetchedArchived ? archivedSuppliers.length : 'غير مجلوب', cls: 'bg-orange-50 text-orange-700' },
            { label: 'إجمالي المحمّل', value: activeSuppliers.length + (hasFetchedArchived ? archivedSuppliers.length : 0), cls: 'bg-blue-50 text-blue-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 ${s.cls}`}>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-primary/20 shadow-lg p-6 mb-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {editingId ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editingId ? 'تعديل بيانات التاجر' : 'إضافة تاجر جديد'}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeForm} className="gap-1 text-gray-500">
                <X className="h-4 w-4" /> إغلاق
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                  اسم التاجر / المتجر <span className="text-red-500">*</span>
                </Label>
                <Input placeholder="مثال: متجر الحمد" value={form.name}
                  onChange={e => handleNameChange(e.target.value)} autoFocus />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Slug (رابط المتجر) <span className="text-red-500">*</span>
                </Label>
                <Input dir="ltr" placeholder="hamd-store" value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: cleanSlugInput(e.target.value) }))}
                  onBlur={() => setForm(f => ({ ...f, slug: f.slug.replace(/^-+|-+$/g, '') }))}
                  className="font-mono text-sm" />
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1.5 font-mono">
                  <span className="text-primary font-semibold">رابط المتجر:</span>
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 select-all">/{form.slug || 'hamd-store'}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> رقم الهاتف
                  </Label>
                  <div className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      id="phone-public"
                      checked={form.isPhonePublic ?? true}
                      onCheckedChange={(checked) => setForm((f) => ({ ...f, isPhonePublic: checked }))}
                    />
                    <Label htmlFor="phone-public" className="text-[11px] font-medium cursor-pointer text-muted-foreground select-none">
                      {form.isPhonePublic ?? true ? 'ظاهر للزوار (عام)' : 'مخفي عن الزوار (خاص)'}
                    </Label>
                  </div>
                </div>
                <Input dir="ltr" placeholder="01012345678" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  <Hash className="h-3 w-3" /> ترتيب الظهور (الأولوية)
                </Label>
                <Input
                  dir="ltr"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="1 = الأول، 2 = الثاني... (0 = افتراضي)"
                  value={form.displayOrder ?? 0}
                  onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">الأرقام 1، 2، 3... تظهر أولاً بترتيبها • 0 تعيد التاجر للترتيب الافتراضي الأبجدي</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> العنوان
                </Label>
                <Input placeholder="مثال: شارع التحرير، القاهرة" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">رابط اللوجو</Label>
                <Input dir="ltr" placeholder="https://..." value={form.logo}
                  onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} />
                {form.logo && (
                  <img src={form.logo} alt="logo" className="mt-2 h-10 w-10 object-contain rounded-lg border bg-white"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">رابط صورة الغلاف</Label>
                <Input dir="ltr" placeholder="https://..." value={form.coverImage}
                  onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">وصف المتجر</Label>
                <Textarea placeholder="وصف مختصر..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>

              {/* Tags */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags للتصفية
                </Label>
                <div className="flex gap-2">
                  <Input dir="ltr" placeholder="مثال: laptops" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                </div>
                {(form.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(form.tags || []).map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-lg">
                        #{tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Subscription Details Section */}
              <div className="sm:col-span-2 p-4 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-gray-900 text-sm">الاشتراك الشهري للتاجر</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white hover:bg-amber-50 border-amber-200"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const nextMonth = new Date();
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      const endDate = nextMonth.toISOString().split('T')[0];
                      setForm(f => ({ ...f, subscriptionStartDate: today, subscriptionEndDate: endDate }));
                    }}
                  >
                    + شهر جديد من اليوم
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" /> تاريخ بدء الاشتراك
                    </Label>
                    <Input
                      type="date"
                      value={form.subscriptionStartDate || ''}
                      onChange={e => setForm(f => ({ ...f, subscriptionStartDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" /> تاريخ انتهاء الاشتراك
                    </Label>
                    <Input
                      type="date"
                      value={form.subscriptionEndDate || ''}
                      onChange={e => setForm(f => ({ ...f, subscriptionEndDate: e.target.value }))}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 text-amber-600" /> الإجراء المتخذ عند انتهاء وقت الاشتراك
                    </Label>
                    <Select
                      value={form.subscriptionExpiredAction || 'archive_supplier'}
                      onValueChange={(val: 'none' | 'archive_supplier' | 'transfer_to_bazar') =>
                        setForm(f => ({ ...f, subscriptionExpiredAction: val }))
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="اختر الإجراء عند انتهاء الاشتراك" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="archive_supplier">
                          📦 أرشفة التاجر تلقائياً (إخفاء المتجر والمنتجات من الموقع)
                        </SelectItem>
                        <SelectItem value="transfer_to_bazar">
                          🏬 أرشفة التاجر + ضم ونقل جميع منتجاته إلى "بازار للموضه" (التاجر الافتراضي)
                        </SelectItem>
                        <SelectItem value="none">
                          ⚠️ لا يحدث شيء (تنبيه بالانتهاء فقط)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      يتم تنفيذ هذا الإجراء تلقائياً بمجرد حلول تاريخ انتهاء الاشتراك المحدد.
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-gray-600 mb-2 block">روابط السوشيال ميديا</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.keys(socialIcons).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      {socialIcons[key]}
                      <Input dir="ltr" placeholder={socialPlaceholders[key]}
                        value={(form.socialLinks as any)?.[key] || ''}
                        onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, [key]: e.target.value } }))}
                        className="text-xs" />
                    </div>
                  ))}
                </div>
              </div>

              {editingId && (
                <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200">
                  <Switch id="is-archived" checked={form.isArchived} onCheckedChange={v => setForm(f => ({ ...f, isArchived: v }))} />
                  <Label htmlFor="is-archived" className="cursor-pointer">
                    <span className="font-semibold text-orange-700">أرشفة التاجر</span>
                    <p className="text-xs text-orange-600 font-normal mt-0.5">لن يظهر التاجر أو منتجاته عند الأرشفة</p>
                  </Label>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة التاجر'}
              </Button>
              <Button variant="outline" onClick={closeForm}>إلغاء</Button>
            </div>
          </div>
        )}

        {/* Suppliers Grid */}
        {isCurrentLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="h-6 w-6 animate-spin" /><span>جاري التحميل...</span>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <Store className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">
              {showArchived ? 'لا يوجد تجار مؤرشفون' : 'لا يوجد تجار — ابدأ بالإضافة'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSuppliers.map(s => (
              <div key={s.id}
                className={`bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${s.isArchived ? 'opacity-60' : 'hover:shadow-md'}`}
              >
                {s.logo ? (
                  <img src={s.logo} alt={s.name} className="h-14 w-14 object-contain rounded-xl border bg-gray-50 flex-shrink-0"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-primary">{s.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{s.name}</h3>
                    {s.isArchived && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">مؤرشف</span>}
                    {s.displayOrder && s.displayOrder > 0 ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold rounded-full flex items-center gap-1" title="أولوية الظهور">
                        <Hash className="h-2.5 w-2.5" />{s.displayOrder}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">/{s.slug}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {s.phone && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />{s.phone}
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${s.isPhonePublic !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {s.isPhonePublic !== false ? 'عام' : 'خاص (مخفي)'}
                        </span>
                      </span>
                    )}
                    {s.address && <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{s.address}</span>}
                  </div>

                  {s.subscriptionEndDate && (
                    <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-600 font-mono text-[11px]">
                        الاشتراك: {s.subscriptionStartDate || 'غير محدد'} ➔ {s.subscriptionEndDate}
                      </span>
                      {new Date(s.subscriptionEndDate) <= new Date() ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[10px] rounded-full border border-red-200">
                          منتهي ({s.subscriptionExpiredAction === 'transfer_to_bazar' ? 'تم النقل لبازار' : s.subscriptionExpiredAction === 'archive_supplier' ? 'مؤرشف' : 'تنبيه'})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 font-bold text-[10px] rounded-full border border-green-200">
                          نشط
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {Object.entries(s.socialLinks || {}).map(([key, val]) => val ? (
                      <a key={key} href={val} target="_blank" rel="noopener" className="hover:opacity-70 transition-opacity">
                        {socialIcons[key]}
                      </a>
                    ) : null)}
                  </div>
                  {(s.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(s.tags || []).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" className="gap-1 text-xs"
                    onClick={() => window.open(`/${s.slug}`, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">عرض</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)} className="gap-1 text-xs">
                    <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">تعديل</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSupplierToArchive(s)}
                    className={`gap-1 text-xs ${s.isArchived ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-orange-600 border-orange-300 hover:bg-orange-50'}`}>
                    {s.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{s.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSupplierToDelete(s)}
                    className="gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Modern Delete Confirmation Modal ── */}
        <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && !isDeleting && setSupplierToDelete(null)}>
          <AlertDialogContent className="max-w-md rounded-2xl p-6 border-red-100 bg-white/95 backdrop-blur-md shadow-2xl">
            <AlertDialogHeader className="space-y-3 text-right">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <AlertDialogTitle className="text-lg font-bold text-gray-900">
                    تأكيد حذف التاجر نهائياً
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-gray-500 mt-0.5">
                    هذا الإجراء سيؤدي إلى إزالة التاجر بشكل دائم من قاعدة البيانات.
                  </AlertDialogDescription>
                </div>
              </div>

              {/* Target Supplier Card Preview */}
              {supplierToDelete && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 mt-2">
                  {supplierToDelete.logo ? (
                    <img
                      src={supplierToDelete.logo}
                      alt={supplierToDelete.name}
                      className="w-11 h-11 rounded-lg object-contain bg-white border border-gray-200 shrink-0"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
                      {supplierToDelete.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <p className="font-bold text-gray-900 text-sm truncate">{supplierToDelete.name}</p>
                    <p className="text-xs text-gray-400 font-mono">/{supplierToDelete.slug}</p>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-red-50/70 border border-red-200/60 text-xs text-red-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span>تحذير هام</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-600">
                  لا يمكن التراجع عن هذا الإجراء وسيتم حذف بيانات التاجر بالكامل.
                </p>
              </div>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex flex-row-reverse gap-2 sm:gap-2 pt-2">
              <AlertDialogAction
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmDelete();
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold flex-1 gap-2 h-10 shadow-md shadow-red-600/20"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'جاري الحذف...' : 'نعم، احذف التاجر'}
              </AlertDialogAction>
              <AlertDialogCancel
                disabled={isDeleting}
                onClick={() => setSupplierToDelete(null)}
                className="flex-1 h-10 border-gray-200 hover:bg-gray-100"
              >
                إلغاء
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Modern Archive / Restore Confirmation Modal ── */}
        <AlertDialog open={!!supplierToArchive} onOpenChange={(open) => !open && !isArchiving && setSupplierToArchive(null)}>
          <AlertDialogContent className="max-w-md rounded-2xl p-6 border-gray-100 bg-white/95 backdrop-blur-md shadow-2xl">
            <AlertDialogHeader className="space-y-3 text-right">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${supplierToArchive?.isArchived
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}>
                  {supplierToArchive?.isArchived ? (
                    <ArchiveRestore className="w-6 h-6" />
                  ) : (
                    <Archive className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <AlertDialogTitle className="text-lg font-bold text-gray-900">
                    {supplierToArchive?.isArchived ? 'تأكيد إلغاء أرشفة التاجر' : 'تأكيد أرشفة التاجر'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-gray-500 mt-0.5">
                    {supplierToArchive?.isArchived
                      ? 'سيتم إعادة تفعيل التاجر واستعادة جميع منتجاته لاسمه الأصلي تلقائياً.'
                      : 'سيتم تحويل جميع منتجات هذا التاجر تلقائياً إلى "bazar fashion" (التاجر الافتراضي).'}
                  </AlertDialogDescription>
                </div>
              </div>

              {/* Target Supplier Card Preview */}
              {supplierToArchive && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 mt-2">
                  {supplierToArchive.logo ? (
                    <img
                      src={supplierToArchive.logo}
                      alt={supplierToArchive.name}
                      className="w-11 h-11 rounded-lg object-contain bg-white border border-gray-200 shrink-0"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
                      {supplierToArchive.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-right">
                    <p className="font-bold text-gray-900 text-sm truncate">{supplierToArchive.name}</p>
                    <p className="text-xs text-gray-400 font-mono">/{supplierToArchive.slug}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={supplierToArchive.isArchived ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
                  >
                    {supplierToArchive.isArchived ? 'مؤرشف حالياً' : 'نشط حالياً'}
                  </Badge>
                </div>
              )}

              <div className={`p-3 rounded-xl border text-xs space-y-1 ${supplierToArchive?.isArchived
                ? 'bg-emerald-50/70 border-emerald-200/60 text-emerald-800'
                : 'bg-amber-50/70 border-amber-200/60 text-amber-800'
                }`}>
                <p className="text-[11.5px] leading-relaxed">
                  {supplierToArchive?.isArchived
                    ? '🔄 عند إلغاء الأرشفة، ستتم استعادة جميع المنتجات المحولة لتعود باسم هذا التاجر مجدداً ويظهر متجره في الموقع.'
                    : '🛡️ سيتم تحويل جميع منتجات هذا التاجر لتظهر باسم "bazar fashion"، مع حفظ بياناته الأصلية لترجع له المنتجات تلقائياً فور عودته.'}
                </p>
              </div>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex flex-row-reverse gap-2 sm:gap-2 pt-2">
              <AlertDialogAction
                disabled={isArchiving}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmArchive();
                }}
                className={`text-white font-semibold flex-1 gap-2 h-10 shadow-md ${supplierToArchive?.isArchived
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
              >
                {isArchiving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isArchiving
                  ? 'جاري المعالجة...'
                  : supplierToArchive?.isArchived
                    ? 'نعم، تفعيل وإلغاء الأرشفة'
                    : 'نعم، أرشفة التاجر'}
              </AlertDialogAction>
              <AlertDialogCancel
                disabled={isArchiving}
                onClick={() => setSupplierToArchive(null)}
                className="flex-1 h-10 border-gray-200 hover:bg-gray-100"
              >
                إلغاء
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
