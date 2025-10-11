import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Pencil, Plus, RefreshCcw, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import ModelEditDialog from "./model-edit-dialog";
import ModelFilter, { type ModelFilterOptions } from "./model-filter";

interface ModelsManagementProps {
  provider: ModelProvider;
  isRefreshing: boolean;
  refreshError: string | null;
  onRefreshModels: () => void;
  onUpdateModel: (index: number, field: keyof Model, value: any) => void;
  onEditModel: (index: number, updates: { id: string; name: string }) => void;
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
  onEditModel,
  onRemoveModel,
  onAddModel,
  onClearAllModels,
}: ModelsManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editModelIndex, setEditModelIndex] = useState<number | null>(null);
  const [editModelData, setEditModelData] = useState<{ id: string; name: string } | undefined>(undefined);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [filters, setFilters] = useState<ModelFilterOptions>({
    searchTerm: "",
  });

  const filteredModels = useMemo(() => {
    if (!provider?.models) return [];

    const modelsWithIndex = provider.models.map((model, originalIndex) => ({
      ...model,
      originalIndex,
    }));

    return modelsWithIndex
      .filter((model) => {
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const matchId = model.id.toLowerCase().includes(searchLower);
          const matchName = model.name?.toLowerCase().includes(searchLower);
          if (!matchId && !matchName) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const activeDiff = Number(!!b.active) - Number(!!a.active);
        if (activeDiff !== 0) return activeDiff;
        return a.originalIndex - b.originalIndex;
      });
  }, [provider?.models, filters]);

  const addModel = () => {
    setDialogMode("add");
    setEditModelData(undefined);
    setEditModelIndex(null);
    setDialogOpen(true);
  };

  const openEditDialog = (originalIndex: number) => {
    const target = provider.models[originalIndex];
    if (!target) return;
    setDialogMode("edit");
    setEditModelIndex(originalIndex);
    setEditModelData({
      id: target.id,
      name: target.name ?? "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogMode("add");
    setEditModelIndex(null);
    setEditModelData(undefined);
  };

  const handleSaveModel = (data: { id: string; name: string }) => {
    if (dialogMode === "add") {
      onAddModel(data);
    } else if (editModelIndex !== null) {
      onEditModel(editModelIndex, data);
    }
    closeDialog();
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

      <ModelEditDialog
        open={dialogOpen}
        mode={dialogMode}
        initialData={editModelData}
        onSave={handleSaveModel}
        onCancel={closeDialog}
      />

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
                checked={model.active ?? false}
                onCheckedChange={(checked) => onUpdateModel(model.originalIndex, "active", checked)}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="break-all font-medium text-sm leading-tight dark:text-neutral-200">
                    {model.name?.trim() || model.id}
                  </span>
                  {model.manual && (
                    <span className="rounded bg-neutral-200 px-1 py-0.5 text-neutral-700 text-xs dark:bg-neutral-700 dark:text-neutral-300">
                      手动
                    </span>
                  )}
                </div>
                {model.name && model.name.trim() !== model.id && (
                  <span className="break-all text-neutral-500 text-xs leading-relaxed dark:text-neutral-400">
                    {model.id}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                onClick={() => openEditDialog(model.originalIndex)}
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                onClick={() => onRemoveModel(model.originalIndex)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        ))}

        {(!provider?.models || filteredModels.length === 0) && !dialogOpen && (
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
