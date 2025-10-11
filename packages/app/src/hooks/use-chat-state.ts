import { useChat } from "@/ai/hooks/use-chat";
import { useForceUpdate } from "@/hooks/use-force-update";
import { useModelSelector } from "@/hooks/use-model-selector";
import type { ReasoningTimes } from "@/hooks/use-reasoning-timer";
import { useTextEventHandler } from "@/hooks/use-text-event";
import { generateContextWithAI } from "@/services/ai-context-service";
import {
  createThread,
  editThread,
  getLatestThreadBybookId,
  getThreadById,
  getThreadContext,
  updateThreadContext,
} from "@/services/thread-service";
import { type SelectedModel, useProviderStore } from "@/store/provider-store";
import { useThreadStore } from "@/store/thread-store";
import type { ChatReference, MessageMetadata } from "@/types/message";
import type { Thread, ThreadSummary } from "@/types/thread";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseChatStateReturn {
  // 基础状态
  input: string;
  setInput: (value: string) => void;
  references: ChatReference[];
  displayError: Error | null;
  showThreads: boolean;
  threadsKey: number;
  isInit: React.RefObject<boolean>;
  currentThread: any;

  // Chat 相关
  messages: UIMessage[];
  status: string;
  error: any;
  stop: () => void;

  // 模型相关
  selectedModel: SelectedModel | null;
  setSelectedModel: (model: SelectedModel) => void;

  // 引用管理
  handleAskSelection: (text: string) => void;
  handleRemoveReference: (id: string) => void;

  // 消息处理
  handleSubmit: (promptOverride?: string) => Promise<void>;
  handleRetry: () => Promise<void>;

  // 线程管理
  handleNewThread: () => void;
  handleShowThreads: () => void;
  handleSelectThread: (thread: ThreadSummary) => Promise<void>;
  handleBackFromThreads: () => void;

  // 其他
  handleReasoningTimesUpdate: (messageId: string, reasoningTimes: ReasoningTimes) => void;
  canRetry: boolean;
}

export interface ChatContext {
  activeBookId?: string;
  activeContext?: string;
  activeSectionLabel?: string;
}

interface UseChatStateOptions {
  chatContext: ChatContext;
  setActiveBookId: (bookId: string) => void;
  setActiveContext: (context: string | undefined) => void;
  currentThread?: Thread | null;
  setCurrentThread?: (thread: Thread | null) => void;
}

