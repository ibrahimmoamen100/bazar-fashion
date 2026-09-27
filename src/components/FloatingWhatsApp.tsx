'use client';

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import { useCompareStore } from '@/store/useCompareStore';
import { trackMetaContact } from '@/lib/metaPixel';

export function FloatingWhatsApp() {
  const [mounted, setMounted] = useState(false);
  const { settings } = useSiteSettings();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnyModalOpen, setHasAnyModalOpen] = useState(false);

  const compareList = useCompareStore((s) => s.compareList);
  const isCompareOpen = useCompareStore((s) => s.isCompareOpen);
  const hasCompareBar = compareList.length > 0 && !isCompareOpen;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkModal = () => {
      const modalElements = document.querySelectorAll('[role="dialog"], [data-state="open"]');
      setHasAnyModalOpen(modalElements.length > 0 || isCompareOpen);
    };

    checkModal();
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => observer.disconnect();
  }, [isCompareOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!mounted || hasAnyModalOpen) {
    return null;
  }

  if (!settings?.floatingWhatsappEnabled || !settings?.whatsapp) {
    return null;
  }

  const pathname = location.pathname;
  const allowedPages = settings.floatingWhatsappPages || [];
  
  const isAllowedPage = () => {
    if (allowedPages.includes('home') && pathname === '/') return true;
    if (allowedPages.includes('cart') && pathname === '/cart') return true;
    if (allowedPages.includes('about') && pathname === '/about') return true;
    if (allowedPages.includes('locations') && pathname === '/locations') return true;
    
    // Check if it's the main products list (or category pages)
    const isProductsList = pathname.startsWith('/products');
    if (allowedPages.includes('products') && isProductsList) return true;
    
    // Check if it's a product details page
    const isProductDetails = pathname.startsWith('/product/');
    if (allowedPages.includes('product-details') && isProductDetails) return true;
    
    return false;
  };

  if (!isAllowedPage()) {
    return null;
  }

  const handleWhatsAppClick = () => {
    try {
      trackMetaContact('WhatsApp');
    } catch (e) {
      console.warn("Meta Pixel Contact error:", e);
    }
    let phoneNumber = settings.whatsapp.replace(/\D/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '2' + phoneNumber; 
    }
    const message = encodeURIComponent('مرحباً، لدي استفسار من موقعكم الإلكتروني.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const isRight = settings.floatingWhatsappPosition === 'right';
  const positionClass = isRight ? 'right-6' : 'left-6';
  
  // Shift upward if the bottom CompareBar is visible to prevent overlap blocking
  const bottomClass = hasCompareBar ? 'bottom-[106px] md:bottom-6' : 'bottom-6';

  const content = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className={`fixed ${bottomClass} ${positionClass} z-[9999] flex flex-col items-center gap-2 transition-all duration-300`}
        >
          {/* Tooltip */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="bg-white text-gray-800 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none mb-1 border border-gray-100 relative"
          >
            تواصل معنا
            {/* Small triangle arrow pointing down */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-gray-100"></div>
          </motion.div>

          {/* Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWhatsAppClick}
            className="relative flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] hover:bg-[#1ebe57] hover:shadow-[0_6px_20px_rgba(37,211,102,0.23)] transition-colors"
            aria-label="تواصل معنا عبر واتساب"
            title="تواصل معنا عبر واتساب"
          >
            {/* Ripple Effect Background */}
            <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></div>
            
            {/* Notification Dot */}
            <span className={`absolute top-0 ${isRight ? 'left-0' : 'right-0'} w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white`}></span>
            
            <FaWhatsapp className={`w-8 h-8 ${isRight ? 'pl-0.5' : 'pr-0.5'} pb-0.5`} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use createPortal to attach the element directly to the document body
  // This guarantees that it's immune to relative/absolute positioning constraints or CSS transforms on parent containers
  return createPortal(content, document.body);
}
