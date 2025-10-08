import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useProviderStore } from "@/store/provider-store";
import { Plus, Settings } from "lucide-react";
import { ProviderIcons } from "./settings-dialog";

interface ProvidersSettingsProps {
  onProviderSelect?: (providerId: string) => void;
}

export default function ProvidersSettings({ onProviderSelect }: ProvidersSettingsProps) {
  const { modelProviders, setModelProviders, addProvider } = useProviderStore();

  const toggleProviderEnabled = (providerId: string) => {
    const updatedProviders = modelProviders.map((provider) =>
      provider.provider === providerId ? { ...provider, active: !provider.active } : provider,
    );
    setModelProviders(updatedProviders);
  };

  const handleAddProvider = () => {
    const newProviderId = addProvider();
    onProviderSelect?.(newProviderId);
  };

  return (
    <div className="p-4 pt-3">
      <div className="rounded-lg bg-muted/80 p-4">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text dark:text-neutral-200">模型提供商</h2>
          <Button size="sm" className="rounded-sm text-xs" onClick={handleAddProvider}>
            <Plus className="h-4 w-4" />
            添加提供商
          </Button>
        </div>

        <div className="space-y-2">
          {modelProviders.map((provider, index) => {
            const providerName = provider.name;
            const modelCount = provider.models.length;

            return (
              <div key={provider.provider} className={cn("pt-2", index === 0 ? "" : "border-t")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ProviderIcons providerId={provider.provider} />
                    <div>
                      <span className="text-sm dark:text-neutral-200">{providerName}</span>
                      <p className="text-gray-600 text-xs dark:text-neutral-400">
                        {modelCount === 1 ? "个模型" : `${modelCount} 个模型`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => onProviderSelect?.(provider.provider)}
                    >
                      <Settings className="size-4" />
                    </Button>
                    <Switch
                      checked={provider.active}
                      onCheckedChange={() => toggleProviderEnabled(provider.provider)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
