import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fetchModelsFromProvider } from "@/services/provider-service";
import { useProviderStore } from "@/store/provider-store";
import { throttle } from "@/utils/throttle";
import { ask } from "@tauri-apps/plugin-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ApiConfigSection from "./api-config-section";
import ModelsManagement from "./models-management";
import { ProviderIcons } from "./settings-dialog";

interface ProviderDetailSettingsProps {
  providerId: string;
  onBack: () => void;
}

export default function ProviderDetailSettings({ providerId, onBack }: ProviderDetailSettingsProps) {
  const { modelProviders, updateProvider, removeProvider } = useProviderStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const [localName, setLocalName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const provider = modelProviders.find((p) => p.provider === providerId);
  const isCustomProvider = providerId.startsWith("custom-");

  useEffect(() => {
    if (provider?.name === "untitled") {
      setIsEditingName(true);
    }
  }, [provider?.name]);

  useEffect(() => {
    if (isEditingName) {
      setLocalName(provider?.name || "");
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isEditingName, provider?.name]);

  const throttledUpdate = useMemo(
    () =>
      throttle((field: string, value: any) => {
        updateProvider(providerId, { [field]: value });
      }, 200),
    [providerId, updateProvider],
  );

  const handleFieldChange = (field: string, value: any) => {
    throttledUpdate(field, value);
  };

  const handleAddModel = (newModel: Omit<Model, "active" | "description" | "capabilities" | "manual">) => {
    if (!provider) return;

    const modelWithDefaults = {
      ...newModel,
      active: true,
      description: "",
      capabilities: [],
      manual: true,
    };

    updateProvider(providerId, {
      models: [...provider.models, modelWithDefaults],
    });
  };

  const handleClearAllModels = () => {
    if (provider) {
      updateProvider(providerId, {
        models: [],
      });
    }
  };

  const handleUpdateModel = (index: number, field: keyof Model, value: any) => {
    if (provider) {
      const updatedModels = provider.models.map((model, i) => (i === index ? { ...model, [field]: value } : model));
      updateProvider(providerId, {
        models: updatedModels,
      });
    }
  };

  const handleRemoveModel = (index: number) => {
    if (provider) {
      updateProvider(providerId, {
        models: provider.models.filter((_, i) => i !== index),
      });
    }
  };

  const handleRefreshModels = async () => {
    if (!provider || !provider.baseUrl) {
      setRefreshError("请先配置基础URL");
      return;
    }

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const modelIds = await fetchModelsFromProvider({
        ...provider,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
      });

      const existingModelMap = new Map(provider.models.map((model) => [model.id, model.active ?? true]));

      const defaultActive = isCustomProvider ? false : providerId !== "openrouter";

      const newModels: Model[] = modelIds.map((id) => ({
        id,
        name: id,
        active: existingModelMap.has(id) ? existingModelMap.get(id)! : defaultActive,
        description: "",
        capabilities: [],
        manual: false,
      }));

      const existingManualModels = provider.models.filter((model) => model.manual === true);

      const updatedModels = [...newModels, ...existingManualModels];

      updateProvider(providerId, {
        models: updatedModels,
      });
    } catch (error) {
      console.error("Failed to refresh models:", error);
      setRefreshError(error instanceof Error ? error.message : "Failed to fetch models from provider");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!provider) return;

    const confirmed = await ask(`确定要删除此提供商吗?\n\n"${provider.name}"\n\n删除后无法恢复。`, {
      title: "确认删除",
      kind: "warning",
    });

    if (confirmed) {
      removeProvider(providerId);
      onBack();
    }
  };

  if (!provider) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500 dark:text-neutral-400">未找到提供商</div>
      </div>
    );
  }

  const providerName = provider.name;

  const handleNameBlur = () => {
    const trimmedName = localName.trim();
    updateProvider(providerId, { name: trimmedName || "untitled" });
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-2"
          onMouseEnter={() => setIsHoveringName(true)}
          onMouseLeave={() => setIsHoveringName(false)}
        >
          <ProviderIcons providerId={providerId} />
          {isEditingName ? (
            <Input
              ref={inputRef}
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="h-7 w-40 text-sm dark:text-neutral-200"
              placeholder="Provider Name"
            />
          ) : (
            <div onClick={() => setIsEditingName(true)} className="flex h-7 cursor-pointer items-center gap-2">
              <span className="font-medium dark:text-neutral-200">{providerName}</span>
              {isHoveringName && (
                <button className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
                  <Pencil className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={provider?.active ?? true}
            onCheckedChange={(checked) => handleFieldChange("active", checked)}
          />
          {isCustomProvider && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="size-8 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <ApiConfigSection provider={provider} onFieldChange={handleFieldChange} />
        <ModelsManagement
          provider={provider}
          isRefreshing={isRefreshing}
          refreshError={refreshError}
          onRefreshModels={handleRefreshModels}
          onUpdateModel={handleUpdateModel}
          onRemoveModel={handleRemoveModel}
          onAddModel={handleAddModel}
          onClearAllModels={handleClearAllModels}
        />
      </div>
    </div>
  );
}
