import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Pencil, Plus, RefreshCcw, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newModelData, setNewModelData] = useState({ id: "", name: "" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editModelIndex, setEditModelIndex] = useState<number | null>(null);
  const [editModelData, setEditModelData] = useState({ id: "", name: "" });
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
    const tempId = `temp-${Date.now()}`;
    setEditingModelId(tempId);
    setNewModelData({ id: "", name: "" });
  };

  const openEditDialog = (originalIndex: number) => {
    const target = provider.models[originalIndex];
    if (!target) return;
    setEditModelIndex(originalIndex);
    setEditModelData({
      id: target.id,
      name: target.name ?? "",
    });
    setEditDialogOpen(true);
    setEditingModelId(null);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditModelIndex(null);
    setEditModelData({ id: "", name: "" });
  };

  const saveEditedModel = () => {
    if (editModelIndex == null) return;
    const trimmedId = editModelData.id.trim();
    if (!trimmedId) return;
    const trimmedName = editModelData.name.trim();

    onEditModel(editModelIndex, { id: trimmedId, name: trimmedName || trimmedId });
    closeEditDialog();
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
                checked={model.active ?? false}
                onCheckedChange={(checked) => onUpdateModel(model.originalIndex, "active", checked)}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm leading-tight dark:text-neutral-200 break-all">
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

        {(!provider?.models || filteredModels.length === 0) && !editingModelId && (
          <div className="py-8 text-center text-neutral-500 text-sm dark:text-neutral-200">
            {!provider?.models || provider.models.length === 0
              ? '未配置模型。点击"添加模型"开始。'
              : "没有模型匹配当前筛选条件。"}
          </div>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={(open) => (open ? setEditDialogOpen(true) : closeEditDialog())}>
        <DialogContent className="sm:max-w-[420px] overflow-hidden rounded-2xl border-neutral-200 bg-background p-0 shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
          <DialogHeader className="border-b px-5 py-4" showCloseButton>
            <DialogTitle className="text-base font-semibold dark:text-neutral-100">编辑模型</DialogTitle>
            <DialogDescription className="px-0 text-muted-foreground text-xs">
              更新模型 ID 与显示名称，保持列表整洁一致。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-5 py-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">模型 ID</Label>
              <Input
                value={editModelData.id}
                onChange={(e) => setEditModelData((prev) => ({ ...prev, id: e.target.value }))}
                placeholder="gemini-1.5-flash"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">显示名称</Label>
              <Input
                value={editModelData.name}
                onChange={(e) => setEditModelData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Gemini 1.5 Flash"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="border-t px-5 py-4">
            <Button variant="outline" onClick={closeEditDialog} className="h-9 text-sm">
              取消
            </Button>
            <Button onClick={saveEditedModel} disabled={!editModelData.id.trim()} className="h-9 text-sm">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
