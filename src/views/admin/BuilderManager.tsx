'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Cpu,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
  Search,
  Check,
  X,
  Tag,
  ShieldCheck,
  Package,
  ArrowRight,
  Filter,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { useStore } from "@/store/useStore";
import { builderService } from "@/lib/builderService";
import { BuilderPreset, BuilderStep, BuilderOption, BuilderCategory } from "@/types/builder";
import { BUILDER_CATEGORIES } from "@/constants/builderPresets";
import { getDashboardSession } from "@/lib/dashboardAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getCategoryNameFromSlug } from "@/utils/category";

export default function BuilderManager() {
  const navigate = useNavigate();
  const products = useStore((s) => s.products) || [];
  const loadProducts = useStore((s) => s.loadProducts);

  // ── Auth Guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const session = getDashboardSession();
    const allowed =
      session &&
      (session.permissions.includes('builder') || session.permissions.includes('superadmin'));
    if (!allowed) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);
  // ────────────────────────────────────────────────────────────────────────

  const [presets, setPresets] = useState<BuilderPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Ensure store products are loaded for category selection and product picking
  useEffect(() => {
    if (products.length === 0) {
      loadProducts();
    }
  }, [products.length, loadProducts]);

  // Extract unique categories from store products
  const storeCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Currently selected preset for editing its steps & options
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0);
  const currentPreset = presets[activePresetIndex] || null;

  // Modals state
  // 1. Preset Modal
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [editingPresetIndex, setEditingPresetIndex] = useState<number | null>(null);
  const [presetForm, setPresetForm] = useState<Partial<BuilderPreset>>({
    slug: "",
    title: "",
    category: "pc",
    categoryLabel: "تجميعات PC",
    badge: "5% OFF",
    discountPercentage: 5,
    showcaseImage: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=700&auto=format&fit=crop&q=80",
    description: "",
    steps: [],
  });

  // 2. Step Modal (with Category & Subcategory)
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [stepForm, setStepForm] = useState<Partial<BuilderStep>>({
    name: "",
    nameEn: "",
    category: "",
    subcategory: "",
    required: true,
    options: [],
  });

  // Subcategories available for the selected category in stepForm
  const stepAvailableSubcategories = useMemo(() => {
    if (!stepForm.category) return [];
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category === stepForm.category && p.subcategory && p.subcategory.trim()) {
        set.add(p.subcategory.trim());
      }
    });
    return Array.from(set);
  }, [products, stepForm.category]);

  // 3. Option / Product Modal (Direct product picking from category & subcategory)
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [targetStepIndex, setTargetStepIndex] = useState<number | null>(null);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductItem, setSelectedProductItem] = useState<any | null>(null);
  const [customBundlePrice, setCustomBundlePrice] = useState<number>(0);
  const [priceDelta, setPriceDelta] = useState<number>(0);

  // Dynamic Categories state
  const [categories, setCategories] = useState<BuilderCategory[]>(Array.from(BUILDER_CATEGORIES));
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatLabel, setEditingCatLabel] = useState("");

  // Load presets and categories on mount from Firebase / LocalStorage
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [data, cats] = await Promise.all([
          builderService.getPresets(),
          builderService.getCategories(),
        ]);
        setPresets(data);
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      } catch (err) {
        toast.error("فشل تحميل بيانات التجميعات أو التصنيفات");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAddCategory = async () => {
    if (!newCatLabel.trim()) {
      toast.error("يرجى كتابة اسم التصنيف");
      return;
    }
    const cleanLabel = newCatLabel.trim();
    const id = "cat-" + Date.now().toString(36);
    const updated = [...categories, { id, label: cleanLabel }];
    setCategories(updated);
    setNewCatLabel("");
    await builderService.saveCategories(updated);
    toast.success(`تمت إضافة تصنيف "${cleanLabel}" بنجاح`);
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCatLabel.trim()) {
      toast.error("يرجى كتابة اسم التصنيف");
      return;
    }
    const updated = categories.map((c) =>
      c.id === id ? { ...c, label: editingCatLabel.trim() } : c
    );
    setCategories(updated);
    setEditingCatId(null);
    setEditingCatLabel("");
    await builderService.saveCategories(updated);
    toast.success("تم تحديث اسم التصنيف بنجاح");
  };

  const handleDeleteCategory = async (id: string, label: string) => {
    if (id === "all") {
      toast.error("لا يمكن حذف تصنيف (جميع الأقسام)");
      return;
    }
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await builderService.saveCategories(updated);
    toast.success(`تم حذف التصنيف بنجاح`);
  };

  // Helper to update state and immediately persist to Firebase Firestore
  const persistPresets = async (updated: BuilderPreset[], successMessage: string) => {
    setPresets(updated);
    setSaving(true);
    try {
      const res = await builderService.savePresets(updated);
      if (res.success) {
        toast.success(successMessage);
      } else {
        toast.error(`تم التحديث، لكن حدث خطأ أثناء الحفظ: ${res.error}`);
      }
    } catch (e) {
      toast.error("فشل الاتصال بقاعدة البيانات");
    } finally {
      setSaving(false);
    }
  };

  // ── Preset Actions ──────────────────────────────────────────────────────────
  const openNewPresetModal = () => {
    setEditingPresetIndex(null);
    setPresetForm({
      id: `preset-${Date.now()}`,
      slug: "",
      title: "",
      category: "pc",
      categoryLabel: "تجميعات PC",
      badge: "وفر 10%",
      discountPercentage: 10,
      showcaseImage: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=700&auto=format&fit=crop&q=80",
      description: "تجميعة مخصصة جديدة",
      steps: [],
    });
    setPresetModalOpen(true);
  };

  const openEditPresetModal = (index: number) => {
    setEditingPresetIndex(index);
    const target = presets[index];
    setPresetForm({
      ...target,
      slug: target.slug || target.id.replace(/^preset-/, "") || "",
    });
    setPresetModalOpen(true);
  };

  const handleSavePresetModal = async () => {
    if (!presetForm.title?.trim()) {
      toast.error("يرجى إدخال عنوان التجميعة");
      return;
    }

    // Strict English slug validation
    const rawSlug = (presetForm.slug || "").trim().toLowerCase();
    if (!rawSlug) {
      toast.error("يرجى إدخال معرّف الرابط (Slug) الإنجليزي للتجميعة");
      return;
    }

    if (!/^[a-z0-9-_]+$/.test(rawSlug)) {
      toast.error("يجب أن يتكون الرابط (Slug) من أحرف إنجليزية وأرقام وعلامات (-) فقط وبدون مسافات أو لغة عربية، مثل: am4-budget");
      return;
    }

    // Check duplicate slug among other presets
    const duplicate = presets.find(
      (p, idx) => idx !== editingPresetIndex && (p.slug?.toLowerCase() === rawSlug || p.id === rawSlug)
    );
    if (duplicate) {
      toast.error(`معرّف الرابط (Slug) "${rawSlug}" مستخدم بالفعل لتجميعة "${duplicate.title}"، يرجى اختيار رابط فريد`);
      return;
    }

    const updated = [...presets];
    const isEditing = editingPresetIndex !== null;
    const currentCat = categories.find((c) => c.id === presetForm.category);
    const categoryLabel = currentCat?.label || presetForm.categoryLabel || "تجميعة مخصصة";

    if (isEditing) {
      updated[editingPresetIndex!] = {
        ...updated[editingPresetIndex!],
        ...presetForm,
        slug: rawSlug,
        categoryLabel,
      } as BuilderPreset;
    } else {
      const newPreset: BuilderPreset = {
        id: presetForm.id || `preset-${Date.now()}`,
        slug: rawSlug,
        title: presetForm.title!,
        category: presetForm.category || (categories.find(c => c.id !== 'all')?.id || "pc"),
        categoryLabel,
        badge: presetForm.badge,
        discountPercentage: Number(presetForm.discountPercentage) || 0,
        showcaseImage: presetForm.showcaseImage || "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=700&auto=format&fit=crop&q=80",
        description: presetForm.description || "",
        steps: presetForm.steps || [],
      };
      updated.push(newPreset);
      setActivePresetIndex(updated.length - 1);
    }

    setPresetModalOpen(false);
    await persistPresets(
      updated,
      isEditing ? "تم تعديل وحفظ التجميعة بنجاح ✓" : "تمت إضافة وحفظ التجميعة بنجاح ✓"
    );
  };

  const handleDeletePreset = async (index: number) => {
    if (presets.length <= 1) {
      toast.error("يجب الإبقاء على تجميعة واحدة على الأقل في المتجر");
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف تجميعة "${presets[index].title}"؟`)) return;

    const updated = presets.filter((_, i) => i !== index);
    setActivePresetIndex(0);
    await persistPresets(updated, "تم حذف التجميعة وحفظ التغيير في Firebase ✓");
  };

  const handleDuplicatePreset = async (index: number) => {
    const target = presets[index];
    const copy: BuilderPreset = {
      ...JSON.parse(JSON.stringify(target)),
      id: `${target.id}-copy-${Date.now()}`,
      title: `${target.title} (نسخة)`,
    };
    const updated = [...presets, copy];
    setActivePresetIndex(updated.length - 1);
    await persistPresets(updated, "تم نسخ التجميعة وحفظها في Firebase ✓");
  };

  // ── Step Actions ────────────────────────────────────────────────────────────
  const openNewStepModal = () => {
    setEditingStepIndex(null);
    setStepForm({
      id: `step-${Date.now()}`,
      name: "",
      nameEn: "",
      category: storeCategories[0] || "",
      subcategory: "",
      required: true,
      options: [],
    });
    setStepModalOpen(true);
  };

  const openEditStepModal = (stepIndex: number) => {
    setEditingStepIndex(stepIndex);
    const step = currentPreset.steps[stepIndex];
    setStepForm({ ...step });
    setStepModalOpen(true);
  };

  const handleSaveStepModal = async () => {
    if (!stepForm.name?.trim()) {
      toast.error("يرجى إدخال اسم الخطوة (مثلاً: المعالج، اللوحة الأم)");
      return;
    }

    const updatedPreset = { ...currentPreset };
    const updatedSteps = [...updatedPreset.steps];
    const isEditing = editingStepIndex !== null;

    if (isEditing) {
      updatedSteps[editingStepIndex!] = {
        ...updatedSteps[editingStepIndex!],
        ...stepForm,
      } as BuilderStep;
    } else {
      const newStep: BuilderStep = {
        id: stepForm.id || `step-${Date.now()}`,
        name: stepForm.name!,
        nameEn: stepForm.nameEn || "",
        category: stepForm.category || "",
        subcategory: stepForm.subcategory || "",
        required: stepForm.required ?? true,
        options: [],
      };
      updatedSteps.push(newStep);
    }

    updatedPreset.steps = updatedSteps;
    const updatedPresets = [...presets];
    updatedPresets[activePresetIndex] = updatedPreset;

    setStepModalOpen(false);
    await persistPresets(
      updatedPresets,
      isEditing ? "تم تعديل وحفظ الخطوة في Firebase بنجاح ✓" : "تمت إضافة وحفظ الخطوة في Firebase بنجاح ✓"
    );
  };

  const handleDeleteStep = async (stepIndex: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الخطوة بكافة خياراتها؟")) return;

    const updatedPreset = { ...currentPreset };
    updatedPreset.steps = updatedPreset.steps.filter((_, i) => i !== stepIndex);

    const updatedPresets = [...presets];
    updatedPresets[activePresetIndex] = updatedPreset;

    await persistPresets(updatedPresets, "تم حذف الخطوة وحفظ التغيير في Firebase ✓");
  };

  const handleMoveStep = async (stepIndex: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? stepIndex - 1 : stepIndex + 1;
    if (newIndex < 0 || newIndex >= currentPreset.steps.length) return;

    const updatedSteps = [...currentPreset.steps];
    const temp = updatedSteps[stepIndex];
    updatedSteps[stepIndex] = updatedSteps[newIndex];
    updatedSteps[newIndex] = temp;

    const updatedPreset = { ...currentPreset, steps: updatedSteps };
    const updatedPresets = [...presets];
    updatedPresets[activePresetIndex] = updatedPreset;

    await persistPresets(updatedPresets, "تم تحديث ترتيب الخطوات في Firebase ✓");
  };

  // ── Option / Product Selection Actions ──────────────────────────────────────
  // Filter products specifically matching the active step's category & subcategory
  const activeStepForModal = targetStepIndex !== null ? currentPreset?.steps[targetStepIndex] : null;

  const matchingProductsForStep = useMemo(() => {
    if (!activeStepForModal) return [];

    const stepCat = activeStepForModal.category?.trim().toLowerCase();
    const stepSub = activeStepForModal.subcategory?.trim().toLowerCase();

    return products.filter((p) => {
      if (p.isArchived) return false;

      // Match Category
      if (stepCat && stepCat !== "all") {
        const prodCat = p.category?.trim().toLowerCase();
        if (prodCat !== stepCat) return false;
      }

      // Match Subcategory if specified on the step
      if (stepSub && stepSub !== "all") {
        const prodSub = p.subcategory?.trim().toLowerCase();
        if (prodSub !== stepSub) return false;
      }

      // Match search query inside the modal
      if (productSearchQuery.trim()) {
        const q = productSearchQuery.trim().toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesBrand = p.brand?.toLowerCase().includes(q);
        return matchesName || matchesBrand;
      }

      return true;
    });
  }, [activeStepForModal, products, productSearchQuery]);

  const openAddOptionModal = (stepIndex: number) => {
    setTargetStepIndex(stepIndex);
    setEditingOptionIndex(null);
    setProductSearchQuery("");
    setSelectedProductItem(null);
    setCustomBundlePrice(0);
    setPriceDelta(0);
    setOptionModalOpen(true);
  };

  const openEditOptionModal = (stepIndex: number, optionIndex: number) => {
    setTargetStepIndex(stepIndex);
    setEditingOptionIndex(optionIndex);
    setProductSearchQuery("");

    const existingOpt = currentPreset.steps[stepIndex].options[optionIndex];
    const realProduct = products.find((p) => p.id === existingOpt.productId) || {
      id: existingOpt.productId || existingOpt.id,
      name: existingOpt.name,
      brand: existingOpt.brand,
      price: existingOpt.originalPrice || existingOpt.price,
      images: [existingOpt.image],
      description: existingOpt.specs,
    };

    setSelectedProductItem(realProduct);
    setCustomBundlePrice(existingOpt.price);
    setPriceDelta(existingOpt.priceDelta || 0);
    setOptionModalOpen(true);
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProductItem(product);
    setCustomBundlePrice(product.price || 0);
  };

  const handleSaveOption = async () => {
    if (targetStepIndex === null || !selectedProductItem) {
      toast.error("يرجى اختيار منتج أولاً");
      return;
    }

    const updatedPreset = { ...currentPreset };
    const step = updatedPreset.steps[targetStepIndex];
    const updatedOptions = [...step.options];
    const isEditing = editingOptionIndex !== null;

    const newOption: BuilderOption = {
      id: isEditing ? updatedOptions[editingOptionIndex!].id : `opt-${Date.now()}`,
      productId: selectedProductItem.id,
      name: selectedProductItem.name,
      brand: selectedProductItem.brand || "",
      image: selectedProductItem.images?.[0] || "/placeholder.png",
      originalPrice: selectedProductItem.price || 0, // Keeps the original single-purchase store price!
      price: Number(customBundlePrice) > 0 ? Number(customBundlePrice) : Number(selectedProductItem.price || 0), // Bundle price
      priceDelta: Number(priceDelta) || 0,
      specs: selectedProductItem.subcategory ? `${selectedProductItem.category} - ${selectedProductItem.subcategory}` : (selectedProductItem.brand || ""),
      quantity: 1,
      inStock: true,
    };

    if (isEditing) {
      updatedOptions[editingOptionIndex!] = newOption;
    } else {
      updatedOptions.push(newOption);
      if (updatedOptions.length === 1) {
        step.defaultOptionId = newOption.id;
      }
    }

    step.options = updatedOptions;
    const updatedPresets = [...presets];
    updatedPresets[activePresetIndex] = updatedPreset;

    setOptionModalOpen(false);
    await persistPresets(
      updatedPresets,
      isEditing ? "تم تعديل وحفظ القطعة في Firebase بنجاح ✓" : "تمت إضافة وحفظ القطعة في Firebase بنجاح ✓"
    );
  };

  const handleDeleteOption = async (stepIndex: number, optionIndex: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج من التجميعة؟")) return;

    const updatedPreset = { ...currentPreset };
    const step = updatedPreset.steps[stepIndex];
    const deletedOptId = step.options[optionIndex]?.id;

    step.options = step.options.filter((_, i) => i !== optionIndex);
    if (step.defaultOptionId === deletedOptId) {
      step.defaultOptionId = step.options[0]?.id || undefined;
    }

    const updatedPresets = [...presets];
    updatedPresets[activePresetIndex] = updatedPreset;

    await persistPresets(updatedPresets, "تم حذف القطعة وحفظ التغيير في Firebase ✓");
  };

  const handleSetDefaultOption = async (stepIndex: number, optionId: string) => {
    const updatedPreset = { ...currentPreset };
    updatedPreset.steps[stepIndex].defaultOptionId = optionId;

    const updatedPresets = [...presets];
    updatedPresets[activePresetIndex] = updatedPreset;

    await persistPresets(updatedPresets, "تم تعيين الخيار الافتراضي وحفظه في Firebase ✓");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500 font-bold">
          <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>جاري تحميل التجميعات والمنتجات من Firebase...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-gray-900" dir="rtl">
      <Helmet>
        <title>إدارة قسم التجميعات المخصصة | لوحة التحكم</title>
      </Helmet>

      {/* ── Top Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                    إدارة قسم "ابني تجميعتك" (Builder)
                  </h1>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-md border border-emerald-200">
                    متزامن مع Firebase ✓
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  الاعتماد المباشر على جدول المنتجات (Product Table) مع تسعير مخصص داخل كل تجميعة
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center flex-wrap gap-2">
              <Link
                to="/builder"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition"
              >
                <ExternalLink className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">معاينة المتجر</span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-xs text-gray-500 gap-1 h-10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>لوحة التحكم</span>
              </Button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="container mx-auto px-4 py-8">

        {/* ── Presets Grid ── */}
        <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                التجميعات المحفوظة في Firebase ({presets.length})
              </h2>
            </div>

            <Button
              onClick={openNewPresetModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تجميعة جديدة</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {presets.map((preset, idx) => {
              const isSelected = idx === activePresetIndex;
              return (
                <div
                  key={preset.id}
                  onClick={() => setActivePresetIndex(idx)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                    ? "border-blue-600 bg-blue-50/20 shadow-md ring-1 ring-blue-600/30"
                    : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                >
                  <div className="relative h-28 rounded-lg overflow-hidden mb-3 bg-gray-100">
                    <img
                      src={preset.showcaseImage}
                      alt={preset.title}
                      className="w-full h-full object-cover"
                    />
                    {preset.badge && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                        {preset.badge}
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {preset.steps?.length || 0} خطوات
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-gray-900 line-clamp-1">
                        {preset.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[11px] text-gray-400 font-medium">
                          {preset.categoryLabel}
                        </span>
                        <span className="text-gray-300">•</span>
                        <a
                          href={`/builder/${preset.slug || preset.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100"
                          title="فتح صفحة التجميعة في نافذة جديدة"
                        >
                          <span>/{preset.slug || preset.id}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="p-1 bg-blue-600 text-white rounded-full shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Preset Controls */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPresetModal(idx);
                      }}
                      className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-md transition"
                      title="تعديل بيانات التجميعة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicatePreset(idx);
                      }}
                      className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-md transition"
                      title="تكرار / نسخ التجميعة"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(idx);
                      }}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition"
                      title="حذف التجميعة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Active Preset Steps & Options Workspace ── */}
        {currentPreset && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">

            {/* Header of Active Preset */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900">
                    مكونات وخطوات تجميعة: {currentPreset.title}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                    {currentPreset.steps.length} خطوات
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  حدد فئة وفئة فرعية لكل خطوة، ثم اضغط "إضافة قطعة" لاختيار المنتجات المناسبة وتحديد سعر التجميعة الخاص بها
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={openNewStepModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-9"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة خطوة  </span>
                </Button>
              </div>
            </div>

            {/* Steps List */}
            <div className="space-y-6 mt-6">
              {currentPreset.steps.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-500">لا توجد خطوات في هذه التجميعة حتى الآن</p>
                  <p className="text-xs text-gray-400 mt-1">اضغط "إضافة خطوة جديدة" لإضافة مكونات مثل اللوحة الأم، المعالج، إلخ</p>
                  <Button onClick={openNewStepModal} className="mt-4 text-xs font-bold bg-blue-600 text-white">
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة خطوة أولى
                  </Button>
                </div>
              ) : (
                currentPreset.steps.map((step, sIdx) => {
                  return (
                    <div
                      key={step.id}
                      className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-gray-50/50 hover:bg-white transition"
                    >
                      {/* Step Header Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                            {sIdx + 1}
                          </span>

                          <h3 className="text-base font-bold text-gray-900">
                            {step.name} {step.nameEn ? `(${step.nameEn})` : ""}
                          </h3>

                          {step.required ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                              مطلوب
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                              اختياري
                            </span>
                          )}

                          {/* Filtered Category & Subcategory Badges */}
                          {step.category && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                              <Filter className="w-3 h-3" />
                              فئة: {getCategoryNameFromSlug(step.category)}
                              {step.subcategory ? ` / ${step.subcategory}` : " (الكل)"}
                            </span>
                          )}

                          <span className="text-xs text-gray-400">
                            • {step.options.length} قطع مضافة
                          </span>
                        </div>

                        {/* Step Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleMoveStep(sIdx, "up")}
                            disabled={sIdx === 0}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
                            title="تحريك لأعلى"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveStep(sIdx, "down")}
                            disabled={sIdx === currentPreset.steps.length - 1}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
                            title="تحريك لأسفل"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditStepModal(sIdx)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            title="تعديل الخطوة والفئة"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStep(sIdx)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="حذف الخطوة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <Button
                            size="sm"
                            onClick={() => openAddOptionModal(sIdx)}
                            className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white mr-2 h-8"
                          >
                            <Plus className="w-3.5 h-3.5 ml-1" />
                            إضافة قطعة
                          </Button>
                        </div>
                      </div>

                      {/* Options Grid for this Step */}
                      {step.options.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-xs border border-dashed rounded-lg bg-white">
                          لا توجد قطع مضافة في هذه الخطوة. اضغط "إضافة قطعة من جدول المنتجات" للاختيار من منتجات{" "}
                          <span className="font-bold text-gray-700">
                            {step.category ? `${getCategoryNameFromSlug(step.category)} ${step.subcategory || ""}` : "المتجر"}
                          </span>.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {step.options.map((opt, oIdx) => {
                            const isDefault = step.defaultOptionId === opt.id;
                            const hasBundleDiscount = opt.originalPrice && opt.originalPrice > opt.price;

                            return (
                              <div
                                key={opt.id}
                                className={`flex flex-col justify-between p-3.5 rounded-xl border bg-white relative transition shadow-xs ${isDefault ? "border-blue-500 ring-1 ring-blue-500/20" : "border-gray-200"
                                  }`}
                              >
                                <div className="flex items-start gap-3 mb-2">
                                  <img
                                    src={opt.image}
                                    alt={opt.name}
                                    className="w-16 h-16 object-contain rounded-lg bg-gray-50 p-1 shrink-0 border"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      {opt.brand && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                          {opt.brand}
                                        </span>
                                      )}
                                      {isDefault && (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          الافتراضي ✓
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-xs font-bold text-gray-900 line-clamp-2" title={opt.name}>
                                      {opt.name}
                                    </h4>
                                  </div>
                                </div>

                                {/* Prices row */}
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                  <div>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-xs font-black text-blue-700">
                                        {opt.price?.toLocaleString()} ج.م
                                      </span>
                                      <span className="text-[10px] text-gray-500 font-medium">داخل التجميعة</span>
                                    </div>

                                    {opt.originalPrice && opt.originalPrice !== opt.price && (
                                      <div className="text-[10px] text-gray-400">
                                        السعر المنفرد: <span className="line-through">{opt.originalPrice?.toLocaleString()} ج.م</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {!isDefault && (
                                      <button
                                        onClick={() => handleSetDefaultOption(sIdx, opt.id)}
                                        className="text-[10px] text-gray-500 hover:text-blue-600 font-bold px-1.5 py-0.5 rounded hover:bg-gray-100"
                                        title="تعيين كخيار افتراضي للخطوة"
                                      >
                                        اجعله افتراضي
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openEditOptionModal(sIdx, oIdx)}
                                      className="p-1 hover:bg-gray-100 text-gray-600 rounded"
                                      title="تعديل السعر أو بيانات القطعة"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOption(sIdx, oIdx)}
                                      className="p-1 hover:bg-red-50 text-red-600 rounded"
                                      title="حذف القطعة من الخطوة"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </main>

      {/* ── 1. Preset Modal ── */}
      <Dialog open={presetModalOpen} onOpenChange={setPresetModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg text-right font-sans max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl p-5 sm:p-6 my-auto shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingPresetIndex !== null ? "تعديل التجميعة" : "إضافة تجميعة جديدة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">اسم / عنوان التجميعة:</label>
              <Input
                value={presetForm.title || ""}
                onChange={(e) => setPresetForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="مثلاً: AM4 Budget أو تجميعة الجيل 14 إنتل"
              />
            </div>

            {/* Slug Field (Mandatory English URL Slug) */}
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/80">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <span>معرّف الرابط (Slug بالإنجليزية)</span>
                  <span className="text-red-500 font-black">*</span>
                </label>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                  إجباري باللغة الإنجليزية فقط
                </span>
              </div>
              <div className="relative flex items-center">
                <Input
                  dir="ltr"
                  value={presetForm.slug || ""}
                  onChange={(e) => {
                    // Force lowercase, remove any spaces (replace with hyphen), keep only [a-z0-9-_]
                    const clean = e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-_]/g, "");
                    setPresetForm((p) => ({ ...p, slug: clean }));
                  }}
                  placeholder="e.g. am4-budget or rtx-4070-super"
                  className="text-left font-mono text-xs pl-3 pr-24 bg-white border-blue-200 focus:border-blue-500 h-9"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (presetForm.title) {
                      const auto = presetForm.title
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, "")
                        .trim()
                        .replace(/\s+/g, "-");
                      if (auto) {
                        setPresetForm((p) => ({ ...p, slug: auto }));
                      } else {
                        setPresetForm((p) => ({ ...p, slug: `build-${Date.now().toString().slice(-4)}` }));
                      }
                    } else {
                      setPresetForm((p) => ({ ...p, slug: `build-${Date.now().toString().slice(-4)}` }));
                    }
                  }}
                  className="absolute right-1.5 top-1 bottom-1 px-2.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold rounded-md flex items-center gap-1 transition"
                  title="توليد تلقائي بالإنجليزية من العنوان"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>توليد</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500">
                <span className="text-gray-400">معاينة رابط التجميعة:</span>
                <span className="font-mono font-bold text-blue-600 dir-ltr">
                  /builder/{presetForm.slug || "..."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">التصنيف الرئيسي:</label>
                  <button
                    type="button"
                    onClick={() => setCategoryManagerOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>إدارة التصنيفات</span>
                  </button>
                </div>
                <select
                  value={presetForm.category || (categories.find((c) => c.id !== "all")?.id || "pc")}
                  onChange={(e) => {
                    const cat = e.target.value;
                    const catLabel = categories.find((c) => c.id === cat)?.label || "تجميعة";
                    setPresetForm((p) => ({ ...p, category: cat, categoryLabel: catLabel }));
                  }}
                  className="w-full text-xs h-10 px-3 border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-500 transition"
                >
                  {categories
                    .filter((c) => c.id !== "all")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">بادج الخصم / العرض:</label>
                <Input
                  value={presetForm.badge || ""}
                  onChange={(e) => setPresetForm((p) => ({ ...p, badge: e.target.value }))}
                  placeholder="مثلاً: 6% OFF أو تجميعة الوحش ⚡"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">نسبة الخصم الإجمالية (%):</label>
              <Input
                type="number"
                value={presetForm.discountPercentage ?? 0}
                onChange={(e) => setPresetForm((p) => ({ ...p, discountPercentage: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">رابط صورة الغلاف الرئيسية:</label>
              <Input
                value={presetForm.showcaseImage || ""}
                onChange={(e) => setPresetForm((p) => ({ ...p, showcaseImage: e.target.value }))}
                placeholder="https://..."
              />
              {presetForm.showcaseImage && (
                <img
                  src={presetForm.showcaseImage}
                  alt="Preview"
                  className="w-full h-24 object-cover rounded-md mt-2 border"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">وصف مختصر:</label>
              <Input
                value={presetForm.description || ""}
                onChange={(e) => setPresetForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="تجميعة مميزة للألعاب والمونتاج..."
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setPresetModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSavePresetModal} className="bg-blue-600 text-white font-bold">
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Manager Modal ── */}
      <Dialog open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md text-right font-sans max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl p-5 my-auto shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>إدارة خيارات التصنيف الرئيسي</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add New Category Form */}
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-gray-700">إضافة تصنيف جديد:</label>
              <div className="flex gap-2">
                <Input
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  placeholder="مثال: 🎮 تجميعات قيمنق، 💻 لابتوبات"
                  className="text-xs bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddCategory}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 ml-1" />
                  <span>إضافة</span>
                </Button>
              </div>
            </div>

            {/* List of current categories */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                التصنيفات المتاحة ({categories.filter((c) => c.id !== "all").length}):
              </label>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {categories
                  .filter((c) => c.id !== "all")
                  .map((cat) => {
                    const isEditing = editingCatId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className="p-2.5 flex items-center justify-between gap-2 hover:bg-gray-50/80 transition"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingCatLabel}
                              onChange={(e) => setEditingCatLabel(e.target.value)}
                              className="text-xs h-8 bg-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleUpdateCategory(cat.id);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleUpdateCategory(cat.id)}
                              className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              حفظ
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCatId(null);
                                setEditingCatLabel("");
                              }}
                              className="h-8 px-2 text-xs text-gray-500"
                            >
                              إلغاء
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                              <span className="text-xs font-bold text-gray-800 truncate">
                                {cat.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatId(cat.id);
                                  setEditingCatLabel(cat.label);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="تعديل اسم التصنيف"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.label)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="حذف التصنيف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-gray-100">
            <Button
              type="button"
              onClick={() => setCategoryManagerOpen(false)}
              className="w-full bg-slate-900 text-white font-bold text-xs"
            >
              تم الانتهاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 2. Step Modal (With Category and Subcategory) ── */}
      <Dialog open={stepModalOpen} onOpenChange={setStepModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg text-right font-sans max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl p-5 sm:p-6 my-auto shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingStepIndex !== null ? "تعديل الخطوة والفئة" : "إضافة خطوة جديدة للتجميعة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">اسم الخطوة بالعربي:</label>
              <Input
                value={stepForm.name || ""}
                onChange={(e) => setStepForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="مثلاً: المعالج، اللوحة الأم، كرت الشاشة، الرامات..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">الاسم بالإنجليزي (اختياري):</label>
              <Input
                value={stepForm.nameEn || ""}
                onChange={(e) => setStepForm((s) => ({ ...s, nameEn: e.target.value }))}
                placeholder="مثلاً: CPU، Mother Board، VGA..."
              />
            </div>

            {/* Category selection */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>ربط الخطوة بمنتجات المتجر:</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  1. اختيار الفئة (Category) من جدول المنتجات:
                </label>
                <select
                  value={stepForm.category || ""}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setStepForm((s) => ({ ...s, category: cat, subcategory: "" }));
                  }}
                  className="w-full text-xs h-10 px-3 border border-gray-200 rounded-md bg-white outline-none focus:border-blue-500 font-bold"
                >
                  <option value="">-- اختر الفئة من المتجر --</option>
                  {storeCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryNameFromSlug(cat)} ({cat})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  2. اختيار الفئة الفرعية (Subcategory) - اختياري:
                </label>
                <select
                  value={stepForm.subcategory || ""}
                  onChange={(e) => setStepForm((s) => ({ ...s, subcategory: e.target.value }))}
                  disabled={!stepForm.category}
                  className="w-full text-xs h-10 px-3 border border-gray-200 rounded-md bg-white outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-60"
                >
                  <option value="">جميع الفئات الفرعية (الكل)</option>
                  {stepAvailableSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  عند إضافة قطع في هذه الخطوة، سيظهر لك فقط المنتجات التابعة للفئة والفئة الفرعية المحددة هنا.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="text-xs font-bold text-gray-700">نوع الخطوة:</label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold">
                <input
                  type="radio"
                  name="stepRequired"
                  checked={stepForm.required === true}
                  onChange={() => setStepForm((s) => ({ ...s, required: true }))}
                />
                <span>مطلوب (إجباري في التجميعة)</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="stepRequired"
                  checked={stepForm.required === false}
                  onChange={() => setStepForm((s) => ({ ...s, required: false }))}
                />
                <span>اختياري</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStepModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveStepModal} className="bg-blue-600 text-white font-bold">
              حفظ الخطوة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 3. Option / Product Picker & Pricing Modal ── */}
      <Dialog open={optionModalOpen} onOpenChange={setOptionModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl text-right font-sans max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl p-4 sm:p-6 my-auto shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center justify-between">
              <span>
                {editingOptionIndex !== null ? "تعديل سعر وبيانات القطعة" : "إضافة قطعة من جدول المنتجات"}
              </span>

              {activeStepForModal && (
                <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                  خطوة: {activeStepForModal.name}
                  {activeStepForModal.category && ` (${getCategoryNameFromSlug(activeStepForModal.category)}${activeStepForModal.subcategory ? ` / ${activeStepForModal.subcategory}` : ""})`}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step 1: Select Product from filtered products list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>اختر المنتج من قائمة منتجات الفئة ({matchingProductsForStep.length} منتجات متطابقة):</span>
                </label>
              </div>

              {/* Search within matched products */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                <Input
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو الماركة داخل هذه الفئة..."
                  className="pr-9 text-xs"
                />
              </div>

              {/* Matched Products List */}
              <div className="max-h-56 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                {matchingProductsForStep.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400">
                    لا توجد منتجات مسجلة في المتجر تحت هذه الفئة/الفئة الفرعية.
                    <br />
                    يمكنك إضافة منتجات من صفحة <Link to="/admin" target="_blank" className="text-blue-600 underline font-bold">إدارة المنتجات</Link> أولاً.
                  </div>
                ) : (
                  matchingProductsForStep.map((prod) => {
                    const isSelected = selectedProductItem?.id === prod.id;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod)}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border cursor-pointer transition ${isSelected
                          ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50/50"
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={prod.images?.[0] || "/placeholder.png"}
                            alt={prod.name}
                            className="w-11 h-11 object-contain rounded-lg bg-white border shrink-0 p-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-relaxed break-words" title={prod.name}>
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              {prod.brand && (
                                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {prod.brand}
                                </span>
                              )}
                              <span className="text-xs font-black text-blue-600">
                                {prod.price?.toLocaleString()} ج.م
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          {isSelected ? (
                            <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs">
                              محدد ✓
                            </span>
                          ) : (
                            <span className="text-xs text-blue-600 font-bold px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition">
                              اختيار ↵
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 2: Configure Pricing for this Product in the bundle */}
            {selectedProductItem && (
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-blue-100">
                  <img
                    src={selectedProductItem.images?.[0] || "/placeholder.png"}
                    alt={selectedProductItem.name}
                    className="w-12 h-12 object-contain rounded-lg bg-white border p-1 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-gray-900 line-clamp-2 leading-relaxed break-words">
                      {selectedProductItem.name}
                    </h4>
                    <div className="text-xs text-gray-500 mt-1">
                      السعر الأساسي في المتجر عند الشراء المنفرد:{" "}
                      <span className="font-bold text-gray-800">
                        {selectedProductItem.price?.toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      سعر القطعة داخل هذه التجميعة (Bundle Price):
                    </label>
                    <Input
                      type="number"
                      value={customBundlePrice || ""}
                      onChange={(e) => setCustomBundlePrice(Number(e.target.value))}
                      placeholder={selectedProductItem.price?.toString() || "0"}
                      className="font-bold text-sm bg-white"
                    />
                    <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                      💡 يمكنك تخفيض السعر هنا ليكون خاصاً بالتجميعة فقط، ولن يتغير سعره الأساسي في المتجر.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      فارق السعر مقارنة بالخيار الأساسي (اختياري):
                    </label>
                    <Input
                      type="number"
                      value={priceDelta || 0}
                      onChange={(e) => setPriceDelta(Number(e.target.value))}
                      placeholder="0 أو -500 أو +1000"
                      className="bg-white"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      (اتركه 0 إذا كان هذا هو الخيار الأساسي للخطوة)
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setOptionModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSaveOption}
              disabled={!selectedProductItem}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
            >
              تأكيد إضافة القطعة للتجميعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
