export interface Tab {
  id: string;
  title: string;
  active?: boolean;
  isCloseIconVisible?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  onTabClick?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  pinnedLeft?: React.ReactNode;
  pinnedRight?: React.ReactNode;
  darkMode?: boolean;
  className?: string;
}
