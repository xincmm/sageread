import { type FontInfo, listFonts } from "@/services/font-service";
import { create } from "zustand";

interface FontStoreState {
  fonts: FontInfo[];
  isLoading: boolean;
  loadFonts: () => Promise<void>;
  refreshFonts: () => Promise<void>;
}

export const useFontStore = create<FontStoreState>((set) => ({
  fonts: [],
  isLoading: false,

  loadFonts: async () => {
    set({ isLoading: true });
    try {
      const fontList = await listFonts();
      set({ fonts: fontList, isLoading: false });
    } catch (error) {
      console.error("[FontStore] Failed to load fonts:", error);
      set({ fonts: [], isLoading: false });
    }
  },

  refreshFonts: async () => {
    const fontList = await listFonts();
    set({ fonts: fontList });
  },
}));
