import { cn } from "@/lib/utils";
import { Quote } from "lucide-react";
import type React from "react";

interface QuoteBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  iconClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  children,
  className,
  iconClassName,
  contentClassName,
  ...props
}) => {
  return (
    <div
      className={cn("flex max-w-full items-start gap-1 rounded-lg text-muted-foreground text-sm leading-5", className)}
      {...props}
    >
      <Quote className={cn("mt-0.5 size-3 shrink-0", iconClassName)} />
      <span className={cn("flex-1 whitespace-pre-wrap break-words text-left", contentClassName)}>{children}</span>
    </div>
  );
};
