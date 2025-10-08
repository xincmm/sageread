import { createModelInstance } from "@/ai/providers/factory";
import { useProviderStore } from "@/store/provider-store";
import type { SimpleBook } from "@/types/simple-book";
import { generateText } from "ai";
import type { Tag } from "./tag-service";

export interface AITagSuggestion {
  name: string;
  reason: string;
  isExisting: boolean;
  existingTagId?: string;
}

export interface AITagResponse {
  suggestions: AITagSuggestion[];
  reasoning: string;
}

/**
 * 使用AI生成标签建议
 */
export async function generateTagsWithAI(
  book: SimpleBook,
  existingTags: Tag[],
  selectedModel?: { providerId: string; modelId: string },
): Promise<AITagResponse> {
  try {
    // 获取当前选中的模型，如果没有传入则从store获取
    let modelConfig = selectedModel;
    if (!modelConfig) {
      const { selectedModel: storeModel } = useProviderStore.getState();
      if (!storeModel) {
        throw new Error("没有选中的AI模型，请先在设置中配置AI模型");
      }
      modelConfig = {
        providerId: storeModel.providerId,
        modelId: storeModel.modelId,
      };
    }

    // 创建模型实例
    const modelInstance = createModelInstance(modelConfig.providerId, modelConfig.modelId);

    // 构建提示词
    const existingTagsText =
      existingTags.length > 0 ? existingTags.map((tag) => `- ${tag.name}`).join("\n") : "无现有标签";

    const prompt = `作为一个图书标签分类专家，请为以下书籍生成合适的标签建议：

书籍信息：
- 标题：${book.title || "未知标题"}
- 作者：${book.author || "未知作者"}
- 格式：${book.format || "未知格式"}
- 语言：${book.language || "未知语言"}

现有标签：
${existingTagsText}

请根据书籍的标题、作者和内容，为这本书生成2-3个合适的标签。

标签生成原则：
1. **优先使用现有标签** - 如果现有标签合适，必须优先选择，避免创建相似标签
2. **避免碎片化** - 不要生成意思相近的标签，避免过度细分
3. **多样化分类** - 从不同角度进行分类，不要都是学科分类
4. **标签名称简洁** - 通常2-4个字，使用常见词汇
5. **实用性优先** - 选择对读者有实际价值的分类方式

标签分类角度（按优先级排序）：
- **内容主题**：个人成长、思维方式、商业管理、人际关系、生活哲学等
- **实用性质**：实用指南、理论探讨、案例分析、工具方法等
- **目标读者**：入门读物、进阶内容、专业书籍等
- **阅读体验**：深度思考、轻松阅读、启发性强、系统性强等
- **学科领域**：心理学、管理学、历史、文学等（仅当明显属于某学科时使用）

请仔细检查现有标签列表，如果有合适的标签就直接使用，避免创建新的相似标签。

请按以下格式回复，每个标签一行，用管道符分割：
标签名称|选择此标签的原因

例如：
个人成长|关于个人发展和自我提升的内容
实用指南|提供具体可操作的方法和建议
深度思考|需要深入思考和理解的内容

请直接输出标签列表，不要添加其他说明文字：`;

    // 发送请求
    const { text } = await generateText({
      model: modelInstance,
      prompt: prompt,
      temperature: 0.7,
    });

    // 解析AI响应（管道符分割格式）
    let aiResponse: AITagResponse;
    try {
      // 清理响应文本，移除多余的空白和换行
      const cleanedText = text.trim();

      // 按行分割并过滤空行
      const lines = cleanedText.split("\n").filter((line) => line.trim().length > 0);

      const suggestions: AITagSuggestion[] = [];

      for (const line of lines) {
        // 检查是否包含管道符
        if (line.includes("|")) {
          const [tagName, reason] = line.split("|").map((part) => part.trim());

          if (tagName && tagName.length > 0) {
            // 检查是否是现有标签
            const existingTag = existingTags.find((tag) => tag.name.toLowerCase() === tagName.toLowerCase());

            suggestions.push({
              name: tagName,
              reason: reason || "AI推荐的标签",
              isExisting: !!existingTag,
              existingTagId: existingTag?.id,
            });
          }
        }
      }

      // 如果没有解析到任何标签，尝试备用解析
      if (suggestions.length === 0) {
        console.warn("未能从管道符格式解析标签，尝试备用解析");

        // 尝试提取可能的标签名称（中文词汇）
        const chineseWords = cleanedText.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
        const uniqueWords = Array.from(new Set(chineseWords)).slice(0, 5);

        for (const word of uniqueWords) {
          const existingTag = existingTags.find((tag) => tag.name.toLowerCase() === word.toLowerCase());

          suggestions.push({
            name: word,
            reason: "从AI响应中提取的可能标签",
            isExisting: !!existingTag,
            existingTagId: existingTag?.id,
          });
        }
      }

      // 如果仍然没有标签，提供默认标签
      if (suggestions.length === 0) {
        suggestions.push(
          {
            name: "文学",
            reason: "默认文学类标签",
            isExisting: false,
            existingTagId: undefined,
          },
          {
            name: "阅读",
            reason: "默认阅读类标签",
            isExisting: false,
            existingTagId: undefined,
          },
        );
      }

      aiResponse = {
        suggestions: suggestions.slice(0, 5), // 最多5个标签
        reasoning: `AI分析了书籍的标题、作者、格式等信息，生成了 ${suggestions.length} 个标签建议`,
      };
    } catch (error) {
      console.error("解析AI响应失败:", error);

      // 最终备用方案
      aiResponse = {
        suggestions: [
          {
            name: "图书",
            reason: "通用图书标签",
            isExisting: false,
            existingTagId: undefined,
          },
          {
            name: "阅读",
            reason: "通用阅读标签",
            isExisting: false,
            existingTagId: undefined,
          },
        ],
        reasoning: "AI响应解析失败，提供默认标签建议",
      };
    }

    return aiResponse;
  } catch (error) {
    console.error("AI生成标签失败:", error);

    // 提供更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("AI服务配置错误：请检查API密钥设置");
      }
      if (error.message.includes("quota") || error.message.includes("limit")) {
        throw new Error("AI服务额度不足：请检查账户余额或使用限制");
      }
      if (error.message.includes("network") || error.message.includes("fetch")) {
        throw new Error("网络连接错误：请检查网络连接后重试");
      }
      throw new Error(`AI生成标签失败: ${error.message}`);
    }

    throw new Error("AI生成标签失败: 未知错误");
  }
}
