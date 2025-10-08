import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChatState } from "@/hooks/use-chat-state";
import { useReaderStore } from "@/pages/reader/components/reader-provider";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useThemeStore } from "@/store/theme-store";
import {
  CircleQuestionMark,
  History,
  Lightbulb,
  MessageCirclePlus,
  NotebookPen,
  ScrollText,
  Search,
  Settings,
  UserSearch,
} from "lucide-react";
import { useState } from "react";
import { ChatContainerRoot } from "../prompt-kit/chat-container";
import { ScrollButton } from "../prompt-kit/scroll-button";
import { MindmapDialog } from "../tools/mindmap-dialog";
import { ChatInputArea } from "./chat-input-area";
import { ChatMessages } from "./chat-messages";
import { ChatThreads } from "./chat-threads";
import ModelSelector from "./model-selector";

interface ChatContentProps {
  bookId?: string;
}

function ChatContent({ bookId }: ChatContentProps) {
  const { toggleSettingsDialog } = useAppSettingsStore();
  const { autoScroll } = useThemeStore();
  const [toolDetail, setToolDetail] = useState<any>(null);
  const [showMindmapDialog, setShowMindmapDialog] = useState(false);
  const setActiveContext = useReaderStore((state) => state.setActiveContext)!;
  const progress = useReaderStore((state) => state.progress);
  const activeContext = useReaderStore((state) => state.activeContext)!;

  const {
    input,
    references,
    displayError,
    showThreads,
    threadsKey,
    isInit,
    currentThread,
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
      activeBookId: bookId,
      activeContext,
      activeSectionLabel: progress?.sectionLabel,
    },
    setActiveBookId: () => {},
    setActiveContext: setActiveContext,
  });

  const handleViewToolDetail = (toolPart: any) => {
    setToolDetail(toolPart);
    setShowMindmapDialog(true);
  };

  const promptSuggestions = [
    { text: "总结这一页的内容", icon: ScrollText, isNew: true },
    { text: "解释这个概念", icon: Lightbulb, isNew: false },
    { text: "分析作者的观点", icon: UserSearch, isNew: false },
    { text: "找出关键信息", icon: Search, isNew: true },
    { text: "提出相关问题", icon: CircleQuestionMark, isNew: false },
    { text: "生成学习笔记", icon: NotebookPen, isNew: true },
  ] as const;

  const EmptyState = () => (
    <div className="flex h-full w-full flex-col overflow-y-auto p-2 pb-8">
      <div className="flex flex-1 flex-col justify-end gap-2">
        <div className="mb-4 flex flex-col items-start gap-4 pl-2">
          <div className="rounded-full bg-muted/70 p-3 shadow-md dark:bg-neutral-800/90">
            <img className="size-8" src="https://www.notion.so/_assets/9ade71d75a1c0e93.png" alt="" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-neutral-900 text-xl dark:text-neutral-50">AI 阅读助手</h3>
            <p className="max-w-md text-sm dark:text-neutral-400">
              智能分析文本内容，提供深度理解和个性化解答，帮助你快速掌握书籍要点。你可以：
            </p>
          </div>
        </div>
        <div className="space-y-1">
          {promptSuggestions.map(({ text, icon: Icon, isNew }) => (
            <div
              key={text}
              onClick={() => setInput(text)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:hover:bg-neutral-800/80"
            >
              <span className="flex items-center gap-3 text-neutral-800 text-sm dark:text-neutral-200">
                <Icon className="size-4" />
                {text}
              </span>
              {isNew ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-primary/10 font-medium text-[10px] text-primary uppercase tracking-wide"
                >
                  New
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <main id="chat-sidebar" className="flex h-full flex-col overflow-hidden ">
      <div className="ml-1 flex-shrink-0 border-neutral-300 dark:border-neutral-700">
        <div className="flex h-8 items-center justify-between">
          <div className="flex flex-1 items-center gap-2 pl-0.5">
            <ModelSelector selectedModel={selectedModel} onModelSelect={setSelectedModel} className="z-40 max-w-80" />
          </div>
          <div className="flex items-center gap-0">
            <Button
              variant="ghost"
              size="icon"
              className="z-40 size-7 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
              onClick={handleNewThread}
            >
              <MessageCirclePlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="z-40 size-7 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
              onClick={handleShowThreads}
            >
              <History className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="z-40 size-7 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
              onClick={toggleSettingsDialog}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      {showThreads && bookId ? (
        <ChatThreads
          key={`threads-${threadsKey}`}
          bookId={bookId}
          onBack={handleBackFromThreads}
          onSelectThread={handleSelectThread}
        />
      ) : messages.length === 0 && isInit.current ? (
        <EmptyState />
      ) : (
        <ChatContainerRoot className="relative flex-1" autoScroll={autoScroll}>
          <ChatMessages
            messages={messages}
            status={status}
            error={displayError}
            autoScroll={autoScroll}
            scrollKey={currentThread?.id ?? "__init__"}
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
      )}

      {!showThreads && bookId && (
        <ChatInputArea
          input={input}
          setInput={setInput}
          references={references}
          onRemoveReference={handleRemoveReference}
          onSubmit={handleSubmit}
          onStop={stop}
          status={status}
          activeBookId={bookId}
          setActiveBookId={() => {}}
        />
      )}

      <MindmapDialog open={showMindmapDialog} onOpenChange={setShowMindmapDialog} toolPart={toolDetail} />
    </main>
  );
}

export default ChatContent;
