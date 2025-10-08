import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/use-translation";
import { useLayoutStore } from "@/store/layout-store";
import { useThemeStore } from "@/store/theme-store";
import { SessionState } from "@/types/reading-session";
import { Clock, TableOfContents } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftCollapseFilled,
  TbLayoutSidebarRightCollapse,
  TbLayoutSidebarRightCollapseFilled,
} from "react-icons/tb";
import { useAutoHideControls } from "../hooks/use-auto-hide-controls";
import { useReaderStore } from "./reader-provider";
import SearchDropdown from "./search-dropdown";
import SettingsDropdown from "./settings-dropdown";
import TOCView from "./toc-view";

const HeaderBar = () => {
  const _ = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const [displayTime, setDisplayTime] = useState(0);

  const bookId = useReaderStore((state) => state.bookId);
  const bookDoc = useReaderStore((state) => state.bookData?.bookDoc);
  const progress = useReaderStore((state) => state.progress);
  const sessionStats = useReaderStore((state) => state.sessionStats);
  const isSessionInitialized = useReaderStore((state) => state.isSessionInitialized);
  const openDropdown = useReaderStore((state) => state.openDropdown);
  const setOpenDropdown = useReaderStore((state) => state.setOpenDropdown);
  const section = progress?.sectionLabel || "";

  const { isChatVisible, isNotepadVisible, toggleChatSidebar, toggleNotepadSidebar } = useLayoutStore();
  const { swapSidebars } = useThemeStore();

  const isTocDropdownOpen = openDropdown === "toc";

  const {
    isVisible: showControls,
    handleMouseEnter,
    handleMouseLeave,
  } = useAutoHideControls({
    keepVisible: Boolean(openDropdown),
  });

  useEffect(() => {
    if (!sessionStats || !isSessionInitialized) {
      setDisplayTime(0);
      return;
    }

    const updateDisplayTime = () => {
      const now = Date.now();
      let totalActiveTimeMs = sessionStats.totalActiveTime;

      if (sessionStats.currentState === SessionState.ACTIVE) {
        const timeSinceLastUpdate = now - sessionStats.lastActivityTime;
        totalActiveTimeMs += timeSinceLastUpdate;
      }

      const activeSeconds = Math.floor(totalActiveTimeMs / 1000);
      setDisplayTime(activeSeconds);
    };

    updateDisplayTime();

    const interval = setInterval(updateDisplayTime, 1000);

    return () => clearInterval(interval);
  }, [sessionStats, isSessionInitialized]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    }
    return `${seconds}秒`;
  };

  const getStatusDisplay = () => {
    if (!isSessionInitialized || !sessionStats) {
      return { text: "初始化", color: "text-neutral-400" };
    }

    switch (sessionStats.currentState) {
      case SessionState.ACTIVE:
        return { text: "阅读中", color: "text-green-500" };
      case SessionState.PAUSED:
        return { text: "已暂停", color: "text-neutral-400" };
      case SessionState.STOPPED:
        return { text: "已结束", color: "text-neutral-400" };
      default:
        return { text: "", color: "text-neutral-400" };
    }
  };

  const handleToggleTocDropdown = (isOpen: boolean) => {
    setOpenDropdown?.(isOpen ? "toc" : null);
  };

  const handleTocItemSelect = () => {
    setOpenDropdown?.(null);
  };

  return (
    <div className="w-full">
      <div
        ref={headerRef}
        className="header-bar pointer-events-auto visible flex h-10 w-full items-center px-2 pl-4 transition-all duration-300"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`flex h-full items-center justify-start gap-x-2 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="cursor-pointer" onClick={swapSidebars ? toggleChatSidebar : toggleNotepadSidebar}>
            {(swapSidebars ? isChatVisible : isNotepadVisible) ? (
              <TbLayoutSidebarLeftCollapseFilled className="size-5 text-neutral-700 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200" />
            ) : (
              <TbLayoutSidebarLeftCollapse className="size-5 text-neutral-700 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200" />
            )}
          </div>

          <DropdownMenu open={isTocDropdownOpen} onOpenChange={handleToggleTocDropdown}>
            <DropdownMenuTrigger asChild>
              <button className="btn btn-ghost flex h-6 w-6 items-center justify-center rounded-full p-0 outline-none focus:outline-none focus-visible:ring-0">
                <TableOfContents size={18} className="text-base-content" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="max-h-[calc(100vh-8rem)] w-80 overflow-y-auto p-0"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              {bookDoc?.toc ? (
                <div className="h-full">
                  <TOCView
                    toc={bookDoc.toc}
                    bookId={bookId!}
                    autoExpand={true}
                    onItemSelect={handleTocItemSelect}
                    isVisible={isTocDropdownOpen}
                  />
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">{_("No table of contents available")}</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-x-4 px-4">
          <span
            title={section}
            className={`max-w-100 flex-shrink-0 overflow-hidden truncate whitespace-nowrap font-medium text-sm transition-colors duration-300 ${
              showControls ? "text-neutral-800 dark:text-neutral-300" : "text-neutral-500 dark:text-neutral-600"
            }`}
          >
            {section}
          </span>

          {/* {isSessionInitialized && (
            <div
              className={`flex items-center gap-x-2 text-xs transition-colors duration-300 ${
                showControls ? "" : "opacity-70"
              }`}
            >
              <Clock size={14} className="text-neutral-600 dark:text-neutral-400" />
              <span className="font-mono text-neutral-700 dark:text-neutral-300">{formatTime(displayTime)}</span>
              <span className={`text-sm ${getStatusDisplay().color} font-medium`}>{getStatusDisplay().text}</span>
            </div>
          )} */}
        </div>

        <div
          className={`flex h-full items-center justify-end space-x-2 ps-2 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <SearchDropdown />
          <SettingsDropdown />
          <div className="cursor-pointer" onClick={swapSidebars ? toggleNotepadSidebar : toggleChatSidebar}>
            {(swapSidebars ? isNotepadVisible : isChatVisible) ? (
              <TbLayoutSidebarRightCollapseFilled className="size-5 text-neutral-700 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200" />
            ) : (
              <TbLayoutSidebarRightCollapse className="size-5 text-neutral-700 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;
