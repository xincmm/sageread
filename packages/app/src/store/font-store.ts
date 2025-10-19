import { type FontInfo, type SystemFontInfo, listFonts, listSystemFonts } from "@/services/font-service";
import { create } from "zustand";

interface FontStoreState {
  fonts: FontInfo[];
  systemFonts: SystemFontInfo[];
  isLoading: boolean;
  isSystemLoading: boolean;
  loadFonts: () => Promise<void>;
  refreshFonts: () => Promise<void>;
  loadSystemFonts: () => Promise<void>;
}

export const useFontStore = create<FontStoreState>((set) => ({
  fonts: [],
  systemFonts: [],
  isLoading: false,
  isSystemLoading: false,

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

  loadSystemFonts: async () => {
    set({ isSystemLoading: true });
    try {
      const systemFonts = await listSystemFonts();
      set({ systemFonts, isSystemLoading: false });
    } catch (error) {
      console.error("[FontStore] Failed to load system fonts:", error);
      set({ systemFonts: [], isSystemLoading: false });
    }
  },
}));
