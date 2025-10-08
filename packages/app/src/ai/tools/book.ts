import type { BookQueryOptions, BookStatus, BookWithStatus, SimpleBook } from "@/types/simple-book";
import { invoke } from "@tauri-apps/api/core";
import { tool } from "ai";
import { z } from "zod";

type BookStatusState = BookStatus["status"];

const STATUS_LABELS: Record<BookStatusState, string> = {
  unread: "未开始",
  reading: "阅读中",
  completed: "已完成",
};

async function loadSingleBook(bookId: string): Promise<BookWithStatus | null> {
  const book = await invoke<SimpleBook | null>("get_book_by_id", { id: bookId });
  if (!book) {
    return null;
  }

  const status = await invoke<BookStatus | null>("get_book_status", { bookId });
  return { ...book, status: status ?? undefined };
}

async function loadBookList(options: BookQueryOptions): Promise<BookWithStatus[]> {
  return await invoke<BookWithStatus[]>("get_books_with_status", { options });
}

export const getBooksTool = tool({
  description: `查询书籍列表和基本信息，支持按状态和关键词筛选。

🎯 **核心功能**：
• 查询书库中的书籍列表
• 支持按书籍ID精确查询
• 支持按书名/作者模糊搜索
• 支持按阅读状态筛选

📊 **返回内容**：
书籍列表，包含标题、作者、格式、阅读状态和进度等信息`,

  inputSchema: z.object({
    reasoning: z.string().min(1).describe("调用此工具的原因，例如：'用户想查看所有在读的书籍'"),
    bookId: z.string().min(1).optional().describe("指定书籍ID，精确查询单本书"),
    search: z.string().min(1).optional().describe("搜索关键词，匹配书名或作者"),
    status: z.enum(["unread", "reading", "completed"]).optional().describe("筛选阅读状态"),
    limit: z.number().int().min(1).max(50).default(10).describe("最多返回条数，默认10"),
  }),

  execute: async ({
    reasoning,
    bookId,
    search,
    status,
    limit,
  }: {
    reasoning: string;
    bookId?: string;
    search?: string;
    status?: BookStatusState;
    limit?: number;
  }) => {
    try {
      let rawBooks: BookWithStatus[] = [];

      // 1. 如果指定了 bookId，精确查询
      if (bookId?.trim()) {
        const single = await loadSingleBook(bookId.trim());
        if (single) {
          rawBooks = [single];
        }
      } else {
        // 2. 否则查询列表
        const queryOptions: BookQueryOptions = {
          limit: limit || 10,
          sortBy: "updatedAt",
          sortOrder: "desc",
          ...(search ? { searchQuery: search.trim() } : {}),
        };
        rawBooks = await loadBookList(queryOptions);
      }

      // 3. 按状态筛选
      if (status) {
        rawBooks = rawBooks.filter((book) => book.status?.status === status);
      }

      // 4. 限制返回数量
      if (!bookId) {
        rawBooks = rawBooks.slice(0, limit || 10);
      }

      // 5. 格式化返回数据（统一使用 results 字段）
      const results = rawBooks.map((book) => {
        const { status: statusInfo, ...rest } = book;
        const basic = rest as SimpleBook;

        const progressPercent =
          statusInfo && statusInfo.progressTotal > 0
            ? Number(((statusInfo.progressCurrent / statusInfo.progressTotal) * 100).toFixed(1))
            : null;

        return {
          id: basic.id,
          title: basic.title,
          author: basic.author,
          format: basic.format,
          language: basic.language,
          tags: basic.tags ?? [],
          createdAt: basic.createdAt,
          updatedAt: basic.updatedAt,
          status: statusInfo
            ? {
                state: statusInfo.status,
                label: STATUS_LABELS[statusInfo.status],
                progressCurrent: statusInfo.progressCurrent,
                progressTotal: statusInfo.progressTotal,
                progressPercent,
                lastReadAt: statusInfo.lastReadAt ?? null,
                startedAt: statusInfo.startedAt ?? null,
                completedAt: statusInfo.completedAt ?? null,
              }
            : null,
        };
      });

      return {
        results,
        meta: {
          reasoning,
          total: results.length,
          filters: {
            bookId: bookId ?? null,
            search: search ?? null,
            status: status ?? null,
            limit: limit || 10,
          },
        },
      };
    } catch (error) {
      throw new Error(`查询书籍失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  },
});
