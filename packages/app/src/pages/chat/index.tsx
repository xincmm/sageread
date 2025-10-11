import { ChatContainerRoot } from "@/components/prompt-kit/chat-container";
import { PromptInput, PromptInputAction, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import { ChatInputArea } from "@/components/side-chat/chat-input-area";
import { ChatMessages, TOOL_NAME_MAP } from "@/components/side-chat/chat-messages";
import { ChatThreads } from "@/components/side-chat/chat-threads";
import { ContextPopover } from "@/components/side-chat/context-popover";
import ModelSelector from "@/components/side-chat/model-selector";
import { MindmapViewer } from "@/components/tools/mindmap-viewer";
import { RagResultViewer } from "@/components/tools/rag-result-viewer";
import { Button } from "@/components/ui/button";
import { useChatState } from "@/hooks/use-chat-state";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useChatReaderStore } from "@/store/chat-reader-store";
import { useThemeStore } from "@/store/theme-store";
import {
  Brain,
  History,
  Lightbulb,
  MessageCirclePlus,
  Paperclip,
  ScrollText,
  Search,
  Settings,
  UserSearch,
  X,
} from "lucide-react";
import { ArrowUp } from "lucide-react";
import { Resizable } from "re-resizable";
import { memo, useRef, useState } from "react";

interface EmptyStateProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (promptOverride?: string) => Promise<void>;
  stop: () => void;
  status: string;
}

