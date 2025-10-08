import { debounce } from "@/utils/debounce";
import { useEffect } from "react";
import type { ScrollSource } from "./use-pagination";

export const useMouseEvent = (
  bookId: string,
  handlePageFlip: (msg: MessageEvent | React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
  handleContinuousScroll: (source: ScrollSource, delta: number, threshold: number) => void,
) => {
  const debounceScroll = debounce(handleContinuousScroll, 500);
  const debounceFlip = debounce(handlePageFlip, 100);
  const handleMouseEvent = (msg: MessageEvent | React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (msg instanceof MessageEvent) {
      if (msg.data && msg.data.bookId === bookId) {
        if (msg.data.type === "iframe-wheel") {
          debounceScroll("mouse", -msg.data.deltaY, 0);
        }
        if (msg.data.type === "iframe-wheel") {
          debounceFlip(msg);
        } else {
          handlePageFlip(msg);
        }
      }
    } else if (msg.type === "wheel") {
      const event = msg as React.WheelEvent<HTMLDivElement>;
      debounceScroll("mouse", -event.deltaY, 0);
    } else {
      handlePageFlip(msg);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    window.addEventListener("message", handleMouseEvent);
    return () => {
      window.removeEventListener("message", handleMouseEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  return {
    onClick: handlePageFlip,
    onWheel: handleMouseEvent,
  };
};
