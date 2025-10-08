import type { ChatContext } from "@/hooks/use-chat-state";
import { type UIMessage, type UseChatOptions, useChat as useChatSDK } from "@ai-sdk/react";
import type { ChatInit, LanguageModel } from "ai";
import { useEffect, useRef } from "react";
import { CustomChatTransport } from "../custom-chat-transport";

type CustomChatOptions = Omit<ChatInit<UIMessage>, "transport"> &
  Pick<UseChatOptions<UIMessage>, "experimental_throttle" | "resume"> & {
    chatContext?: ChatContext;
  };

export function useChat(model: LanguageModel, options?: CustomChatOptions) {
  const { chatContext, ...restOptions } = options || {};
  const chatContextRef = useRef(chatContext);
  const transportRef = useRef<CustomChatTransport | null>(null);

  useEffect(() => {
    chatContextRef.current = chatContext;
  }, [chatContext]);

  if (!transportRef.current) {
    transportRef.current = new CustomChatTransport(model, {
      prepareSendMessagesRequest: ({ body }) => {
        const currentChatContext = chatContextRef.current;
        return {
          body: {
            ...body,
            chatContext: currentChatContext,
          },
        };
      },
    });
  }

  useEffect(() => {
    if (transportRef.current) {
      transportRef.current.updateModel(model);
    }
  }, [model]);

  const chatResult = useChatSDK({
    transport: transportRef.current,
    ...restOptions,
  });

  return chatResult;
}
