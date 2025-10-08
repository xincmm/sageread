import type { BookProgress } from "@/types/book";
import * as CFI from "foliate-js/epubcfi.js";
import { useEffect, useRef, useState } from "react";

const useScrollToItem = (cfi: string, progress: BookProgress | null) => {
  const viewRef = useRef<HTMLLIElement | null>(null);
  const [isCurrent, setIsCurrent] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!viewRef.current || !progress) return;

    // Calculate if the current item is in the progress range
    const { location } = progress;
    const start = CFI.collapse(location);
    const end = CFI.collapse(location, true);
    const isCurrent = CFI.compare(cfi, start) >= 0 && CFI.compare(cfi, end) <= 0;
    setIsCurrent(isCurrent);

    // Scroll to the item if it's the current one and not visible
    if (isCurrent) {
      const element = viewRef.current;
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (!isVisible) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      element.setAttribute("aria-current", "page");
    }
  }, [cfi, progress, viewRef]);

  return { isCurrent, viewRef };
};

export default useScrollToItem;
