import type { SessionInfo } from "@/components/settings/llama-client";
import { LlamaServerManager, LlamacppClient } from "@/components/settings/llama-client";
import { PRESET_EMBEDDING_MODELS, PRESET_MODELS_VERSION, type PresetModel } from "@/constants/preset-models";
import { tauriStorageKey } from "@/constants/tauri-storage";
import { tauriStorage } from "@/lib/tauri-storage";
import { getAppDataDir } from "@/services/model-service";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface VectorModelConfig {
  id: string;
  name: string;
  url: string;
  modelId: string;
  apiKey: string;
  description?: string;
  dimension?: number;
}

export interface ModelDownloadState {
  isDownloading: boolean;
  filename: string;
  progress: {
    percent: number;
    downloaded: number;
    total: number;
  };
}

function mergePresetModels(storedModels: PresetModel[], presetModels: PresetModel[]): PresetModel[] {
  const mergedMap = new Map<string, PresetModel>();

  for (const preset of presetModels) {
    mergedMap.set(preset.id, { ...preset });
  }

  for (const stored of storedModels) {
    const existing = mergedMap.get(stored.id);
    if (existing && stored.downloaded) {
      mergedMap.set(stored.id, { ...existing, downloaded: true });
    }
  }

  return Array.from(mergedMap.values());
}

interface LlamaState {
  serverStatus: string;
  currentSession: SessionInfo | null;
  modelPath: string;
  testText: string;
  vectorModels: VectorModelConfig[];
  selectedVectorModelId: string | null;
  vectorModelEnabled: boolean;
  embeddingModels: PresetModel[];
  downloadState: ModelDownloadState | null;
  hasHydrated: boolean;

  setServerStatus: (status: string) => void;
  setCurrentSession: (session: SessionInfo | null) => void;
  setModelPath: (path: string) => void;
  setTestText: (text: string) => void;
  reset: () => void;
  setVectorModelEnabled: (enabled: boolean) => void;
  setVectorModels: (models: VectorModelConfig[]) => void;
  addVectorModel: (model: VectorModelConfig) => void;
  updateVectorModel: (id: string, updates: Partial<VectorModelConfig>) => void;
  deleteVectorModel: (id: string) => void;
  setSelectedVectorModelId: (id: string | null) => void;
  getSelectedVectorModel: () => VectorModelConfig | null;
  hasVectorCapability: () => boolean;
  resetVectorModels: () => void;
  setEmbeddingModels: (models: PresetModel[]) => void;
  addEmbeddingModel: (model: PresetModel) => void;
  updateEmbeddingModel: (filename: string, updates: Partial<PresetModel>) => void;
  deleteEmbeddingModel: (filename: string) => void;
  setDownloadState: (state: ModelDownloadState | null) => void;
  updateDownloadProgress: (progress: { percent: number; downloaded: number; total: number }) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  initializeEmbeddingService: () => Promise<void>;
}

