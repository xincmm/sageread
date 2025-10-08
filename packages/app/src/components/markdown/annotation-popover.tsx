import { Markdown } from "@/components/prompt-kit/markdown";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsChatPage } from "@/hooks/use-is-chat-page";
import { useReaderStore } from "@/pages/reader/components/reader-provider";
import { useChatReaderStore } from "@/store/chat-reader-store";
import { useThemeStore } from "@/store/theme-store";
import { Loader, SquareArrowOutUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAnnotationSearch } from "./hooks/use-annotation-search";

export function AnnotationPopover({ chunkId, children }: { chunkId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sideOffset, setSideOffset] = useState(16);
  const isChatPage = useIsChatPage();
  const triggerRef = useRef<HTMLSpanElement>(null);

  const chatActiveBookId = useChatReaderStore((state) => state.activeBookId);
  const readerBookId = useReaderStore((state) => state.bookId);
  const activeBookId = isChatPage ? chatActiveBookId : readerBookId;

  const { swapSidebars } = useThemeStore();
  const { loading, chunkData, error, searching, fetchChunkData, searchAndNavigate, resetError } = useAnnotationSearch();

  const shouldShowRight = isChatPage || swapSidebars;

  const handleSearchInReader = useCallback(async () => {
    const success = await searchAndNavigate();
    if (success) {
      setOpen(false);
    }
  }, [searchAndNavigate]);

  const calculateSideOffset = useCallback(() => {
    if (!triggerRef.current) return;

    try {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const chatSidebar = document.getElementById("chat-sidebar");
      if (!chatSidebar && !isChatPage) {
        return;
      }

      const sidebarRect = chatSidebar?.getBoundingClientRect();
      if (!sidebarRect) return;

      if (shouldShowRight) {
        const chatWidth = sidebarRect.width;
        const triggerLeft = triggerRect.left;
        const offset = chatWidth - triggerLeft - 60;
        const finalOffset = Math.max(16, offset);
        setSideOffset(finalOffset);
      } else {
        const targetLeft = sidebarRect.left;
        const currentLeft = triggerRect.left;
        const offset = currentLeft - targetLeft - 4;
        const finalOffset = Math.max(16, offset);
        setSideOffset(finalOffset);
      }
    } catch (error) {
      console.error("计算偏移量失败:", error);
    }
  }, [isChatPage, shouldShowRight]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      resetError();
      calculateSideOffset();
      if (!chunkData && !loading) {
        fetchChunkData(chunkId);
      }
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleResize = () => {
      calculateSideOffset();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open, calculateSideOffset]);

  useEffect(() => {
    if (!open || !activeBookId) return;

    const handleIframeClick = (event: MessageEvent) => {
      if (event.data?.type === "iframe-single-click" && event.data?.bookId === activeBookId) {
        setOpen(false);
      }
    };

    window.addEventListener("message", handleIframeClick);

    return () => {
      window.removeEventListener("message", handleIframeClick);
    };
  }, [open, activeBookId]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <span ref={triggerRef} className="cursor-pointer text-primary hover:underline">
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={shouldShowRight ? "right" : "left"}
        align="center"
        sideOffset={sideOffset}
        className="max-h-96 w-80 overflow-auto p-0"
      >
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="text-muted-foreground text-sm">加载中...</div>
          </div>
        ) : error ? (
          <div className="p-3 text-red-600 text-sm dark:text-red-400">错误: {error}</div>
        ) : chunkData ? (
          <div className="flex max-h-[320px] flex-col overflow-hidden bg-muted/80">
            <div className="border-b px-3 py-1 pr-2">
              <div className="flex items-center justify-between">
                <div
                  title={chunkData.related_chapter_titles}
                  className="mr-2 flex-1 truncate font-medium text-foreground"
                >
                  {chunkData.related_chapter_titles}
                </div>
                {!isChatPage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSearchInReader}
                    disabled={searching}
                    className="size-7 flex-shrink-0 rounded-full px-2 text-xs"
                    title="查看原文"
                  >
                    {searching ? (
                      <>
                        <Loader className="h-3 w-3 animate-spin" />
                      </>
                    ) : (
                      <>
                        <SquareArrowOutUpRight className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 pt-0">
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-foreground text-sm leading-relaxed">
                <Markdown>{chunkData.chunk_text}</Markdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 text-muted-foreground text-sm">点击查看原文内容</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
