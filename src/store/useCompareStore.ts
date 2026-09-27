import { create } from "zustand";
import { Product } from "@/types/product";

const MAX_COMPARE = 4;

interface CompareState {
  compareList: Product[];
  isCompareOpen: boolean;
  addToCompare: (product: Product) => { success: boolean; message?: string };
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  openCompare: () => void;
  closeCompare: () => void;
  isInCompare: (productId: string) => boolean;
}

export const useCompareStore = create<CompareState>()((set, get) => ({
  compareList: [],
  isCompareOpen: false,

  addToCompare: (product: Product) => {
    const { compareList } = get();

    // Already in list
    if (compareList.some((p) => p.id === product.id)) {
      return { success: false, message: "هذا المنتج مضاف بالفعل للمقارنة" };
    }

    // Max reached
    if (compareList.length >= MAX_COMPARE) {
      return {
        success: false,
        message: `يمكنك مقارنة ${MAX_COMPARE} منتجات كحد أقصى`,
      };
    }

    // Different category
    if (
      compareList.length > 0 &&
      compareList[0].category !== product.category
    ) {
      return {
        success: false,
        message: `لا يمكن مقارنة منتجات من فئات مختلفة. الفئة الحالية: "${compareList[0].category}"`,
        // Signal to caller that they should prompt user to clear and re-add 
      };
    }

    set({ compareList: [...compareList, product] });
    return { success: true };
  },

  removeFromCompare: (productId: string) => {
    set((state) => ({
      compareList: state.compareList.filter((p) => p.id !== productId),
      // Auto-close if empty
      isCompareOpen:
        state.compareList.length <= 1 ? false : state.isCompareOpen,
    }));
  },

  clearCompare: () => {
    set({ compareList: [], isCompareOpen: false });
  },

  openCompare: () => {
    set({ isCompareOpen: true });
  },

  closeCompare: () => {
    set({ isCompareOpen: false });
  },

  isInCompare: (productId: string) => {
    return get().compareList.some((p) => p.id === productId);
  },
}));
