import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AITagSuggestion } from "@/services/ai-tag-service";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AITagConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AITagSuggestion[];
  bookTitle: string;
  bookAuthor?: string;
  onConfirm: (selectedTags: { name: string; isExisting: boolean; existingTagId?: string }[]) => void;
  isLoading?: boolean;
}

interface SelectableTag extends AITagSuggestion {
  selected: boolean;
}

export default function AITagConfirmDialog({
  isOpen,
  onClose,
  suggestions,
  bookTitle,
  bookAuthor,
  onConfirm,
  isLoading = false,
}: AITagConfirmDialogProps) {
  const [selectableTags, setSelectableTags] = useState<SelectableTag[]>([]);

  // 当suggestions变化时更新可选择标签
  useEffect(() => {
    setSelectableTags(
      suggestions.map((suggestion) => ({
        ...suggestion,
        selected: true, // 默认全选
      })),
    );
  }, [suggestions]);

  // 切换标签选中状态
  const toggleTagSelection = useCallback((index: number) => {
    setSelectableTags((prev) => prev.map((tag, i) => (i === index ? { ...tag, selected: !tag.selected } : tag)));
  }, []);

  // 切换全选状态
  const toggleSelectAll = useCallback(() => {
    const allSelected = selectableTags.every((tag) => tag.selected);
    setSelectableTags((prev) => prev.map((tag) => ({ ...tag, selected: !allSelected })));
  }, [selectableTags]);

  // 处理确认操作
  const handleConfirm = useCallback(() => {
    const selectedTags = selectableTags
      .filter((tag) => tag.selected)
      .map((tag) => ({
        name: tag.name.trim(),
        isExisting: tag.isExisting,
        existingTagId: tag.existingTagId,
      }))
      .filter((tag) => tag.name.length > 0); // 过滤空标签

    onConfirm(selectedTags);
  }, [selectableTags, onConfirm]);

  const selectedCount = selectableTags.filter((tag) => tag.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            AI 标签建议
          </DialogTitle>
          <div className="mt-2 text-neutral-600 text-sm dark:text-neutral-400">
            《<span className="font-medium text-neutral-900 dark:text-neutral-100">{bookTitle}</span>》
            {bookAuthor && (
              <>
                {" "}
                by <span className="font-medium text-neutral-700 dark:text-neutral-300">{bookAuthor}</span>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-6 p-4">
          <div className="flex min-h-0 flex-1 flex-col space-y-4">
            <div className="flex flex-shrink-0 items-center justify-between">
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                建议标签 ({selectedCount} / {selectableTags.length} 选中)
              </h4>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectableTags.every((tag) => tag.selected) ? "全不选" : "全选"}
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {selectableTags.map((tag, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg bg-muted p-3 transition-colors">
                  <Checkbox checked={tag.selected} onCheckedChange={() => toggleTagSelection(index)} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tag.name}</span>
                      <Badge variant={tag.isExisting ? "default" : "secondary"} className="text-xs">
                        {tag.isExisting ? "现有标签" : "新标签"}
                      </Badge>
                    </div>

                    {tag.reason && <p className="text-neutral-600 text-xs dark:text-neutral-400">{tag.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-shrink-0 justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              取消
            </Button>
            <Button onClick={handleConfirm} disabled={selectedCount === 0 || isLoading} className="min-w-24">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border border-white/30 border-t-white" />
                  处理中...
                </div>
              ) : (
                <>确认添加 ({selectedCount})</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
