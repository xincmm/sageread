import type React from "react";
import { type CSSProperties, forwardRef, useCallback, useEffect, useRef } from "react";
import ChromeTabsClz, { type ChromeTabsOptions, type TabProperties } from "../chrome-tabs";
import { useLatest } from "./useLatest";

export type Listeners = {
  onTabActive?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabReorder?: (tabId: string, fromIdex: number, toIndex: number) => void;
  onDragBegin?: (tabId: string) => void;
  onDragEnd?: (tabId: string) => void;
  onContextMenu?: (tabId: string, event: MouseEvent) => void;
};

const ChromeTabsWrapper = forwardRef<
  HTMLDivElement,
  {
    className?: string;
    darkMode?: boolean;
    toolbar?: React.ReactNode;
    pinnedLeft?: React.ReactNode;
    enableDragRegion?: boolean;
    marginLeft?: number;
  }
>((props, ref) => {
  const classList = ["chrome-tabs"];
  if (props.darkMode) {
    classList.push("chrome-tabs-dark-theme");
  }
  if (props.className) {
    classList.push(props.className);
  }

  const dragRegionProps = props.enableDragRegion ? { "data-tauri-drag-region": true } : {};
  const marginLeft = props.marginLeft ?? 60; // 默认 60px，适用于 macOS

  return (
    <div
      ref={ref}
      className={classList.join(" ")}
      {...dragRegionProps}
      style={
        { "--tab-content-margin": "9px", marginLeft: `${marginLeft}px`, display: "flex", position: "relative" } as CSSProperties
      }
    >
      <div className="chrome-tabs-toolbar-left" style={{ zIndex: 1, position: "relative", flexShrink: 0 }}>
        {props.pinnedLeft || null}
      </div>
      <div
        className="chrome-tabs-content"
        {...dragRegionProps}
        style={{ flex: 1, zIndex: 1, position: "relative", minWidth: 0 }}
      />
      <div className="chrome-tabs-toolbar-right" style={{ zIndex: 1, position: "relative", paddingLeft: "8px", flexShrink: 0 }}>
        {props.toolbar || null}
      </div>
      {/* <div className="chrome-tabs-bottom-bar" /> */}
    </div>
  );
});

export function useChromeTabs(listeners: Listeners, options: ChromeTabsOptions = { draggable: true }) {
  const ref = useRef<HTMLDivElement>(null);
  const chromeTabsRef = useRef<ChromeTabsClz | null>(null);

  const listenersLest = useLatest(listeners);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const chromeTabs = new ChromeTabsClz(options);
    chromeTabsRef.current = chromeTabs;
    chromeTabs.init(ref.current as HTMLDivElement);
    return () => {
      chromeTabs.destroy();
    };
  }, []);

  useEffect(() => {
    chromeTabsRef.current?.setDraggable(options.draggable ?? true);
  }, [options.draggable]);

  // activated
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const listener = ({ detail }: any) => {
      const tabEle = detail.tabEl as HTMLDivElement;
      const tabId = tabEle.getAttribute("data-tab-id") as string;
      listenersLest.current.onTabActive?.(tabId);
    };
    const ele = chromeTabsRef.current?.el;
    ele?.addEventListener("tabClick", listener);
    return () => {
      ele?.removeEventListener("tabClick", listener);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const ele = chromeTabsRef.current?.el;
    const listener = ({ detail }: any) => {
      const { tabEl: tabEle, originIndex, destinationIndex } = detail;
      const tabId = tabEle.getAttribute("data-tab-id") as string;
      listenersLest.current.onTabReorder?.(tabId, originIndex, destinationIndex);
    };
    ele?.addEventListener("tabReorder", listener);
    return () => {
      ele?.removeEventListener("tabReorder", listener);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const ele = chromeTabsRef.current?.el;
    const listener = ({ detail }: any) => {
      const tabEle = detail.tabEl as HTMLDivElement;
      const tabId = tabEle.getAttribute("data-tab-id") as string;
      listenersLest.current.onTabClose?.(tabId);
    };
    ele?.addEventListener("tabClose", listener);
    return () => {
      ele?.removeEventListener("tabClose", listener);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const listener = ({ detail }: any) => {
      const tabEle = detail.tabEl as HTMLDivElement;
      const tabId = tabEle.getAttribute("data-tab-id") as string;
      listenersLest.current.onDragBegin?.(tabId);
    };
    const ele = chromeTabsRef.current?.el;
    ele?.addEventListener("dragStart", listener);
    return () => {
      ele?.removeEventListener("dragStart", listener);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const ele = chromeTabsRef.current?.el;
    const listener = ({ detail }: any) => {
      const tabEle = detail.tabEl as HTMLDivElement;
      if (!tabEle) {
        return;
      }
      const tabId = tabEle.getAttribute("data-tab-id") as string;
      listenersLest.current.onContextMenu?.(tabId, detail.event);
    };
    ele?.addEventListener("contextmenu", listener);
    return () => {
      ele?.removeEventListener("contextmenu", listener);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const listener = ({ detail }: any) => {
      const tabEle = detail.tabEl as HTMLDivElement;
      const tabId = tabEle.getAttribute("data-tab-id") as string;
      listenersLest.current.onDragEnd?.(tabId);
    };
    const ele = chromeTabsRef.current?.el;
    ele?.addEventListener("dragEnd", listener);
    return () => {
      ele?.removeEventListener("dragEnd", listener);
    };
  }, []);

  const addTab = useCallback((tab: TabProperties) => {
    chromeTabsRef.current?.addTab(tab);
  }, []);

  const removeTab = useCallback((tabId: string) => {
    const ele = ref.current?.querySelector(`[data-tab-id="${tabId}"]`) as HTMLDivElement;
    if (ele) {
      chromeTabsRef.current?.removeTab(ele);
    }
  }, []);

  const activeTab = useCallback((tabId: string) => {
    const ele = ref.current?.querySelector(`[data-tab-id="${tabId}"]`) as HTMLDivElement;
    if (ele !== chromeTabsRef.current?.activeTabEl) {
      chromeTabsRef.current?.setCurrentTab(ele);
    }
  }, []);

  const updateTab = useCallback((tabId: string, tab: TabProperties) => {
    const ele = ref.current?.querySelector(`[data-tab-id="${tabId}"]`) as HTMLDivElement;
    if (ele) {
      chromeTabsRef.current?.updateTab(ele, { ...tab });
    } else {
      chromeTabsRef.current?.addTab(tab);
    }
  }, []);

  const updateTabByIndex = useCallback((index: number, tab: TabProperties) => {
    const tabs = ref.current?.querySelectorAll(".chrome-tab");
    if (tabs) {
      const ele = tabs.item(index) as HTMLDivElement;
      if (ele) {
        chromeTabsRef.current?.updateTab(ele, { ...tab });
      } else {
        chromeTabsRef.current?.addTab(tab);
      }
    }
  }, []);

  const ChromeTabs = useCallback(function ChromeTabs(props: {
    className?: string;
    darkMode?: boolean;
    toolbar?: React.ReactNode;
    pinnedLeft?: React.ReactNode;
  }) {
    return <ChromeTabsWrapper {...props} ref={ref} />;
  }, []);

  return {
    ChromeTabs,
    addTab,
    updateTab,
    removeTab,
    activeTab,
    updateTabByIndex,
  };
}
