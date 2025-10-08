import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CheckCircle, ChevronDown, Eye, Loader2, Settings, XCircle } from "lucide-react";
import { useState } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { TOOL_NAME_MAP } from "../side-chat/chat-messages";

export type ToolPart = {
  type: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  toolCallId?: string;
  errorText?: string;
};

export type ToolProps = {
  toolPart: ToolPart;
  defaultOpen?: boolean;
  className?: string;
  onViewDetail?: (toolPart: ToolPart) => void;
  isChatPage?: boolean;
};

const Tool = ({ toolPart, defaultOpen = false, className, onViewDetail, isChatPage = false }: ToolProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { state, input, output, type } = toolPart;
  const { stopScroll } = useStickToBottomContext();
  const isMindmap = type === TOOL_NAME_MAP.mindmap;
  const isRagTool =
    type === TOOL_NAME_MAP.ragSearch || type === TOOL_NAME_MAP.ragContext || type === TOOL_NAME_MAP.ragToc;
  const isGetSkillsTool = type === TOOL_NAME_MAP.getSkills;

  const handleOpenChange = (open: boolean) => {
    stopScroll();
    setIsOpen(open);
  };

  const getStateIcon = () => {
    switch (state) {
      case "input-streaming":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "input-available":
        return <Settings className="h-4 w-4 text-orange-500" />;
      case "output-available":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "output-error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Settings className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStateBadge = () => {
    const baseClasses = "px-1 py-0.5 rounded-full text-xs font-medium";
    switch (state) {
      case "input-streaming":
        return (
          <span className={cn(baseClasses, "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400")}>
            Processing
          </span>
        );
      case "input-available":
        return (
          <span className={cn(baseClasses, "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400")}>
            Ready
          </span>
        );
      case "output-available":
        return (
          <span className={cn(baseClasses, "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>
            Completed
          </span>
        );
      case "output-error":
        return (
          <span className={cn(baseClasses, "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>Error</span>
        );
      default:
        return (
          <span className={cn(baseClasses, "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400")}>
            Pending
          </span>
        );
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className={className} data-tool-id={toolPart.toolCallId}>
      {input && "reasoning" in input && (
        <div className="my-2 mb-4">
          <p className="border-neutral-300 border-l-2 pl-1 text-muted-foreground text-sm leading-4.5">
            {String(input.reasoning)}
          </p>
        </div>
      )}

      <div className="mb-2 overflow-hidden rounded-lg border border-border">
        <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
          <CollapsibleTrigger asChild>
            <div className="flex h-auto w-full cursor-pointer justify-between gap-2 rounded-b-none px-3 py-2 font-normal hover:bg-muted">
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                <div>{getStateIcon()}</div>
                <span className="flex-nowrap text-sm">{type}</span>
                {type === TOOL_NAME_MAP.ragSearch && input?.question && (
                  <span className="flex-1 overflow-hidden truncate font-medium font-mono text-sm">
                    {String(input?.question)}
                  </span>
                )}
                {isMindmap && (output?.results as any)?.title && (
                  <span
                    title={(output?.results as any)?.title}
                    className="flex-1 overflow-hidden truncate font-medium text-sm"
                  >
                    {String((output?.results as any)?.title)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isMindmap && state === "output-available" && onViewDetail && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      stopScroll();
                      onViewDetail(toolPart);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </div>
                )}
                {isRagTool && isChatPage && state === "output-available" && onViewDetail && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      stopScroll();
                      onViewDetail(toolPart);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </div>
                )}
                {!isMindmap && !isRagTool && !isGetSkillsTool && state === "output-available" && (
                  <span className="text-muted-foreground text-sm">
                    {String((output?.results as unknown[] | undefined)?.length || 0)} results
                  </span>
                )}
                {isRagTool && state === "output-available" && (
                  <span className="text-muted-foreground text-sm">
                    {String((output?.results as unknown[] | undefined)?.length || 0)} results
                  </span>
                )}
                {state !== "output-available" && getStateBadge()}
                <ChevronDown className={cn("h-4 w-4", isOpen && "rotate-180")} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent
            className={cn(
              "border-border border-t",
              "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
            )}
          >
            <div className="space-y-3 bg-background p-3">
              {input && Object.keys(input).length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-muted-foreground text-sm">Input</h4>
                  <div className="rounded border bg-background p-2 font-mono text-sm">
                    {Object.entries(input)
                      .filter(([key]) => key !== "reasoning")
                      .map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <span className="text-muted-foreground">{key}:</span> <span>{formatValue(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {output && (
                <div>
                  <h4 className="mb-2 font-medium text-muted-foreground text-sm">Output</h4>
                  <div className="max-h-60 overflow-auto rounded border bg-background p-2 font-mono text-sm">
                    <pre className="whitespace-pre-wrap">{formatValue(output)}</pre>
                  </div>
                </div>
              )}

              {state === "output-error" && toolPart.errorText && (
                <div>
                  <h4 className="mb-2 font-medium text-red-500 text-sm">Error</h4>
                  <div className="rounded border border-red-200 bg-background p-2 text-sm dark:border-red-950 dark:bg-red-900/20">
                    {toolPart.errorText}
                  </div>
                </div>
              )}

              {state === "input-streaming" && (
                <div className="text-muted-foreground text-sm">Processing tool call...</div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export { Tool };
