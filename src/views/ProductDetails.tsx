'use client';

import { useParams } from "@/lib/router-shim";
import { useNavigate } from "react-router-dom";
import { usePathname } from 'next/navigation';
import { copyToClipboard } from '@/utils/clipboard';
import { SEOHelmet } from "@/components/SEOHelmet";
import seoData from "@/constants/seo.json";
import {
  buildProductSeoTitle,
  buildProductSeoDescription,
  buildProductKeywords,
  extractProductKeySpecs,
} from "@/utils/productSeo";
import { useStore } from "@/store/useStore";
import { Product, ProductSize, ProductAddon } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";
import { ProductModal } from "@/components/ProductModal";
import { ProductOptions, CheckoutFormData } from "@/components/ProductOptions";
import { useAuth } from "@/contexts/AuthContext";
import { createOrderAndUpdateProductQuantitiesAtomically, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { checkOrderSpam } from '@/lib/spamProtection';
import { generateOrderTrackingCode, saveTrackedOrder } from '@/utils/orderTracking';
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { analytics } from "@/lib/analytics";
import { trackMetaViewContent } from "@/lib/metaPixel";
import { Button } from "@/components/ui/button";
import { extractProductId, getProductUrl, generateSlug, slugifySupplier, getVideoEmbedUrl, getVideoThumbnailUrl, getVideoMeta, type VideoMeta } from "@/utils/url";
import { getCategorySlugFromName, getCategoryNameFromSlug } from "@/utils/category";
import { getActiveSuppliers, CachedSupplier } from "@/lib/suppliersCache";
import { DEFAULT_BAZAR_SUPPLIER } from "@/constants/store";
import {
  ShoppingCart,
  Share2,
  X,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Package,
  Battery,
  HardDrive,
  Clock,
  CheckCircle,
  Monitor,
  Cpu,
  CircuitBoard,
  Play,
  Info,
  ShieldCheck,
  Film,
  Settings2,
  ClipboardCopy,
  MessageCircle,
  Phone,
  FileText,
  GitCompare,
  Check,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { formatCurrency } from "@/utils/format";
import { commonColors, getColorByName } from "@/constants/colors";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createPortal } from "react-dom";
import { SpecsDisplay } from "@/components/SpecsDisplay";
import { STORE_GOVERNORATES } from '@/constants/store';
import { CountdownBadge } from "@/components/CountdownBadge";
import ReservationSuccessModal from "@/components/ReservationSuccessModal";
import OrderSuccessModal from "@/components/OrderSuccessModal";
import { useCompareStore } from "@/store/useCompareStore";


interface ProductDetailsProps {
  initialProduct?: Product | null;
}

const ProductDetails = ({ initialProduct }: ProductDetailsProps) => {
  // Next.js catch-all route returns { slug: ['category', 'subcategory', 'name'] }
  // React Router returns { category, subcategory, id } named params
  const rawParams = useParams<{ id?: string; category?: string; subcategory?: string; slug?: string[] }>();
  const slugArr = rawParams.slug as string[] | undefined;

  // Map Next.js route params → product ID / slug
  const rawId = rawParams.id || rawParams.subcategory || (slugArr ? slugArr[slugArr.length - 1] : undefined);
  const id = rawId ? (() => { try { return decodeURIComponent(rawId); } catch { return rawId; } })() : undefined;
  const categoryParam = rawParams.category || (slugArr ? slugArr[0] : undefined);
  const subcategoryParam = rawParams.subcategory || (slugArr && slugArr.length >= 3 ? slugArr[1] : undefined);

  const decodedSubcategoryParam = subcategoryParam ? decodeURIComponent(subcategoryParam) : undefined;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const compareList = useCompareStore((s) => s.compareList);
  const isCompareOpen = useCompareStore((s) => s.isCompareOpen);
  const addToCompare = useCompareStore((s) => s.addToCompare);
  const removeFromCompare = useCompareStore((s) => s.removeFromCompare);
  const isInCompare = useCompareStore((s) => s.isInCompare);
  const clearCompare = useCompareStore((s) => s.clearCompare);
  const [showCompareConfirm, setShowCompareConfirm] = useState(false);
  const [showShippingPolicy, setShowShippingPolicy] = useState(false);
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [selectedOptionGroups, setSelectedOptionGroups] = useState<any[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [finalPrice, setFinalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [isPurchaseVisible, setIsPurchaseVisible] = useState(false);
  const [isSpecsVisible, setIsSpecsVisible] = useState(false);
  const [isBuyButtonManuallyHidden, setIsBuyButtonManuallyHidden] = useState(false);
  const [isSpecsButtonManuallyHidden, setIsSpecsButtonManuallyHidden] = useState(false);

  const [viewsCount, setViewsCount] = useState<number>(0);
  const [showViews, setShowViews] = useState<boolean>(false);

  // Order Success Modal State
  const [orderSuccess, setOrderSuccess] = useState<{
    isOpen: boolean;
    orderCode?: string;
    type: 'online' | 'reservation';
    governorate?: string;
    whatsappUrl: string;
    totalAmount?: number;
    supplierName?: string;
    supplierLogo?: string;
    items?: any[];
    reservationInfo?: {
      fullName: string;
      phoneNumber: string;
      appointmentDate: string;
      appointmentTime: string;
      notes?: string;
    } | null;
    deliveryInfo?: {
      fullName: string;
      phoneNumber: string;
      address: string;
      city: string;
      notes?: string;
    } | null;
  }>({
    isOpen: false,
    type: 'online',
    whatsappUrl: '',
    deliveryInfo: null
  });

  // Special Offer Countdown State
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const [hasAnyModalOpen, setHasAnyModalOpen] = useState(false);

  useEffect(() => {
    const checkModal = () => {
      const modalElements = document.querySelectorAll('[role="dialog"], [data-state="open"]');
      setHasAnyModalOpen(
        modalElements.length > 0 ||
        isCompareOpen ||
        orderSuccess.isOpen ||
        modalOpen ||
        isBatteryModalOpen ||
        showShippingPolicy ||
        showCompareConfirm
      );
    };

    checkModal();
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => observer.disconnect();
  }, [isCompareOpen, orderSuccess.isOpen, modalOpen, isBatteryModalOpen, showShippingPolicy, showCompareConfirm]);

  const products = useStore((state) => state.products);
  const loading = useStore((state) => state.loading);
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartItemQuantity = useStore(
    (state) => state.updateCartItemQuantity
  );
  const getCartTotal = useStore((state) => state.getCartTotal);
  const getCartItemPrice = useStore((state) => state.getCartItemPrice);
  const updateProductQuantity = useStore((state) => state.updateProductQuantity);

  // Find current product
  const actualId = extractProductId(id);
  const rawActualId = rawId ? extractProductId(rawId) : undefined;
  const normTarget = id ? id.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '') : '';
  const product = products.find((p) =>
    p.id === id ||
    p.id === rawId ||
    p.id === actualId ||
    p.id === rawActualId ||
    generateSlug(p.name) === id ||
    generateSlug(p.name) === rawId ||
    generateSlug(p.name) === actualId ||
    (p as any).slug === id ||
    (p as any).slug === rawId ||
    (p as any).slug === actualId ||
    ((p as any).slug && generateSlug((p as any).slug) === id) ||
    ((p as any).slug && generateSlug((p as any).slug) === rawId) ||
    ((p as any).slug && generateSlug((p as any).slug) === actualId) ||
    (normTarget && (p as any).slug && String((p as any).slug).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '') === normTarget) ||
    (normTarget && (p.name || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '') === normTarget) ||
    (normTarget && (p.id || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '') === normTarget)
  ) || initialProduct;

  // Smoothly normalize and update browser URL to canonical slug if accessed via raw ID or old name slug
  useEffect(() => {
    if (!product || typeof window === 'undefined') return;
    const currentCanonicalPath = getProductUrl(product);
    if (window.location.pathname.startsWith('/product/') && window.location.pathname !== currentCanonicalPath) {
      window.history.replaceState(null, '', currentCanonicalPath + window.location.search);
    }
  }, [product]);

  // Track active suppliers to know if product's merchant is currently archived
  const [activeSuppliersList, setActiveSuppliersList] = useState<CachedSupplier[]>([]);

  useEffect(() => {
    getActiveSuppliers().then(list => {
      if (Array.isArray(list)) setActiveSuppliersList(list);
    }).catch(() => { });
  }, []);

  // Determine effective supplier: if original merchant is archived or product transferred, display "bazar fashion"
  const effectiveSupplier = useMemo(() => {
    const rawWholesale = product?.wholesaleInfo;
    const rawName = (rawWholesale?.supplierName || '').trim();
    if (!rawName) return null;

    const isBazarDirect =
      rawName.toLowerCase() === 'bazar fashion' ||
      rawName === 'بازار للموضه' ||
      rawName.toLowerCase() === 'bazar' ||
      (product as any)?.transferredToBazarDueToArchive === true;

    if (isBazarDirect) {
      return {
        name: DEFAULT_BAZAR_SUPPLIER.name,
        slug: DEFAULT_BAZAR_SUPPLIER.slug,
        logo: rawWholesale?.supplierLogo || DEFAULT_BAZAR_SUPPLIER.logo,
        address: rawWholesale?.supplierAddress || DEFAULT_BAZAR_SUPPLIER.address,
        phone: rawWholesale?.supplierPhone || DEFAULT_BAZAR_SUPPLIER.phone,
        isArchivedFallback: (product as any)?.transferredToBazarDueToArchive === true,
      };
    }

    // Check if supplier is archived among known suppliers
    if (activeSuppliersList.length > 0) {
      const activeMatch = activeSuppliersList.find(s =>
        s.name.trim().toLowerCase() === rawName.toLowerCase() ||
        (s.slug && (product as any)?.supplierSlug && s.slug.toLowerCase() === ((product as any).supplierSlug as string).toLowerCase())
      );

      // If supplier is NOT in active suppliers list, merchant is archived -> fallback to bazar fashion!
      if (!activeMatch) {
        return {
          name: DEFAULT_BAZAR_SUPPLIER.name,
          slug: DEFAULT_BAZAR_SUPPLIER.slug,
          logo: DEFAULT_BAZAR_SUPPLIER.logo,
          address: DEFAULT_BAZAR_SUPPLIER.address,
          phone: DEFAULT_BAZAR_SUPPLIER.phone,
          isArchivedFallback: true,
        };
      }

      return {
        name: activeMatch.name || rawName,
        slug: activeMatch.slug || (product as any)?.supplierSlug || slugifySupplier(rawName),
        logo: activeMatch.logo || rawWholesale?.supplierLogo || '',
        address: activeMatch.address || rawWholesale?.supplierAddress || '',
        phone: activeMatch.phone || rawWholesale?.supplierPhone || '',
        isArchivedFallback: false,
      };
    }

    return {
      name: rawName,
      slug: (product as any)?.supplierSlug || slugifySupplier(rawName),
      logo: rawWholesale?.supplierLogo || '',
      address: rawWholesale?.supplierAddress || '',
      phone: rawWholesale?.supplierPhone || '',
      isArchivedFallback: false,
    };
  }, [product, activeSuppliersList]);

  // Set initial views count & increment views if tracking enabled
  useEffect(() => {
    if (product) {
      setViewsCount(product.views || 0);

      getDoc(doc(db, 'admin_config', 'settings')).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          const tracking = data.trackingEnabled !== false;
          const show = data.showProductViews !== false;
          setShowViews(show);

          if (tracking) {
            // Increment views in Firestore
            const productRef = doc(db, 'products', product.id);
            updateDoc(productRef, {
              views: increment(1)
            }).then(() => {
              setViewsCount(prev => prev + 1);
            }).catch(err => {
              console.warn("Failed to increment product views count:", err);
            });
          }
        } else {
          // Default fallbacks
          setShowViews(true);
          const productRef = doc(db, 'products', product.id);
          updateDoc(productRef, {
            views: increment(1)
          }).then(() => {
            setViewsCount(prev => prev + 1);
          }).catch(err => {
            console.warn("Failed to increment product views count:", err);
          });
        }
      }).catch(err => {
        console.warn("Failed to load tracking settings:", err);
        setShowViews(true);
      });
    }
  }, [product?.id]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Parse available colors and create color-image mapping
  const availableColors = useMemo(() =>
    product?.color ? product.color.split(',').map(c => c.trim()) : [],
    [product?.color]);

  // Ref for the observer to persist across renders
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset manual hide state when product changes
  useEffect(() => {
    setIsBuyButtonManuallyHidden(false);
    setIsSpecsButtonManuallyHidden(false);

    // Scroll to top ONLY when navigating to a new product
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // Handle loading state and analytics
  useEffect(() => {
    if (product) {
      setIsLoading(false);
      try {
        sessionStorage.setItem('bazar-fashion_current_product', JSON.stringify({
          id: product.id,
          name: product.name,
          slug: product.id
        }));
      } catch (e) {
        console.warn('Failed to store product in sessionStorage:', e);
      }

      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      if (currentPath.startsWith('/product/')) {
        // Track Meta Pixel ViewContent event
        try {
          trackMetaViewContent({
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
          });
        } catch (e) {
          console.warn("Meta Pixel ViewContent error:", e);
        }

        // Debounce analytics to avoid multiple calls
        const trackTimeout = setTimeout(() => {
          analytics.trackPageView(currentPath, product.name).catch(console.error);
        }, 1000);
        return () => clearTimeout(trackTimeout);
      }
    } else if (products.length > 0) {
      const redirectTimeout = setTimeout(() => navigate("/products"), 100);
      return () => clearTimeout(redirectTimeout);
    }
  }, [products, product, navigate, id]);

  // Optimized IntersectionObserver
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.target.id === 'checkout-form-section') {
          setIsPurchaseVisible(entry.isIntersecting);
        }
        if (entry.target.id === 'specs-section') {
          setIsSpecsVisible(entry.isIntersecting);
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: "-50px 0px 0px 0px"
    });

    const purchaseSection = document.getElementById('checkout-form-section');
    const specsSection = document.getElementById('specs-section');

    if (purchaseSection) observerRef.current.observe(purchaseSection);
    if (specsSection) observerRef.current.observe(specsSection);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, product]); // Re-run only when loading finishes or product changes

  // Special Offer Countdown Effect
  useEffect(() => {
    if (!product?.specialOffer || !product?.offerEndsAt) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(product.offerEndsAt!).getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [product?.specialOffer, product?.offerEndsAt]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Create mapping between colors and images
  const colorImageMapping = useMemo(() => {
    const mapping: { [key: string]: string } = {};
    availableColors.forEach((color, index) => {
      if (product?.images && product.images[index]) {
        mapping[color] = product.images[index];
      }
    });
    return mapping;
  }, [availableColors, product?.images]);

  // Cache for async-fetched video creator/channel metadata (e.g. YouTube oEmbed)
  const [videoMetaCache, setVideoMetaCache] = useState<Record<string, VideoMeta>>({});

  useEffect(() => {
    const urls = product?.videoUrls || [];
    urls.forEach((url) => {
      if (!url) return;
      fetch(`/api/video-meta?url=${encodeURIComponent(url)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: VideoMeta | null) => {
          if (data && (data.channelUrl || data.avatarUrl || data.authorName)) {
            setVideoMetaCache((prev) => ({ ...prev, [url]: data }));
          }
        })
        .catch(() => {
          // ignore error, sync fallback is already active
        });
    });
  }, [product?.videoUrls]);

  // Combine images and videos into a single media array: images ALWAYS first, then videos at the end
  const mediaItems = useMemo(() => {
    const images = (product?.images || [])
      .filter(url => !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('fb.watch') && !url.includes('facebook.com/video') && !url.includes('tiktok.com'))
      .map(url => ({ type: 'image' as const, url, thumbnail: url, meta: null as null }));

    const primaryFallback = images[0]?.url;
    const videos = (product?.videoUrls || []).map(url => {
      const syncMeta = getVideoMeta(url);
      const asyncMeta = videoMetaCache[url];
      const meta = asyncMeta ? { ...syncMeta, ...asyncMeta } : syncMeta;
      return {
        type: 'video' as const,
        url,
        thumbnail: getVideoThumbnailUrl(url, primaryFallback),
        meta,
      };
    });
    return [...images, ...videos];
  }, [product?.videoUrls, product?.images, videoMetaCache]);

  // Get current image/video based on selected image index
  const currentMedia = useMemo(() => {
    return mediaItems[selectedImage] || mediaItems[0];
  }, [selectedImage, mediaItems]);

  const currentImage = currentMedia?.url;
  const isCurrentVideo = currentMedia?.type === 'video';

  // Helper to check if addons match
  const areAddonsMatching = useCallback((itemAddons: ProductAddon[], targetAddons: ProductAddon[]) => {
    if ((!itemAddons || itemAddons.length === 0) && (!targetAddons || targetAddons.length === 0)) return true;
    if (!itemAddons || !targetAddons) return false;
    if (itemAddons.length !== targetAddons.length) return false;
    const itemAddonIds = itemAddons.map(a => a.id).sort();
    const targetAddonIds = targetAddons.map(a => a.id).sort();
    return itemAddonIds.every((id, index) => id === targetAddonIds[index]);
  }, []);

  // Check if product is in cart (considering selected size, color AND addons)
  const cartItem = useMemo(() => cart.find((item) =>
    item.product &&
    item.product.id === id &&
    (selectedSize ? item.selectedSize?.id === selectedSize.id : !item.selectedSize) &&
    (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor) &&
    areAddonsMatching(item.selectedAddons || [], selectedAddons || []) &&
    JSON.stringify(item.selectedOptionGroups || []) === JSON.stringify(selectedOptionGroups || [])
  ), [cart, id, selectedSize, selectedColor, selectedAddons, selectedOptionGroups, areAddonsMatching]);

  // Local quantity for products not in cart
  const [localQuantity, setLocalQuantity] = useState(1);

  // Reset local quantity when selections change and item is not in cart
  useEffect(() => {
    if (!cartItem) {
      setLocalQuantity(1);
    }
  }, [selectedSize, selectedColor, selectedAddons, selectedOptionGroups, cartItem]);

  // Determine actual quantity to display
  const currentQuantity = cartItem ? cartItem.quantity : localQuantity;

  const handleQuantityChange = async (newQuantity: number) => {
    if (cartItem) {
      // If item is in cart, update cart immediately
      try {
        await updateCartItemQuantity(
          product!.id,
          newQuantity,
          selectedSize?.id || null,
          selectedOptionGroups,
          selectedAddons.map(a => a.id),
          selectedColor
        );
      } catch (error) {
        toast.error("خطأ في تحديث الكمية");
      }
    } else {
      // If not in cart, just update local state
      setLocalQuantity(newQuantity);
    }
  };

  // Find suggested products (same category, excluding current product)
  const suggestedProducts = products
    .filter(
      (p) =>
        p.category === product?.category &&
        p.id !== product?.id &&
        !p.isArchived
    )
    .slice(0, 4);

  const [undiscountedPrice, setUndiscountedPrice] = useState(0);

  useEffect(() => {
    if (product) {
      // Initialize final price with base price or first size price
      let basePrice = product.price;
      if (product.sizes && product.sizes.length > 0) {
        basePrice = product.sizes[0].price;
      }

      // Initialize undiscounted price
      setUndiscountedPrice(basePrice);

      // Apply special offer discount to the calculated base price
      let finalPrice = basePrice;
      if (product.specialOffer &&
        product.offerEndsAt &&
        new Date(product.offerEndsAt) > new Date()) {
        if (product.discountPrice) {
          // Use fixed discount amount (original price - discountPrice) as saving
          // This ensures the saving is always the fixed amount regardless of selected options
          const discountAmount = Math.max(0, product.price - product.discountPrice);
          finalPrice = Math.max(0, basePrice - discountAmount);
        } else if (product.discountPercentage) {
          // Fallback: use percentage discount only if no discountPrice is set
          const discountAmount = (basePrice * product.discountPercentage) / 100;
          finalPrice = basePrice - discountAmount;
        }
      }

      setFinalPrice(finalPrice);

      // Set first color as default if available and no color is selected
      if (availableColors.length > 0 && !selectedColor) {
        setSelectedColor(availableColors[0]);
      }
    }
  }, [product, availableColors, selectedColor]);

  // Handle selection changes from ProductOptions component
  const handleSelectionChange = useCallback((
    newSelectedSize: ProductSize | null,
    newSelectedOptionGroups: any[],
    newSelectedAddons: ProductAddon[],
    calculatedPrice: number
  ) => {
    setSelectedSize(newSelectedSize);
    setSelectedOptionGroups(newSelectedOptionGroups);
    setSelectedAddons(newSelectedAddons);
    setUndiscountedPrice(calculatedPrice);

    // Apply special offer discount to the calculated price (including sizes and addons)
    let finalPrice = calculatedPrice;
    if (product?.specialOffer &&
      product.offerEndsAt &&
      new Date(product.offerEndsAt) > new Date()) {
      if (product.discountPrice) {
        // Use fixed discount amount (original price - discountPrice) as saving
        // This ensures the saving is always the fixed amount regardless of selected options
        const discountAmount = Math.max(0, product.price - product.discountPrice);
        finalPrice = Math.max(0, calculatedPrice - discountAmount);
      } else if (product.discountPercentage) {
        // Fallback: use percentage discount only if no discountPrice is set
        const discountAmount = (calculatedPrice * product.discountPercentage) / 100;
        finalPrice = calculatedPrice - discountAmount;
      }
    }

    setFinalPrice(finalPrice);
  }, [product]);

  // Show loading state while data is being loaded
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المنتج...</p>
        </div>
      </div>
    );
  }

  // Show 404 if product not found after loading is complete
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600 mb-8">المنتج غير موجود</p>
          <Button onClick={() => navigate("/products")}>
            العودة إلى المنتجات
          </Button>
        </div>
      </div>
    );
  }

  // SEO: Build dynamic meta info with unified productSeo engine
  const optimizedTitle = buildProductSeoTitle(product);
  const metaDescription = buildProductSeoDescription(product);
  const optimizedKeywords = buildProductKeywords(product);
  const keySpecs = extractProductKeySpecs(product);

  const canonicalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://bazar-fashion.vercel.app'}${getProductUrl(product)}`;

  const handleAddToCart = async () => {
    if (!product) return;

    const availableQuantity = product.wholesaleInfo?.quantity || 0;
    if (availableQuantity <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error("يرجى اختيار حجم المنتج أولاً");
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      toast.error("يرجى اختيار لون المنتج أولاً");
      return;
    }

    try {
      await addToCart(
        product,
        currentQuantity,
        selectedSize,
        selectedOptionGroups,
        selectedAddons,
        selectedColor
      );
      toast.success(`${t("cart.productAdded")}: ${product.name}`, {
        description: t("cart.whatWouldYouLikeToDo"),
        action: {
          label: t("cart.checkout"),
          onClick: () => navigate("/cart"),
        },
        cancel: {
          label: t("cart.continueShopping"),
          onClick: () => { },
        },
        duration: 5000,
        dismissible: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الإضافة للسلة");
    }
  };

  const handleBuy = async (quantity: number, formData: CheckoutFormData) => {
    if (!product) return;

    // Check if product is out of stock
    const availableQuantity = product.wholesaleInfo?.quantity || 0;
    if (availableQuantity <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error("يرجى اختيار حجم المنتج أولاً");
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      toast.error("يرجى اختيار لون المنتج أولاً");
      return;
    }

    // Process Order
    try {
      const totalAmount = finalPrice * quantity;

      const rawShippingCost = formData.orderType === 'online_purchase'
        ? STORE_GOVERNORATES.find(g => g.name === formData.governorate)?.shippingCost || 0
        : 0;

      const numericShippingCost = typeof rawShippingCost === 'number' ? rawShippingCost : 0;

      const finalTotalAmount = Math.max(0, totalAmount - (formData.couponDiscountAmount || 0)) + numericShippingCost;

      const orderItem = {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        price: finalPrice,
        totalPrice: totalAmount,
        image: product.images[0],
        selectedSize: selectedSize ? {
          id: selectedSize.id,
          label: selectedSize.label,
          price: selectedSize.price
        } : null,
        selectedOptionGroups: selectedOptionGroups || [],
        selectedAddons: selectedAddons.map(addon => ({
          id: addon.id,
          label: addon.label,
          price_delta: addon.price_delta
        })),
        selectedColor: selectedColor,
        wholesaleInfo: product.wholesaleInfo ? {
          supplierName: product.wholesaleInfo.supplierName || '',
          supplierPhone: product.wholesaleInfo.supplierPhone || '',
          supplierAddress: product.wholesaleInfo.supplierAddress || '',
          supplierLogo: product.wholesaleInfo.supplierLogo || ''
        } : null
      };

      const orderCode = generateOrderTrackingCode();

      const orderData = {
        orderCode,
        userId: userProfile?.uid || `guest-${Date.now()}`,
        items: [orderItem],
        total: finalTotalAmount,
        couponCode: formData.couponCode || null,
        couponDiscountAmount: formData.couponDiscountAmount || 0,
        status: 'pending',
        type: formData.orderType,
        deliveryInfo: {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.orderType === 'reservation' ? 'استلام من المحل' : formData.address,
          city: formData.orderType === 'reservation' ? 'لا يوجد' : formData.governorate,
          notes: formData.notes || ''
        },
        reservationInfo: formData.orderType === 'reservation' ? {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          appointmentDate: formData.appointmentDate || new Date().toISOString().split('T')[0], // Default to today if not specified in simplified form
          appointmentTime: formData.appointmentTime || '12:00', // Default
          notes: formData.notes || ''
        } : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        supplierName: effectiveSupplier?.name || product.wholesaleInfo?.supplierName || '',
        supplierPhone: effectiveSupplier?.phone || product.wholesaleInfo?.supplierPhone || '',
      };

      const deductions = [{
        productId: product.id,
        quantityToDeduct: quantity
      }];

      // Check for spam/duplicate orders
      const spamResult = await checkOrderSpam({
        orderType: formData.orderType === 'reservation' ? 'reservation' : 'online_purchase',
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        productId: product.id,
        selectedSize: selectedSize,
        selectedOptionGroups: selectedOptionGroups,
        selectedAddons: selectedAddons,
        selectedColor: selectedColor
      });

      if (spamResult.isSpam) {
        toast.error(spamResult.message);
        return;
      }

      // Save to Firebase
      await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);

      // Construct WhatsApp Message
      const getSupplierWhatsAppNumber = (_phone?: string) => {
        return '201024911062';
      };
      const whatsappNumber = getSupplierWhatsAppNumber();
      const orderLines = [
        `1. ${product.name}`,
        `   الكمية: ${quantity}`,
        selectedSize ? `   الحجم: ${selectedSize.label}` : '',
        selectedColor ? `   اللون: ${getColorByName(selectedColor).name}` : '',
        selectedOptionGroups.length > 0 ? `   المواصفات المختارة:\n${selectedOptionGroups.map(opt => `      - ${opt.groupName}: ${opt.optionLabel} (+${formatCurrency(opt.extraPrice, 'جنيه')})`).join('\n')}` : '',
        selectedAddons.length > 0 ? `   الإضافات:\n${selectedAddons.map(addon => `      - ${addon.label} (+${formatCurrency(addon.price_delta, 'جنيه')})`).join('\n')}` : '',
        `   السعر: ${formatCurrency(totalAmount, 'جنيه')}`
      ].filter(Boolean).join('\n');

      const customerInfo = formData.orderType === 'reservation' ?
        [
          `👤 الاسم: ${formData.fullName}`,
          `📱 الهاتف: ${formData.phoneNumber}`,
          `📅 التاريخ: ${formData.appointmentDate}`,
          `⏰ الوقت: ${formData.appointmentTime}`,
          `🏷 النوع: حجز`,
          formData.notes ? `📝 ملاحظات: ${formData.notes}` : null
        ].filter(Boolean).join('\n') :
        [
          `👤 الاسم: ${formData.fullName}`,
          `🏙 المحافظة: ${formData.governorate}`,
          `📍 العنوان: ${formData.address}`,
          `📱 الهاتف: ${formData.phoneNumber}`,
          `🏷 النوع: شراء أونلاين`,
          formData.notes ? `📝 ملاحظات: ${formData.notes}` : null
        ].filter(Boolean).join('\n');

      const message = [
        formData.orderType === 'reservation' ? '📅 طلب حجز جديد' : '🚀 طلب شراء جديد',
        '========================',
        formData.orderType === 'reservation' ? `🔢 كود الحجز للتتبع وتأكيد الوصول: *${orderCode}*` : `🔢 كود تتبع الطلب: *${orderCode}*`,
        '========================',
        effectiveSupplier?.name ? `🏢 المحل / المورد: ${effectiveSupplier.name}` : (product.wholesaleInfo?.supplierName ? `🏢 المحل / المورد: ${product.wholesaleInfo.supplierName}` : null),
        orderLines,
        '========================',
        '*بيانات العميل:*',
        customerInfo,
        '========================',
        formData.couponCode ? `🎟 كود الخصم: ${formData.couponCode} (-${formatCurrency(formData.couponDiscountAmount || 0, 'جنيه')})` : null,
        typeof rawShippingCost === 'number' && rawShippingCost > 0 ? `🚚 مصاريف الشحن: ${formatCurrency(rawShippingCost, 'جنيه')}` : typeof rawShippingCost === 'string' ? `🚚 مصاريف الشحن: ${rawShippingCost}` : null,
        `💰 الإجمالي النهائي: ${formatCurrency(finalTotalAmount, 'جنيه')}`,
        '========================',
        formData.orderType === 'reservation'
          ? 'يرجى تأكيد الحجز وإرسال العربون.'
          : 'يرجى تأكيد الطلب وتحديد مصاريف الشحن.'
      ].filter(Boolean).join('\n');

      // Save to localStorage for customer tracking
      saveTrackedOrder({
        orderCode,
        type: formData.orderType === 'reservation' ? 'reservation' : 'online',
        total: finalTotalAmount,
        createdAt: new Date().toISOString(),
        itemsCount: quantity,
        customerName: formData.fullName || 'عميل بازار',
        customerPhone: formData.phoneNumber,
        status: 'pending',
      });

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      setOrderSuccess({
        isOpen: true,
        orderCode,
        type: formData.orderType === 'reservation' ? 'reservation' : 'online',
        governorate: formData.governorate,
        whatsappUrl,
        totalAmount: finalTotalAmount,
        supplierName: effectiveSupplier?.name || product.wholesaleInfo?.supplierName || '',
        supplierLogo: effectiveSupplier?.logo || product.wholesaleInfo?.supplierLogo || '',
        items: [orderItem],
        reservationInfo: formData.orderType === 'reservation' ? {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          appointmentDate: formData.appointmentDate || new Date().toISOString().split('T')[0],
          appointmentTime: formData.appointmentTime || '12:00',
          notes: formData.notes || ''
        } : null,
        deliveryInfo: formData.orderType === 'reservation' ? null : {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.address || '',
          city: formData.governorate || '',
          notes: formData.notes || ''
        }
      });

    } catch (error) {
      console.error('Order Error:', error);
      toast.error('حدث خطأ أثناء تنفيذ الطلب. يرجى المحاولة لاحقاً.');
    }
  };



  const handleShare = () => {
    const productUrl = `${window.location.origin}${getProductUrl(product)}`;

    // Build selection info
    const selectionInfo = [];
    if (selectedSize) {
      selectionInfo.push(`📐 الحجم: ${selectedSize.label}`);
    }
    if (selectedColor) {
      selectionInfo.push(`🎨 اللون: ${getColorByName(selectedColor).name}`);
    }
    if (selectedOptionGroups.length > 0) {
      selectedOptionGroups.forEach(opt => {
        selectionInfo.push(`🔧 ${opt.groupName}: ${opt.optionLabel}`);
      });
    }
    if (selectedAddons.length > 0) {
      selectionInfo.push(`➕ الإضافات: ${selectedAddons.map(addon => addon.label).join(', ')}`);
    }

    const message = [
      `🛍️ *${product.name}*`,
      `🏷️ ${t("products.brand")}: ${product.brand}`,
      ...selectionInfo,
      `💰 السعر النهائي: ${formatCurrency(finalPrice, 'جنيه')}`,
      product.specialOffer &&
        new Date(product.offerEndsAt as string) > new Date()
        ? `🎉 ${t("products.specialOffer")}`
        : null,
      product.description
        ? `📝 ${t("products.description")}: ${product.description.replace(/<[^>]*>/g, '').substring(0, 100)}...`
        : null,
      product.category
        ? `📦 ${t("products.category")}: ${product.category}`
        : null,
      `\n🔗 ${t("common.viewProduct")}: ${productUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const handleCopySpecs = async () => {
    if (!product) return;

    // Determine Base Price considering active discounts
    const currentPrice = product.specialOffer && product.discountPrice && (!product.offerEndsAt || new Date(product.offerEndsAt) > new Date())
      ? product.discountPrice
      : product.price;

    const textLines = [
      `💻 ${product.name}`,
      ''
    ];

    // Extract filtered specs from admin panel
    const filterSpecs = product.specifications?.filter(s => s.inFilter) || [];

    if (filterSpecs.length > 0) {
      filterSpecs.forEach(spec => {
        const key = spec.key.toLowerCase();
        let emoji = '✨'; // default
        if (key.match(/معالج|processor|cpu/i)) emoji = '⚙️';
        else if (key.match(/كارت|جرافيك|vga|gpu|graphics/i)) {
          emoji = key.match(/مدمج|داخلي|intel/i) ? '🎞️' : '🎮';
        }
        else if (key.match(/شاشة|display|screen/i)) emoji = '🖥️';
        else if (key.match(/رام|ram|ذاكرة/i)) emoji = '🧠';
        else if (key.match(/تخزين|مساحة|هارد|storage|hdd|ssd/i)) emoji = '💽';
        else if (key.match(/جيل|generation/i)) emoji = '📅';

        textLines.push(`${emoji} ${spec.key}: ${spec.value}`);
      });
      textLines.push('');
    } else {
      // Fallback for earlier products without inFilter set
      const cpu = product.specifications?.find(s => s.key.match(/معالج|processor|cpu/i))?.value;
      const gpus = product.specifications?.filter(s => s.key.match(/كارت|جرافيك|vga|gpu|graphics/i)) || [];
      const display = product.specifications?.find(s => s.key.match(/شاشة|display|screen/i) && !s.key.match(/كارت/i))?.value;

      if (cpu) textLines.push(`⚙️ المعالج: ${cpu}`);

      gpus.forEach(gpu => {
        const emoji = gpu.key.match(/مدمج|داخلي|intel/i) ? '🎞️' : '🎮';
        textLines.push(`${emoji} ${gpu.key}: ${gpu.value}`);
      });

      if (display) textLines.push(`🖥 الشاشة: ${display}`);
      if (cpu || gpus.length > 0 || display) textLines.push('');
    }

    // Determine Base RAM & Storage
    let baseRam = product.specifications?.find(s => s.key.match(/رام|ram|ذاكرة/i))?.value;
    let baseStorage = product.specifications?.find(s => s.key.match(/تخزين|مساحة|هارد|storage|hdd|ssd/i))?.value;

    const ramGroup = product.customOptionGroups?.find(g => g.name.match(/رام|ram/i));
    if (ramGroup && ramGroup.options.length > 0) baseRam = ramGroup.options[0].label;

    const storageGroup = product.customOptionGroups?.find(g => g.name.match(/تخزين|مساحة|هارد|storage|hdd|ssd/i));
    if (storageGroup && storageGroup.options.length > 0) baseStorage = storageGroup.options[0].label;

    let baseSpecsText = [baseRam, baseStorage].filter(Boolean).join(' + ');

    // Fallback to sizes if available and no specific base specs found
    if (!baseSpecsText && product.sizes && product.sizes.length > 0) {
      baseSpecsText = product.sizes[0].label;
    }

    if (baseSpecsText) {
      textLines.push(`📦 المواصفات الأساسية:`);
      textLines.push(baseSpecsText);
      textLines.push('');
    }

    textLines.push(`💰 السعر الأساسي: ${formatCurrency(currentPrice, 'جنيه')}`);
    textLines.push('');

    // Add Custom Upgrades (RAM, Storage, etc.)
    if (product.customOptionGroups && product.customOptionGroups.length > 0) {
      product.customOptionGroups.forEach(group => {
        const upgradeOptions = group.options.filter((opt, idx) => idx > 0 && opt.extraPrice > 0);
        if (upgradeOptions.length > 0) {
          const isRam = group.name.match(/رام|ram/i);
          const emoji = isRam ? '🧠' : (group.name.match(/تخزين|هارد|مساحة/i) ? '💽' : '✨');
          textLines.push(`${emoji} ترقية ${group.name}:`);
          upgradeOptions.forEach(opt => {
            textLines.push(`${opt.label} (+${formatCurrency(opt.extraPrice, 'جنيه')})`);
          });
          textLines.push('');
        }
      });
    }

    // Add Size Upgrades if applicable
    if (product.sizes && product.sizes.length > 1) {
      const sizeUpgrades = product.sizes.slice(1);
      textLines.push(`⚡ خيارات إضافية:`);
      sizeUpgrades.forEach(size => {
        const extraPrice = size.price - currentPrice;
        if (extraPrice > 0) {
          textLines.push(`${size.label} (+${formatCurrency(extraPrice, 'جنيه')})`);
        } else {
          textLines.push(`${size.label} (${formatCurrency(size.price, 'جنيه')})`);
        }
      });
      textLines.push('');
    }

    const productShareUrl = `${window.location.origin}${getProductUrl(product)}`;
    textLines.push(`🔗 شاهد التفاصيل واطلب الآن من الموقع الرسمي:`);
    textLines.push(productShareUrl);
    textLines.push('');
    textLines.push(`🚀 اطلب دلوقتي من الموقع واستعرض كل التفاصيل والصور بجودة عالية، واستمتع بتجربة شراء سهلة وسريعة!`);

    const finalString = textLines.join('\n');

    try {
      await copyToClipboard(finalString);
      toast.success("تم نسخ المواصفات بنجاح");
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error("حدث خطأ أثناء النسخ");
    }
  };

  const inCompare = product ? isInCompare(product.id) : false;

  const handleCompareClick = () => {
    if (!product) return;
    if (inCompare) {
      removeFromCompare(product.id);
      toast.info("تم إزالة المنتج من المقارنة");
      return;
    }

    const result = addToCompare(product);

    if (result.success) {
      toast.success("تمت إضافة المنتج للمقارنة", {
        description: `${compareList.length + 1} منتج في المقارنة`,
        duration: 2000,
      });
    } else {
      if (compareList.length > 0 && compareList[0].category !== product.category) {
        setShowCompareConfirm(true);
      } else {
        toast.error(result.message);
      }
    }
  };


  return (
    <div className="pd-page min-h-screen bg-gray-50/50">
      <SEOHelmet
        title={optimizedTitle}
        description={metaDescription}
        keywords={optimizedKeywords}
        image={mediaItems.find(m => m.type === 'image')?.url || product.images?.[0]}
        url={getProductUrl(product)}
        type="product"
        breadcrumbs={[
          { name: 'الأقسام', url: '/categories' },
          {
            name: getCategoryNameFromSlug(product.categorySlug || getCategorySlugFromName(product.category)) || product.category || 'عام',
            url: `/products/${product.categorySlug || getCategorySlugFromName(product.category) || 'general'}`
          },
          { name: product.name, url: getProductUrl(product) }
        ]}
        productData={{
          name: product.name,
          brand: product.brand,
          price: finalPrice,
          currency: "EGP",
          availability: (product.wholesaleInfo?.quantity || 0) > 0 ? "InStock" : "OutOfStock",
          condition: (keySpecs.condition || '').includes('استيراد') || (keySpecs.condition || '').includes('مستعمل') ? "UsedCondition" : "NewCondition",
          sku: product.id,
          category: product.category,
          description: metaDescription
        }}
      />
      <main className="container mx-auto py-6 px-4 md:px-8">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm"
        >
          <Breadcrumb>
            <BreadcrumbList className="flex items-center text-sm flex-wrap gap-y-1">
              {(() => {
                const categorySlug = product.categorySlug || getCategorySlugFromName(product.category) || 'general';
                const categoryName = getCategoryNameFromSlug(categorySlug) || product.category || 'عام';

                return (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link
                          to="/categories"
                          className="text-gray-400 hover:text-primary transition-colors duration-200 font-medium"
                        >
                          الأقسام
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>

                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 shrink-0 mx-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>

                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link
                          to={`/products/${categorySlug}`}
                          className="text-gray-400 hover:text-primary transition-colors duration-200 font-medium"
                        >
                          {categoryName}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                );
              })()}

              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-300 shrink-0 mx-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>

              <BreadcrumbItem className="max-w-[200px] sm:max-w-[350px] md:max-w-none truncate">
                <BreadcrumbPage className="font-extrabold text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-xl text-xs sm:text-sm shadow-sm truncate" title={product.name}>
                  {product.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </motion.div>

        {/* Product Details */}
        <div className="pd-columns flex flex-col lg:flex-row gap-8 lg:gap-16 mb-16 relative">

          {/* Left Column: Product Images (Sticky) */}
          <div className="pd-image-col w-full lg:w-1/2 flex flex-col gap-4">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Main Image */}
              <div className="pd-main-image aspect-[4/5] sm:aspect-square w-full rounded-3xl overflow-hidden relative group bg-white border border-gray-200 transition-all duration-500">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentImage}
                    initial={{ opacity: 0, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className={`h-full w-full flex items-center justify-center ${isCurrentVideo ? 'p-2 sm:p-4' : 'p-8'}`}
                  >
                    {isCurrentVideo ? (
                      <div className="w-full h-full relative group rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                        {currentMedia?.thumbnail && (
                          <img
                            src={currentMedia.thumbnail}
                            alt="غلاف الفيديو"
                            className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                          />
                        )}
                        <iframe
                          src={getVideoEmbedUrl(currentImage, true)}
                          title="Product Video"
                          className="w-full h-full border-0 relative z-10"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />

                        {/* Channel avatar + subscribe/watch button — positioned at bottom-left of video */}
                        {currentMedia?.meta && currentMedia.meta.channelUrl && (
                          <a
                            href={currentMedia.meta.channelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/15 rounded-full pl-1 pr-3 py-1 shadow-xl transition-all hover:scale-105 group/ch"
                            title={
                              currentMedia.meta.channelHandle || currentMedia.meta.authorName
                                ? `فتح القناة / الصفحة (${currentMedia.meta.authorName || `@${currentMedia.meta.channelHandle}`})`
                                : `فتح ومشاهدة الفيديو الأصلي على ${currentMedia.meta.platform === 'youtube' ? 'يوتيوب' : currentMedia.meta.platform === 'tiktok' ? 'تيك توك' : 'فيسبوك'}`
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            {currentMedia.meta.avatarUrl ? (
                              <img
                                src={currentMedia.meta.avatarUrl}
                                alt={currentMedia.meta.authorName || `@${currentMedia.meta.channelHandle}`}
                                className="w-7 h-7 rounded-full object-cover border border-white/40 flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${currentMedia.meta.platform === 'youtube' ? 'bg-red-600' :
                                currentMedia.meta.platform === 'tiktok' ? 'bg-black border border-white/20' : 'bg-blue-600'
                                }`}>
                                <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                              </div>
                            )}
                            <div className="flex flex-col leading-none min-w-0">
                              <span className="text-white text-[11px] font-semibold leading-tight truncate max-w-[110px]">
                                {currentMedia.meta.authorName || (currentMedia.meta.channelHandle ? `@${currentMedia.meta.channelHandle}` : (
                                  currentMedia.meta.platform === 'youtube' ? 'يوتيوب' :
                                    currentMedia.meta.platform === 'tiktok' ? 'تيك توك' : 'فيسبوك'
                                ))}
                              </span>
                              <span className={`text-[9px] font-bold leading-tight mt-0.5 ${currentMedia.meta.platform === 'youtube' ? 'text-red-400' :
                                currentMedia.meta.platform === 'tiktok' ? 'text-[#69C9D0]' : 'text-blue-400'
                                }`}>
                                {currentMedia.meta.channelHandle || currentMedia.meta.authorName
                                  ? (currentMedia.meta.platform === 'youtube' ? '▶ اشترك' : currentMedia.meta.platform === 'tiktok' ? '♪ متابعة' : '👍 متابعة')
                                  : (currentMedia.meta.platform === 'youtube' ? '▶ مشاهدة واشتراك' : currentMedia.meta.platform === 'tiktok' ? '♪ مشاهدة ومتابعة' : '👍 مشاهدة ومتابعة')}
                              </span>
                            </div>
                          </a>
                        )}
                      </div>
                    ) : (
                      <img
                        src={currentImage}
                        alt={product.name}
                        fetchPriority="high"
                        className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>



                {/* Navigation arrows */}
                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        const newIdx = selectedImage > 0 ? selectedImage - 1 : mediaItems.length - 1;
                        setSelectedImage(newIdx);
                        const item = mediaItems[newIdx];
                        if (item.type === 'image' && availableColors.length > 1) {
                          const c = availableColors.find(color => colorImageMapping[color] === item.url);
                          if (c) setSelectedColor(c);
                        }
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white backdrop-blur-md p-3 text-gray-800 opacity-0 transition-all duration-300 group-hover:opacity-100 border border-gray-200 -translate-x-4 group-hover:translate-x-0"
                      aria-label="الصورة السابقة"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        const newIdx = selectedImage < mediaItems.length - 1 ? selectedImage + 1 : 0;
                        setSelectedImage(newIdx);
                        const item = mediaItems[newIdx];
                        if (item.type === 'image' && availableColors.length > 1) {
                          const c = availableColors.find(color => colorImageMapping[color] === item.url);
                          if (c) setSelectedColor(c);
                        }
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white backdrop-blur-md p-3 text-gray-800 opacity-0 transition-all duration-300 group-hover:opacity-100 border border-gray-200 translate-x-4 group-hover:translate-x-0"
                      aria-label="الصورة التالية"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {mediaItems.length > 1 && (
                <div className="space-y-3">

                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {mediaItems.map((item, index) => {
                      const isSelected = index === selectedImage;

                      return (
                        <motion.button
                          key={index}
                          onClick={() => {
                            setSelectedImage(index);
                            if (item.type === 'image' && availableColors.length > 1) {
                              // Find the color that corresponds to this image
                              const correspondingColor = availableColors.find(color =>
                                colorImageMapping[color] === item.url
                              );
                              if (correspondingColor) {
                                setSelectedColor(correspondingColor);
                              }
                            }
                          }}
                          className={`group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${isSelected
                            ? "border-primary ring-1 ring-primary/20"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          aria-label={`عرض الصورة رقم ${index + 1}`}
                        >
                          {item.type === 'video' ? (
                            <div className="w-full h-full relative overflow-hidden bg-gray-900 group/vid flex items-center justify-center">
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt="فيديو المنتج"
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                  <Film className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              {/* Very light overlay so thumbnail is crisp and clear */}
                              <div className="absolute inset-0 bg-black/15 group-hover/vid:bg-black/30 transition-colors" />

                              {/* Compact Primary Play Triangle Badge */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-5 h-5 rounded-full bg-white/95 shadow-xs flex items-center justify-center transition-transform group-hover/vid:scale-115">
                                  <Play className="w-2.5 h-2.5 fill-primary text-primary ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={item.url}
                              alt={`${product.name} - ${index + 1}`}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              loading="lazy"
                            />
                          )}

                          {/* Selection indicator */}
                          {isSelected && (
                            <motion.div
                              className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15 }}
                            >
                              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            </motion.div>
                          )}

                          {/* Color indicator overlay - only for images linked to colors */}
                          {item.type === 'image' && availableColors.length > 1 && availableColors.some(c => colorImageMapping[c] === item.url) && (
                            <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm"
                              style={{
                                backgroundColor: availableColors.find(c => colorImageMapping[c] === item.url) || '#ccc'
                              }}
                            />
                          )}

                          {/* Image number badge */}
                          <div className="absolute top-1 left-1 w-4 h-4 bg-black/60 text-white text-xs rounded-full flex items-center justify-center font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            {index + 1}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Product Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="pd-info-col w-full lg:w-1/2 space-y-8 lg:py-4"
          >
            {/* Product Header */}
            <div className="space-y-5">
              {/* Hanging Ribbon Countdown Badge */}
              {product?.specialOffer && timeLeft && (
                <div className="flex items-center gap-5 mb-6 mt-2">
                  <CountdownBadge timeLeft={timeLeft} size="lg" />
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-[11px] font-bold tracking-wider text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        عرض حصري لفترة محدودة
                      </span>
                    </span>
                    <p className="text-sm text-gray-500 font-medium">
                      استغل العرض قبل انتهاء الوقت!
                    </p>
                    {product.discountPercentage && (
                      <span className="text-2xl font-black text-red-600">
                        خصم {product.discountPercentage}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-full tracking-wider uppercase">
                  {product.brand}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                  {product.category}
                </span>
                {showViews && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1.5 border border-indigo-100/50 shadow-sm transition-all duration-300">
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{viewsCount.toLocaleString()} مشاهدة</span>
                  </span>
                )}
                {product.wholesaleInfo?.quantity !== undefined && (
                  <span className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-300 ${product.wholesaleInfo.quantity <= 0
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : product.wholesaleInfo.quantity <= 3
                      ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                      : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                    {product.wholesaleInfo.quantity <= 0
                      ? 'نفذت الكمية'
                      : product.wholesaleInfo.quantity <= 3
                        ? `متبقي ${product.wholesaleInfo.quantity} قطع فقط!`
                        : `متوفر في المخزون: ${product.wholesaleInfo.quantity} قطع`}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <h1 className="pd-product-name text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Supplier Info Card */}
              {effectiveSupplier && (
                <div className="flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm w-full transition-colors duration-200 hover:border-gray-300">

                  {/* Top row: logo + name + address */}
                  <div className="flex items-start gap-3">
                    {/* Logo or Initial Avatar - clickable */}
                    <Link
                      to={`/${effectiveSupplier.slug}/categories`}
                      className="flex-shrink-0 mt-0.5 hover:opacity-80 transition-opacity"
                      title={`زيارة متجر ${effectiveSupplier.name}`}
                    >
                      {effectiveSupplier.logo ? (
                        <img
                          src={effectiveSupplier.logo}
                          alt={effectiveSupplier.name}
                          className="h-10 w-10 object-contain rounded-xl border border-gray-100 bg-gray-50 p-1"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {effectiveSupplier.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Divider */}
                    <div className="w-px self-stretch bg-gray-200 flex-shrink-0" />

                    {/* Name + address */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-none">اسم المحل</span>
                      <Link
                        to={`/${effectiveSupplier.slug}/categories`}
                        className="text-sm font-bold text-gray-900 leading-snug break-words hover:text-primary transition-colors duration-200 group flex items-center gap-1"
                        title={`زيارة متجر ${effectiveSupplier.name}`}
                      >
                        {effectiveSupplier.name}
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                      </Link>
                      {effectiveSupplier.address && (
                        <p className="text-xs text-gray-500 leading-snug break-words">
                          {effectiveSupplier.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="h-px bg-gray-100" />

                  {/* Platform note */}
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg leading-none flex-shrink-0">ℹ️</span>
                    <p className="text-[11px] leading-5 text-gray-600">
                      <span className="font-bold text-gray-900">Bazaar Electronics</span>{" "}
                      Bazaar Electronics سجل طلبك وهيتم معاينه المنتج وفحصه بشكل دقيق وأمن وارسال صور وفيديو للمنتج من خلالنا❤️



                    </p>
                  </div>

                </div>
              )}
            </div>

            {/* Color Selection */}
            {availableColors.length > 0 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">اللون: <span className="font-medium text-gray-500 ml-2">{selectedColor ? getColorByName(selectedColor).name : 'اختر لوناً'}</span></h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => {
                    const colorInfo = getColorByName(color);

                    return (
                      <button
                        key={color}
                        onClick={() => {
                          setSelectedColor(color);
                          const imgUrl = colorImageMapping[color];
                          if (imgUrl) {
                            const idx = mediaItems.findIndex(m => m.url === imgUrl);
                            if (idx !== -1) setSelectedImage(idx);
                          }
                        }}
                        className={`relative group ${selectedColor === color
                          ? 'ring-2 ring-primary ring-offset-4 ring-offset-white scale-110'
                          : 'ring-1 ring-gray-200 hover:ring-gray-300 hover:scale-105'
                          } rounded-full transition-all duration-300`}
                        title={colorInfo.name}
                      >
                        <div
                          className="w-10 h-10 rounded-full shadow-inner border border-black/5"
                          style={{ backgroundColor: color }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Options Container */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200">
              <ProductOptions
                product={product}
                currentPrice={finalPrice}
                undiscountedPrice={undiscountedPrice}
                maxQuantity={product.wholesaleInfo?.quantity}
                quantity={currentQuantity}
                onSelectionChange={handleSelectionChange}
                onQuantityChange={handleQuantityChange}
                onBuy={handleBuy}
                onAddToCart={handleAddToCart}
              />
            </div>

            {/* Actions Row */}
            <div className="grid grid-cols-3 gap-2 md:gap-3 pt-2">
              {/* Share button */}
              <Button
                size="lg"
                variant="outline"
                className="rounded-2xl h-14 bg-white hover:bg-gray-50 hover:text-primary transition-all border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-1 md:gap-2 px-1.5 text-center"
                onClick={handleShare}
                title="مشاركة المنتج"
              >
                <Share2 className="w-4 h-4 text-gray-550 shrink-0" />
                <span className="text-[10px] sm:text-xs md:text-sm font-bold truncate">مشاركة</span>
              </Button>

              {/* Copy Specs button */}
              <Button
                size="lg"
                variant="outline"
                className="rounded-2xl h-14 bg-white hover:bg-gray-50 hover:text-primary transition-all border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-1 md:gap-2 px-1.5 text-center"
                onClick={handleCopySpecs}
                title="نسخ المواصفات"
              >
                <ClipboardCopy className="w-4 h-4 text-gray-550 shrink-0" />
                <span className="text-[10px] sm:text-xs md:text-sm font-bold truncate">المواصفات</span>
              </Button>

              {/* Compare button */}
              <Button
                size="lg"
                variant="outline"
                className={`rounded-2xl h-14 transition-all border shadow-sm flex flex-col sm:flex-row items-center justify-center gap-1 md:gap-2 px-1.5 text-center ${inCompare
                  ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary"
                  }`}
                onClick={handleCompareClick}
                title={inCompare ? "مضاف للمقارنة" : "مقارنة المنتج"}
              >
                {inCompare ? (
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <GitCompare className="w-4 h-4 text-gray-550 shrink-0" />
                )}
                <span className="text-[10px] sm:text-xs md:text-sm font-bold truncate">
                  {inCompare ? "مقارن" : "قارن"}
                </span>
              </Button>
            </div>
          </motion.div>
        </div>




        {/* Product Description */}
        {product.description && (
          <div className="mb-16 scroll-mt-24">
            <Separator className="mb-8" />
            <div className="max-w-5xl mx-auto">
              {/* Elegant Paper Container */}
              <div className="relative bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-100/80 dark:border-slate-800/60 shadow-sm transition-all duration-300">

                {/* Scroll container — الكلمات لا تُكسر أبداً، المحتوى الطويل يتمرر أفقياً */}
                <div className="product-description-scroll-wrapper overflow-x-auto p-4 sm:p-6 md:p-8 rounded-2xl">
                  <div
                    className="product-description-content prose prose-base sm:prose-lg dark:prose-invert
                    prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
                    prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300
                    prose-ul:list-disc prose-ul:pr-6 prose-ul:pl-0
                    prose-ol:list-decimal prose-ol:pr-6 prose-ol:pl-0
                    prose-li:my-1.5 prose-li:text-gray-600 dark:prose-li:text-gray-400
                    prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-extrabold
                    prose-em:text-gray-800 dark:prose-em:text-gray-200
                    prose-ul:marker:text-primary prose-ol:marker:text-primary
                    prose-pre:overflow-x-auto
                    [&_img]:w-full [&_img]:h-auto [&_img]:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </div>

              </div>
            </div>
          </div>
        )}

        <div id="specs-section" className="mb-16 scroll-mt-24">
          <Separator className="mb-8" />
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Settings2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">المواصفات التقنية</h2>
                <p className="text-gray-500 mt-1">المواصفات الفنية الكاملة للجهاز</p>
              </div>
            </div>

            {product.specifications && product.specifications.length > 0 ? (
              <SpecsDisplay
                category={product.category}
                specifications={product.specifications}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد مواصفات مُدخلة لهذا المنتج</p>
              </div>
            )}
          </div>
        </div>



        {/* Suggested Products */}
        <div className="mb-16">
          <Separator className="mb-8" />
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              منتجات مشابهة
            </h2>
            <p className="text-gray-600">
              اكتشف المزيد من المنتجات المميزة
            </p>
          </div>

          {suggestedProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {suggestedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={() => {
                    setSelectedProduct(product);
                    setModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main >

      <ProductModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Sticky Bottom Navigation - Rendered in Portal to avoid parent stacking contexts */}
      {mounted && createPortal(
        <AnimatePresence mode="wait">
          {((!isBuyButtonManuallyHidden && !isPurchaseVisible) || (!isSpecsButtonManuallyHidden && !isSpecsVisible)) && !hasAnyModalOpen ? (
            <motion.div
              className="fixed bottom-4 left-4 right-4 z-[100] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-sm pointer-events-none"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              style={{ willChange: "transform, opacity" }}
            >
              <div className="flex items-center justify-center gap-3">
                <AnimatePresence mode="popLayout">
                  {!isBuyButtonManuallyHidden && !isPurchaseVisible && (
                    <motion.div
                      key="buy-btn"
                      layout
                      initial={{ y: 50, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 50, opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex-1 pointer-events-auto shadow-2xl rounded-2xl relative group"
                    >
                      {/* Close button for Buy button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBuyButtonManuallyHidden(true);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg z-10"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="إغلاق زر إتمام الشراء العائم"
                      >
                        <X className="h-3 w-3" />
                      </motion.button>

                      <Button
                        onClick={() => {
                          const event = new CustomEvent('open-checkout-form');
                          window.dispatchEvent(event);
                          setTimeout(() => scrollToSection('checkout-form-section'), 100);
                        }}
                        className="w-full rounded-2xl h-12 text-base font-bold shadow-lg bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 border-none backdrop-blur-md"
                      >
                        إتمام الشراء
                      </Button>
                    </motion.div>
                  )}

                  {!isSpecsButtonManuallyHidden && !isSpecsVisible && (
                    <motion.div
                      key="specs-btn"
                      layout
                      initial={{ y: 50, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 50, opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex-1 pointer-events-auto shadow-2xl rounded-2xl relative group"
                    >
                      {/* Close button for Specs button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSpecsButtonManuallyHidden(true);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg z-10"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="إغلاق زر المواصفات العائم"
                      >
                        <X className="h-3 w-3" />
                      </motion.button>

                      <Button
                        variant="secondary"
                        onClick={() => scrollToSection('specs-section')}
                        className="w-full rounded-2xl h-12 text-base font-bold shadow-lg bg-white/90 hover:bg-white text-gray-900 transition-all active:scale-95 border border-gray-200/50 backdrop-blur-md"
                      >
                        المواصفات
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}

      <Footer />

      <Dialog open={isBatteryModalOpen} onOpenChange={setIsBatteryModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              ضمان الشاحن والبطارية
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-600">
              يغطي الضمان الشاحن والبطارية لمدة أسبوعين من تاريخ الشراء.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-green-50 border-green-100 p-3">
                <p className="text-sm font-semibold text-green-800">مدة التشغيل المتوقعة</p>
                <p className="text-sm text-green-700 mt-1">من ساعتين إلى ٥ ساعات حسب الاستخدام.</p>
              </div>
              <div className="rounded-lg border bg-red-50 border-red-100 p-3">
                <p className="text-sm font-semibold text-red-800">علامة الخلل</p>
                <p className="text-sm text-red-700 mt-1">
                  إذا انخفضت البطارية من 100٪ إلى نفاد كامل في أقل من ساعتين فهذا مؤشر على مشكلة.
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-gray-50">
              <p className="text-sm font-semibold text-gray-900 mb-2">شروط الاستبدال</p>
              <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700">
                <li>يمكن استبدال الجهاز أو البطارية ببطارية أخرى خلال أسبوعين من الضمان عند ثبوت المشكلة.</li>
                <li>بعد مرور أسبوعين لا يمكن الاستبدال.</li>
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">نصائح للحفاظ على عمر البطارية</p>
              <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700">
                <li>استخدم الشاحن الأصلي وتجنب الشواحن غير الموثوقة.</li>
                <li>تجنب استخدام الجهاز أثناء الشحن وتقليل تعرضه للحرارة.</li>
                <li>حافظ على الشحن بين 20٪ و80٪ قدر الإمكان.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end">
            <Button variant="outline" onClick={() => setIsBatteryModalOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Shipping Policy Modal */}
      <Dialog open={showShippingPolicy} onOpenChange={setShowShippingPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-700">
              <Truck className="h-5 w-5" /> ╪│┘è╪º╪│╪⌐ ╪º┘ä╪┤╪¡┘å ┘ê╪º┘ä╪¬┘ê╪╡┘è┘ä
            </DialogTitle>
            <DialogDescription>
              ┘è╪▒╪¼┘ë ┘à╪▒╪º╪¼╪╣╪⌐ ╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä╪┤╪¡┘å ╪ú╪»┘å╪º┘ç
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-100 shadow-sm">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/60 p-3 rounded border border-yellow-100/50">
                <p className="font-medium flex items-center gap-2 text-gray-800">
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
                  ╪»╪º╪«┘ä ╪º┘ä┘é╪º┘ç╪▒╪⌐
                </p>
                <div className="text-right">
                  <p className="font-bold text-yellow-800">100</p>
                  <p className="text-xs text-yellow-600">(24 ╪│╪º╪╣╪⌐)</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-white/60 p-3 rounded border border-yellow-100/50">
                <p className="font-medium flex items-center gap-2 text-gray-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                  ╪¼┘à┘è╪╣ ╪º┘ä┘à╪¡╪º┘ü╪╕╪º╪¬
                </p>
                <div className="text-right">
                  <p className="font-bold text-yellow-800">200</p>
                  <p className="text-xs text-yellow-600">(48 ╪│╪º╪╣╪⌐)</p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-yellow-800 bg-yellow-100/50 p-2 rounded">
              * ╪│┘è╪¬┘à ╪¬╪ú┘â┘è╪» ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪┤╪¡┘å ╪º┘ä┘å┘ç╪º╪ª┘è╪⌐ ╪╣╪¿╪▒ ┘ê╪º╪¬╪│╪º╪¿.
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowShippingPolicy(false)} className="w-full">
              ╪¡╪│┘å╪º┘ï╪î ┘ü┘ç┘à╪¬
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Success Modal */}
      <OrderSuccessModal
        open={orderSuccess.isOpen && orderSuccess.type === 'online'}
        onClose={() => {
          setOrderSuccess(prev => ({ ...prev, isOpen: false }));
          const categorySlug = product?.category ? getCategorySlugFromName(product.category) : null;
          navigate(categorySlug ? `/products/${categorySlug}` : '/categories');
        }}
        orderCode={orderSuccess.orderCode}
        items={orderSuccess.items ? orderSuccess.items.map(item => ({
          productId: item.productId || '',
          productName: item.productName || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || '',
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          selectedOptionGroups: item.selectedOptionGroups
        })) : []}
        deliveryInfo={orderSuccess.deliveryInfo || null}
        totalAmount={orderSuccess.totalAmount || 0}
        whatsappUrl={orderSuccess.whatsappUrl}
        supplierName={orderSuccess.supplierName}
        supplierLogo={orderSuccess.supplierLogo}
      />

      {/* Reservation Success Modal */}
      <ReservationSuccessModal
        open={orderSuccess.isOpen && orderSuccess.type === 'reservation'}
        onClose={() => {
          setOrderSuccess(prev => ({ ...prev, isOpen: false }));
          const categorySlug = product?.category ? getCategorySlugFromName(product.category) : null;
          navigate(categorySlug ? `/products/${categorySlug}` : '/products/laptops');
        }}
        orderCode={orderSuccess.orderCode}
        items={orderSuccess.items ? orderSuccess.items.map(item => ({
          productId: item.productId || '',
          productName: item.productName || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || '',
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          selectedOptionGroups: item.selectedOptionGroups
        })) : []}
        reservationInfo={orderSuccess.reservationInfo || null}
        totalAmount={orderSuccess.totalAmount || 0}
        whatsappUrl={orderSuccess.whatsappUrl}
        supplierName={orderSuccess.supplierName}
        supplierLogo={orderSuccess.supplierLogo}
      />

      {/* Category Mismatch Confirmation Dialog */}
      <Dialog open={showCompareConfirm} onOpenChange={setShowCompareConfirm}>
        <DialogContent className="max-w-sm rounded-2xl bg-white p-6" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold text-gray-900">تنبيه فئات مختلفة</DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-2">
              المنتج الذي تحاول مقارنته ينتمي لفئة مختلفة عن المنتجات الموجودة حالياً في قائمة المقارنة. هل تريد إفراغ قائمة المقارنة والبدء بفئة جديدة؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCompareConfirm(false)}
              className="text-xs font-bold rounded-xl border-gray-200"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                clearCompare();
                setTimeout(() => {
                  addToCompare(product);
                  toast.success("تمت إضافة المنتج للمقارنة (فئة جديدة)");
                }, 50);
                setShowCompareConfirm(false);
              }}
              className="text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              نعم، ابدأ جديدة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default ProductDetails; 
