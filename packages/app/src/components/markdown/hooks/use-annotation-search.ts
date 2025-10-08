import { useIsChatPage } from "@/hooks/use-is-chat-page";
import { useReaderStore } from "@/pages/reader/components/reader-provider";
import { useChatReaderStore } from "@/store/chat-reader-store";
import type { BookSearchConfig, BookSearchResult } from "@/types/book";
import type { DocumentChunk } from "@/types/document";
import { createRejecttFilter } from "@/utils/node";
import { resolveMarkdownImagePaths } from "@/utils/path";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { getBestSearchSentence } from "../text-utils";

export function useAnnotationSearch() {
  const [loading, setLoading] = useState(false);
  const [chunkData, setChunkData] = useState<DocumentChunk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const isChatPage = useIsChatPage();

  const chatActiveBookId = useChatReaderStore((state) => state.activeBookId);
  const chatBookData = useChatReaderStore((state) => state.bookData);
  const chatConfig = useChatReaderStore((state) => state.config);

  const readerBookId = useReaderStore((state) => state.bookId);
  const readerBookData = useReaderStore((state) => state.bookData);
  const readerConfig = useReaderStore((state) => state.config);
  const readerView = useReaderStore((state) => state.view);
  const readerProgress = useReaderStore((state) => state.progress);

  const activeBookId = isChatPage ? chatActiveBookId : readerBookId;
  const bookData = isChatPage ? chatBookData : readerBookData;
  const config = isChatPage ? chatConfig : readerConfig;
  const view = isChatPage ? null : readerView;
  const progress = isChatPage ? null : readerProgress;

  const fetchChunkData = useCallback(
    async (chunkId: string) => {
      if (!activeBookId || !chunkId) return;

      setLoading(true);
      setError(null);

      try {
        const res = (await invoke("plugin:epub|get_chunk_with_context", {
          bookId: activeBookId,
          chunkId: Number.parseInt(chunkId),
          prevCount: 0,
          nextCount: 0,
        })) as DocumentChunk[];

        if (res.length > 0) {
          const chunk = res[0];

          // md_file_path 现在存储的是绝对路径，可以直接用于图片路径解析
          if (chunk.md_file_path) {
            try {
              chunk.chunk_text = await resolveMarkdownImagePaths(chunk.chunk_text, chunk.md_file_path);
            } catch (error) {
              console.warn(`Failed to resolve image paths in chunk ${chunk.id}:`, error);
            }
          }

          setChunkData(chunk);
        } else {
          setError("未找到对应的文本片段");
        }
      } catch (e: any) {
        console.error("获取 chunk 数据失败:", e);
        setError(typeof e === "string" ? e : e?.message || "获取文本片段失败");
      } finally {
        setLoading(false);
      }
    },
    [activeBookId],
  );

  const searchAndNavigate = useCallback(async () => {
    if (!chunkData || !activeBookId) return false;

    setSearching(true);
    setError(null);

    try {
      const searchQuery = getBestSearchSentence(chunkData.chunk_text);

      if (!searchQuery || searchQuery.length < 3) {
        setError("无法提取有效的搜索关键词");
        return false;
      }
      if (!view || !config || !bookData || !progress) {
        setError("阅读器未就绪，请稍后重试");
        return false;
      }

      try {
        view.clearSearch();
      } catch (e) {}

      const searchConfig = config.searchConfig as BookSearchConfig;
      const primaryLang = bookData.book?.primaryLanguage || "en";
      const { pageinfo } = progress;
      const index = searchConfig.scope === "section" ? pageinfo.current : undefined;

      view.setSearchIndicator("arrow", {
        color: "#ff4444",
        size: 24,
        animated: true,
        autoHide: true,
        hideDelay: 6000,
        offset: 15,
      });

      const generator = await view.search({
        ...searchConfig,
        index,
        query: searchQuery,
        acceptNode: createRejecttFilter({
          tags: primaryLang.startsWith("ja") ? ["rt"] : [],
        }),
      });

      const results: BookSearchResult[] = [];
      let foundFirst = false;

      for await (const result of generator) {
        if (typeof result === "string") {
          if (result === "done") {
            if (results.length === 0) {
              setError("未找到匹配的内容");
              return false;
            }
            return true;
          }
        } else {
          if (result.progress) {
          } else {
            results.push(result);

            if (!foundFirst) {
              foundFirst = true;
              let firstCfi: string | undefined;
              if ("subitems" in result && result.subitems && result.subitems.length > 0) {
                firstCfi = result.subitems[0].cfi;
              } else if ("cfi" in result) {
                firstCfi = (result as any).cfi;
              }

              if (firstCfi && view) {
                view.goTo(firstCfi);

                setTimeout(() => {
                  view.setSearchIndicator("outline", {});
                }, 100);
                return true;
              }
            }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      return false;
    } catch (e: any) {
      console.error("搜索失败:", e);
      setError(typeof e === "string" ? e : e?.message || "搜索失败");
      return false;
    } finally {
      setSearching(false);
    }
  }, [chunkData, activeBookId, view, config, bookData, progress]);

  return {
    loading,
    chunkData,
    error,
    searching,
    fetchChunkData,
    searchAndNavigate,
    resetError: () => setError(null),
    resetChunkData: () => setChunkData(null),
  };
}
