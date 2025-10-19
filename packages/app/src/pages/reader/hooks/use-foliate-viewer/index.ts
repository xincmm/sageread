import { useUICSS } from "@/hooks/use-ui-css";
import type { BookDoc } from "@/lib/document";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useThemeStore } from "@/store/theme-store";
import type { BookConfig } from "@/types/book";
import type { ViewSettings } from "@/types/book";
import type { Insets } from "@/types/misc";
import type { FoliateView } from "@/types/view";
import { applyFixedlayoutStyles, getStyles } from "@/utils/style";
import { useEffect, useRef, useState } from "react";
import { useReaderStoreApi } from "../../components/reader-provider";
import { useMouseEvent } from "../use-iframe-events";
import { usePagination } from "../use-pagination";
import { useProgressAutoSave } from "../use-progress-auto-save";
import { FoliateViewerManager, type ProgressData } from "./foliate-viewer-manager";

export const useFoliateViewer = (bookId: string, bookDoc: BookDoc, config: BookConfig, insets: Insets) => {
  const store = useReaderStoreApi();
  const { themeCode, isDarkMode } = useThemeStore();
  const { settings, setSettings } = useAppSettingsStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<FoliateViewerManager | null>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const isInitialized = useRef(false);
  const [, forceUpdate] = useState({});

  useUICSS(bookId);
  useProgressAutoSave(bookId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isInitialized.current || !containerRef.current) {
      console.log(
        "[useFoliateViewer] Skipping init - isInitialized:",
        isInitialized.current,
        "containerRef:",
        !!containerRef.current,
      );
      return;
    }

    console.log("[useFoliateViewer] Starting initialization");
    isInitialized.current = true;

    const manager = new FoliateViewerManager({
      bookId,
      bookDoc,
      config,
      insets,
      container: containerRef.current,
      globalViewSettings: settings.globalViewSettings,
      onViewCreated: (view) => {
        store.getState().setView(view);
        viewRef.current = view;
      },
    });

    manager.setProgressCallback((progress: ProgressData) => {
      store.getState().setProgress(progress);
      store.getState().setLocation(progress.location);
    });

    manager.setViewSettingsCallback((updatedSettings: ViewSettings) => {
      const { settings: currentSettings } = useAppSettingsStore.getState();
      setSettings({
        ...currentSettings,
        globalViewSettings: updatedSettings,
      });
    });

    managerRef.current = manager;

    manager
      .initialize()
      .then(() => {
        forceUpdate({});
      })
      .catch((error) => {
        console.error("Failed to initialize foliate viewer:", error);
      });

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
      viewRef.current = null;
      isInitialized.current = false;
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!isInitialized.current) return;

    const manager = managerRef.current;
    const view = manager?.getView();

    if (manager) {
      manager.updateViewSettings(settings.globalViewSettings);
    }

    if (view?.renderer) {
      const styles = getStyles(settings.globalViewSettings, themeCode);
      view.renderer.setStyles?.(styles);

      if (bookDoc.rendition?.layout === "pre-paginated") {
        const docs = view.renderer.getContents();
        docs.forEach(({ doc }) => applyFixedlayoutStyles(doc, settings.globalViewSettings, themeCode));
      }
    }
  }, [themeCode, isDarkMode, settings.globalViewSettings, bookDoc.rendition?.layout]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const view = managerRef.current?.getView();
    if (view?.renderer && isInitialized.current) {
      if (settings.globalViewSettings.scrolled) {
        view.renderer.setAttribute("flow", "scrolled");
      }
    }
  }, [insets.top, insets.right, insets.bottom, insets.left, settings.globalViewSettings]);

  const { handlePageFlip, handleContinuousScroll } = usePagination(
    bookId,
    containerRef as React.RefObject<HTMLDivElement>,
  );

  const mouseHandlers = useMouseEvent(bookId, handlePageFlip, handleContinuousScroll);

  const refresh = async () => {
    if (managerRef.current) {
      await managerRef.current.refresh();
    }
  };

  return {
    containerRef,
    mouseHandlers,
    refresh,
    getView: () => managerRef.current?.getView() || null,
  } as const;
};

export default useFoliateViewer;
