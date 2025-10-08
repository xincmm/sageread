import { useCallback, useEffect, useRef, useState } from "react";

export interface SelectionState {
  selectedText: string;
  showPopup: boolean;
  position: { x: number; y: number };
}

export interface UseTextSelectionReturn {
  selectionState: SelectionState | null;
  handleTextSelection: () => void;
  handleClosePopup: () => void;
  handleAskSelection: (text: string) => void;
  popupRef: React.RefObject<HTMLDivElement | null>;
}

interface UseTextSelectionOptions {
  onAskSelection?: (text: string) => void;
}

export function useTextSelection({ onAskSelection }: UseTextSelectionOptions): UseTextSelectionReturn {
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const getFilteredText = (selection: Selection): string => {
    if (!selection.rangeCount) return "";

    const range = selection.getRangeAt(0);
    const container = range.cloneContents();

    const pageNumElements = container.querySelectorAll("span.rounded-full.bg-muted");
    pageNumElements.forEach((el) => el.remove());

    return container.textContent?.trim() || "";
  };

  const updatePosition = useCallback((range: Range) => {
    const rect = range.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      return { x, y, valid: true };
    }
    return { x: 0, y: 0, valid: false };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const handleTextSelection = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection) return;

        const selectedText = getFilteredText(selection);

        if (selectedText && selectedText.length > 0) {
          const range = selection.getRangeAt(0);
          const { x, y, valid } = updatePosition(range);
          if (valid) {
            setSelectionRange(range);
            setSelectionState({
              selectedText,
              showPopup: true,
              position: { x, y },
            });
          }
        } else {
          setSelectionState(null);
          setSelectionRange(null);
        }
      }, 50);
    });
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectionState(null);
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleAskSelection = useCallback(
    (text: string) => {
      onAskSelection?.(text);
    },
    [onAskSelection],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const handleScroll = () => {
      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;

        if (selectionRange && selectionState?.showPopup) {
          const { x, y, valid } = updatePosition(selectionRange);
          if (valid) {
            setSelectionState((prev) => (prev ? { ...prev, position: { x, y } } : null));
          } else {
            handleClosePopup();
          }
        }
      });
    };

    if (selectionState?.showPopup) {
      window.addEventListener("scroll", handleScroll, true);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
      };
    }
  }, [selectionState?.showPopup, selectionRange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectionState?.showPopup && popupRef.current) {
        if (!popupRef.current.contains(event.target as Node)) {
          handleClosePopup();
        }
      }
    };

    if (selectionState?.showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [selectionState?.showPopup, handleClosePopup]);

  return {
    selectionState,
    handleTextSelection,
    handleClosePopup,
    handleAskSelection,
    popupRef,
  };
}
