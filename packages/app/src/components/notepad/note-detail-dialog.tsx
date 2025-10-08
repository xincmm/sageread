import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Note } from "@/types/note";
import dayjs from "dayjs";

interface NoteDetailDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteDetailDialog({ note, open, onOpenChange }: NoteDetailDialogProps) {
  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note.title || "无标题"}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <div className="mt-2 flex flex-col gap-1 text-mutedx text-sm">
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
          <div className="whitespace-pre-wrap break-words text-neutral-900 dark:text-neutral-300">
            {note.content || "暂无内容"}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
