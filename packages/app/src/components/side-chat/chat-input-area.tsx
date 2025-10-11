import { PromptInput, PromptInputAction, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";
import { Button } from "@/components/ui/button";
import { useIsChatPage } from "@/hooks/use-is-chat-page";
import type { ChatReference } from "@/types/message";
import { ArrowUp, BookOpen, Brain, Notebook, Paperclip, Quote, X } from "lucide-react";
import { useRef } from "react";
import { ContextPopover } from "./context-popover";

interface ChatInputAreaProps {
  references: ChatReference[];
  input: string;
  status: string;
  activeBookId: string | undefined;
  showToolDetail?: boolean;

  setInput: (value: string) => void;
  onRemoveReference: (id: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  setActiveBookId: (bookId: string | undefined) => void;
}

const quickActions = [
  { label: "总结本章", icon: BookOpen, prompt: "请帮我总结本章的核心要点和结论。" },
  { label: "分析观点", icon: Brain, prompt: "请分析作者的观点，指出论据与可能的偏见。" },
  { label: "生成思维导图", icon: Notebook, prompt: "请基于当前内容生成思维导图。" },
] as const;

export function ChatInputArea({
  input,
  status,
  references,
  activeBookId,
  showToolDetail = false,

  setActiveBookId,
  onRemoveReference,
  onSubmit,
  onStop,
  setInput,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isChatPage = useIsChatPage();

  return (
    <div className="z-10 shrink-0 px-2 pr-0 pl-1.5">
      {!isChatPage && (
        <div className="flex items-center justify-between gap-2 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {quickActions.map(({ label, icon: Icon, prompt }) => (
              <PromptInputAction key={label} tooltip={label}>
                <Button
                  variant="soft"
                  className="h-7 cursor-pointer"
                  size="sm"
                  onClick={() => setInput(prompt)}
                >
                  <Icon className="size-4" />
                  {!showToolDetail && <span className="text-xs">{label}</span>}
                </Button>
              </PromptInputAction>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-3xl">
        <PromptInput
          isLoading={status !== "ready"}
          value={input}
          onValueChange={setInput}
          onSubmit={onSubmit}
          className="relative z-10 w-full rounded-2xl border bg-background shadow-around dark:bg-neutral-800"
        >
          {isChatPage && (
            <div className="flex items-center justify-between gap-2 py-2">
              <ContextPopover activeBookId={activeBookId} setActiveBookId={setActiveBookId} />
              <div className="flex flex-wrap items-center gap-2 ">
                {quickActions.map(({ label, icon: Icon, prompt }) => (
                  <PromptInputAction key={label} tooltip={label}>
                    <Button
                      variant="soft"
                      className="h-7 cursor-pointer"
                      size="sm"
                      onClick={() => setInput(prompt)}
                    >
                      <Icon className="size-4" />
                      {!showToolDetail && <span className="text-xs">{label}</span>}
                    </Button>
                  </PromptInputAction>
                ))}
              </div>
            </div>
          )}
          {references.length > 0 && (
            <div className="my-1 flex flex-col">
              {references.map((reference) => (
                <div
                  key={reference.id}
                  className="group flex w-full items-start gap-2 rounded-xl border border-neutral-200 bg-muted/70 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-700/70"
                >
                  <Quote className="mt-[1px] size-3.5 text-neutral-600 dark:text-neutral-100" />
                  <span className="flex-1 whitespace-pre-wrap break-words text-left text-neutral-700 dark:text-neutral-100">
                    {reference.text}
                  </span>
                  <button
                    type="button"
                    className="mt-0.5 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-300 dark:hover:text-neutral-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveReference(reference.id);
                    }}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <PromptInputTextarea
            placeholder="问我任何问题..."
            className="flex-1 py-2 pl-2 text-sm leading-[1.3] placeholder:font-light dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400"
          />
          <div className="flex items-center justify-between gap-2">
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
              type="submit"
              size="icon"
              disabled={status === "ready" ? !input.trim() : status !== "submitted" && status !== "streaming"}
              onClick={status === "ready" ? onSubmit : onStop}
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
    </div>
  );
}
