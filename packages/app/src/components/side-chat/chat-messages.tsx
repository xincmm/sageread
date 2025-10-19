import { ChatContainerContent, ChatContainerScrollAnchor } from "@/components/prompt-kit/chat-container";
import { Message, MessageAction, MessageActions, MessageContent } from "@/components/prompt-kit/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/prompt-kit/reasoning";
import { Tool } from "@/components/prompt-kit/tool";
import { Button } from "@/components/ui/button";
import { QuoteBlock } from "@/components/ui/quote-block";
import { useIsChatPage } from "@/hooks/use-is-chat-page";
import { type ReasoningTimes, useReasoningTimer } from "@/hooks/use-reasoning-timer";
import { useTextSelection } from "@/hooks/use-text-selection";
import { cn } from "@/lib/utils";
import { audioPlayerManager, synthesizeSpeechChunked } from "@/services/tts-service";
import { useTTSStore } from "@/store/tts-store";
import { getReasoningTimes } from "@/types/message";
import type { UIMessage, UIMessagePart } from "ai";
import dayjs from "dayjs";
import { Brain, Check, Copy, Loader2, Pause, RefreshCw, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { ChatSelectionPopup } from "./chat-selection-popup";

export const TOOL_NAME_MAP: Record<string, string> = {
  ragSearch: "智能搜索",
  ragToc: "章节内容",
  ragContext: "扩展上下文",
  ragRange: "范围检索",
  notes: "笔记查询",
  getBooks: "书籍列表",
  getReadingStats: "阅读统计",
  mindmap: "思维导图",
  getSkills: "技能查询",
};

interface ChatMessagesProps {
  messages: any[];
  status: string;
  error: any;
  autoScroll?: boolean;
  scrollKey?: string | number;
  bookId?: string | null;
  onReasoningTimesUpdate?: (messageId: string, reasoningTimes: ReasoningTimes) => void;
  onRetry?: () => void | Promise<void>;
  canRetry?: boolean;
  onAskSelection?: (text: string) => void;
  onViewToolDetail?: (toolPart: any) => void;
}

export function reorderTextAndReasoning(message: UIMessage): UIMessage {
  const srcParts = Array.isArray(message?.parts) ? message.parts : [];
  const cloned = srcParts.map((p) => ({ ...p }));
  const reordered: UIMessagePart<any, any>[] = [];

  for (let i = 0; i < cloned.length; i++) {
    const a = cloned[i];
    const b = cloned[i + 1];

    if (a?.type === "text" && b?.type === "reasoning") {
      reordered.push(b, a);
      i++;
    } else {
      reordered.push(a);
    }
  }

  return { ...message, parts: reordered };
}

export function ChatMessages({
  messages,
  status,
  error,
  scrollKey,
  onReasoningTimesUpdate,
  onRetry,
  canRetry = true,
  onAskSelection,
  onViewToolDetail,
}: ChatMessagesProps) {
  const { scrollToBottom } = useStickToBottomContext();
  const isChatPage = useIsChatPage();
  const lastMessage = reorderTextAndReasoning(messages[messages.length - 1]);
  const reasoningPart = lastMessage?.parts?.findLast((part: UIMessagePart<any, any>) => part.type === "reasoning");
  const isStreaming = status === "streaming";
  const reasoningActive = isStreaming && !!reasoningPart && reasoningPart?.state === "streaming";
  const existingReasoningTimes = getReasoningTimes(lastMessage);

  const [copiedMessageIds, setCopiedMessageIds] = useState<Set<string>>(new Set());
  const [audioStates, setAudioStates] = useState<Map<string, "idle" | "loading" | "playing" | "paused">>(new Map());
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());

  const { config: ttsConfig } = useTTSStore();

  const { selectionState, handleTextSelection, handleClosePopup, handleAskSelection, popupRef } = useTextSelection({
    onAskSelection,
  });

  const hasInitialScrolled = useRef(false);
  const prevScrollKey = useRef(scrollKey);

  const getFilteredTextFromDOM = (messageId: string): string => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return "";

    const textDivs = messageElement.querySelectorAll(".prose");
    if (textDivs.length === 0) return "";

    const lastTextDiv = textDivs[textDivs.length - 1];
    const cloned = lastTextDiv.cloneNode(true) as HTMLElement;
    const pageNumElements = cloned.querySelectorAll("span.rounded-full.bg-muted");
    pageNumElements.forEach((el) => el.remove());

    return cloned.textContent?.trim() || "";
  };

  const errorMessage = typeof error === "string" ? error : error?.message;

  const { getDisplayTime, onReasoningStreamingChange } = useReasoningTimer({
    messageId: lastMessage?.id,
    existingTimes: existingReasoningTimes,
    onTimesChange: onReasoningTimesUpdate,
  });

  const handleCopy = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageIds((prev) => new Set(prev).add(messageId));
    setTimeout(() => {
      setCopiedMessageIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }, 2000);
  };

  const handlePlayAudio = async (messageId: string, text: string) => {
    if (!ttsConfig.apiKey || ttsConfig.apiKey.trim() === "") {
      toast.error("请先在设置中配置 DashScope API Key");
      return;
    }

    const currentState = audioStates.get(messageId) || "idle";

    if (currentState === "playing") {
      audioPlayerManager.pause();
      setAudioStates((prev) => new Map(prev).set(messageId, "paused"));
      return;
    }

    if (currentState === "paused") {
      await audioPlayerManager.resume();
      setAudioStates((prev) => new Map(prev).set(messageId, "playing"));
      return;
    }

    try {
      setAudioStates((prev) => new Map(prev).set(messageId, "loading"));

      const cachedUrls = audioUrls.get(messageId);
      if (cachedUrls) {
        const urlArray = cachedUrls.split(",");
        const wasResumed = await audioPlayerManager.startPlayback(messageId);
        if (!wasResumed) {
          for (const url of urlArray) {
            audioPlayerManager.addToQueue(url);
          }
          audioPlayerManager.markAllChunksAdded();
        }
        setAudioStates((prev) => new Map(prev).set(messageId, "playing"));
      } else {
        const wasResumed = await audioPlayerManager.startPlayback(messageId);
        if (!wasResumed) {
          let isFirstChunk = true;
          const audioUrlArray = await synthesizeSpeechChunked({
            text,
            onChunkReady: (url) => {
              audioPlayerManager.addToQueue(url);
              if (isFirstChunk) {
                isFirstChunk = false;
                setAudioStates((prev) => new Map(prev).set(messageId, "playing"));
              }
            },
          });

          audioPlayerManager.markAllChunksAdded();
          setAudioUrls((prev) => new Map(prev).set(messageId, audioUrlArray.join(",")));
        } else {
          setAudioStates((prev) => new Map(prev).set(messageId, "playing"));
        }
      }

      audioPlayerManager.onEnded(() => {
        setAudioStates((prev) => new Map(prev).set(messageId, "idle"));
      });
    } catch (error) {
      console.error("语音播放失败:", error);
      setAudioStates((prev) => new Map(prev).set(messageId, "idle"));
    }
  };

  useEffect(() => {
    if (!lastMessage?.parts) return;
    const lastReasoningIndex = lastMessage.parts.reduce((lastIndex, part, index) => {
      return part?.type === "reasoning" ? index : lastIndex;
    }, -1);

    lastMessage.parts.forEach((part, index) => {
      if (part?.type === "reasoning") {
        const isCurrentlyStreaming = reasoningActive && index === lastReasoningIndex;
        onReasoningStreamingChange(index, isCurrentlyStreaming);
      }
    });
  }, [lastMessage?.parts, reasoningActive, onReasoningStreamingChange]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!hasInitialScrolled.current && messages.length > 0) {
      scrollToBottom("instant");
      hasInitialScrolled.current = true;
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (scrollKey !== undefined && prevScrollKey.current !== scrollKey) {
      scrollToBottom("instant");
      prevScrollKey.current = scrollKey;
      hasInitialScrolled.current = true;
    }
  }, [scrollKey, scrollToBottom]);

  const renderMessageParts = (parts: any[], isLastMessage: boolean, isAssistant = true, messageId?: string) => {
    const elements: any[] = [];
    let textBuffer = "";

    const flushText = () => {
      if (!textBuffer) return;
      const className = isAssistant
        ? "prose prose-neutral flex-1 rounded bg-transparent p-0 text-foreground"
        : "rounded-xl bg-muted p-2 text-base leading-5";

      elements.push(
        <div key={`text-${elements.length}`} onMouseUp={handleTextSelection}>
          <MessageContent className={className} markdown={isAssistant}>
            {textBuffer}
          </MessageContent>
        </div>,
      );
      textBuffer = "";
    };

    const reasoningStreaming = isLastMessage && reasoningActive;
    const lastReasoningIndex = parts.reduce((lastIndex, part, index) => {
      return part?.type === "reasoning" ? index : lastIndex;
    }, -1);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const type = part?.type as string | undefined;

      if (type === "text") {
        textBuffer += part.text ?? "";
        continue;
      }

      if (type === "quote") {
        flushText();
        elements.push(
          <QuoteBlock key={`quote-${i}`} className="leading-[18px]">
            {part.text}
          </QuoteBlock>,
        );
        continue;
      }

      if (type === "reasoning") {
        flushText();
        const isCurrentlyStreaming = reasoningStreaming && i === lastReasoningIndex;
        const displayTime = getDisplayTime(i, isCurrentlyStreaming);
        const showTimer = displayTime !== undefined && displayTime >= 0;

        elements.push(
          <Reasoning key={`reasoning-${i}`} isStreaming={isCurrentlyStreaming}>
            <ReasoningTrigger className="flex items-center gap-1 text-muted-foreground">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Brain className="h-4 w-4" />
                <span className="text-sm">{isCurrentlyStreaming ? "Thinking..." : ""}</span>
                {showTimer && (
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <span>
                      {isCurrentlyStreaming
                        ? `${displayTime}s`
                        : `Thought for ${displayTime} second${displayTime === 1 ? "" : "s"}`}
                    </span>
                  </div>
                )}
              </div>
            </ReasoningTrigger>
            <ReasoningContent
              className="ml-2 border-l-2 border-l-neutral-300 px-2 pl-4 dark:border-l-neutral-600"
              markdown
            >
              {part.text || ""}
            </ReasoningContent>
          </Reasoning>,
        );
        continue;
      }

      if (typeof type === "string" && type.startsWith("tool-")) {
        flushText();
        const toolType = type.replace(/^tool-/, "");
        const toolName = TOOL_NAME_MAP[toolType] || toolType;
        elements.push(
          <Tool
            key={`tool-${i}`}
            className="w-full"
            toolPart={{
              type: toolName,
              state: part.state ?? "output-available",
              input: part.input,
              output: part.output,
              toolCallId: part.toolCallId,
              errorText: part.errorText,
            }}
            onViewDetail={onViewToolDetail}
            isChatPage={isChatPage}
          />,
        );
        continue;
      }

      flushText();
    }

    flushText();

    return (
      <div className="flex flex-col gap-1" data-message-id={messageId}>
        {elements}
      </div>
    );
  };

  return (
    <ChatContainerContent className="select-auto py-6 first:mt-0">
      {messages.map((message, index) => {
        const isAssistant = message.role === "assistant";
        const isLastMessage = index === messages.length - 1;
        const isFirstMessage = index === 0;
        const isStreaming = status === "streaming";
        const showError = !!errorMessage && isLastMessage;
        const canShowRetry = showError && !!onRetry;
        const reorderedMessage = reorderTextAndReasoning(message);

        return (
          <Message
            key={message.id}
            className={cn("mx-auto flex w-full max-w-3xl flex-col items-start gap-2", isChatPage ? "px-4" : "px-2")}
          >
            {isAssistant ? (
              <div className="group flex w-full flex-col gap-0">
                {renderMessageParts(reorderedMessage.parts, isLastMessage, true, message.id)}
                {((!isStreaming && isLastMessage) || !isLastMessage) && (
                  <div className="flex items-center justify-between">
                    <MessageActions className="-ml-2.5 flex transform-gpu gap-0">
                      {canShowRetry && (
                        <MessageAction tooltip="刷新重试" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full"
                            disabled={!canRetry}
                            onClick={() => {
                              onRetry?.();
                            }}
                          >
                            <RefreshCw size={12} />
                          </Button>
                        </MessageAction>
                      )}
                      <MessageAction tooltip={copiedMessageIds.has(message.id) ? "已复制" : "复制"} delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-full"
                          onClick={() => {
                            const textContent = message.parts
                              .map((part: any) => (part.type === "text" ? part.text : ""))
                              .join("");
                            handleCopy(message.id, textContent);
                          }}
                        >
                          {copiedMessageIds.has(message.id) ? <Check size={10} /> : <Copy size={10} />}
                        </Button>
                      </MessageAction>

                      <MessageAction
                        tooltip={
                          audioStates.get(message.id) === "playing"
                            ? "暂停"
                            : audioStates.get(message.id) === "paused"
                              ? "继续"
                              : "播放语音"
                        }
                        delayDuration={100}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-full"
                          disabled={audioStates.get(message.id) === "loading"}
                          onClick={() => {
                            const textContent = getFilteredTextFromDOM(message.id);
                            handlePlayAudio(message.id, textContent);
                          }}
                        >
                          {audioStates.get(message.id) === "loading" ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : audioStates.get(message.id) === "playing" ? (
                            <Pause size={10} />
                          ) : (
                            <Volume2 size={10} />
                          )}
                        </Button>
                      </MessageAction>
                    </MessageActions>
                    {message.metadata && (
                      <div className="flex items-center gap-2 text-neutral-500 text-xs dark:text-neutral-400">
                        {message.metadata.totalUsage && (
                          <span className="text-xs">{message.metadata.totalUsage.totalTokens} tokens</span>
                        )}
                        {message.metadata.updatedAt && (
                          <span className="text-xs">
                            {dayjs(message.metadata.updatedAt * 1000).format("YYYY-MM-DD HH:mm:ss")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {showError && (
                  <div className="mt-2 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-xs dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                    错误: {errorMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn("group mt-7 flex max-w-full flex-col", isFirstMessage && "mt-0")}>
                {renderMessageParts(reorderedMessage.parts, isLastMessage, false, message.id)}

                <MessageActions
                  className={cn(
                    "flex transform-gpu justify-end gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                  )}
                >
                  {canShowRetry && (
                    <MessageAction tooltip="刷新重试" delayDuration={100}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-full hover:bg-white dark:hover:bg-neutral-600"
                        disabled={!canRetry}
                        onClick={() => {
                          onRetry?.();
                        }}
                      >
                        <RefreshCw size={12} />
                      </Button>
                    </MessageAction>
                  )}
                  {/* TODO: 实现编辑功能
                  <MessageAction tooltip="编辑" delayDuration={100}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full hover:bg-white dark:hover:bg-neutral-600"
                    >
                      <Pencil size={12} />
                    </Button>
                  </MessageAction>
                  */}
                  {/* TODO: 实现删除功能
                  <MessageAction tooltip="删除" delayDuration={100}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full hover:bg-white dark:hover:bg-neutral-600"
                    >
                      <Trash size={12} />
                    </Button>
                  </MessageAction>
                  */}
                  <MessageAction tooltip={copiedMessageIds.has(message.id) ? "已复制" : "复制"} delayDuration={100}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full hover:bg-white dark:hover:bg-neutral-600"
                      onClick={() => {
                        const textContent = reorderedMessage.parts
                          .map((part: any) => (part.type === "text" ? part.text : ""))
                          .join("");
                        handleCopy(message.id, textContent);
                      }}
                    >
                      {copiedMessageIds.has(message.id) ? <Check size={12} /> : <Copy size={12} />}
                    </Button>
                  </MessageAction>
                </MessageActions>
                {showError && (
                  <div className="mt-2 max-w-full rounded-lg border border-red-200 bg-red-50 px-1.5 py-1 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}
          </Message>
        );
      })}

      {(status === "submitted" || status === "streaming") && (
        <div className={cn("mx-auto flex w-full max-w-3xl flex-col items-start gap-2", isChatPage && "px-6")}>
          <div className="group flex w-full flex-col gap-0 px-2">
            <div className="flex items-center gap-2">Thinking...</div>
          </div>
        </div>
      )}
      <ChatContainerScrollAnchor />
      {selectionState?.showPopup && (
        <ChatSelectionPopup
          selectedText={selectionState.selectedText}
          onClose={handleClosePopup}
          onAskAi={handleAskSelection}
          position={selectionState.position}
          popupRef={popupRef}
        />
      )}
    </ChatContainerContent>
  );
}
