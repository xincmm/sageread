import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { StickToBottom, type StickToBottomContext, useStickToBottomContext } from "use-stick-to-bottom";

export type ChatContainerRootProps = {
  children: React.ReactNode;
  className?: string;
  autoScroll?: boolean;
  resize?: "auto" | "instant" | "smooth";
  initial?: "auto" | "instant" | "smooth" | boolean;
  contextRef?: React.RefObject<StickToBottomContext>;
} & React.HTMLAttributes<HTMLDivElement>;

function AutoScrollController({ autoScroll }: { autoScroll: boolean }) {
  const { stopScroll } = useStickToBottomContext();

  useEffect(() => {
    if (!autoScroll) {
      stopScroll();
    }
  }, [autoScroll, stopScroll]);

  return null;
}

export type ChatContainerContentProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export type ChatContainerScrollAnchorProps = {
  className?: string;
  ref?: React.RefObject<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>;

function ChatContainerRoot({
  children,
  className,
  autoScroll = true,
  resize = "instant",
  initial = "instant",
  contextRef,
  ...props
}: ChatContainerRootProps) {
  return (
    <StickToBottom
      className={cn("flex overflow-y-auto", className)}
      resize={resize}
      initial={initial}
      contextRef={contextRef}
      role="log"
      {...props}
    >
      <AutoScrollController autoScroll={autoScroll} />
      {children}
    </StickToBottom>
  );
}

function ChatContainerContent({ children, className, ...props }: ChatContainerContentProps) {
  return (
    <StickToBottom.Content className={cn("flex w-full flex-col", className)} {...props}>
      {children}
    </StickToBottom.Content>
  );
}

function ChatContainerScrollAnchor({ className, ...props }: ChatContainerScrollAnchorProps) {
  return <div className={cn("h-px w-full shrink-0 scroll-mt-4", className)} aria-hidden="true" {...props} />;
}

export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor };
