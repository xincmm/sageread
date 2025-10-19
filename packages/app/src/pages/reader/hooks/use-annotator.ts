import { createBookNote, deleteBookNote, updateBookNote } from "@/services/book-note-service";
import { iframeService } from "@/services/iframe-service";
import { useAppSettingsStore } from "@/store/app-settings-store";
import type { HighlightColor, HighlightStyle } from "@/types/book";
import { type Position, type TextSelection, getPopupPosition, getPosition } from "@/utils/sel";
import { useQueryClient } from "@tanstack/react-query";
import * as CFI from "foliate-js/epubcfi.js";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useReaderStore, useReaderStoreApi } from "../components/reader-provider";

function getContextByRange(range: Range, win = 30) {
  const container = range.commonAncestorContainer;
  const el =
    (container.nodeType === Node.ELEMENT_NODE ? (container as Element) : (container.parentElement as Element)).closest(
      "p,li,div,section,article,blockquote,td",
    ) || document.body;

  const blockText = el.textContent || "";
  const highlight = range.toString();
  const i = blockText.indexOf(highlight);
  if (i < 0) return { before: "", highlight, after: "" };

  const s = Math.max(0, i - win);
  const e = Math.min(blockText.length, i + highlight.length + win);
  const squash = (s: string) => s.replace(/\s+/g, " ");
  return {
    before: squash(blockText.slice(s, i)),
    highlight,
    after: squash(blockText.slice(i + highlight.length, e)),
  };
}

interface UseAnnotatorProps {
  bookId: string;
}

