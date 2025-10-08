import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Plus, RefreshCcw, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import ModelFilter, { type ModelFilterOptions } from "./model-filter";

interface ModelsManagementProps {
  provider: ModelProvider;
  isRefreshing: boolean;
  refreshError: string | null;
  onRefreshModels: () => void;
  onUpdateModel: (index: number, field: keyof Model, value: any) => void;
  onRemoveModel: (index: number) => void;
  onAddModel: (model: Omit<Model, "active" | "description" | "capabilities" | "manual">) => void;
  onClearAllModels: () => void;
}

export default function ModelsManagement({
  provider,
  isRefreshing,
  refreshError,
  onRefreshModels,
  onUpdateModel,
  onRemoveModel,
  onAddModel,
  onClearAllModels,
}: ModelsManagementProps) {
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newModelData, setNewModelData] = useState({ id: "", name: "" });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [filters, setFilters] = useState<ModelFilterOptions>({
    searchTerm: "",
  });

  const filteredModels = useMemo(() => {
    if (!provider?.models) return [];

    return provider.models
      .filter((model) => {
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const matchId = model.id.toLowerCase().includes(searchLower);
          const matchName = model.name?.toLowerCase().includes(searchLower);
          if (!matchId && !matchName) return false;
        }

        return true;
      })
      .map((model) => ({
        ...model,
        originalIndex: provider.models.findIndex((m) => m.id === model.id),
      }))
      .sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [provider?.models, filters]);

  const addModel = () => {
    const tempId = `temp-${Date.now()}`;
    setEditingModelId(tempId);
    setNewModelData({ id: "", name: "" });
  };

  const saveNewModel = () => {
    if (!newModelData.id.trim()) return;

    const newModel = {
      id: newModelData.id.trim(),
      name: newModelData.name.trim() || newModelData.id.trim(),
    };

    onAddModel(newModel);
    setEditingModelId(null);
    setNewModelData({ id: "", name: "" });
  };

  const cancelNewModel = () => {
    setEditingModelId(null);
    setNewModelData({ id: "", name: "" });
  };

  const handleClearAllModels = () => {
    onClearAllModels();
    setShowClearConfirm(false);
  };

  const shouldShowFilter = provider?.provider === "openrouter" || (provider?.models?.length ?? 0) > 10;

  return (
    <div className="space-y-4 rounded-lg bg-muted/80 p-4 pt-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm dark:text-neutral-200">模型</h3>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="size-7"
                onClick={onRefreshModels}
                variant="outline"
                disabled={isRefreshing || !provider?.baseUrl}
              >
                <RefreshCcw className={`size-3 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isRefreshing ? "刷新中..." : "刷新"}</TooltipContent>
          </Tooltip>
          {provider?.models && provider.models.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" className="size-7" onClick={() => setShowClearConfirm(true)} variant="soft">
                  <X className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>清空全部</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="size-7" onClick={addModel} size="icon">
                <Plus className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>新增模型</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {refreshError && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 text-xs dark:bg-red-900/20 dark:text-red-200">
          <strong>错误：</strong> {refreshError}
        </div>
      )}

      {showClearConfirm && (
        <div className="rounded-md bg-red-100 p-3 text-xs dark:bg-red-900/30 dark:text-red-100">
          <div className="flex items-center justify-between">
            <div>
              <strong>确认清空所有模型</strong>
              <p className="mt-1">这将永久删除所有模型。此操作无法撤销。</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleClearAllModels} variant="destructive" className="h-6 text-xs">
                删除全部
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowClearConfirm(false)} className="h-6 text-xs">
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      {shouldShowFilter && provider?.models && provider.models.length > 0 && (
        <ModelFilter
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={provider.models.length}
          filteredCount={filteredModels.length}
        />
      )}

      {editingModelId && (
        <div className="space-y-3 rounded-md border p-2 py-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm dark:text-neutral-200">添加新模型</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNewModel} disabled={!newModelData.id.trim()} className="h-6 text-xs">
                保存
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelNewModel} className="h-6 text-xs">
                取消
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                模型ID <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newModelData.id}
                onChange={(e) => setNewModelData((prev) => ({ ...prev, id: e.target.value }))}
                placeholder="gpt-4"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">显示名称</Label>
              <Input
                value={newModelData.name}
                onChange={(e) => setNewModelData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="GPT-4"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredModels.map((model, index) => (
          <div
            key={model.id}
            className={cn(
              "flex items-center justify-between border-neutral-200 border-t pt-3 pr-1 dark:border-neutral-700",
              index === 0 && "border-t-0 pt-1",
            )}
          >
            <div className="flex items-center gap-3">
              <Switch
                checked={model.active ?? true}
                onCheckedChange={(checked) => onUpdateModel(model.originalIndex, "active", checked)}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm dark:text-neutral-200">{model.id}</span>
                  {model.manual && (
                    <span className="rounded bg-neutral-200 px-1 py-0.5 text-neutral-700 text-xs dark:bg-neutral-700 dark:text-neutral-300">
                      手动
                    </span>
                  )}
                </div>
                {model.name && model.name !== model.id && (
                  <span className="text-neutral-500 text-xs dark:text-neutral-400">{model.name}</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              onClick={() => onRemoveModel(model.originalIndex)}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}

        {(!provider?.models || filteredModels.length === 0) && !editingModelId && (
          <div className="py-8 text-center text-neutral-500 text-sm dark:text-neutral-200">
            {!provider?.models || provider.models.length === 0
              ? '未配置模型。点击"添加模型"开始。'
              : "没有模型匹配当前筛选条件。"}
          </div>
        )}
      </div>
    </div>
  );
}
