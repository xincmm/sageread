import type { ChatContext } from "@/hooks/use-chat-state";
import { getSkills } from "@/services/skill-service";
import { useLlamaStore } from "@/store/llama-store";
import { appDataDir } from "@tauri-apps/api/path";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";

export async function buildReadingPrompt(chatContext: ChatContext | undefined): Promise<string> {
  const activeBookId = chatContext?.activeBookId;
  const semanticContext = chatContext?.activeContext;
  const sectionLabel = chatContext?.activeSectionLabel;
  let systemPromptBase = "";
  let activeSkillNames: string[] = [];

  try {
    const allSkills = await getSkills();
    const systemPromptSkill = allSkills.find((skill) => skill.isSystem && skill.isActive);
    systemPromptBase = systemPromptSkill?.content || "";
    activeSkillNames = allSkills.filter((skill) => skill.isActive && !skill.isSystem).map((skill) => skill.name);
  } catch (error) {
    console.warn("获取技能列表失败:", error);
  }

  const hasVectorCapability = useLlamaStore.getState().hasVectorCapability();

  let metadataMd: string | null = null;
  try {
    if (activeBookId) {
      const base = await appDataDir();
      const activeBookBaseDir = `${base}/books/${activeBookId}`;
      const metaPath = `${activeBookBaseDir}/metadata.md`;
      if (await exists(metaPath)) {
        metadataMd = await readTextFile(metaPath);
      }
    }
  } catch (e) {
    console.warn("加载 metadata.md 失败：", e);
  }

  let base = systemPromptBase;

  if (hasVectorCapability === false) {
    base = base.replace(/—— RAG 工具使用策略 ——[\s\S]*?—— 引用标注规范 ——/m, "");
    base = base.replace(/—— 引用标注规范 ——[\s\S]*?—— 图片输出规范 ——/m, "");
    base = base.replace(/—— 图片输出规范 ——[\s\S]*?—— 书籍与笔记管理工具 ——/m, "—— 书籍与笔记管理工具 ——");
  }

  let prompt = base;

  if (activeSkillNames && activeSkillNames.length > 0) {
    prompt += "\n\n—— 可用技能库 ——\n";
    prompt += "当前系统已配置以下技能，当用户需求匹配时，请先调用 getSkills 工具获取详细执行步骤：\n";
    prompt += activeSkillNames.map((name) => `• ${name}`).join("\n");
  }

  if (semanticContext && semanticContext.trim().length > 0) {
    prompt += `\n\n【语义上下文】\n${semanticContext}`;
  }

  if (sectionLabel && sectionLabel.trim().length > 0) {
    prompt += `\n\n【当前阅读章节】\n${sectionLabel}`;
  }

  if (metadataMd && metadataMd.trim().length > 0) {
    prompt += `\n\n【当前阅读图书元信息与目录】\n${metadataMd}`;
  }

  return prompt;
}