export const useAnnotator = ({ bookId }: UseAnnotatorProps) => {
  const { settings } = useAppSettingsStore();
  const config = useReaderStore((state) => state.config)!;
  const progress = useReaderStore((state) => state.progress)!;
  const view = useReaderStore((state) => state.view);
  const store = useReaderStoreApi();
  const queryClient = useQueryClient();
  const globalViewSettings = settings.globalViewSettings;

  // 状态管理
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [showAnnotPopup, setShowAnnotPopup] = useState(false);
  const [showAskAIPopup, setShowAskAIPopup] = useState(false);
  const [trianglePosition, setTrianglePosition] = useState<Position>();
  const [annotPopupPosition, setAnnotPopupPosition] = useState<Position>();
  const [askAIPopupPosition, setAskAIPopupPosition] = useState<Position>();
  const [highlightOptionsVisible, setHighlightOptionsVisible] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState<HighlightStyle>(settings.globalReadSettings.highlightStyle);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>(
    settings.globalReadSettings.highlightStyles[selectedStyle],
  );

  const popupPadding = 10;
  const basePopupWidth = globalViewSettings?.vertical ? 240 : 220;
  const annotPopupWidth = Math.min(basePopupWidth, window.innerWidth - 2 * popupPadding);
  const annotPopupHeight = 36;

  // Popup 相关函数
  const handleDismissPopup = useCallback(() => {
    setSelection(null);
    setShowAnnotPopup(false);
    setShowAskAIPopup(false);
  }, []);

  const handleDismissPopupAndSelection = useCallback(() => {
    handleDismissPopup();
    view?.deselect();
  }, [handleDismissPopup, view]);

  // 业务逻辑函数
  const handleCopy = useCallback(() => {
    if (!selection || !selection.text) return;
    if (selection) navigator.clipboard?.writeText(selection.text);
    toast.success("Copy success!");
    handleDismissPopupAndSelection();
  }, [selection, handleDismissPopupAndSelection]);

  const handleHighlight = useCallback(
    async (update = false) => {
      if (!selection || !selection.text) return;
      setHighlightOptionsVisible(true);
      const { booknotes: annotations = [] } = config;
      const cfi = view?.getCFI(selection.index, selection.range);
      if (!cfi) return;

      const style = settings.globalReadSettings.highlightStyle;
      const color = settings.globalReadSettings.highlightStyles[style];

      const existingAnnotation = annotations.find(
        (annotation) => annotation.cfi === cfi && annotation.type === "annotation" && !annotation.deletedAt,
      );

      try {
        if (existingAnnotation) {
          if (update) {
            const updatedAnnotation = await updateBookNote(existingAnnotation.id, {
              style,
              color,
              text: selection.text,
              note: existingAnnotation.note,
            });

            const updatedAnnotations = annotations.map((ann) =>
              ann.id === existingAnnotation.id ? updatedAnnotation : ann,
            );
            const updatedConfig = store.getState().updateBooknotes(updatedAnnotations);
            view?.addAnnotation(updatedAnnotation, true);
            view?.addAnnotation(updatedAnnotation);

            if (updatedConfig) {
              await store.getState().saveConfig(updatedConfig);
            }
            queryClient.invalidateQueries({ queryKey: ["annotations", bookId] });
          } else {
            await deleteBookNote(existingAnnotation.id);
            const updatedAnnotations = annotations.filter((ann) => ann.id !== existingAnnotation.id);
            const updatedConfig = store.getState().updateBooknotes(updatedAnnotations);

            view?.addAnnotation(existingAnnotation, true);

            setShowAnnotPopup(false);

            if (updatedConfig) {
              await store.getState().saveConfig(updatedConfig);
            }

            queryClient.invalidateQueries({ queryKey: ["annotations", bookId] });
          }
        } else {
          const ctx = getContextByRange(selection.range, 50);
          const newAnnotation = await createBookNote({
            bookId,
            type: "annotation",
            cfi,
            style,
            color,
            text: selection.text,
            note: "",
            context: {
              before: ctx.before,
              after: ctx.after,
            },
          });

          const updatedAnnotations = [...annotations, newAnnotation];
          const updatedConfig = store.getState().updateBooknotes(updatedAnnotations);

          view?.addAnnotation(newAnnotation);
          setSelection({ ...selection, annotated: true });

          if (updatedConfig) {
            await store.getState().saveConfig(updatedConfig);
          }

          queryClient.invalidateQueries({ queryKey: ["annotations", bookId] });
        }
      } catch (error) {
        console.error("Failed to handle highlight:", error);
        toast.error("Failed to save annotation");
      }
    },
    [selection, config, view, settings, bookId, store, queryClient],
  );

  const handleExplain = useCallback(() => {
    if (!selection || !selection.text) return;
    setShowAnnotPopup(false);
    iframeService.sendExplainTextRequest(selection.text, "explain", bookId);
  }, [selection, bookId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const handleAskAI = useCallback(() => {
    if (!selection || !selection.text) return;

    setShowAnnotPopup(false);
    setShowAskAIPopup(false);

    // Calculate position for AskAI popup
    const gridFrame = document.querySelector(`#gridcell-${bookId}`);
    if (!gridFrame) return;
    const rect = gridFrame.getBoundingClientRect();
    const triangPos = getPosition(selection.range, rect, popupPadding, globalViewSettings?.vertical);

    // Calculate AskAI popup position
    const askAIPopupWidth = 320;
    const askAIPopupHeight = 120;
    const askAIPopupPos = getPopupPosition(
      triangPos,
      rect,
      globalViewSettings?.vertical ? askAIPopupHeight : askAIPopupWidth,
      globalViewSettings?.vertical ? askAIPopupWidth : askAIPopupHeight,
      popupPadding,
    );

    if (triangPos.point.x === 0 || triangPos.point.y === 0) return;
    setAskAIPopupPosition(askAIPopupPos);

    setTimeout(() => {
      setShowAskAIPopup(true);
    }, 0);
  }, [selection, bookId, globalViewSettings, popupPadding]);

  const handleCloseAskAI = useCallback(() => {
    setShowAskAIPopup(false);
    view?.deselect();
  }, [view]);

  const handleSendAIQuery = useCallback(
    (query: string, selectedText: string) => {
      iframeService.sendAskAIRequest(selectedText, query, bookId);
      handleDismissPopupAndSelection();
    },
    [handleDismissPopupAndSelection, bookId],
  );

  // Popup 位置计算
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setHighlightOptionsVisible(!!selection?.annotated);
    if (selection && selection.text.trim().length > 0 && !showAskAIPopup) {
      const gridFrame = document.querySelector(`#gridcell-${bookId}`);

      if (!gridFrame) {
        return;
      }

      const rect = gridFrame.getBoundingClientRect();
      const triangPos = getPosition(selection.range, rect, popupPadding, globalViewSettings?.vertical);
      const annotPopupPos = getPopupPosition(
        triangPos,
        rect,
        globalViewSettings?.vertical ? annotPopupHeight : annotPopupWidth,
        globalViewSettings?.vertical ? annotPopupWidth : annotPopupHeight,
        popupPadding,
      );

      if (triangPos.point.x === 0 || triangPos.point.y === 0) {
        return;
      }

      setAnnotPopupPosition(annotPopupPos);
      setTrianglePosition(triangPos);
      setShowAnnotPopup(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, bookId, showAskAIPopup]);

  // 加载当前页面的标注
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!progress) return;
    const { location } = progress;
    const start = CFI.collapse(location);
    const end = CFI.collapse(location, true);
    const { booknotes = [] } = config;
    const annotations = booknotes.filter(
      (item) =>
        !item.deletedAt &&
        item.type === "annotation" &&
        item.style &&
        CFI.compare(item.cfi, start) >= 0 &&
        CFI.compare(item.cfi, end) <= 0,
    );
    try {
      Promise.all(annotations.map((annotation) => view?.addAnnotation(annotation)));
    } catch (e) {
      console.warn(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return {
    // 状态
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

    // 函数
    handleDismissPopup,
    handleDismissPopupAndSelection,
    handleCopy,
    handleHighlight,
    handleExplain,
    handleAskAI,
    handleCloseAskAI,
    handleSendAIQuery,
  };
};
