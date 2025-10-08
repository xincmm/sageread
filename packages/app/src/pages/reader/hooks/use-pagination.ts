import { useAppSettingsStore } from "@/store/app-settings-store";
import type { ViewSettings } from "@/types/book";
import type { FoliateView } from "@/types/view";
import { eventDispatcher } from "@/utils/event";
import { useReaderStoreApi } from "../components/reader-provider";

export type ScrollSource = "touch" | "mouse";

export const viewPagination = (
  view: FoliateView | null,
  viewSettings: ViewSettings | null | undefined,
  side: "left" | "right",
) => {
  if (!view || !viewSettings) return;
  const renderer = view.renderer;
  if (renderer.scrolled) {
    if (view.book.dir === "rtl") {
      side = side === "left" ? "right" : "left";
    }
    const { size } = renderer;
    const showHeader = viewSettings.showHeader && viewSettings.showBarsOnScroll;
    const showFooter = viewSettings.showFooter && viewSettings.showBarsOnScroll;
    const scrollingOverlap = viewSettings.scrollingOverlap;
    const distance = size - scrollingOverlap - (showHeader ? 44 : 0) - (showFooter ? 44 : 0);
    return side === "left" ? view.prev(distance) : view.next(distance);
  }
  return side === "left" ? view.goLeft() : view.goRight();
};

export const usePagination = (bookId: string, containerRef: React.RefObject<HTMLDivElement>) => {
  const { settings } = useAppSettingsStore();
  const store = useReaderStoreApi();
  const globalViewSettings = settings.globalViewSettings!;

  const view = store.getState().view;

  const handlePageFlip = async (msg: MessageEvent | CustomEvent | React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (msg instanceof MessageEvent) {
      if (msg.data && msg.data.bookId === bookId) {
        if (msg.data.type === "iframe-single-click") {
          const viewElement = containerRef.current;
          if (viewElement) {
            const { screenX } = msg.data;
            const viewRect = viewElement.getBoundingClientRect();
            const windowStartX = window.screenX;
            const viewStartX = windowStartX + viewRect.left;
            const viewCenterX = viewStartX + viewRect.width / 2;
            const consumed = eventDispatcher.dispatchSync("iframe-single-click");
            if (!consumed) {
              const centerStartX = viewStartX + viewRect.width * 0.375;
              const centerEndX = viewStartX + viewRect.width * 0.625;
              if (globalViewSettings.disableClick! || (screenX >= centerStartX && screenX <= centerEndX)) {
                // Center area - no action needed
              } else {
                if (!globalViewSettings.disableClick! && screenX >= viewCenterX) {
                  if (globalViewSettings.swapClickArea) {
                    viewPagination(view, globalViewSettings, "left");
                  } else {
                    viewPagination(view, globalViewSettings, "right");
                  }
                } else if (!globalViewSettings.disableClick! && screenX < viewCenterX) {
                  if (globalViewSettings.swapClickArea) {
                    viewPagination(view, globalViewSettings, "right");
                  } else {
                    viewPagination(view, globalViewSettings, "left");
                  }
                }
              }
            }
          }
        } else if (msg.data.type === "iframe-wheel" && !globalViewSettings.scrolled) {
          // The wheel event is handled by the iframe itself in scrolled mode.
          const { deltaY } = msg.data;
          if (deltaY > 0) {
            view?.next(1);
          } else if (deltaY < 0) {
            view?.prev(1);
          }
        } else if (msg.data.type === "iframe-mouseup") {
          if (msg.data.button === 3) {
            view?.history.back();
          } else if (msg.data.button === 4) {
            view?.history.forward();
          }
        }
      }
    } else if (msg instanceof CustomEvent) {
      const { keyName } = msg.detail;
      if (globalViewSettings?.volumeKeysToFlip) {
        if (keyName === "VolumeUp") {
          viewPagination(view, globalViewSettings, "left");
        } else if (keyName === "VolumeDown") {
          viewPagination(view, globalViewSettings, "right");
        }
      }
    } else {
      if (msg.type === "click") {
        const { clientX } = msg;
        const width = window.innerWidth;
        const leftThreshold = width * 0.5;
        const rightThreshold = width * 0.5;
        if (clientX < leftThreshold) {
          viewPagination(view, globalViewSettings, "left");
        } else if (clientX > rightThreshold) {
          viewPagination(view, globalViewSettings, "right");
        }
      }
    }
  };

  const handleContinuousScroll = (mode: ScrollSource, scrollDelta: number, threshold: number) => {
    const renderer = view?.renderer;
    if (renderer && globalViewSettings.scrolled && globalViewSettings.continuousScroll) {
      const doScroll = () => {
        // may have overscroll where the start is greater than 0
        if (renderer.start <= scrollDelta && scrollDelta > threshold) {
          setTimeout(() => {
            view?.prev(renderer.start + 1);
          }, 100);
          // sometimes viewSize has subpixel value that the end never reaches
        } else if (Math.ceil(renderer.end) - scrollDelta >= renderer.viewSize && scrollDelta < -threshold) {
          setTimeout(() => {
            view?.next(renderer.viewSize - Math.floor(renderer.end) + 1);
          }, 100);
        }
      };
      if (mode === "mouse") {
        // we can always get mouse wheel events
        doScroll();
      } else if (mode === "touch") {
        // when the document height is less than the viewport height, we can't get the relocate event
        if (renderer.size >= renderer.viewSize) {
          doScroll();
        } else {
          // scroll after the relocate event
          renderer.addEventListener("relocate", () => doScroll(), { once: true });
        }
      }
    }
  };

  return {
    handlePageFlip,
    handleContinuousScroll,
  };
};
