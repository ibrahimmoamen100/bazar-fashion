'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query as firestoreQuery,
  where,
} from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  ChevronDown,
  Check,
  Store,
  Loader2,
  X,
  UserPlus,
  ArrowRight,
  Pencil,
  Trash2,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
export interface SupplierRecord {
  id: string;
  name: string;
  slug?: string;
  phone?: string;
  address?: string;
  logo?: string;
}

export interface SupplierInfo {
  supplierName?: string;
  supplierSlug?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierLogo?: string;
}

interface SupplierSelectorProps {
  value: SupplierInfo;
  onChange: (info: SupplierInfo) => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\u0600-\u06FFa-z0-9_]/g, '');
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────
export function SupplierSelector({ value, onChange }: SupplierSelectorProps) {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Inline form state (For adding new OR editing existing)
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLogo, setNewLogo] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch active (non-archived) suppliers only when dropdown is opened ────
  const fetchActiveSuppliers = async () => {
    setLoading(true);
    try {
      const q = firestoreQuery(
        collection(db, 'suppliers'),
        where('isArchived', '==', false)
      );
      const snap = await getDocs(q);
      const list: SupplierRecord[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const computedSlug = data.slug || slugify(data.name || '') || d.id;
        return {
          id: d.id,
          ...data,
          slug: computedSlug,
        };
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      setSuppliers(list);
      setHasFetched(true);
    } catch (e) {
      console.error('Failed to fetch active suppliers', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOpen = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !hasFetched) {
      fetchActiveSuppliers();
    }
  };

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  // ── Select existing supplier ─────────────────────────────────────────────
  function handleSelect(s: SupplierRecord) {
    onChange({
      supplierName: s.name,
      supplierSlug: s.slug,
      supplierPhone: s.phone || '',
      supplierAddress: s.address || '',
      supplierLogo: s.logo || '',
    });
    setOpen(false);
    setQuery('');
    setIsAddingNew(false);
    setIsEditing(false);
  }

  // ── Clear selection ──────────────────────────────────────────────────────
  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange({ supplierName: '', supplierPhone: '', supplierAddress: '', supplierLogo: '' });
    setIsAddingNew(false);
    setIsEditing(false);
  }

  // ── Switch to "add new" mode ──────────────────────────────────────────────
  function handleStartNew() {
    setOpen(false);
    onChange({ supplierName: '', supplierPhone: '', supplierAddress: '', supplierLogo: '' });
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewLogo('');
    setIsEditing(false);
    setEditingId(null);
    setIsAddingNew(true);
  }

  // ── Switch to "edit existing" mode ────────────────────────────────────────
  function handleStartEdit(e: React.MouseEvent, s: SupplierRecord) {
    e.stopPropagation();
    setOpen(false);
    setEditingId(s.id);
    setNewName(s.name);
    setNewPhone(s.phone || '');
    setNewAddress(s.address || '');
    setNewLogo(s.logo || '');
    setIsAddingNew(false);
    setIsEditing(true);
  }

  // ── Delete supplier ──────────────────────────────────────────────────────
  async function handleDelete(e: React.MouseEvent, s: SupplierRecord) {
    e.stopPropagation();
    const confirmed = window.confirm(`هل أنت متأكد من حذف التاجر "${s.name}"؟ سيتم حذفه نهائياً من قاعدة البيانات.`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'suppliers', s.id));

      // If deleted supplier is the selected one, clear selection
      if (value.supplierName === s.name) {
        onChange({ supplierName: '', supplierPhone: '', supplierAddress: '', supplierLogo: '' });
      }

      setSuppliers((prev) => prev.filter((item) => item.id !== s.id));
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      alert('حدث خطأ أثناء حذف التاجر، يرجى المحاولة مرة أخرى.');
    }
  }

  // ── Cancel new/edit supplier ─────────────────────────────────────────────
  function handleCancelForm() {
    setIsAddingNew(false);
    setIsEditing(false);
    setEditingId(null);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewLogo('');
  }

  // ── Save new or edited supplier ─────────────────────────────────────────
  async function handleSave() {
    if (!newName.trim()) return;
    setSaving(true);

    // For edit, use the existing ID. For new, slugify the name.
    const computedSlug = slugify(newName);
    const id = isEditing && editingId ? editingId : (computedSlug || crypto.randomUUID());

    const record: Omit<SupplierRecord, 'id'> = {
      name: newName.trim(),
      slug: computedSlug,
      phone: newPhone.trim() || undefined,
      address: newAddress.trim() || undefined,
      logo: newLogo.trim() || undefined,
    };

    try {
      await setDoc(doc(db, 'suppliers', id), {
        ...record,
        isArchived: false,
        createdAt: serverTimestamp(),
      }, { merge: true });

      const savedEntry: SupplierRecord = { id, ...record };

      setSuppliers((prev) => {
        const updated = [...prev.filter((s) => s.id !== id), savedEntry];
        updated.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        return updated;
      });

      // Select it automatically
      onChange({
        supplierName: savedEntry.name,
        supplierSlug: savedEntry.slug,
        supplierPhone: savedEntry.phone || '',
        supplierAddress: savedEntry.address || '',
        supplierLogo: savedEntry.logo || '',
      });

      setIsAddingNew(false);
      setIsEditing(false);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save supplier', e);
      alert('حدث خطأ أثناء حفظ التاجر، يرجى التحقق من القواعد والمحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  }

  const selectedName = value.supplierName || '';
  const hasSelection = !!selectedName;

  return (
    <div className="space-y-3 relative" ref={containerRef}>
      {/* ── Trigger button ─────────────────────────────────────────────── */}
      {!isAddingNew && !isEditing && (
        <button
          type="button"
          onClick={handleToggleOpen}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${open
            ? 'border-primary ring-1 ring-primary/30 bg-white'
            : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Store className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {hasSelection ? (
              <span className="font-semibold text-gray-900 truncate">{selectedName}</span>
            ) : (
              <span className="text-gray-400">اختر تاجراً من القائمة...</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasSelection && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="إزالة الاختيار"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>
      )}

      {/* ── Dropdown (Inline absolute rendering to fix pointer-events inside Modals) ── */}
      {open && !isAddingNew && !isEditing && (
        <div className="absolute z-50 top-full right-0 left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="ابحث عن تاجر..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Suppliers list */}
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحميل...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-5">
                {query ? `لا توجد نتائج لـ "${query}"` : 'لا يوجد تجار مضافون بعد'}
              </p>
            ) : (
              filtered.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-right cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {s.logo ? (
                      <img
                        src={s.logo}
                        alt={s.name}
                        className="h-8 w-8 rounded-lg border border-gray-100 object-contain bg-gray-50 flex-shrink-0"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{s.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1 text-right">
                      <span className="text-sm font-semibold text-gray-900 truncate">{s.name}</span>
                      {(s.phone || s.address) && (
                        <span className="text-xs text-gray-400 truncate">
                          {[s.phone, s.address].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1.5 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleStartEdit(e, s)}
                      className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-blue-600 transition-colors"
                      title="تعديل بيانات التاجر"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, s)}
                      className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-red-600 transition-colors"
                      title="حذف التاجر نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {selectedName === s.name && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mr-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add new button */}
          <div className="p-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleStartNew}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors font-semibold"
            >
              <UserPlus className="w-4 h-4" />
              إضافة تاجر جديد
            </button>
          </div>
        </div>
      )}

      {/* ── Inline Add/Edit Supplier Form ──────────────────────────────── */}
      {(isAddingNew || isEditing) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-gray-800">
                {isEditing ? 'تعديل بيانات التاجر' : 'إضافة تاجر جديد'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              العودة للقائمة
            </button>
          </div>

          {/* Fields */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                اسم التاجر / المحل <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="مثال: محل الأمل للللموضه - ملابس - أحذيه"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                رقم الهاتف <span className="text-gray-400">(اختياري)</span>
              </label>
              <Input
                placeholder="مثال: 01012345678"
                dir="ltr"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                العنوان <span className="text-gray-400">(اختياري)</span>
              </label>
              <Input
                placeholder="مثال: شارع التحرير، القاهرة"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                رابط اللوجو <span className="text-gray-400">(اختياري)</span>
              </label>
              <Input
                type="text"
                placeholder="https://example.com/logo3.png"
                dir="ltr"
                value={newLogo}
                onChange={(e) => setNewLogo(e.target.value)}
                className="bg-white"
              />
              {newLogo && (
                <img
                  src={newLogo}
                  alt="معاينة اللوجو"
                  className="mt-2 h-10 w-10 object-contain rounded-lg border border-gray-200 bg-white"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={!newName.trim() || saving}
              onClick={handleSave}
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> جاري الحفظ...</>
              ) : (
                <>{isEditing ? 'حفظ التعديلات' : 'حفظ واختيار التاجر'}</>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCancelForm}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}


    </div>
  );
}