const EmptyState = memo(({ input, setInput, handleSubmit, stop, status }: EmptyStateProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeBookId, setActiveBookId } = useChatReaderStore();
  const promptSuggestions = [
    { text: "总结我最近的阅读情况", icon: ScrollText, isNew: true },
    { text: "分析我最近的问题", icon: Lightbulb, isNew: false },
    { text: "总结我最近的学习笔记", icon: UserSearch, isNew: false },
    { text: "总结我最近的标注", icon: Search, isNew: true },
  ] as const;

  return (
    <div className="flex h-full w-full select-none flex-col items-center justify-center overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full">
            <Brain className="size-12 text-primary" />
          </div>
          <h1 className="font-semibold text-3xl text-neutral-900 dark:text-neutral-50">How can I help you today?</h1>
        </div>

        <div className="w-full">
          <PromptInput
            isLoading={status !== "ready"}
            value={input}
            onValueChange={setInput}
            onSubmit={handleSubmit}
            className="relative z-10 w-full rounded-2xl border bg-background shadow-around dark:bg-neutral-800"
          >
            <div className="flex items-center justify-between gap-2 pt-1">
              <ContextPopover activeBookId={activeBookId} setActiveBookId={setActiveBookId} />
            </div>
            <PromptInputTextarea
              placeholder="Ask, search, or make anything..."
              className="flex-1 py-2 pl-1 text-base leading-[1.5] placeholder:font-normal dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400"
            />
            <div className="flex items-center justify-between gap-2 pb-1">
              <input ref={fileInputRef} type="file" multiple className="hidden" />
              <PromptInputAction tooltip="上传文件">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="size-8 rounded-full dark:border-neutral-600 dark:hover:bg-neutral-700"
                >
                  <Paperclip className="size-4" />
                </Button>
              </PromptInputAction>

              <Button
                type="button"
                size="icon"
                disabled={status === "ready" ? !input.trim() : status !== "submitted" && status !== "streaming"}
                onClick={(e) => {
                  e.preventDefault();
                  if (status === "ready") {
                    handleSubmit();
                  } else {
                    stop();
                  }
                }}
                className="size-8 rounded-full"
              >
                {status === "ready" ? (
                  <ArrowUp size={18} />
                ) : (
                  <span className="size-2 rounded-xs bg-white dark:bg-neutral-900" />
                )}
              </Button>
            </div>
          </PromptInput>
        </div>

        <div>
          <h2 className="font-medium text-neutral-600 text-sm dark:text-neutral-400">Get started</h2>
          <div className="mt-2 flex gap-4">
            {promptSuggestions.map(({ text, icon: Icon }) => (
              <div
                key={text}
                onClick={() => {
                  setInput(text);
                  handleSubmit(text);
                }}
                className="flex w-full cursor-pointer flex-col items-start rounded-xl bg-muted p-4 transition-all dark:border-neutral-700 dark:bg-neutral-800"
              >
                <Icon className="size-5 flex-shrink-0 text-neutral-600 dark:text-neutral-300" />
                <span className="mt-3 flex-1 text-neutral-600 text-sm dark:text-neutral-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

EmptyState.displayName = "EmptyState";

function ChatPage() {
  const { toggleSettingsDialog } = useAppSettingsStore();
  const { autoScroll } = useThemeStore();
  const [toolDetail, setToolDetail] = useState<any>(null);
  const [showToolDetail, setShowToolDetail] = useState(false);
  const scrollContextRef = useRef<any>(null);
  const { activeBookId, activeContext, setActiveBookId, setActiveContext, currentThread, setCurrentThread } =
    useChatReaderStore();

  const {
    input,
    references,
    displayError,
    showThreads,
    threadsKey,
    isInit,
    messages,
    status,
    selectedModel,

    stop,
    setInput,
    setSelectedModel,
    handleAskSelection,
    handleRemoveReference,
    handleSubmit,
    handleRetry,
    handleNewThread,
    handleShowThreads,
    handleSelectThread,
    handleBackFromThreads,
    handleReasoningTimesUpdate,
  } = useChatState({
    chatContext: {
      activeBookId,
      activeContext,
    },
    setActiveBookId,
    setActiveContext,
    currentThread: currentThread,
    setCurrentThread: setCurrentThread,
  });

  const handleViewToolDetail = (toolPart: any) => {
    scrollContextRef.current?.stopScroll?.();
    setToolDetail(toolPart);
    setShowToolDetail(true);

    if (toolPart?.toolCallId && !showToolDetail) {
      setTimeout(() => {
        const toolElement = document.querySelector(`[data-tool-id="${toolPart.toolCallId}"]`);
        if (toolElement) {
          toolElement.scrollIntoView({ behavior: "instant", block: "center" });
        }
      }, 300);
    }
  };

  const handleCloseToolDetail = () => {
    setShowToolDetail(false);
    setToolDetail(null);
  };

  const renderToolContent = () => {
    if (!toolDetail?.output?.results) return null;

    const toolType = toolDetail.type;

    if (toolType === TOOL_NAME_MAP.mindmap) {
      return <MindmapViewer markdown={toolDetail.output.results.markdown} />;
    }

    const isRagTool =
      toolType === TOOL_NAME_MAP.ragSearch ||
      toolType === TOOL_NAME_MAP.ragContext ||
      toolType === TOOL_NAME_MAP.ragToc;

    if (isRagTool) {
      return <RagResultViewer results={toolDetail.output.results} />;
    }

    return null;
  };

  return (
    <div className="relative flex h-full rounded-xl border bg-background">
      <div className={`absolute inset-0 z-50 ${showThreads ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${showThreads ? "bg-transparent opacity-100" : "bg-transparent opacity-0"}`}
          onClick={showThreads ? handleBackFromThreads : undefined}
        />
        <div
          className={`absolute top-0 left-0 h-full w-80 transform rounded-2xl border-neutral-200 border-r bg-white px-2 shadow-md transition-all duration-300 ease-out dark:border-neutral-700 dark:bg-neutral-900 ${showThreads ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"}`}
        >
          <ChatThreads
            key={`threads-${threadsKey}`}
            bookId={undefined}
            onBack={handleBackFromThreads}
            onSelectThread={handleSelectThread}
          />
        </div>
      </div>

      <div className="flex h-full w-full overflow-hidden">
        <Resizable
          defaultSize={{
            width: "40%",
            height: "100%",
          }}
          minWidth={showToolDetail ? "30%" : "100%"}
          maxWidth={showToolDetail ? "70%" : "100%"}
          enable={{
            top: false,
            right: showToolDetail,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          handleComponent={{
            right: <div className="custom-resize-handle custom-resize-handle-left" />,
          }}
          className="flex h-full flex-col pr-2"
        >
          <div className="relative flex h-10 flex-shrink-0 items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                onClick={handleShowThreads}
              >
                <History className="size-5" />
              </Button>
              <ModelSelector selectedModel={selectedModel} onModelSelect={setSelectedModel} className="max-w-60" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                onClick={handleNewThread}
              >
                <MessageCirclePlus className="size-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                onClick={toggleSettingsDialog}
              >
                <Settings className="size-5" />
              </Button>
            </div>
            {messages.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 z-10 h-6 translate-y-full bg-gradient-to-b from-background to-background/30 blur-sm" />
            )}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {messages.length === 0 && isInit.current ? (
              <EmptyState input={input} setInput={setInput} handleSubmit={handleSubmit} stop={stop} status={status} />
            ) : (
              <>
                <ChatContainerRoot className="relative flex-1" autoScroll={autoScroll} contextRef={scrollContextRef}>
                  <ChatMessages
                    messages={messages}
                    status={status}
                    error={displayError}
                    autoScroll={autoScroll}
                    scrollKey={currentThread?.id ?? "__global__"}
                    onReasoningTimesUpdate={handleReasoningTimesUpdate}
                    onRetry={handleRetry}
                    canRetry={status === "ready" && !!displayError}
                    onAskSelection={handleAskSelection}
                    onViewToolDetail={handleViewToolDetail}
                  />
                  <div className="-translate-x-1/2 pointer-events-none absolute bottom-4 left-1/2 flex w-full max-w-3xl justify-end px-5">
                    <div className="pointer-events-auto">
                      <ScrollButton />
                    </div>
                  </div>
                </ChatContainerRoot>

                <div className="py-2">
                  <div id="chat-sidebar" className="mx-auto max-w-4xl">
                    <ChatInputArea
                      input={input}
                      setInput={setInput}
                      references={references}
                      onRemoveReference={handleRemoveReference}
                      onSubmit={handleSubmit}
                      onStop={stop}
                      status={status}
                      activeBookId={activeBookId}
                      setActiveBookId={setActiveBookId}
                      showToolDetail={showToolDetail}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Resizable>

        <div
          className={`flex h-full flex-1 flex-col rounded-r-2xl border-neutral-200 border-l bg-background transition-transform duration-300 ease-out dark:border-neutral-700 ${
            showToolDetail ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-neutral-200 border-b p-2 py-2 pl-3 dark:border-neutral-700">
            <h2 className="font-semibold text-lg text-neutral-900 dark:text-neutral-50">
              {toolDetail?.type || "工具详情"}
            </h2>
            <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={handleCloseToolDetail}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">{renderToolContent()}</div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
