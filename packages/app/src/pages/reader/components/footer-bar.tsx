import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAutoHideControls } from "../hooks/use-auto-hide-controls";
import { viewPagination } from "../hooks/use-pagination";
import { useReaderStore, useReaderStoreApi } from "./reader-provider";

const FooterBar = () => {
  const _ = useTranslation();
  const store = useReaderStoreApi();
  const progress = useReaderStore((state) => state.progress);
  const { settings } = useAppSettingsStore();
  const globalViewSettings = settings.globalViewSettings;
  const view = store.getState().view;
  const { isVisible: showControls, handleMouseEnter, handleMouseLeave } = useAutoHideControls();

  const handleGoPrevPage = () => {
    const isScrolledMode = globalViewSettings?.scrolled;
    if (isScrolledMode) {
      if (view) {
        view.renderer.prevSection?.();
      }
    } else {
      if (view) {
        viewPagination(view, globalViewSettings, "left");
      }
    }
  };

  const handleGoNextPage = () => {
    const isScrolledMode = globalViewSettings?.scrolled;
    if (view) {
      if (isScrolledMode) {
        view?.renderer.nextSection?.();
      } else {
        viewPagination(view, globalViewSettings, "right");
      }
    }
  };

  const isVertical = globalViewSettings?.vertical;
  const isScrolledMode = globalViewSettings?.scrolled;
  const pageinfo = progress?.pageinfo;

  const pageInfo =
    pageinfo && pageinfo.current >= 0 && pageinfo.total > 0
      ? _(isVertical ? "{{currentPage}} · {{totalPage}}" : "Loc. {{currentPage}} / {{totalPage}}", {
          currentPage: pageinfo.current + 1,
          totalPage: pageinfo.total,
        })
      : "";

  return (
    <div
      className="footer-bar pointer-events-auto flex h-10 w-full items-center px-2 transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex w-full items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className={`size-7 rounded-full transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
          onClick={handleGoPrevPage}
          title={isScrolledMode ? _("Previous Chapter") : _("Previous Page")}
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="z-50 flex justify-center">
          <span className="text-center text-sm">{pageInfo}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={`size-7 rounded-full transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
          onClick={handleGoNextPage}
          title={isScrolledMode ? _("Next Chapter") : _("Next Page")}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
};

export default FooterBar;
