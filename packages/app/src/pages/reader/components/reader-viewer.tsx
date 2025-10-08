import { useReadingSession } from "@/hooks/use-reading-session";
import { useSafeAreaInsets } from "@/hooks/use-safe-areaInsets";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useLayoutStore } from "@/store/layout-store";
import { useLibraryStore } from "@/store/library-store";
import { getInsetEdges } from "@/utils/grid";
import { getViewInsets } from "@/utils/insets";
import { useEffect, useMemo } from "react";
import useBookShortcuts from "../hooks/use-book-shortcuts";
import { useFoliateViewer } from "../hooks/use-foliate-viewer";
import Annotator from "./annotator";
import FooterBar from "./footer-bar";
import HeaderBar from "./header-bar";
import { useReaderStore, useReaderStoreApi } from "./reader-provider";

const ReaderViewerContent: React.FC = () => {
  const bookId = useReaderStore((state) => state.bookId);
  const bookData = useReaderStore((state) => state.bookData);
  const config = useReaderStore((state) => state.config);
  const { settings } = useAppSettingsStore();

  const screenInsets = useSafeAreaInsets();
  const aspectRatio = window.innerWidth / window.innerHeight;
  const globalViewSettings = settings.globalViewSettings;

  const contentInsets = useMemo(() => {
    if (!screenInsets || !globalViewSettings) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const { top, right, bottom, left } = getInsetEdges(0, 1, aspectRatio);
    const gridInsets = {
      top: top ? screenInsets.top : 0,
      right: right ? screenInsets.right : 0,
      bottom: bottom ? screenInsets.bottom : 0,
      left: left ? screenInsets.left : 0,
    };

    const viewInsets = getViewInsets(globalViewSettings);

    return {
      top: gridInsets.top + viewInsets.top,
      right: gridInsets.right + viewInsets.right,
      bottom: gridInsets.bottom + viewInsets.bottom,
      left: gridInsets.left + viewInsets.left,
    };
  }, [screenInsets, globalViewSettings, aspectRatio]);

  if (!bookData?.bookDoc || !config || !contentInsets) {
    return null;
  }

  const foliateViewer = useFoliateViewer(bookId, bookData.bookDoc, config, contentInsets);

  return (
    <div ref={foliateViewer.containerRef} className="flex-1" data-book-id={bookId} {...foliateViewer.mouseHandlers} />
  );
};

export default function ReaderViewer() {
  const store = useReaderStoreApi();
  useBookShortcuts();

  const bookId = useReaderStore((state) => state.bookId);
  const bookData = useReaderStore((state) => state.bookData);
  const config = useReaderStore((state) => state.config);
  const isLoading = useReaderStore((state) => state.isLoading);
  const error = useReaderStore((state) => state.error);

  const { settings } = useAppSettingsStore();
  const { booksWithStatus } = useLibraryStore();

  // 判断当前 tab 是否可见（不在首页 && 当前激活的 tab）
  const { activeTabId, isHomeActive } = useLayoutStore();
  const tabId = `reader-${bookId}`;
  const isTabVisible = !isHomeActive && activeTabId === tabId;

  const { sessionStats, isInitialized: isSessionInitialized } = useReadingSession(bookId, {
    saveInterval: 5 * 1000,
    isVisible: isTabVisible,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const currentBookData = store.getState().bookData;
    if (!currentBookData) {
      store.getState().initBook();
    }
  }, [store, booksWithStatus, settings.globalViewSettings]);

  useEffect(() => {
    store.getState().setSessionStats(sessionStats);
    store.getState().setSessionInitialized(isSessionInitialized);
  }, [store, sessionStats, isSessionInitialized]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-neutral-500">loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!bookData || !config) {
    return null;
  }

  return (
    <div id={`gridcell-${bookId}`} className="relative flex h-full w-full flex-col rounded-md bg-background">
      <HeaderBar />
      <ReaderViewerContent />
      <FooterBar />
      <Annotator />
    </div>
  );
}
