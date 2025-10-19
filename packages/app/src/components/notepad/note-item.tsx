import { QuoteBlock } from "@/components/ui/quote-block";
import type { Note } from "@/types/note";
import { Menu } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useNotepad } from "./hooks";
import { NoteDetailDialog } from "./note-detail-dialog";

interface NoteItemProps {
  note: Note;
}

export const NoteItem = ({ note }: NoteItemProps) => {
  const { handleDeleteNote } = useNotepad();
  const [showDetail, setShowDetail] = useState(false);
  const [currentNote, setCurrentNote] = useState(note);

  useEffect(() => {
    setCurrentNote(note);
  }, [note]);

  const handleNativeDelete = useCallback(async () => {
    try {
      const preview = currentNote.content || "";
      const confirmed = await ask(
        `确定要删除这条笔记吗？\n\n"${preview.length > 50 ? `${preview.substring(0, 50)}...` : preview}"\n\n此操作无法撤销。`,
        {
          title: "确认删除",
          kind: "warning",
        },
      );

      if (confirmed) {
        await handleDeleteNote(currentNote.id);
      }
    } catch (error) {
      console.error("删除笔记失败:", error);
    }
  }, [currentNote, handleDeleteNote]);

  const handleClick = useCallback(() => {
    setShowDetail(true);
  }, []);

  const handleMenuClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const menu = await Menu.new({
          items: [
            {
              id: "delete",
              text: "删除",
              action: () => {
                handleNativeDelete();
              },
            },
          ],
        });

        await menu.popup(new LogicalPosition(e.clientX, e.clientY));
      } catch (error) {
        console.error("显示菜单失败:", error);
      }
    },
    [handleNativeDelete],
  );

  return (
    <>
      <div
        className="group cursor-pointer rounded-lg bg-muted p-2"
        onClick={handleClick}
        onContextMenu={handleMenuClick}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            {currentNote.title && (
              <QuoteBlock
                className="bg-neutral-200/60 px-3 py-2 text-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200"
                contentClassName="line-clamp-3"
              >
                {currentNote.title}
              </QuoteBlock>
            )}

            {currentNote.content && (
              <p className="line-clamp-3 select-auto text-neutral-700 text-sm leading-5 dark:text-neutral-200">
                {currentNote.content}
              </p>
            )}

            {!currentNote.title && !currentNote.content && (
              <p className="select-auto text-neutral-500 text-sm">暂无内容</p>
            )}

            <div className="text-neutral-800 text-xs dark:text-neutral-500">
              {dayjs(currentNote.createdAt).format("YYYY-MM-DD HH:mm:ss")}
            </div>
          </div>
        </div>
      </div>

      <NoteDetailDialog
        note={currentNote}
        open={showDetail}
        onOpenChange={setShowDetail}
        onNoteUpdated={setCurrentNote}
      />
    </>
  );
};
