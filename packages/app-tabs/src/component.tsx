import isEqual from "lodash.isequal";
import type React from "react";
import { useEffect, useRef } from "react";
import type { TabProperties } from "./chrome-tabs";
import { type Listeners, useChromeTabs } from "./hooks/useChromeTabs";
import { useLatest } from "./hooks/useLatest";
import { usePersistFn } from "./hooks/usePersistFn";
import { usePrevious } from "./hooks/usePrevious";

export type TabsProps = Listeners & {
  tabs: TabProperties[];
  className?: string;
  darkMode?: boolean;
  pinnedRight?: React.ReactNode;
  pinnedLeft?: React.ReactNode;
  draggable?: boolean;
  enableDragRegion?: boolean;
  marginLeft?: number;
};

export function Tabs({
  tabs,
  className,
  draggable,
  darkMode,
  onTabActive,
  onTabClose,
  onDragBegin,
  onDragEnd,
  onTabReorder,
  onContextMenu,
  pinnedRight: toolbar,
  pinnedLeft,
  enableDragRegion,
  marginLeft,
}: TabsProps) {
  const tabsLatest = useLatest(tabs);
  const previousTabs = usePrevious(tabs);

  const moveIndex = useRef({ tabId: "", fromIndex: -1, toIndex: -1 });

  const handleTabReorder = usePersistFn((tabId: string, fromIndex: number, toIndex: number) => {
    const [dest] = tabsLatest.current.splice(fromIndex, 1);
    tabsLatest.current.splice(toIndex, 0, dest);
    const beforeFromIndex = moveIndex.current.fromIndex;
    moveIndex.current = {
      tabId,
      fromIndex: beforeFromIndex > -1 ? beforeFromIndex : fromIndex,
      toIndex,
    };
  });

  const handleDragEnd = usePersistFn((tId) => {
    const { tabId, fromIndex, toIndex } = moveIndex.current;
    if (fromIndex > -1) {
      onTabReorder?.(tabId, fromIndex, toIndex);
    }
    moveIndex.current = {
      tabId: "",
      fromIndex: -1,
      toIndex: -1,
    };
    onDragEnd?.(tId);
  });

  const { ChromeTabs, activeTab, removeTab, updateTabByIndex } = useChromeTabs(
    {
      onTabClose: onTabClose,
      onTabActive: onTabActive,
      onContextMenu,
      onDragEnd: handleDragEnd,
      onTabReorder: handleTabReorder,
      onDragBegin,
    },
    { draggable },
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const beforeTabs = previousTabs || [];
    if (!isEqual(beforeTabs, tabs)) {
      const retainTabs = beforeTabs.slice(tabs.length);
      retainTabs.forEach((tab) => {
        removeTab(tab.id);
      });

      tabs.forEach((tab, index) => {
        updateTabByIndex(index, tab);
      });

      tabs.forEach((tab) => {
        if (tab.active) {
          activeTab(tab.id);
        }
      });

      // 当所有tabs的active都为false时，清除chrome-tabs内部的激活状态
      const hasActiveTab = tabs.some((tab) => tab.active);
      if (!hasActiveTab && tabs.length > 0) {
        // 清除当前激活的DOM元素的active属性
        const currentActiveEl = document.querySelector(".chrome-tab[active]");
        if (currentActiveEl) {
          currentActiveEl.removeAttribute("active");
        }
      }
    }
  }, [tabs]);
  return <ChromeTabs className={className} darkMode={darkMode} toolbar={toolbar} pinnedLeft={pinnedLeft} enableDragRegion={enableDragRegion} marginLeft={marginLeft} />;
}
