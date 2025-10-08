import { X } from "lucide-react";
import type { TabsProps } from "./types";

export function Tabs({ tabs, onTabClick, onTabClose, pinnedLeft, pinnedRight, darkMode, className }: TabsProps) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 ${darkMode ? "bg-neutral-900" : "bg-neutral-100"} ${className || ""}`}
    >
      {pinnedLeft}

      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group relative flex min-w-[120px] max-w-[200px] cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab.active
                ? darkMode
                  ? "bg-neutral-800 text-neutral-100"
                  : "bg-white text-neutral-900 shadow-sm"
                : darkMode
                  ? "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                  : "text-neutral-600 hover:bg-neutral-200/70"
            }`}
            onClick={() => onTabClick?.(tab.id)}
          >
            <span className="flex-1 truncate">{tab.title}</span>

            {tab.isCloseIconVisible && (
              <button
                type="button"
                className={`shrink-0 rounded p-0.5 transition-colors ${
                  darkMode ? "hover:bg-neutral-700" : "hover:bg-neutral-300"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose?.(tab.id);
                }}
                aria-label="Close tab"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {pinnedRight}
    </div>
  );
}

export type { Tab, TabsProps } from "./types";
