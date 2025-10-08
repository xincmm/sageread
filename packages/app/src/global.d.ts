declare module "app-tabs" {
  import type React from "react";

  export interface TabProperties {
    id: string;
    title: string;
    active?: boolean;
    favicon?: boolean | string;
    faviconClass?: string;
    isCloseIconVisible?: boolean;
  }

  export interface TabsProps {
    tabs: TabProperties[];
    className?: string;
    darkMode?: boolean;
    pinnedRight?: React.ReactNode;
    pinnedLeft?: React.ReactNode;
    draggable?: boolean;
    enableDragRegion?: boolean;
    marginLeft?: number;
    onTabActive?: (tabId: string) => void;
    onTabClose?: (tabId: string) => void;
    onTabReorder?: (tabId: string, fromIndex: number, toIndex: number) => void;
    onDragBegin?: (tabId: string) => void;
    onDragEnd?: (tabId: string) => void;
    onContextMenu?: (tabId: string, event: MouseEvent) => void;
  }

  export function Tabs(props: TabsProps): React.ReactElement;

  export function useChromeTabs(): any;
}
