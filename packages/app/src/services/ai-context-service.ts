import { createModelInstance } from "@/ai/providers/factory";
import { useProviderStore } from "@/store/provider-store";
import { generateText } from "ai";

export interface AIContextResponse {
  context: string;
  operation: "replace" | "refine" | "shift";
  reasoning: string;
}

/**
 * 使用AI生成语义上下文
 */
export async function generateContextWithAI(
  userQuestion: string,
  previousContext?: string,
  previousAnswer?: string,
  selectedModel?: { providerId: string; modelId: string },
): Promise<AIContextResponse> {
  try {
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

    const modelInstance = createModelInstance(modelConfig.providerId, modelConfig.modelId);

    // 构建提示词 - 后续需要通过feedback确认
    const prompt = buildContextPrompt(userQuestion, previousContext, previousAnswer);

    const { text } = await generateText({
      model: modelInstance,
      prompt: prompt,
      temperature: 0.7,
    });

    const result = parseContextResponse(text, userQuestion);

    // 关键日志：AI生成的新语义上下文
    console.log("🔄 [语义上下文] AI生成新上下文:", {
      operation: result.operation,
      contextLength: result.context.length,
      hasInput: {
        userQuestion: !!userQuestion,
        previousContext: !!previousContext,
        previousAnswer: !!previousAnswer,
      },
      newContext: result.context.substring(0, 150) + (result.context.length > 150 ? "..." : ""),
    });

    return result;
  } catch (error) {
    console.error("AI生成语义上下文失败:", error);

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
      throw new Error(`AI生成语义上下文失败: ${error.message}`);
    }

    throw new Error("AI生成语义上下文失败: 未知错误");
  }
}

/**
 * 构建语义上下文生成的提示词
 */
function buildContextPrompt(userQuestion: string, previousContext?: string, previousAnswer?: string): string {
  const hasContext = previousContext && previousContext.trim().length > 0;
  const hasAnswer = previousAnswer && previousAnswer.trim().length > 0;

  if (!hasContext && !hasAnswer) {
    // 首次问句，仅基于用户问题生成初始语义上下文
    return `作为语义上下文生成专家，请为以下对话生成初始语义上下文：

用户问句：${userQuestion}

请生成一个语义上下文（Semantic Reading Context, SRC），要求：
1. 用单段自然语言描述当前对话的核心焦点和方向
2. 长度限制在500字内，保持简洁精准
3. 遵循"书→章/节→唯一焦点→可选下一步"的结构（如果涉及阅读材料）
4. 保持单一主焦点，避免列表化和多主题混合
5. 用可朗读的自然语言表达

请直接输出语义上下文内容，不要添加其他解释文字：`;
  }

  return `作为语义上下文生成专家，请根据对话历史更新语义上下文：

当前语义上下文：
${previousContext || "无"}

用户新问句：${userQuestion}

${hasAnswer ? `上轮AI回答摘要：${previousAnswer.substring(0, 120)}...` : ""}

请分析并生成新的语义上下文，遵循以下规则：

**优先级判断**（按顺序）：
1. 显式指令：如"开始新话题"、"切换到X章"、"换个书"等直接指令
2. 隐含意图：如"深入分析"、"简单概括"、"对比说明"、"只看要点"等
3. 上轮线索：从前一轮回答中提取的延续方向

**操作类型识别**：
- replace：出现切章、换书、开始新话题等重大转换
- refine：同一话题内的焦点变更或深化
- shift：话题的轻微延伸或角度调整

**生成要求**：
1. 单段自然语言，500字内
2. 描述结构：核心主题→当前焦点→下一步方向
3. 保持单一主焦点，禁止：
   - 历史回放（"之前我们讨论了..."）
   - 列表化表述（"包括以下几点..."）
   - 跨主题混谈
   - 冗余推断
4. 用可朗读的自然语言，避免机械化表述

请直接输出更新后的语义上下文，不要添加操作类型标识或其他解释：`;
}

/**
 * 解析AI响应为结构化数据
 */
function parseContextResponse(text: string, fallbackText?: string): AIContextResponse {
  try {
    const cleanedText = text.trim();

    // 确保不超过500字
    const context = cleanedText.substring(0, 500);

    // 简单的操作类型推断
    let operation: "replace" | "refine" | "shift" = "refine";
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("开始") || lowerText.includes("切换") || lowerText.includes("新的")) {
      operation = "replace";
    } else if (lowerText.includes("继续") || lowerText.includes("延续") || lowerText.includes("进一步")) {
      operation = "shift";
    }

    return {
      context: context,
      operation: operation,
      reasoning: `AI生成的语义上下文，操作类型：${operation}`,
    };
  } catch (error) {
    console.error("解析语义上下文响应失败:", error);

    // 备用方案
    return {
      context: fallbackText ? fallbackText.substring(0, 500) : "生成语义上下文失败",
      operation: "replace",
      reasoning: "解析失败，使用备用上下文",
    };
  }
}
