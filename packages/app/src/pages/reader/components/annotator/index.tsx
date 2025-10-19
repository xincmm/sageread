import { DEFAULT_READER_SHORTCUTS, HIGHLIGHT_COLOR_HEX } from "@/services/constants";
import { useAppSettingsStore } from "@/store/app-settings-store";
import type { BookNote } from "@/types/book";
import { Overlayer } from "foliate-js/overlayer.js";
import { NotebookPen } from "lucide-react";
import type React from "react";
import { useEffect, useMemo } from "react";
import { FiCopy, FiHelpCircle, FiMessageCircle } from "react-icons/fi";
import { PiHighlighterFill } from "react-icons/pi";
import { RiDeleteBinLine } from "react-icons/ri";
import { useAnnotator } from "../../hooks/use-annotator";
import { useFoliateEvents } from "../../hooks/use-foliate-events";
import { useTextSelector } from "../../hooks/use-text-selector";
import { useReaderStore, useReaderStoreApi } from "../reader-provider";
import AnnotationPopup from "./annotation-popup";
import AskAIPopup from "./ask-ai-popup";

const Annotator: React.FC = () => {
  const { settings } = useAppSettingsStore();
  const store = useReaderStoreApi();

  const bookId = useReaderStore((state) => state.bookId)!;
  const view = useReaderStore((state) => state.view);
  const globalViewSettings = settings.globalViewSettings;

  // 使用 use-annotator hook
  const {
    selection,
    setSelection,
    showAnnotPopup,
    showAskAIPopup,
    trianglePosition,
    annotPopupPosition,
    askAIPopupPosition,
    highlightOptionsVisible,
    selectedStyle,
    setSelectedStyle,
    selectedColor,
    setSelectedColor,
    annotPopupWidth,
    annotPopupHeight,
    handleDismissPopup,
    handleCopy,
    handleHighlight,
    addNote,
    handleExplain,
    handleAskAI,
    handleCloseAskAI,
    handleSendAIQuery,
  } = useAnnotator({ bookId });

  const { handleScroll, handleMouseUp, handleShowPopup } = useTextSelector(bookId, setSelection, handleDismissPopup);

  const onLoad = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const { doc, index } = detail;

    view?.renderer?.addEventListener("scroll", handleScroll);

    if (detail.doc) {
      detail.doc.addEventListener("mouseup", () => {
        handleMouseUp(doc, index);
      });
    }
  };

  const onDrawAnnotation = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const { draw, annotation, doc, range } = detail;
    const { style, color } = annotation as BookNote;
    const hexColor = color ? HIGHLIGHT_COLOR_HEX[color] : color;
    if (style === "highlight") {
      draw(Overlayer.highlight, { color: hexColor });
    } else if (["underline", "squiggly"].includes(style as string)) {
      const { defaultView } = doc;
      const node = range.startContainer;
      const el = node.nodeType === 1 ? node : node.parentElement;
      const { writingMode, lineHeight, fontSize } = defaultView.getComputedStyle(el);
      const lineHeightValue =
        Number.parseFloat(lineHeight) || globalViewSettings?.lineHeight! * globalViewSettings?.defaultFontSize!;
      const fontSizeValue = Number.parseFloat(fontSize) || globalViewSettings?.defaultFontSize;
      const strokeWidth = 2;
      const padding = globalViewSettings?.vertical ? (lineHeightValue - fontSizeValue! - strokeWidth) / 2 : strokeWidth;
      draw(Overlayer[style as keyof typeof Overlayer], { writingMode, color: hexColor, padding });
    }
  };

  const onShowAnnotation = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const { value: cfi, index, range } = detail;
    const currentConfig = store.getState().config;

    const { booknotes = [] } = currentConfig!;
    const annotations = booknotes.filter((booknote) => booknote.type === "annotation" && !booknote.deletedAt);
    const annotation = annotations.find((annotation) => annotation.cfi === cfi);

    if (!annotation) return;

    const newSelection = { key: bookId, annotated: true, text: annotation.text ?? "", range, index };

    setSelectedStyle(annotation.style!);
    setSelectedColor(annotation.color!);
    setSelection(newSelection);
  };

  useFoliateEvents(view, { onLoad, onDrawAnnotation, onShowAnnotation });

  // 同步 popup 显示状态到 text selector
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    handleShowPopup(showAnnotPopup || showAskAIPopup);
  }, [showAnnotPopup, showAskAIPopup]);

  const selectionAnnotated = selection?.annotated;
  const readerShortcuts = useMemo(
    () => ({ ...DEFAULT_READER_SHORTCUTS, ...(settings.readerShortcuts ?? {}) }),
    [settings.readerShortcuts],
  );

  const buttons = useMemo(
    () => [
      { label: "复制", Icon: FiCopy, onClick: handleCopy, shortcut: readerShortcuts.copy },
      { label: "解释", Icon: FiHelpCircle, onClick: handleExplain, shortcut: readerShortcuts.explain },
      { label: "询问AI", Icon: FiMessageCircle, onClick: handleAskAI, shortcut: readerShortcuts.askAI },
      {
        label: undefined,
        Icon: selectionAnnotated ? RiDeleteBinLine : PiHighlighterFill,
        onClick: handleHighlight,
        shortcut: readerShortcuts.toggleHighlight,
      },
      { label: undefined, Icon: NotebookPen, onClick: addNote, shortcut: readerShortcuts.addNote },
    ],
    [
      readerShortcuts.copy,
      readerShortcuts.explain,
      readerShortcuts.askAI,
      readerShortcuts.toggleHighlight,
      readerShortcuts.addNote,
      handleCopy,
      handleExplain,
      handleAskAI,
      handleHighlight,
      addNote,
      selectionAnnotated,
    ],
  );

  useEffect(() => {
    if (!showAnnotPopup || showAskAIPopup) return;
    if (!buttons.some((button) => button.shortcut)) return;

    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const eventTarget = event.target as Node | null;
      const activeDocument = eventTarget?.ownerDocument ?? document;
      const activeElement = activeDocument.activeElement as HTMLElement | null;
      if (activeElement) {
        const tagName = activeElement.tagName;
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          activeElement.isContentEditable
        ) {
          return;
        }
      }

      const key = event.key.toLowerCase();
      const matchedButton = buttons.find(
        (button) => button.shortcut && button.shortcut.toLowerCase() === key,
      );

      if (!matchedButton) return;

      event.preventDefault();
      matchedButton.onClick();
    };

    const listeners: Array<() => void> = [];
    const attachedTargets = new Set<Window | Document>();
    const addListener = (target: Window | Document | null | undefined) => {
      if (!target || attachedTargets.has(target)) return;
      attachedTargets.add(target);
      target.addEventListener("keydown", handleShortcut);
      listeners.push(() => target.removeEventListener("keydown", handleShortcut));
    };

    addListener(window);
    addListener(document);

    const ownerDocument = selection?.range?.startContainer?.ownerDocument ?? null;
    addListener(ownerDocument);
    if (ownerDocument?.defaultView && ownerDocument.defaultView !== window) {
      addListener(ownerDocument.defaultView);
    }

    return () => {
      listeners.forEach((dispose) => dispose());
    };
  }, [buttons, selection?.range, showAnnotPopup, showAskAIPopup]);

  return (
    <div>
      {showAnnotPopup && !showAskAIPopup && trianglePosition && annotPopupPosition && (
        <AnnotationPopup
          dir={globalViewSettings?.rtl ? "rtl" : "ltr"}
          isVertical={globalViewSettings?.vertical ?? false}
          buttons={buttons}
          position={annotPopupPosition}
          trianglePosition={trianglePosition}
          highlightOptionsVisible={highlightOptionsVisible}
          selectedStyle={selectedStyle}
          selectedColor={selectedColor}
          popupWidth={annotPopupWidth}
          popupHeight={annotPopupHeight}
          onHighlight={handleHighlight}
        />
      )}
      {showAskAIPopup && askAIPopupPosition && selection && (
        <AskAIPopup
          style={{
            left: `${askAIPopupPosition.point.x}px`,
            top: `${askAIPopupPosition.point.y + 15}px`,
            width: "320px",
          }}
          selectedText={selection.text}
          onClose={handleCloseAskAI}
          onSendQuery={handleSendAIQuery}
        />
      )}
    </div>
  );
};

export default Annotator;
