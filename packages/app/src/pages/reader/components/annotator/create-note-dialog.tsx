import { Button } from "@/components/ui/button";
import { QuoteBlock } from "@/components/ui/quote-block";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type React from "react";

interface CreateNoteDialogProps {
  open: boolean;
  quote: string;
  note: string;
  isSubmitting?: boolean;
  onNoteChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export const CreateNoteDialog: React.FC<CreateNoteDialogProps> = ({
  open,
  quote,
  note,
  isSubmitting = false,
  onNoteChange,
  onOpenChange,
  onSubmit,
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-4 py-4">
          <DialogTitle>创建笔记</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
          <QuoteBlock className="bg-muted px-3 py-2 text-left text-sm leading-5 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
            {quote}
          </QuoteBlock>
          <div className="space-y-2">
            <Label htmlFor="note-thoughts">我的想法（可选）</Label>
            <Textarea
              id="note-thoughts"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="写下你的思考、问题或感受"
              className="min-h-28"
            />
          </div>
          <DialogFooter className="px-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !quote.trim()}>
              {isSubmitting ? "保存中..." : "保存笔记"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
