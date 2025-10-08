import type { DocumentChunk } from "@/types/document";
import { resolveMarkdownImagePaths } from "@/utils/path";
import { invoke } from "@tauri-apps/api/core";
import { tool } from "ai";
import { z } from "zod";

export const createRagTocTool = (activeBookId: string | undefined) =>
  tool({
    description: `基于章节标题获取该章节的完整内容，按文件内顺序返回所有分块。

📖 **核心功能**：
• 基于章节标题获取完整章节内容
• 按顺序返回章节内的所有文档分块
• 提供详细的章节结构和位置信息

📝 **标注支持**：
• 每个章节分块都包含唯一的 chunk_id
• 支持对整个章节进行分块标注管理
• chunk_id 作为标注系统的核心标识符，实现精确的文本定位
• 可以基于 chunk_id 对章节内的特定段落进行标注

💡 **使用场景**：
• 获取完整章节内容进行分析
• 章节级别的内容理解和总结
• 为用户提供可标注的章节文本片段
• 支持基于 chunk_id 的章节标注功能

⚠️ **使用建议**：
• 尽量避免频繁使用此工具获取全章内容
• 除非用户明确要求读取全章，否则优先使用 ragContext 获取相关内容`,
    inputSchema: z.object({
      reasoning: z.string().min(1).describe("调用此工具的原因和目的，例如：'用户想了解整个章节的内容'"),
      chapter_title: z.string().min(1).describe("章节标题，如 '第一章 引言', '1.1 背景介绍' 等"),
    }),
    execute: async ({
      reasoning,
      chapter_title,
    }: {
      reasoning: string;
      chapter_title: string;
    }) => {
      if (!activeBookId) {
        throw new Error("未找到当前阅读图书，请先在阅读器中打开图书");
      }

      const results = (await invoke("plugin:epub|get_toc_chunks", {
        bookId: activeBookId,
        chapterTitle: chapter_title,
      })) as DocumentChunk[];

      if (results.length === 0) {
        throw new Error(`未找到章节 "${chapter_title}" 的内容`);
      }

      const chapterInfo = {
        chapter_title: chapter_title,
        related_chapter_titles: results[0].related_chapter_titles,
        total_chunks: results.length,
        md_file_path: results[0].md_file_path,
        file_order_in_book: results[0].file_order_in_book,
      };

      const chapterContent = await Promise.all(
        results.map(async (chunk, index) => {
          let processedContent = chunk.chunk_text;
          // md_file_path 现在存储的是绝对路径，可以直接用于图片路径解析
          if (chunk.md_file_path) {
            try {
              processedContent = await resolveMarkdownImagePaths(chunk.chunk_text, chunk.md_file_path);
            } catch (error) {
              console.warn(`Failed to resolve image paths in chunk ${chunk.id}:`, error);
            }
          }

          return {
            chunk_id: chunk.id,
            sequence: index + 1,
            related_chapter_titles: chunk.related_chapter_titles,
            content: processedContent,
            position: {
              in_file: `${chunk.chunk_order_in_file + 1}/${chunk.total_chunks_in_file}`,
              global_index: chunk.global_chunk_index,
              is_first: chunk.chunk_order_in_file === 0,
              is_last: chunk.chunk_order_in_file === chunk.total_chunks_in_file - 1,
            },
          };
        }),
      );

      const lines: string[] = [];
      lines.push(`[章节内容] ${chapterInfo.chapter_title}`);
      lines.push(`💭 调用原因：${reasoning}`);
      lines.push(
        `📖 文件顺序：${chapterInfo.file_order_in_book} | 分块数：${chapterInfo.total_chunks} | 来源：${chapterInfo.md_file_path}`,
      );
      lines.push(`�� 相关章节：${chapterInfo.related_chapter_titles}\n`);

      chapterContent.forEach((item) => {
        const isFirstOrLast = item.position.is_first || item.position.is_last;
        const indicator = isFirstOrLast ? "📌" : "📄";
        const label = item.position.is_first ? " [文件开始]" : item.position.is_last ? " [文件结束]" : "";

        lines.push(`${indicator} 第${item.sequence}块 ${label}`);
        lines.push(`   位置：${item.position.in_file} (全局${item.position.global_index})`);
        lines.push(`   内容：${item.content.slice(0, 300)}${item.content.length > 300 ? "..." : ""}`);
        lines.push("");
      });

      const totalLength = chapterContent.reduce((sum, item) => sum + item.content.length, 0);
      const avgLength = Math.round(totalLength / chapterContent.length);

      const citations = chapterContent.map((item) => ({
        chunk_id: item.chunk_id,
        source: `${chapterInfo.chapter_title} - 第${item.sequence}块`,
        chapter_title: chapter_title,
        position: `${item.position.in_file} (全局${item.position.global_index})`,
        preview: item.content.slice(0, 100) + (item.content.length > 100 ? "..." : ""),
        is_first: item.position.is_first,
        is_last: item.position.is_last,
      }));

      const citationGuide = [
        "📚 章节引用标注指南：",
        "在回答中引用此章节信息时，请使用以下标注：",
        ...citations.slice(0, 5).map((c) => `[${c.chunk_id}] ${c.source}`),
        citations.length > 5 ? `... 以及其他 ${citations.length - 5} 个章节片段` : "",
        "",
        "📝 标注说明：",
        "• 使用 [chunk_id] 格式在句末添加引用，如 [123], [456] 等",
        "• chunk_id 是文本标注的核心标识符，用于精确定位原文片段",
        "• 当用户需要标注特定内容时，引导其使用对应的 chunk_id",
        "",
        "示例：「根据该章节的描述[123]...」",
      ]
        .filter((line) => line !== "")
        .join("\n");

      return {
        results: chapterContent,
        chapter: chapterInfo,
        citations: citations,
        citation_guide: citationGuide,
        stats: {
          total_chunks: results.length,
          total_characters: totalLength,
          average_chunk_length: avgLength,
          first_chunk_id: chapterContent[0]?.chunk_id,
          last_chunk_id: chapterContent[chapterContent.length - 1]?.chunk_id,
        },
        meta: {
          reasoning,
        },
      };
    },
  });

export const ragTocTool = createRagTocTool(undefined);
