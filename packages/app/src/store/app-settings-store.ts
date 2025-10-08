import { tauriStorageKey } from "@/constants/tauri-storage";
import { tauriStorage } from "@/lib/tauri-storage";
import {
  DEFAULT_BOOK_FONT,
  DEFAULT_BOOK_LAYOUT,
  DEFAULT_BOOK_STYLE,
  DEFAULT_CJK_VIEW_SETTINGS,
  DEFAULT_READSETTINGS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_VIEW_CONFIG,
  SYSTEM_SETTINGS_VERSION,
} from "@/services/constants";
import type { SystemSettings } from "@/types/settings";
import { isCJKEnv } from "@/utils/misc";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";

interface AppSettingsState {
  isSettingsDialogOpen: boolean;
  settings: SystemSettings;
  toggleSettingsDialog: () => void;
  setSettings: (settings: SystemSettings) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        isSettingsDialogOpen: false,
        settings: {
          ...DEFAULT_SYSTEM_SETTINGS,
          version: SYSTEM_SETTINGS_VERSION,
          globalReadSettings: DEFAULT_READSETTINGS,
          globalViewSettings: {
            ...DEFAULT_BOOK_LAYOUT,
            ...DEFAULT_BOOK_STYLE,
            ...DEFAULT_BOOK_FONT,
            ...(isCJKEnv() ? DEFAULT_CJK_VIEW_SETTINGS : {}),
            ...DEFAULT_VIEW_CONFIG,
          },
        } as SystemSettings,
        toggleSettingsDialog: () => set((state) => ({ isSettingsDialogOpen: !state.isSettingsDialogOpen })),
        setSettings: (settings: SystemSettings) => set({ settings }),
      }),
      {
        name: tauriStorageKey.appSettings,
        storage: createJSONStorage(() => tauriStorage),
        partialize: (state) => ({
          settings: state.settings,
        }),
      },
    ),
  ),
);
