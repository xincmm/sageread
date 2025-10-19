import { QuoteBlock } from "@/components/ui/quote-block";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useNotepad } from "./hooks";
import type { Note } from "@/types/note";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

interface NoteDetailDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteUpdated?: (note: Note) => void;
}

export function NoteDetailDialog({
  note,
  open,
  onOpenChange,
  onNoteUpdated,
}: NoteDetailDialogProps) {
  const { handleUpdateNote } = useNotepad({ bookId: note?.bookId });
  const [noteValue, setNoteValue] = useState(note?.content ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!note || !open) return;
    setNoteValue(note.content ?? "");
  }, [note, open]);

  const hasChanges = useMemo(() => {
    if (!note) return false;
    const originalNote = note.content ?? "";
    return noteValue !== originalNote;
  }, [note, noteValue]);

  const handleSave = async () => {
    if (!note || !hasChanges) return;
    try {
      setSaving(true);
      const updatedNote = await handleUpdateNote({
        id: note.id,
        content: noteValue.trim().length > 0 ? noteValue.trim() : null,
      });

      if (updatedNote) {
        onNoteUpdated?.(updatedNote);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("更新笔记失败:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>笔记详情</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <div className="mt-2 flex flex-col gap-1 text-muted-foreground text-sm">
            <div className="flex items-center gap-1">
              <div>{dayjs(note.createdAt).format("YYYY-MM-DD HH:mm:ss")}</div>
            </div>

            {note.bookMeta && (
              <div>
                关联书籍: {note.bookMeta.title}
                {note.bookMeta.author && ` - ${note.bookMeta.author}`}
              </div>
            )}
          </div>
        </DialogDescription>
        <ScrollArea className="max-h-[60vh] min-h-[200px] px-4 py-2">
          <div className="flex flex-col gap-4 pr-2">
            {note.title && (
              <div className="space-y-2">
                <span className="font-medium text-neutral-600 text-sm dark:text-neutral-300">
                  引用内容
                </span>
                <QuoteBlock className="bg-neutral-200/60 px-3 py-2 text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200">
                  {note.title}
                </QuoteBlock>
              </div>
            )}
            <div className="space-y-2">
              <span className="font-medium text-neutral-600 text-sm dark:text-neutral-300">
                我的想法
              </span>
              <Textarea
                id="note-content"
                value={noteValue}
                onChange={(event) => setNoteValue(event.target.value)}
                placeholder="写下你的思考、问题或感受"
                className="min-h-28"
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? "保存中..." : "保存修改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
