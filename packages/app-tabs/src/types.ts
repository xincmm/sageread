export interface Tab {
  id: string;
  title: string;
  content?: React.ReactNode;
  closable?: boolean;
  active?: boolean;
}

export interface TabsConfig {
  maxTabs?: number;
  defaultTab?: Tab;
  onTabClose?: (tabId: string) => void;
  onTabChange?: (tabId: string) => void;
}
