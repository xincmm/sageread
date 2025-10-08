import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DocumentChunk, SearchItem } from "@/types/document";
import { getCurrentVectorModelConfig } from "@/utils/model";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

interface EmbeddingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
}

export default function EmbeddingDialog({ isOpen, onClose, bookId }: EmbeddingDialogProps) {
  // 通用状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 向量搜索相关状态
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<number | null>(null);

  // 上下文检索相关状态
  const [contextResults, setContextResults] = useState<DocumentChunk[]>([]);
  const [prevCount, setPrevCount] = useState(2);
  const [nextCount, setNextCount] = useState(2);

  // 章节检索相关状态
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterResults, setChapterResults] = useState<DocumentChunk[]>([]);

  // 范围检索相关状态
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(10);
  const [rangeResults, setRangeResults] = useState<DocumentChunk[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSearchResults([]);
      setContextResults([]);
      setChapterResults([]);
      setRangeResults([]);
      setError(null);
      setLoading(false);
      setSelectedChunkId(null);
    }
  }, [isOpen]);

  // 向量搜索
  const doVectorSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // 获取向量模型配置（优先使用外部配置，回退到本地服务）
      const vectorConfig = await getCurrentVectorModelConfig();

      const res = (await invoke("plugin:epub|search_db", {
        bookId,
        query,
        limit: 5,
        dimension: vectorConfig.dimension,
        embeddingsUrl: vectorConfig.embeddingsUrl,
        model: vectorConfig.model,
        apiKey: vectorConfig.apiKey,
      })) as SearchItem[];
      setSearchResults(res);
      // 自动选择第一个结果的chunk_id (需要从搜索结果推导)
      if (res.length > 0) {
        setSelectedChunkId(1); // 暂时用固定值，实际需要从搜索结果获取
      }
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "搜索失败");
    } finally {
      setLoading(false);
    }
  }, [bookId, query]);

  // 获取上下文
  const getContext = useCallback(async () => {
    if (!selectedChunkId) {
      setError("请先选择一个分块ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke("plugin:epub|get_chunk_with_context", {
        bookId,
        chunkId: selectedChunkId,
        prevCount,
        nextCount,
      })) as DocumentChunk[];
      setContextResults(res);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "获取上下文失败");
    } finally {
      setLoading(false);
    }
  }, [bookId, selectedChunkId, prevCount, nextCount]);

  // 获取章节分块
  const getChapterChunks = useCallback(async () => {
    if (!chapterTitle.trim()) {
      setError("请输入章节标题");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke("plugin:epub|get_toc_chunks", {
        bookId,
        chapterTitle: chapterTitle,
      })) as DocumentChunk[];
      setChapterResults(res);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "获取章节分块失败");
    } finally {
      setLoading(false);
    }
  }, [bookId, chapterTitle]);

  // 获取范围分块
  const getRangeChunks = useCallback(async () => {
    if (startIndex < 0 || endIndex <= startIndex) {
      setError("请输入有效的索引范围");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke("plugin:epub|get_chunks_by_range", {
        bookId,
        startIndex,
        endIndex,
      })) as DocumentChunk[];
      setRangeResults(res);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "获取范围分块失败");
    } finally {
      setLoading(false);
    }
  }, [bookId, startIndex, endIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[70vh] min-w-3xl flex-col p-0">
        <DialogHeader>
          <DialogTitle>向量化和上下文检索测试</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mx-4 rounded border border-red-200 bg-red-50 p-3 text-red-600 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-hidden p-2">
          <Tabs defaultValue="vector-search" className="h-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="vector-search">向量搜索</TabsTrigger>
              <TabsTrigger value="context-search">上下文检索</TabsTrigger>
              <TabsTrigger value="chapter-search">章节检索</TabsTrigger>
              <TabsTrigger value="range-search">范围检索</TabsTrigger>
            </TabsList>

            {/* 向量搜索 Tab */}
            <TabsContent value="vector-search" className="h-[calc(100%-3rem)] space-y-2">
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doVectorSearch();
                  }}
                  placeholder="输入查询文本…"
                  className="h-9 flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <Button onClick={doVectorSearch} disabled={loading || !query.trim()}>
                  {loading ? "搜索中…" : "搜索"}
                </Button>
              </div>

              <div className="h-[calc(100%-3rem)] divide-y divide-neutral-200 overflow-auto rounded border bg-background dark:divide-neutral-700">
                {searchResults.length === 0 && !loading ? (
                  <div className="p-2 text-neutral-500 text-sm dark:text-neutral-400">暂无结果</div>
                ) : (
                  searchResults.map((r, idx) => (
                    <div key={idx} className="p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div
                          title={r.related_chapter_titles}
                          className="line-clamp-1 flex-1 overflow-hidden font-medium text-neutral-800 text-sm dark:text-neutral-100"
                        >
                          {r.related_chapter_titles || "未知章节"}
                        </div>
                        <div className="flex-nowrap text-neutral-500 text-xs dark:text-neutral-400">
                          相似度 {(r.similarity * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-neutral-600 text-sm dark:text-neutral-300">{r.content}</div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* 上下文检索 Tab */}
            <TabsContent value="context-search" className="h-[calc(100%-3rem)] space-y-2">
              <div className="grid grid-cols-5 gap-2">
                <input
                  type="number"
                  value={selectedChunkId || ""}
                  onChange={(e) => setSelectedChunkId(Number(e.target.value) || null)}
                  placeholder="分块ID"
                  className="h-9 rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <input
                  type="number"
                  value={prevCount}
                  onChange={(e) => setPrevCount(Number(e.target.value) || 0)}
                  placeholder="前N个"
                  className="h-9 rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <input
                  type="number"
                  value={nextCount}
                  onChange={(e) => setNextCount(Number(e.target.value) || 0)}
                  placeholder="后N个"
                  className="h-9 rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <Button onClick={getContext} disabled={loading || !selectedChunkId} className="col-span-2">
                  {loading ? "获取中…" : "获取上下文"}
                </Button>
              </div>

              <div className="h-[calc(100%-3rem)] divide-y divide-neutral-200 overflow-auto rounded border bg-background dark:divide-neutral-700">
                {contextResults.map((chunk, idx) => (
                  <ChunkDisplay key={idx} chunk={chunk} />
                ))}
              </div>
            </TabsContent>

            {/* 章节检索 Tab */}
            <TabsContent value="chapter-search" className="h-[calc(100%-3rem)] space-y-2">
              <div className="flex gap-2">
                <input
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="输入章节标题或关键词 (支持精确匹配和模糊搜索)"
                  className="h-9 flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <Button onClick={getChapterChunks} disabled={loading || !chapterTitle.trim()}>
                  {loading ? "获取中…" : "获取章节分块"}
                </Button>
              </div>

              <div className="h-[calc(100%-3rem)] divide-y divide-neutral-200 overflow-auto rounded border bg-background dark:divide-neutral-700">
                {chapterResults.length === 0 && !loading ? (
                  <div className="p-2 text-neutral-500 text-sm dark:text-neutral-400">暂无结果</div>
                ) : (
                  chapterResults.map((chunk, idx) => <ChunkDisplay key={idx} chunk={chunk} />)
                )}
              </div>
            </TabsContent>

            {/* 范围检索 Tab */}
            <TabsContent value="range-search" className="h-[calc(100%-3rem)] space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  value={startIndex}
                  onChange={(e) => setStartIndex(Number(e.target.value) || 0)}
                  placeholder="起始索引"
                  className="h-9 rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <input
                  type="number"
                  value={endIndex}
                  onChange={(e) => setEndIndex(Number(e.target.value) || 10)}
                  placeholder="结束索引"
                  className="h-9 rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <Button onClick={getRangeChunks} disabled={loading} className="col-span-2">
                  {loading ? "获取中…" : "获取范围分块"}
                </Button>
              </div>

              <div className="h-[calc(100%-3rem)] divide-y divide-neutral-200 overflow-auto rounded border bg-background dark:divide-neutral-700">
                {rangeResults.length === 0 && !loading ? (
                  <div className="p-2 text-neutral-500 text-sm dark:text-neutral-400">暂无结果</div>
                ) : (
                  rangeResults.map((chunk, idx) => <ChunkDisplay key={idx} chunk={chunk} />)
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 分块显示组件
function ChunkDisplay({ chunk }: { chunk: DocumentChunk }) {
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="line-clamp-1 flex-1 overflow-hidden font-medium text-neutral-800 dark:text-neutral-100">
          {chunk.related_chapter_titles}
        </span>
      </div>
      <div className="flex gap-2 text-neutral-500 text-xs dark:text-neutral-400">
        <span>ID: {chunk.id}</span>
        <span>文件顺序: {chunk.file_order_in_book}</span>
        <span>全局: {chunk.global_chunk_index}</span>
        <span>
          文件内: {chunk.chunk_order_in_file + 1}/{chunk.total_chunks_in_file}
        </span>
        <span>文件路径: {chunk.md_file_path}</span>
      </div>
      <div className="text-neutral-600 text-sm dark:text-neutral-300">{chunk.chunk_text}</div>
    </div>
  );
}
