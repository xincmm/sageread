import { QuoteBlock } from "@/components/ui/quote-block";
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
          <div className="flex flex-col gap-4">
            {note.title && (
              <QuoteBlock className="bg-neutral-200/60 px-3 py-2 text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200">
                {note.title}
              </QuoteBlock>
            )}
            <div className="whitespace-pre-wrap break-words text-neutral-900 dark:text-neutral-200">
              {note.content && note.content.trim().length > 0 ? note.content : "暂无想法"}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
