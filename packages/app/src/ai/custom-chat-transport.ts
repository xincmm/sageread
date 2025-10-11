import { buildReadingPrompt } from "@/constants/prompt";
import type { ChatContext } from "@/hooks/use-chat-state";
import { useLlamaStore } from "@/store/llama-store";
import type { UIMessage } from "@ai-sdk/react";
import {
  type ChatRequestOptions,
  type ChatTransport,
  type LanguageModel,
  type PrepareSendMessagesRequest,
  type UIMessageChunk,
  convertToModelMessages,
  stepCountIs,
  streamText,
} from "ai";
import {
  createRagContextTool,
  createRagSearchTool,
  createRagTocTool,
  getBooksTool,
  getReadingStatsTool,
  getSkillsTool,
  mindmapTool,
  notesTool,
} from "./tools";
import { processQuoteMessages, selectValidMessages } from "./utils";

export class CustomChatTransport implements ChatTransport<UIMessage> {
  private model: LanguageModel;
  private prepareSendMessagesRequest?: PrepareSendMessagesRequest<UIMessage>;

  constructor(
    model: LanguageModel,
    options?: {
      prepareSendMessagesRequest?: PrepareSendMessagesRequest<UIMessage>;
    },
  ) {
    this.model = model;
    this.prepareSendMessagesRequest = options?.prepareSendMessagesRequest;
  }

  updateModel(model: LanguageModel) {
    this.model = model;
  }

  async sendMessages(
    options: {
      chatId: string;
      messages: UIMessage[];
      abortSignal: AbortSignal | undefined;
    } & {
      trigger: "submit-message" | "regenerate-message";
      messageId: string | undefined;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    let requestBody = options.body;

    if (this.prepareSendMessagesRequest) {
      const prepared = await this.prepareSendMessagesRequest({
        id: options.chatId,
        messages: options.messages,
        requestMetadata: options.metadata,
        body: options.body as Record<string, any> | undefined,
        credentials: undefined,
        headers: options.headers,
        api: "",
        trigger: options.trigger,
        messageId: options.messageId,
      });

      requestBody = prepared.body;
    }

    const chatContext = (requestBody as any)?.chatContext as ChatContext | undefined;
    const activeBookId = chatContext?.activeBookId;

    const processedMessages = processQuoteMessages(options.messages);
    const selectedMessages = selectValidMessages(processedMessages, 8);

    const hasVectorCapability = useLlamaStore.getState().hasVectorCapability();

    const tools: any = {
      notes: notesTool,
      getBooks: getBooksTool,
      getReadingStats: getReadingStatsTool,
      getSkills: getSkillsTool,
      mindmap: mindmapTool,
    };

    if (hasVectorCapability && activeBookId) {
      tools.ragSearch = createRagSearchTool(activeBookId);
      tools.ragToc = createRagTocTool(activeBookId);
      tools.ragContext = createRagContextTool(activeBookId);
    }

    const convertedMessages = convertToModelMessages(selectedMessages, {
      tools,
      ignoreIncompleteToolCalls: true,
    });

    const result = streamText({
      model: this.model,
      messages: convertedMessages,
      abortSignal: options.abortSignal,
      toolChoice: "auto",
      stopWhen: stepCountIs(20),
      tools,
      system: await buildReadingPrompt(chatContext),
    });

    return result.toUIMessageStream({
      onError: (error) => {
        console.log("error", error);
        if (error == null) {
          return "Unknown error";
        }
        if (typeof error === "string") {
          return error;
        }
        if (error instanceof Error) {
          return error.message;
        }
        return JSON.stringify(error);
      },
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            totalUsage: part.totalUsage,
          };
        }
      },
    });
  }

  async reconnectToStream(
    _options: {
      chatId: string;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
