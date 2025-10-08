import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TTSConfig {
  apiKey: string;
  voice: string;
  languageType: string;
}

interface TTSStore {
  config: TTSConfig;
  setApiKey: (apiKey: string) => void;
  setVoice: (voice: string) => void;
  setLanguageType: (languageType: string) => void;
  setConfig: (config: Partial<TTSConfig>) => void;
}

export const useTTSStore = create<TTSStore>()(
  persist(
    (set) => ({
      config: {
        apiKey: "",
        voice: "Cherry",
        languageType: "Chinese",
      },
      setApiKey: (apiKey) =>
        set((state) => ({
          config: { ...state.config, apiKey },
        })),
      setVoice: (voice) =>
        set((state) => ({
          config: { ...state.config, voice },
        })),
      setLanguageType: (languageType) =>
        set((state) => ({
          config: { ...state.config, languageType },
        })),
      setConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),
    }),
    {
      name: "tts-config-storage",
    },
  ),
);
