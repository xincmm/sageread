/**
 * 文本解释服务
 * 使用自定义事件在同一页面内传递选中的文本
 */

export interface ExplainTextEventDetail {
  selectedText: string; // 选中的文本（作为引用）
  question: string; // 对应的问题
  type: "explain" | "ask"; // 请求类型
  timestamp: number;
  bookId?: string; // 关联的书籍ID
}

export interface ExplainTextEvent extends CustomEvent<ExplainTextEventDetail> {
  type: "explainText";
}

class IframeService {
  private static instance: IframeService;

  private constructor() {
    // 不再需要 postMessage 监听器
  }

  public static getInstance(): IframeService {
    if (!IframeService.instance) {
      IframeService.instance = new IframeService();
    }
    return IframeService.instance;
  }

  /**
   * 发送解释文本请求
   * @param selectedText 选中的文本
   * @param type 请求类型
   * @param bookId 关联的书籍ID
   */
  public sendExplainTextRequest(selectedText: string, type: "explain" | "ask" = "explain", bookId?: string): void {
    if (!selectedText || selectedText.trim().length === 0) {
      console.warn("⚠️ 尝试发送空的选中文本");
      return;
    }

    const question = type === "explain" ? "请解释这段文字" : "这段内容有什么含义？";

    const eventDetail: ExplainTextEventDetail = {
      selectedText: selectedText.trim(),
      question,
      type,
      timestamp: Date.now(),
      bookId,
    };

    // 派发自定义事件
    const event = new CustomEvent<ExplainTextEventDetail>("explainText", {
      detail: eventDetail,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);
  }

  /**
   * 发送 AI 问答请求
   * @param selectedText 选中的文本
   * @param question 用户的问题
   * @param bookId 关联的书籍ID
   */
  public sendAskAIRequest(selectedText: string, question: string, bookId?: string): void {
    if (!selectedText || selectedText.trim().length === 0) {
      console.warn("⚠️ 尝试发送空的选中文本");
      return;
    }

    if (!question || question.trim().length === 0) {
      console.warn("⚠️ 尝试发送空问题");
      return;
    }

    const eventDetail: ExplainTextEventDetail = {
      selectedText: selectedText.trim(),
      question: question.trim(),
      type: "ask",
      timestamp: Date.now(),
      bookId,
    };

    // 派发自定义事件
    const event = new CustomEvent<ExplainTextEventDetail>("explainText", {
      detail: eventDetail,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(event);
  }

  /**
   * 销毁服务（现在不需要清理任何监听器）
   */
  public destroy(): void {
    // 不再需要清理 postMessage 监听器
    console.log("🧹 IframeService 已销毁");
  }
}

// 导出单例实例
export const iframeService = IframeService.getInstance();

// 导出类以便测试
export { IframeService };
