# app-tabs

Tab management utilities for the tauri app.

## Features

- Tab state management with React hooks
- Configurable tab behavior (max tabs, closable, etc.)
- TypeScript support
- Tailwind CSS styled components

## Usage

```tsx
import { useTabs, TabContainer } from 'app-tabs';

function App() {
  const { tabs, activeTabId, addTab, removeTab, switchTab } = useTabs({
    maxTabs: 8,
    onTabClose: (tabId) => console.log('Tab closed:', tabId),
    onTabChange: (tabId) => console.log('Tab changed:', tabId)
  });

  return (
    <div>
      <TabContainer
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={switchTab}
        onTabClose={removeTab}
      />
      {/* Tab content */}
    </div>
  );
}
```

## API

### useTabs(config?)

Returns tab management utilities.

### TabContainer

React component for rendering tabs. 