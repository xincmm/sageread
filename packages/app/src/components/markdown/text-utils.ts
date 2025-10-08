/**
 * 文本处理工具函数
 */

/**
 * 清理文本中的 Markdown 标记
 * 移除常见的 Markdown 语法，保留纯文本内容
 */
export function stripMarkdown(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return (
    text
      // 移除图片（优先处理，避免与链接混淆）
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // ![alt](src) -> alt (如果有alt文本)
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // ![](src) -> (删除没有alt文本的图片)
      // 移除链接
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [文本](链接) -> 文本
      // 移除粗体和斜体标记
      .replace(/\*\*([^*]+)\*\*/g, "$1") // **粗体** -> 粗体
      .replace(/\*([^*]+)\*/g, "$1") // *斜体* -> 斜体
      .replace(/__([^_]+)__/g, "$1") // __粗体__ -> 粗体
      .replace(/_([^_]+)_/g, "$1") // _斜体_ -> 斜体
      // 移除标题标记
      .replace(/^#{1,6}\s+/gm, "") // # 标题 -> 标题
      // 移除代码标记
      .replace(/`([^`]+)`/g, "$1") // `代码` -> 代码
      .replace(/```[^`]*```/g, "") // ```代码块``` -> (删除)
      // 移除引用标记
      .replace(/^>\s+/gm, "") // > 引用 -> 引用
      // 移除列表标记
      .replace(/^[-*+]\s+/gm, "") // - 列表 -> 列表
      .replace(/^\d+\.\s+/gm, "") // 1. 列表 -> 列表
      // 移除水平分割线
      .replace(/^[-*_]{3,}\s*$/gm, "") // --- -> (删除)
      // 移除HTML标签（如果有的话）
      .replace(/<[^>]*>/g, "") // <tag> -> (删除)
      // 清理多余的空白字符和换行
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "") // 去除首尾空白
      .trim()
  );
}

export function extractSentences(text: string): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  const cleanText = stripMarkdown(text);

  const sentenceEndRegex = /[。！？.!?]+[\s"'""''）】]*\s*/g;

  const sentences = cleanText
    .split(sentenceEndRegex)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  return sentences;
}

export function getBestSearchSentence(text: string): string {
  // 优先基于 Markdown 语义做块级分割，再在段落内选句子
  const candidates = getCandidatesFromMarkdown(text);

  if (candidates.length === 0) {
    const cleanText = stripMarkdown(text);
    return cleanText.slice(0, 50).trim();
  }

  // 🎯 优化：优先选择第一句话，给第一句话加权
  const scored = candidates
    .map((sentence, index) => ({
      sentence,
      score: calculateSentenceScore(sentence) + (index === 0 ? 20 : 0), // 第一句话加20分
    }))
    .sort((a, b) => b.score - a.score);

  // 如果第一句话质量不错（基础分数 >= 5），直接使用第一句话
  const firstSentence = candidates[0];
  if (firstSentence && calculateSentenceScore(firstSentence) >= 5) {
    return stripMarkdown(firstSentence);
  }

  // 否则使用评分最高的句子
  return stripMarkdown(scored[0].sentence);
}

function calculateSentenceScore(sentence: string): number {
  let score = 0;
  const length = sentence.length;

  if (length >= 10 && length <= 100) {
    score += 10;
  } else if (length >= 5 && length <= 150) {
    score += 5;
  } else if (length < 5) {
    score -= 5;
  } else {
    score -= 2;
  }

  if (/\d+/.test(sentence)) {
    score += 3;
  }

  const hasLatin = /[A-Za-z]+/.test(sentence);
  const hanCount = (sentence.match(/[\u4e00-\u9fff]/g) || []).length;
  const spaceCount = (sentence.match(/\s/g) || []).length;
  const hasEndPunc = /[。！？.!?]/.test(sentence);

  // 英文：鼓励有足够单词且带终止符
  if (hasLatin) {
    const wordCount = (sentence.match(/[A-Za-z]+/g) || []).length;
    if (wordCount >= 6) score += 4;
    if (hasEndPunc) score += 2;
  }

  // 中文：鼓励足够汉字和标点，惩罚过多空格
  if (hanCount > 0) {
    if (hanCount >= 10) score += 4;
    if (/[，、；]/.test(sentence)) score += 1;
    if (hasEndPunc) score += 2;
    if (spaceCount >= 2) score -= 3;
  }

  const punctuationCount = (sentence.match(/[，,；;：:（）()【】\[\]]/g) || []).length;
  if (punctuationCount > 3) {
    score -= 1;
  }

  return score;
}

