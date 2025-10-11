import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

interface ModelEditDialogProps {
  open: boolean;
  mode: "add" | "edit";
  initialData?: { id: string; name: string };
  onSave: (data: { id: string; name: string }) => void;
  onCancel: () => void;
}

export default function ModelEditDialog({ open, mode, initialData, onSave, onCancel }: ModelEditDialogProps) {
  const [modelData, setModelData] = useState({ id: "", name: "" });

  useEffect(() => {
    if (open) {
      setModelData(initialData || { id: "", name: "" });
    }
  }, [open, initialData]);

  const handleSave = () => {
    const trimmedId = modelData.id.trim();
    if (!trimmedId) return;

    onSave({
      id: trimmedId,
      name: modelData.name.trim() || trimmedId,
    });
  };

  const handleCancel = () => {
    setModelData({ id: "", name: "" });
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => (open ? undefined : handleCancel())}>
      <DialogContent className="w-100 overflow-hidden rounded-2xl">
        <DialogHeader className="border-b px-5 py-4" showCloseButton>
          <DialogTitle className="font-semibold text-base dark:text-neutral-100">
            {mode === "add" ? "添加新模型" : "编辑模型"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 px-5 py-5">
          <div className="space-y-1.5">
            <Label className="font-medium text-neutral-600 text-xs dark:text-neutral-300">
              模型 ID {mode === "add" && <span className="text-red-500">*</span>}
            </Label>
            <Input
              value={modelData.id}
              onChange={(e) => setModelData((prev) => ({ ...prev, id: e.target.value }))}
              placeholder="gemini-1.5-flash"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-medium text-neutral-600 text-xs dark:text-neutral-300">模型名称</Label>
            <Input
              value={modelData.name}
              onChange={(e) => setModelData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Gemini 1.5 Flash"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} size="sm">
            取消
          </Button>
          <Button onClick={handleSave} disabled={!modelData.id.trim()} size="sm">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
