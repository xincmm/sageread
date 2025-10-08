import useShortcuts from "@/hooks/use-shortcuts";
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from "@/services/constants";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useLayoutStore } from "@/store/layout-store";
import { eventDispatcher } from "@/utils/event";
import { getStyles } from "@/utils/style";
import { useReaderStoreApi } from "../components/reader-provider";
import { viewPagination } from "./use-pagination";

const useBookShortcuts = () => {
  const store = useReaderStoreApi();
  const { settings, setSettings, toggleSettingsDialog } = useAppSettingsStore();
  const globalViewSettings = settings.globalViewSettings;

  const view = store.getState().view;
  const bookId = store.getState().bookId;

  // 判断当前 tab 是否可见
  const { activeTabId, isHomeActive } = useLayoutStore();
  const tabId = `reader-${bookId}`;
  const isTabVisible = !isHomeActive && activeTabId === tabId;

  // 通用的设置更新和样式应用函数
  const updateSettingsAndApplyStyles = (updatedSettings: typeof globalViewSettings) => {
    setSettings({
      ...settings,
      globalViewSettings: updatedSettings,
    });
    view?.renderer.setStyles?.(getStyles(updatedSettings));
  };

  const applyZoom = (zoomLevel: number) => {
    const clampedZoomLevel = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, zoomLevel));
    updateSettingsAndApplyStyles({
      ...globalViewSettings,
      zoomLevel: clampedZoomLevel,
    });
  };

  const toggleScrollMode = () => {
    if (!isTabVisible) return;
    if (globalViewSettings && bookId) {
      const updatedSettings = {
        ...globalViewSettings,
        scrolled: !globalViewSettings.scrolled,
      };
      updateSettingsAndApplyStyles(updatedSettings);
      const flowMode = updatedSettings.scrolled ? "scrolled" : "paginated";
      view?.renderer.setAttribute("flow", flowMode);
    }
  };

  const goLeft = () => {
    if (!isTabVisible) return;
    viewPagination(view, globalViewSettings, "left");
  };

  const goRight = () => {
    if (!isTabVisible) return;
    viewPagination(view, globalViewSettings, "right");
  };

  const goPrev = () => {
    if (!isTabVisible) return;
    const fontSize = globalViewSettings?.defaultFontSize ?? 16;
    const lineHeight = globalViewSettings?.lineHeight ?? 1.6;
    const distance = fontSize * lineHeight * 3;
    view?.prev(distance);
  };

  const goNext = () => {
    if (!isTabVisible) return;
    const fontSize = globalViewSettings?.defaultFontSize ?? 16;
    const lineHeight = globalViewSettings?.lineHeight ?? 1.6;
    const distance = fontSize * lineHeight * 3;
    view?.next(distance);
  };

  const goBack = () => {
    if (!isTabVisible) return;
    view?.history.back();
  };

  const goHalfPageDown = () => {
    if (!isTabVisible) return;
    if (view && globalViewSettings?.scrolled) {
      view.next(view.renderer.size / 2);
    }
  };

  const goHalfPageUp = () => {
    if (!isTabVisible) return;
    if (view && globalViewSettings?.scrolled) {
      view.prev(view.renderer.size / 2);
    }
  };

  const goForward = () => {
    if (!isTabVisible) return;
    view?.history.forward();
  };

  const reloadPage = () => {
    if (!isTabVisible) return;
    window.location.reload();
  };

  const showSearchBar = () => {
    if (!isTabVisible) return;
    eventDispatcher.dispatch("search", { term: "" });
  };

  // const zoomIn = () => {
  //   if (!isTabVisible) return;
  //   applyZoom((globalViewSettings?.zoomLevel ?? 100) + ZOOM_STEP);
  // };
  // const zoomOut = () => {
  //   if (!isTabVisible) return;
  //   applyZoom((globalViewSettings?.zoomLevel ?? 100) - ZOOM_STEP);
  // };

  const resetZoom = () => {
    if (!isTabVisible) return;
    applyZoom(100);
  };

  const toggleTTS = () => {
    if (!isTabVisible) return;
    if (!bookId) return;
    eventDispatcher.dispatch("tts-speak", { bookId });
  };

  const openSettings = () => {
    if (!isTabVisible) return;
    toggleSettingsDialog();
  };

  useShortcuts(
    {
      onToggleScrollMode: toggleScrollMode,
      onToggleSearchBar: showSearchBar,
      onToggleTTS: toggleTTS,
      onReloadPage: reloadPage,
      onGoLeft: goLeft,
      onGoRight: goRight,
      onGoPrev: goPrev,
      onGoNext: goNext,
      onGoHalfPageDown: goHalfPageDown,
      onGoHalfPageUp: goHalfPageUp,
      onGoBack: goBack,
      onGoForward: goForward,
      // onZoomIn: zoomIn,
      // onZoomOut: zoomOut,
      onResetZoom: resetZoom,
      onOpenSettings: openSettings,
      pagePrev: goPrev,
      pageNext: goNext,
    },
    [bookId, view, isTabVisible],
  );
};

export default useBookShortcuts;
