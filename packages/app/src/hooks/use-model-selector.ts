import { createModelInstance } from "@/ai/providers/factory";
import { type SelectedModel, useProviderStore } from "@/store/provider-store";
import { useCallback, useEffect, useMemo } from "react";

export function useModelSelector(defaultProviderId?: string, defaultModelId?: string) {
  const { modelProviders, selectedModel, setSelectedModel } = useProviderStore();

  useEffect(() => {
    if (!selectedModel) {
      let initialModel: SelectedModel | null = null;

      if (defaultProviderId && defaultModelId) {
        const provider = modelProviders.find((p) => p.provider === defaultProviderId && p.active);
        if (provider) {
          const model = provider.models.find((m) => m.id === defaultModelId && m.active);
          if (model) {
            initialModel = {
              modelId: model.id,
              providerId: provider.provider,
              providerName: provider.name,
              modelName: model.name || model.id,
            };
          }
        }
      }

      if (!initialModel) {
        for (const provider of modelProviders) {
          if (!provider.active) continue;

          const activeModel = provider.models.find((m) => m.active);
          if (activeModel) {
            initialModel = {
              modelId: activeModel.id,
              providerId: provider.provider,
              providerName: provider.name,
              modelName: activeModel.name || activeModel.id,
            };
            break;
          }
        }
      }

      if (initialModel) {
        setSelectedModel(initialModel);
      }
    }
  }, [selectedModel, modelProviders, defaultProviderId, defaultModelId, setSelectedModel]);

  const currentModelInstance = useMemo(() => {
    if (!selectedModel) return null;

    try {
      return createModelInstance(selectedModel.providerId, selectedModel.modelId);
    } catch (error) {
      console.error("Failed to create model instance:", error);
      return null;
    }
  }, [selectedModel]);

  const handleModelSelect = useCallback(
    (model: SelectedModel) => {
      setSelectedModel(model);
    },
    [setSelectedModel],
  );

  const availableModels = useMemo(() => {
    return modelProviders
      .filter((provider) => provider.active)
      .flatMap((provider) =>
        provider.models
          .filter((model) => model.active)
          .map((model) => ({
            modelId: model.id,
            providerId: provider.provider,
            providerName: provider.name,
            modelName: model.name || model.id,
            providerIcon: provider.icon,
          })),
      );
  }, [modelProviders]);

  return {
    selectedModel,
    setSelectedModel: handleModelSelect,
    currentModelInstance,
    availableModels,
  };
}
