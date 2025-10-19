import { useIsChatPage } from "@/hooks/use-is-chat-page";
import { useReaderStore } from "@/pages/reader/components/reader-provider";
import { type BookDataState, useChatReaderStore } from "@/store/chat-reader-store";
import { Check, Copy, NotebookPen, Quote } from "lucide-react";
import { useCallback, useState } from "react";
import { useNotepad } from "../notepad/hooks";

interface ChatSelectionPopupProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  onAskAi: (text: string) => void;
  popupRef?: React.RefObject<HTMLDivElement | null>;
}

export const ChatSelectionPopup = ({ selectedText, position, onClose, onAskAi, popupRef }: ChatSelectionPopupProps) => {
  let bookData: BookDataState | null;
  const isChatPage = useIsChatPage();
  if (isChatPage) {
    bookData = useChatReaderStore((state) => state.bookData);
  } else {
    bookData = useReaderStore((state) => state.bookData);
  }
  const { handleCreateNote } = useNotepad();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!selectedText.trim()) return;

      try {
        await navigator.clipboard.writeText(selectedText.trim());
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (error) {
        console.error("复制失败:", error);
      }
    },
    [selectedText],
  );

  const addNote = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!selectedText.trim()) return;

      try {
        const quote = selectedText.trim();

        let bookMeta = undefined;
        if (bookData?.book) {
          bookMeta = {
            title: bookData.book.title,
            author: bookData.book.author ?? "",
          };
        }

        await handleCreateNote({
          bookId: bookData?.id || undefined,
          bookMeta,
          title: quote,
        });
        onClose();
      } catch (error) {
        console.error("创建笔记失败:", error);
      }
    },
    [selectedText, bookData, handleCreateNote, onClose],
  );

  const handleAskAi = useCallback(() => {
    const text = selectedText.trim();
    if (!text) return;
    onAskAi(text);
    onClose();
  }, [selectedText, onAskAi, onClose]);

  return (
    <div
      ref={popupRef}
      className="fixed"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
    >
      <div className="rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        <div className="flex flex-nowrap items-center p-2 py-0.5">
          <div
            className="flex cursor-pointer items-center gap-1 border-r pr-2 hover:text-neutral-900 dark:hover:text-neutral-100"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </div>

          <div
            className="flex cursor-pointer items-center gap-1 border-r px-2 hover:text-neutral-900 dark:hover:text-neutral-100"
            onClick={addNote}
          >
            <NotebookPen className="size-4" />
            <span className="whitespace-nowrap text-sm">添加笔记</span>
          </div>

          <div
            className="flex cursor-pointer items-center gap-1 pl-2 hover:text-neutral-900 dark:hover:text-neutral-100"
            onClick={handleAskAi}
          >
            <Quote className="size-4" />
            <span className="whitespace-nowrap text-sm">Ask AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