export const useLlamaStore = create<LlamaState>()(
  persist(
    (set, get) => ({
      serverStatus: "",
      currentSession: null,
      modelPath: "",
      testText: "核心是什么？",
      vectorModels: [],
      selectedVectorModelId: null,
      vectorModelEnabled: false,
      embeddingModels: PRESET_EMBEDDING_MODELS,
      downloadState: null,
      hasHydrated: false,

      setServerStatus: (serverStatus) => set({ serverStatus }),
      setCurrentSession: (currentSession) => set({ currentSession }),
      setModelPath: (modelPath) => set({ modelPath }),
      setTestText: (testText) => set({ testText }),
      reset: () => set({ serverStatus: "", currentSession: null }),

      setVectorModelEnabled: (vectorModelEnabled) => set({ vectorModelEnabled }),
      setVectorModels: (vectorModels) => set({ vectorModels }),
      addVectorModel: (model) => {
        const { vectorModels } = get();
        set({ vectorModels: [...vectorModels, model] });
      },
      updateVectorModel: (id, updates) => {
        const { vectorModels } = get();
        set({
          vectorModels: vectorModels.map((model) => (model.id === id ? { ...model, ...updates } : model)),
        });
      },
      deleteVectorModel: (id) => {
        const { vectorModels, selectedVectorModelId } = get();
        const newModels = vectorModels.filter((model) => model.id !== id);
        const newSelected = selectedVectorModelId === id ? null : selectedVectorModelId;
        set({ vectorModels: newModels, selectedVectorModelId: newSelected });
      },
      setSelectedVectorModelId: (selectedVectorModelId) => set({ selectedVectorModelId }),
      getSelectedVectorModel: () => {
        const { vectorModels, selectedVectorModelId } = get();
        return vectorModels.find((model) => model.id === selectedVectorModelId) || null;
      },
      hasVectorCapability: () => {
        const { vectorModelEnabled, modelPath } = get();
        if (vectorModelEnabled) {
          const selectedModel = get().getSelectedVectorModel();
          return selectedModel != null || (modelPath != null && modelPath !== "");
        }
        return modelPath != null && modelPath !== "";
      },
      resetVectorModels: () =>
        set({
          vectorModels: [],
          selectedVectorModelId: null,
          vectorModelEnabled: false,
        }),

      setEmbeddingModels: (embeddingModels) => set({ embeddingModels }),
      addEmbeddingModel: (model) => {
        const { embeddingModels } = get();
        set({ embeddingModels: [...embeddingModels, model] });
      },
      updateEmbeddingModel: (filename, updates) => {
        const { embeddingModels } = get();
        set({
          embeddingModels: embeddingModels.map((model) =>
            model.filename === filename ? { ...model, ...updates } : model,
          ),
        });
      },
      deleteEmbeddingModel: (filename) => {
        const { embeddingModels, modelPath } = get();
        const newModels = embeddingModels.filter((model) => model.filename !== filename);
        const newModelPath = modelPath === filename ? "" : modelPath;
        set({ embeddingModels: newModels, modelPath: newModelPath });
      },

      setDownloadState: (downloadState) => set({ downloadState }),
      updateDownloadProgress: (progress) => {
        const { downloadState } = get();
        if (downloadState) {
          set({
            downloadState: {
              ...downloadState,
              progress,
            },
          });
        }
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      initializeEmbeddingService: async () => {
        const { currentSession, vectorModelEnabled, modelPath } = get();

        if (currentSession) return;

        if (vectorModelEnabled) {
          const selectedModel = get().getSelectedVectorModel();
          if (selectedModel) {
            console.log(`使用远程向量模型：${selectedModel.name}`);
            return;
          }
          console.log("向量模型已启用但未配置有效模型，回退到本地模型");
        }

        if (!modelPath) {
          console.log("未选择本地模型，跳过自动启动");
          return;
        }

        try {
          const client = new LlamacppClient();
          const sessions = await client.getAllSessions();
          if (sessions && sessions.length > 0) {
            set({ currentSession: sessions[0] });
            set({ serverStatus: `检测到已运行的服务器 | PID: ${sessions[0].pid} | Port: ${sessions[0].port}` });
            return;
          }

          set({ serverStatus: "启动 Embedding 服务器…" });
          const serverManager = new LlamaServerManager();

          const appDataDir = await getAppDataDir();
          const fullModelPath = `${appDataDir}/llamacpp/models/${modelPath}`;

          const session = await serverManager.startEmbeddingServer(fullModelPath);
          set({ currentSession: session });
          set({ serverStatus: `服务器启动成功 | PID: ${session.pid} | Port: ${session.port}` });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          set({ serverStatus: `自动启动失败：${msg}` });
          console.error("自动启动 Llama 服务器失败:", error);
        }
      },
    }),
    {
      name: tauriStorageKey.llamaStore,
      storage: createJSONStorage(() => tauriStorage),
      version: PRESET_MODELS_VERSION,
      migrate: (persistedState: any, version: number) => {
        if (version < PRESET_MODELS_VERSION) {
          const merged = mergePresetModels(persistedState.embeddingModels || [], PRESET_EMBEDDING_MODELS);
          persistedState.embeddingModels = merged;
        }
        return persistedState;
      },
      partialize: (state) => ({
        vectorModels: state.vectorModels,
        selectedVectorModelId: state.selectedVectorModelId,
        vectorModelEnabled: state.vectorModelEnabled,
        embeddingModels: state.embeddingModels,
        modelPath: state.modelPath,
        testText: state.testText,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