export function useChatState(options: UseChatStateOptions): UseChatStateReturn {
  const { chatContext, setActiveBookId, setActiveContext } = options;
  const { activeBookId } = chatContext;
  const [input, setInput] = useState("");
  const [showThreads, setShowThreads] = useState(false);
  const [threadsKey, setThreadsKey] = useState(0);
  const [displayError, setDisplayError] = useState<Error | null>(null);
  const [references, setReferences] = useState<ChatReference[]>([]);
  const isInit = useRef(false);
  const globalThreadStore = useThreadStore();
  const currentThread = options.currentThread !== undefined ? options.currentThread : globalThreadStore.currentThread;
  const setCurrentThread = options.setCurrentThread || globalThreadStore.setCurrentThread;
  const forceUpdate = useForceUpdate();

  const messagesRef = useRef<UIMessage[]>([]);
  const reasoningTimesRef = useRef<{ [messageId: string]: ReasoningTimes }>({});

  const handleReasoningTimesUpdate = (messageId: string, reasoningTimes: ReasoningTimes) => {
    reasoningTimesRef.current[messageId] = reasoningTimes;
  };

  const { selectedModel, setSelectedModel, currentModelInstance } = useModelSelector("deepseek", "deepseek-chat");

  const { messages, status, error, stop, setMessages, sendMessage, clearError, regenerate } = useChat(
    currentModelInstance || "deepseek-chat",
    {
      experimental_throttle: 50,
      messages: [],
      chatContext,
      onError: (error) => {
        console.error("Error:", error);
      },
      onFinish: ({ message, messages: finishedMessages, isError }) => {
        const { currentThread } = useThreadStore.getState();
        const { selectedModel } = useProviderStore.getState();
        const resolvedMessages = finishedMessages ?? messagesRef.current;

        let nextMessages = resolvedMessages;

        if (isError) {
          const lastMessage = resolvedMessages[resolvedMessages.length - 1];
          if (lastMessage?.role === "assistant") {
            const assistantHasContent = Array.isArray(lastMessage.parts)
              ? lastMessage.parts.some((part: any) => part?.type === "text" && part?.text?.trim())
              : false;
            if (!assistantHasContent) {
              nextMessages = resolvedMessages.slice(0, -1);
            }
          }
        } else if (message) {
          const reasoningTimes = reasoningTimesRef.current[message.id] || {};
          const messageIndex = resolvedMessages.findIndex((item) => item.id === message.id);

          if (messageIndex !== -1) {
            const messageWithMetadata = {
              ...message,
              metadata: {
                ...((message.metadata as MessageMetadata) || {}),
                provider: selectedModel,
                selectedModel,
                createdAt: Math.floor(Date.now() / 1000),
                updatedAt: Math.floor(Date.now() / 1000),
                reasoningTimes,
              } as MessageMetadata,
            };

            nextMessages = [
              ...resolvedMessages.slice(0, messageIndex),
              messageWithMetadata,
              ...resolvedMessages.slice(messageIndex + 1),
            ];
          }
        }

        const normalizedMessages = Array.isArray(nextMessages) ? [...nextMessages] : [...messagesRef.current];
        messagesRef.current = normalizedMessages;
        setMessages(normalizedMessages);

        if (isError) {
          return;
        }

        const persistMessages = (threadId: string) =>
          editThread(threadId, { messages: normalizedMessages })
            .then((updatedThread) => {
              console.log("Thread updated successfully:", updatedThread.id);
              setCurrentThread(updatedThread);
            })
            .catch((error) => {
              console.error("Failed to update thread:", error);
            });

        if (currentThread?.id) {
          persistMessages(currentThread.id);
        } else {
          try {
            const firstUserText =
              normalizedMessages
                .find((m) => m.role === "user")
                ?.parts?.map((p: any) => (p.type === "text" ? p.text : ""))
                .join("") || "新对话";
            createThread(activeBookId, firstUserText.slice(0, 50), normalizedMessages)
              .then((thread) => {
                console.log("Created thread on finish:", thread.id);
                setCurrentThread(thread);
                persistMessages(thread.id);
              })
              .catch((error) => {
                console.error("Failed to create thread on finish:", error);
              });
          } catch (error) {
            console.error("Unexpected error during thread creation on finish:", error);
          }
        }
      },
    },
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!error) return;

    if (error instanceof Error) {
      setDisplayError(error);
    } else {
      let fallbackMessage = "未知错误";
      if (typeof error === "string" && (error as string).trim()) {
        fallbackMessage = error;
      } else {
        try {
          const serialized = JSON.stringify(error);
          if (serialized) {
            fallbackMessage = serialized;
          }
        } catch {
          fallbackMessage = String(error);
        }
      }
      setDisplayError(new Error(fallbackMessage));
    }

    clearError();
  }, [error, clearError]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setDisplayError(null);
    }
  }, [status]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const initializeThread = async () => {
      if (activeBookId && !currentThread && !isInit.current) {
        try {
          const latestThread = await getLatestThreadBybookId(activeBookId);
          if (latestThread) {
            setCurrentThread(latestThread);
            setMessages(latestThread.messages);
            setActiveContext(getThreadContext(latestThread) || undefined);
          }
          isInit.current = true;
        } catch (error) {
          console.error("Failed to load existing thread:", error);
        }
      } else {
        isInit.current = true;
        forceUpdate();
      }
    };

    initializeThread();
  }, [activeBookId, currentThread, setCurrentThread, setMessages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    return () => {
      setCurrentThread(null);
      setMessages([]);
      setReferences([]);
    };
  }, []);

  useTextEventHandler({
    sendMessage,
    activeBookId,
  });

  const createReferenceId = useCallback(() => {
    const cryptoObj = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;
    if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID() as string;
    }
    return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const handleAskSelection = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      setReferences((prev) => {
        if (prev.some((reference) => reference.text === trimmed)) {
          return prev;
        }
        return [...prev, { id: createReferenceId(), text: trimmed }];
      });

      setTimeout(() => {
        const textarea = document.querySelector("#chat-sidebar textarea") as HTMLTextAreaElement;
        console.log("textarea", textarea);
        if (textarea) {
          textarea.focus();
        }
      }, 200);
    },
    [createReferenceId],
  );

  const handleRemoveReference = useCallback((id: string) => {
    setReferences((prev) => prev.filter((reference) => reference.id !== id));
  }, []);

  const buildMessageParts = useCallback((question: string, refs: ChatReference[]) => {
    const parts: any[] = [];
    refs.forEach((reference, index) => {
      parts.push({
        type: "quote",
        text: reference.text,
        source: `引用${index + 1}`,
        id: reference.id,
      });
    });

    if (question.trim()) {
      parts.push({
        type: "text",
        text: question.trim(),
      });
    }

    return parts;
  }, []);

  /**
   * 异步生成语义上下文
   */
  const generateSemanticContextAsync = useCallback(
    async (userQuestion: string) => {
      try {
        const { currentThread } = useThreadStore.getState();
        const thread = currentThread;
        if (!thread) {
          console.log("No current thread, skipping context generation");
          return;
        }
        const previousContext = getThreadContext(thread);
        const lastAssistantMessage = messagesRef.current
          .slice()
          .reverse()
          .find((msg) => msg.role === "assistant");

        const previousAnswer =
          lastAssistantMessage?.parts
            ?.filter((part: any) => part.type === "text")
            ?.map((part: any) => part.text)
            ?.join("") || undefined;

        const contextResponse = await generateContextWithAI(
          userQuestion,
          previousContext,
          previousAnswer,
          selectedModel || undefined,
        );

        await updateThreadContext(thread.id, contextResponse.context);
        setActiveContext(contextResponse.context);
      } catch (error) {
        console.error("Failed to generate semantic context:", error);
      }
    },
    [selectedModel, setActiveContext],
  );

  const handleSubmit = useCallback(async (overrideInput?: string) => {
    if (status !== "ready") return;

    const sourceInput = overrideInput ?? input;
    const trimmedInput = sourceInput.trim();
    if (!trimmedInput) return;

    setDisplayError(null);

    const referenceSnapshot = references.map((reference) => ({ ...reference }));
    const messageParts = buildMessageParts(trimmedInput, referenceSnapshot);

    if (messages.length === 0 && !currentThread) {
      try {
        const titleSource = trimmedInput || referenceSnapshot[0]?.text || "新对话";
        const thread = await createThread(activeBookId, titleSource.substring(0, 50), []);
        setCurrentThread(thread);
        console.log("Created new thread:", thread.id);
      } catch (error) {
        console.error("Failed to create thread:", error);
      }
    }

    setInput("");
    setReferences([]);

    try {
      generateSemanticContextAsync(trimmedInput);
      await sendMessage({ parts: messageParts });
      setMessages((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) {
          return prev;
        }

        const nextMessages = [...prev];

        for (let i = nextMessages.length - 1; i >= 0; i--) {
          const message = nextMessages[i];
          if (message?.role !== "user") {
            continue;
          }
          const existingMetadata = (message.metadata as MessageMetadata) || {};
          nextMessages[i] = {
            ...message,
            parts: messageParts,
            metadata: {
              ...existingMetadata,
              references: referenceSnapshot,
            } as MessageMetadata,
          };
          break;
        }

        messagesRef.current = nextMessages;
        return nextMessages;
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [
    status,
    input,
    references,
    messages,
    activeBookId,
    currentThread,
    buildMessageParts,
    sendMessage,
    setMessages,
    setCurrentThread,
    generateSemanticContextAsync,
  ]);

  const handleNewThread = useCallback(() => {
    setCurrentThread(null);
    setMessages([]);
    setDisplayError(null);
    setReferences([]);
  }, [setCurrentThread, setMessages]);

  const handleShowThreads = useCallback(() => {
    if (!showThreads) {
      setThreadsKey((prev) => prev + 1);
    }
    setShowThreads(!showThreads);
  }, [showThreads]);

  const handleSelectThread = useCallback(
    async (threadSummary: ThreadSummary) => {
      try {
        const fullThread = await getThreadById(threadSummary.id);
        if (fullThread.book_id) {
          setActiveBookId(fullThread.book_id);
        }

        setCurrentThread(fullThread);
        setMessages(fullThread.messages);
        setReferences([]);
        setShowThreads(false);
        const threadContext = getThreadContext(fullThread);
        setActiveContext(threadContext || undefined);

        console.log("Selected thread:", fullThread.id, "context loaded:", !!threadContext);
      } catch (error) {
        console.error("Failed to load thread:", error);
      }
    },
    [setCurrentThread, setMessages, setActiveBookId, setActiveContext],
  );

  const handleBackFromThreads = useCallback(() => {
    setShowThreads(false);
  }, []);

  const handleRetry = useCallback(async () => {
    if (status !== "ready") return;
    const currentMessages = messagesRef.current;
    if (currentMessages.length === 0) return;

    const lastMessage = currentMessages[currentMessages.length - 1];

    setDisplayError(null);

    try {
      if (lastMessage?.role === "assistant") {
        await regenerate({ messageId: lastMessage.id });
      } else {
        await sendMessage();
      }
    } catch (retryError) {
      console.error("Retry failed:", retryError);
    }
  }, [regenerate, sendMessage, status]);

  const canRetry = status === "ready" && !!displayError;

  return {
    // 基础状态
    input,
    setInput,
    references,
    displayError,
    showThreads,
    threadsKey,
    isInit,
    currentThread,

    // Chat 相关
    messages,
    status,
    error,
    stop,

    // 模型相关
    selectedModel,
    setSelectedModel,

    // 引用管理
    handleAskSelection,
    handleRemoveReference,

    // 消息处理
    handleSubmit,
    handleRetry,

    // 线程管理
    handleNewThread,
    handleShowThreads,
    handleSelectThread,
    handleBackFromThreads,

    // 其他
    handleReasoningTimesUpdate,
    canRetry,
  };
}
