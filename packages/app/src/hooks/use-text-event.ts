import type { ExplainTextEventDetail } from "@/services/iframe-service";
import { useCallback, useEffect } from "react";

interface UseTextEventHandlerOptions {
  sendMessage: any;
  onTextReceived?: (text: string) => void;
}

export const useTextEventHandler = (options: UseTextEventHandlerOptions) => {
  const { sendMessage, onTextReceived } = options;

  // 处理自定义文本事件
  const handleTextEvent = useCallback(
    (event: CustomEvent<ExplainTextEventDetail>) => {
      console.log("📨 收到文本解释事件:", event.detail);

      const { selectedText, question, type } = event.detail;
      if (selectedText && question) {
        console.log("🔍 处理文本请求:", { selectedText, question, type });

        onTextReceived?.(selectedText);

        // 统一构建 引用+问题 的 parts 结构
        const parts = [
          {
            type: "quote",
            text: selectedText,
            source: "引用",
          },
          {
            type: "text",
            text: question,
          },
        ];

        sendMessage({ parts });
      }
    },
    [sendMessage, onTextReceived],
  );

  useEffect(() => {
    // 监听自定义文本事件
    window.addEventListener("explainText", handleTextEvent as EventListener);

    return () => {
      window.removeEventListener("explainText", handleTextEvent as EventListener);
    };
  }, [handleTextEvent]);
};
