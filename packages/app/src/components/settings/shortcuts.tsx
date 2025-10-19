import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_READER_SHORTCUTS } from "@/services/constants";
import { useAppSettingsStore } from "@/store/app-settings-store";
import type { ReaderShortcutAction } from "@/types/settings";
import type React from "react";
import { useMemo } from "react";

const floatingMenuShortcuts: Array<{
  action: ReaderShortcutAction;
  label: string;
  description: string;
}> = [
  {
    action: "copy",
    label: "复制",
    description: "在浮动菜单打开时按下快捷键，快速复制选中文本。",
  },
  {
    action: "explain",
    label: "解释",
    description: "为当前选中文本生成解释。",
  },
  {
    action: "askAI",
    label: "询问 AI",
    description: "将选中文本发送到 AI 对话。",
  },
  {
    action: "toggleHighlight",
    label: "高亮 / 取消高亮",
    description: "为选中文本添加或移除高亮标注。",
  },
  {
    action: "addNote",
    label: "添加笔记",
    description: "将选中文本保存到笔记。",
  },
];

const formatShortcutKey = (key: string | undefined) => key?.toUpperCase() ?? "";

export default function ShortcutsSettings() {
  const { settings, setSettings } = useAppSettingsStore();
  const readerShortcuts = useMemo(
    () => ({ ...DEFAULT_READER_SHORTCUTS, ...(settings.readerShortcuts ?? {}) }),
    [settings.readerShortcuts],
  );

  const updateShortcut = (action: ReaderShortcutAction, value: string) => {
    const nextShortcuts = { ...readerShortcuts, [action]: value };
    setSettings({ ...settings, readerShortcuts: nextShortcuts });
  };

  const resetAll = () => {
    setSettings({ ...settings, readerShortcuts: { ...DEFAULT_READER_SHORTCUTS } });
  };

  const handleKeyDown = (action: ReaderShortcutAction, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Backspace" || event.key === "Delete") {
      updateShortcut(action, "");
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.key.length === 1) {
      updateShortcut(action, event.key.toLowerCase());
    }
  };

  return (
    <div className="space-y-8 p-4 pt-3">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg text-neutral-800 dark:text-neutral-100">阅读器浮动菜单</h2>
            <p className="text-neutral-600 text-sm dark:text-neutral-400">
              快捷键仅在浮动菜单打开时生效。按 Backspace 可清除对应快捷键。
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetAll}>
            恢复默认
          </Button>
        </div>

        <div className="space-y-4">
          {floatingMenuShortcuts.map((item) => {
            const currentValue = readerShortcuts[item.action] ?? "";
            const isOverridden = currentValue !== DEFAULT_READER_SHORTCUTS[item.action];
            return (
              <div
                className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800 dark:bg-neutral-900"
                key={item.action}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-neutral-800 dark:text-neutral-100">{item.label}</h3>
                    <p className="text-neutral-600 text-sm dark:text-neutral-400">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <Label htmlFor={`shortcut-${item.action}`} className="sr-only">
                        {item.label}
                      </Label>
                      <Input
                        id={`shortcut-${item.action}`}
                        className="w-20 text-center uppercase"
                        placeholder="未设置"
                        readOnly
                        value={formatShortcutKey(currentValue)}
                        onKeyDown={(event) => handleKeyDown(item.action, event)}
                      />
                    </div>
                    {isOverridden && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateShortcut(item.action, DEFAULT_READER_SHORTCUTS[item.action])}
                      >
                        重置
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-lg text-neutral-800 dark:text-neutral-100">Application</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">New Chat</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Create a new chat.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ N
            </kbd>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Toggle Sidebar</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Show or hide the sidebar.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ B
            </kbd>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Zoom In</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Increase the zoom level.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ +
            </kbd>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Zoom Out</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Decrease the zoom level.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ -
            </kbd>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-lg text-neutral-800 dark:text-neutral-100">Chat</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Send Message</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Send the current message.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              Enter
            </kbd>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">New Line</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Insert a new line.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              Shift + Enter
            </kbd>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-lg text-neutral-800 dark:text-neutral-100">Navigation</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-800 dark:text-neutral-100">Go to Settings</h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">Open settings.</p>
            </div>
            <kbd className="rounded bg-neutral-100 px-2 py-1 text-neutral-800 text-sm dark:bg-neutral-800 dark:text-neutral-200">
              ⌘ ,
            </kbd>
          </div>
        </div>
      </section>
    </div>
  );
}
