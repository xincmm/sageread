import { useOverlayScrollbars } from "overlayscrollbars-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList as VirtualList } from "react-window";
import "overlayscrollbars/overlayscrollbars.css";
import type { TOCItem } from "@/lib/document";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { eventDispatcher } from "@/utils/event";
import { getContentMd5 } from "@/utils/misc";
import { findParentPath } from "@/utils/toc";
import { useReaderStore } from "./reader-provider";
import { type FlatTOCItem, StaticListRow, VirtualListRow } from "./toc-item";

const useFlattenedTOC = (toc: TOCItem[], expandedItems: Set<string>) => {
  return useMemo(() => {
    const flattenTOC = (items: TOCItem[], depth = 0): FlatTOCItem[] => {
      const result: FlatTOCItem[] = [];
      items.forEach((item, index) => {
        const isExpanded = expandedItems.has(item.href || "");
        result.push({ item, depth, index, isExpanded });
        if (item.subitems && isExpanded) {
          result.push(...flattenTOC(item.subitems, depth + 1));
        }
      });
      return result;
    };

    return flattenTOC(toc);
  }, [toc, expandedItems]);
};

const TOCView: React.FC<{
  bookId: string;
  toc: TOCItem[];
  autoExpand?: boolean;
  onItemSelect?: () => void;
  isVisible?: boolean;
}> = ({ bookId, toc, autoExpand = false, onItemSelect }) => {
  const view = useReaderStore((state) => state.view);
  const progress = useReaderStore((state) => state.progress);
  const { settings } = useAppSettingsStore();
  const globalViewSettings = settings.globalViewSettings;

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [containerHeight, setContainerHeight] = useState(400);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const listOuterRef = useRef<HTMLDivElement | null>(null);
  const vitualListRef = useRef<VirtualList | null>(null);
  const staticListRef = useRef<HTMLDivElement | null>(null);

  const [initialize] = useOverlayScrollbars({
    defer: true,
    options: {
      scrollbars: {
        autoHide: "scroll",
      },
      showNativeOverlaidScrollbars: false,
    },
    events: {
      initialized(osInstance) {
        const { viewport } = osInstance.elements();
        viewport.style.overflowX = "var(--os-viewport-overflow-x)";
        viewport.style.overflowY = "var(--os-viewport-overflow-y)";
      },
    },
  });

  useEffect(() => {
    const { current: root } = containerRef;
    const { current: virtualOuter } = listOuterRef;

    if (root && virtualOuter) {
      initialize({
        target: root,
        elements: {
          viewport: virtualOuter,
        },
      });
    }
  }, [initialize]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const parentContainer = containerRef.current.closest(".scroll-container");
        if (parentContainer) {
          const parentRect = parentContainer.getBoundingClientRect();
          const availableHeight = parentRect.height - (rect.top - parentRect.top);
          setContainerHeight(Math.max(400, availableHeight));
        }
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      const parentContainer = containerRef.current.closest(".scroll-container");
      if (parentContainer) {
        resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(parentContainer);
      }
    }

    return () => {
      window.removeEventListener("resize", updateHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [expandedItems]);

  const activeHref = useMemo(() => progress?.sectionHref || null, [progress?.sectionHref]);
  const flatItems = useFlattenedTOC(toc, expandedItems);
  const activeItemIndex = useMemo(() => {
    return flatItems.findIndex((item) => item.item.href === activeHref);
  }, [flatItems, activeHref]);

  const handleToggleExpand = useCallback((item: TOCItem) => {
    const href = item.href || "";
    setShouldAutoScroll(false); // Disable auto scroll during manual expand/collapse
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(href)) {
        newSet.delete(href);
      } else {
        newSet.add(href);
      }
      return newSet;
    });
  }, []);

  const handleItemClick = useCallback(
    (item: TOCItem) => {
      eventDispatcher.dispatch("navigate", { bookId, href: item.href });
      if (item.href && view) {
        view.goTo(item.href);
      }
      onItemSelect?.();
    },
    [bookId, view, onItemSelect],
  );

  const expandParents = useCallback((toc: TOCItem[], href: string) => {
    const parentPath = findParentPath(toc, href).map((item) => item.href);
    const parentHrefs = parentPath.filter(Boolean) as string[];
    setExpandedItems(new Set(parentHrefs));
    setShouldAutoScroll(true);
  }, []);

  const scrollToActiveItem = useCallback(() => {
    if (!activeHref) return;

    if (vitualListRef.current) {
      const activeIndex = flatItems.findIndex((flatItem) => flatItem.item.href === activeHref);
      if (activeIndex !== -1) {
        vitualListRef.current.scrollToItem(activeIndex, "center");
      }
    }

    if (staticListRef.current) {
      const hrefMd5 = activeHref ? getContentMd5(activeHref) : "";
      const activeItem = staticListRef.current?.querySelector(`[data-href="${hrefMd5}"]`);
      if (activeItem) {
        // Always scroll to center, not just when not visible
        (activeItem as HTMLElement).scrollIntoView({ behavior: "instant", block: "center" });
        (activeItem as HTMLElement).setAttribute("aria-current", "page");
      }
    }
  }, [activeHref, flatItems]);

  const virtualItemSize = useMemo(() => {
    return window.innerWidth >= 640 && !globalViewSettings?.translationEnabled ? 37 : 57;
  }, [globalViewSettings?.translationEnabled]);

  const virtualListData = useMemo(
    () => ({
      flatItems,
      itemSize: virtualItemSize,
      bookId,
      activeHref,
      onToggleExpand: handleToggleExpand,
      onItemClick: handleItemClick,
    }),
    [flatItems, virtualItemSize, bookId, activeHref, handleToggleExpand, handleItemClick],
  );

  useEffect(() => {
    if (!progress) return;

    const shouldAutoExpand = autoExpand;
    if (!shouldAutoExpand) return;

    const { sectionHref: currentHref } = progress;
    if (currentHref) {
      expandParents(toc, currentHref);
    }
  }, [toc, progress, expandParents, autoExpand]);

  useEffect(() => {
    if (flatItems.length > 0 && activeHref && shouldAutoScroll) {
      const hasActiveItem = flatItems.some((item) => item.item.href === activeHref);
      if (hasActiveItem) {
        setTimeout(scrollToActiveItem, 100);
      }
    }
  }, [flatItems, scrollToActiveItem, activeHref, shouldAutoScroll]);

  return flatItems.length > 256 ? (
    <div className="virtual-list rounded pt-2" data-overlayscrollbars-initialize="" ref={containerRef}>
      <VirtualList
        ref={vitualListRef}
        outerRef={listOuterRef}
        width="100%"
        height={containerHeight}
        itemCount={flatItems.length}
        itemSize={virtualItemSize}
        itemData={virtualListData}
        overscanCount={20}
        initialScrollOffset={
          activeItemIndex >= 0 ? Math.max(0, activeItemIndex * virtualItemSize - containerHeight / 2) : undefined
        }
      >
        {VirtualListRow}
      </VirtualList>
    </div>
  ) : (
    <div className="static-list rounded pt-2" ref={staticListRef}>
      {flatItems.map((flatItem, index) => (
        <StaticListRow
          key={`static-row-${index}`}
          bookId={bookId}
          flatItem={flatItem}
          activeHref={activeHref}
          onToggleExpand={handleToggleExpand}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  );
};
export default TOCView;
