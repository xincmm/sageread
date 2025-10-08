import { useEffect, useState } from "react";
import { type ShortcutConfig, loadShortcuts } from "../helpers/shortcuts";

export type KeyActionHandlers = {
  [K in keyof ShortcutConfig]?: () => void;
} & {
  pagePrev?: () => void;
  pageNext?: () => void;
};

const useShortcuts = (actions: KeyActionHandlers, dependencies: React.DependencyList = []) => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(loadShortcuts);

  useEffect(() => {
    const handleShortcutUpdate = () => {
      setShortcuts(loadShortcuts());
    };

    window.addEventListener("shortcutUpdate", handleShortcutUpdate);
    return () => window.removeEventListener("shortcutUpdate", handleShortcutUpdate);
  }, []);

  const parseShortcut = (shortcut: string) => {
    const keys = shortcut.toLowerCase().split("+");
    return {
      ctrlKey: keys.includes("ctrl"),
      altKey: keys.includes("alt") || keys.includes("opt"),
      metaKey: keys.includes("meta") || keys.includes("cmd"),
      shiftKey: keys.includes("shift"),
      key: keys.find((k) => !["ctrl", "alt", "opt", "meta", "cmd", "shift"].includes(k)),
    };
  };

  const isShortcutMatch = (
    shortcut: string,
    key: string,
    ctrlKey: boolean,
    altKey: boolean,
    metaKey: boolean,
    shiftKey: boolean,
  ) => {
    const parsedShortcut = parseShortcut(shortcut);
    return (
      parsedShortcut.key === key.toLowerCase() &&
      parsedShortcut.ctrlKey === ctrlKey &&
      parsedShortcut.altKey === altKey &&
      parsedShortcut.metaKey === metaKey &&
      parsedShortcut.shiftKey === shiftKey
    );
  };

  const processKeyEvent = (key: string, ctrlKey: boolean, altKey: boolean, metaKey: boolean, shiftKey: boolean) => {
    if (key === "backspace") return true;

    // 处理通用历史导航等价键：映射到翻页
    if (
      (metaKey && key === "[") || // Cmd+[
      (metaKey && key === "]") || // Cmd+]
      (altKey && key === "arrowleft") || // Alt+←
      (altKey && key === "arrowright") || // Alt+→
      key === "browserback" || // 部分平台
      key === "browserforward"
    ) {
      if ((metaKey && key === "[") || (altKey && key === "arrowleft") || key === "browserback") {
        actions.pagePrev?.();
      } else {
        actions.pageNext?.();
      }
      return true;
    }

    for (const [actionName, actionHandler] of Object.entries(actions)) {
      const shortcutKey = actionName as keyof ShortcutConfig;
      const handler = actionHandler as (() => void) | undefined;
      const shortcutList = shortcuts[shortcutKey as keyof ShortcutConfig];
      if (
        handler &&
        shortcutList?.some((shortcut) => isShortcutMatch(shortcut, key, ctrlKey, altKey, metaKey, shiftKey))
      ) {
        handler();
        return true;
      }
    }
    return false;
  };

  // 判断是否在可编辑区域
  const shouldSkipForEditable = () => {
    const activeElement = document.activeElement as HTMLElement;
    const isInteractiveElement =
      activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable;
    const isNoteEditor = activeElement.tagName === "TEXTAREA" && activeElement.classList.contains("note-editor");
    return isInteractiveElement && !isNoteEditor;
  };

  const unifiedHandleKeyDown = (event: KeyboardEvent | MessageEvent) => {
    if (shouldSkipForEditable()) {
      return; // Skip handling if the user is typing in an input, textarea, or contenteditable
    }

    if (event instanceof KeyboardEvent) {
      const { key, ctrlKey, altKey, metaKey, shiftKey } = event;

      const activeElement = document.activeElement as HTMLElement;
      const isNoteEditor = activeElement.tagName === "TEXTAREA" && activeElement.classList.contains("note-editor");

      if (isNoteEditor && !((key === "Enter" && ctrlKey) || key === "Escape")) {
        return;
      }

      const handled = processKeyEvent(key.toLowerCase(), ctrlKey, altKey, metaKey, shiftKey);
      if (handled) event.preventDefault();
    } else if (event instanceof MessageEvent && event.data && event.data.type === "iframe-keydown") {
      const { key, ctrlKey, altKey, metaKey, shiftKey } = event.data;
      processKeyEvent(key.toLowerCase(), ctrlKey, altKey, metaKey, shiftKey);
    }
  };

  // 拦截鼠标侧键（XButton1/XButton2）
  const handleMouseDown = (e: MouseEvent) => {
    if (shouldSkipForEditable()) return;

    // 3=Back(X1)  4=Forward(X2)
    if (e.button === 3) {
      e.preventDefault();
      e.stopPropagation();
      actions.pagePrev?.();
    } else if (e.button === 4) {
      e.preventDefault();
      e.stopPropagation();
      actions.pageNext?.();
    }
  };

  // 某些平台只在 auxclick 暴露
  const handleAuxClick = (e: MouseEvent) => {
    if (shouldSkipForEditable()) return;
    const btn = (e as MouseEvent).button;
    if (btn === 3) {
      e.preventDefault();
      e.stopPropagation();
      actions.pagePrev?.();
    } else if (btn === 4) {
      e.preventDefault();
      e.stopPropagation();
      actions.pageNext?.();
    }
  };

  useEffect(() => {
    const blockPop = () => history.go(1);
    try {
      history.pushState({ locked: true }, "", location.href);
      window.addEventListener("popstate", blockPop);
      return () => window.removeEventListener("popstate", blockPop);
    } catch {}
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    window.addEventListener("keydown", unifiedHandleKeyDown, { capture: true });
    window.addEventListener("message", unifiedHandleKeyDown);
    window.addEventListener("mousedown", handleMouseDown, { capture: true });
    document.addEventListener("mousedown", handleMouseDown, { capture: true });
    window.addEventListener("auxclick", handleAuxClick, { capture: true });
    document.addEventListener("auxclick", handleAuxClick, { capture: true });

    return () => {
      window.removeEventListener("keydown", unifiedHandleKeyDown, { capture: true } as any);
      window.removeEventListener("message", unifiedHandleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown, { capture: true } as any);
      document.removeEventListener("mousedown", handleMouseDown, { capture: true } as any);
      window.removeEventListener("auxclick", handleAuxClick, { capture: true } as any);
      document.removeEventListener("auxclick", handleAuxClick, { capture: true } as any);
    };
  }, [shortcuts, ...dependencies]);
};

export default useShortcuts;