export function getSearchCandidates(text: string, maxCount = 3): string[] {
  const candidates = getCandidatesFromMarkdown(text);

  if (candidates.length === 0) {
    const cleanText = stripMarkdown(text);
    return [cleanText.slice(0, 50).trim()];
  }

  const scored = candidates
    .map((sentence) => ({ sentence, score: calculateSentenceScore(sentence) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map((x) => stripMarkdown(x.sentence));

  return scored;
}

// =============== 新增：更稳健的 Markdown 语义解析辅助 ===============

function stripMarkdownKeepNewlines(text: string): string {
  if (!text || typeof text !== "string") return "";
  return (
    text
      .replace(/\r\n?/g, "\n")
      // 图片：保留 alt 文本
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      // 链接：保留可读文本
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 粗体/斜体
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // 行内代码
      .replace(/`([^`]+)`/g, "$1")
      // 代码块整段移除
      .replace(/```[\s\S]*?```/g, "")
      // 引用前缀
      .replace(/^>\s?/gm, "")
      // 列表标记
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
  );
}

type Block = { type: "heading" | "code" | "list" | "blockquote" | "paragraph"; text: string };

function splitIntoBlocks(raw: string): Block[] {
  if (!raw) return [];
  const text = raw.replace(/\r\n?/g, "\n");
  const cleaned = stripMarkdownKeepNewlines(text);

  const lines = cleaned.split(/\n/);
  const blocks: Block[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const blockText = current.join("\n").trim();
    if (!blockText) {
      current = [];
      return;
    }
    // 判定块类型
    const first = blockText.split("\n")[0];
    let type: Block["type"] = "paragraph";
    if (/^\s*#{1,6}\s+/.test(first)) type = "heading";
    else if (/^\s*>/.test(first)) type = "blockquote";
    else if (/^\s*```/.test(first))
      type = "code"; // 代码在上面清理时已去除，这里兜底
    else if (blockText.split("\n").every((l) => /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(l))) type = "list";

    blocks.push({ type, text: blockText });
    current = [];
  };

  for (const line of lines) {
    if (/^\s*$/.test(line)) {
      // 空行分段
      flush();
    } else {
      current.push(line);
    }
  }
  flush();

  return blocks;
}

function splitSentencesFromParagraph(text: string): string[] {
  // 段落内部句子切分：兼容中英文
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  // 优先按中日韩句号分句
  const cjkParts = normalized.split(/(?<=[。！？…])\s*/);
  const hasCJK = /[\u4e00-\u9fff]/.test(normalized);

  const parts = hasCJK ? cjkParts : normalized.split(/(?<=[.!?])\s+/);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function getCandidatesFromMarkdown(text: string): string[] {
  const blocks = splitIntoBlocks(text);
  if (blocks.length === 0) return [];

  const sentences: string[] = [];

  for (const b of blocks) {
    // 只从“段落/引用/列表”中提取，跳过标题和代码
    if (b.type === "heading" || b.type === "code") continue;

    const sents = splitSentencesFromParagraph(b.text);

    for (const s of sents) {
      // 过滤明显不适合全文匹配的句子：
      const isHeadingLike = /^[#>\-\d.\s]*[A-Za-z\u4e00-\u9fff]{1,8}$/.test(s);
      const hasWeirdMarkdown = /[#`\[\]\(\)]/.test(s);
      const tooShort = s.length < 6;
      const tooLong = s.length > 180;

      if (isHeadingLike || hasWeirdMarkdown || tooShort || tooLong) continue;

      // 汉字较多但包含大量空格的，可能跨段或格式问题，剔除
      const han = (s.match(/[\u4e00-\u9fff]/g) || []).length;
      const spaces = (s.match(/\s/g) || []).length;
      if (han >= 8 && spaces >= 3) continue;

      sentences.push(s);
    }
  }

  return sentences;
}
