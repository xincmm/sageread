import { tool } from "ai";
import { z } from "zod";

export const mindmapTool = tool({
  description: `生成思维导图，将内容以可视化的思维导图形式展示。

🎯 **核心功能**：
• 接收 Markdown 格式的思维导图内容
• 支持多层级结构展示
• 提供可视化的知识图谱

💡 **使用场景**：
• 章节内容结构化展示
• 知识点梳理和总结
• 将对话内容转换为思维导图
• 复杂概念的层级关系可视化

📝 **Markdown 格式要求**：
• 使用标准 Markdown 标题语法（#, ##, ###）
• 使用无序列表（- 或 *）表示子节点
• 支持多层级嵌套

⚠️ **使用建议**：
• 内容应该有清晰的层级结构
• 避免过深的嵌套层级（建议不超过4层）
• 每个节点内容应简洁明了`,

  inputSchema: z.object({
    reasoning: z.string().min(1).describe("调用此工具的原因，例如：'用户想将章节内容生成思维导图'"),
    title: z.string().min(1).describe("思维导图的标题"),
    markdown: z.string().min(1).describe("思维导图的 Markdown 内容，使用标准 Markdown 格式"),
  }),

  execute: async ({
    reasoning,
    title,
    markdown,
  }: {
    reasoning: string;
    title: string;
    markdown: string;
  }) => {
    try {
      const lines = markdown.trim().split("\n");
      const nodeCount = lines.filter((line) => line.trim().startsWith("#") || line.trim().startsWith("-")).length;

      const maxDepth = Math.max(
        ...lines.map((line) => {
          const headerMatch = line.match(/^(#{1,6})\s/);
          if (headerMatch) return headerMatch[1].length;
          const listMatch = line.match(/^(\s*)-\s/);
          if (listMatch) return Math.floor(listMatch[1].length / 2) + 1;
          return 0;
        }),
      );

      return {
        results: {
          title,
          markdown,
          nodeCount,
          maxDepth,
        },
        stats: {
          nodeCount,
          maxDepth,
          characterCount: markdown.length,
        },
        meta: {
          reasoning,
          toolType: "mindmap",
        },
      };
    } catch (error) {
      throw new Error(`生成思维导图失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  },
});
