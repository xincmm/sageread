import type { UIMessage } from "@ai-sdk/react";

export function processQuoteMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => {
    if (message.role === "user" && Array.isArray(message.parts)) {
      const quoteParts = message.parts.filter((part: any) => part.type === "quote");
      const textParts = message.parts.filter((part: any) => part.type === "text");

      if (quoteParts.length > 0) {
        const quotesText = quoteParts
          .map((part: any, index: number) => {
            const normalized = part.text.replace(/\s+$/g, "");
            const quoted = normalized.replace(/\n/g, "\n> ");
            return `${part.source || `引用${index + 1}`}：\n> ${quoted}`;
          })
          .join("\n\n");

        const userText = textParts.map((part: any) => part.text).join("");
        const combinedText = `${quotesText}\n\n${userText}`.trim();

        return {
          ...message,
          parts: [{ type: "text", text: combinedText } as any],
        } as UIMessage;
      }
    }
    return message;
  });
}
