import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type React from "react";

interface PopupButtonProps {
  label?: string;
  tooltip?: string;
  Icon: React.ElementType;
  onClick: () => void;
  isVertical?: boolean;
  shortcutKey?: string;
}

const PopupButton: React.FC<PopupButtonProps> = ({
  label,
  tooltip,
  Icon,
  onClick,
  isVertical = false,
  shortcutKey,
}) => {
  const handleClick = () => {
    onClick();
  };

  const tooltipLabel = tooltip ?? label;
  const ariaLabel = tooltipLabel ?? shortcutKey ?? "annotation action";

  const button = (
    <div className="flex items-center justify-center">
      <button
        onClick={handleClick}
        type="button"
        aria-label={ariaLabel}
        title={tooltipLabel}
        className={`flex cursor-pointer items-center justify-center gap-1 rounded p-0 transition-colors duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
          isVertical ? "h-auto w-6 flex-col px-0 py-1" : "h-6 min-w-6 px-1"
        }`}
      >
        <Icon size={16} />
        {shortcutKey && (
          <span className={`text-[10px] font-medium uppercase text-neutral-500 dark:text-neutral-400 ${isVertical ? "" : "leading-none"}`}>
            {shortcutKey}
          </span>
        )}
      </button>
    </div>
  );

  if (!tooltipLabel) {
    return button;
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={isVertical ? "right" : "top"}>
        {tooltipLabel}
        {shortcutKey ? ` (${shortcutKey})` : ""}
      </TooltipContent>
    </Tooltip>
  );
};

export default PopupButton;
