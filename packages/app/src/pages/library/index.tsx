import SettingsDialog from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import { useBookUpload } from "@/hooks/use-book-upload";
import { useSafeAreaInsets } from "@/hooks/use-safe-areaInsets";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/hooks/use-translation";
import { useUICSS } from "@/hooks/use-ui-css";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useLibraryStore } from "@/store/library-store";
import clsx from "clsx";
import { Plus, Upload as UploadIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import BookItem from "./components/book-item";
import CreateTagDialog from "./components/create-tag-dialog";
import EditTagDialog from "./components/edit-tag-dialog";
import Upload from "./components/upload";
import { useBooksFilter } from "./hooks/use-books-filter";
import { useBooksOperations } from "./hooks/use-books-operations";
import { useLibraryUI } from "./hooks/use-library-ui";
import { useTagsManagement } from "./hooks/use-tags-management";
import { useTagsOperations } from "./hooks/use-tags-operations";

export default function NewLibraryPage() {
  const { searchQuery, booksWithStatus, isLoading, refreshBooks } = useLibraryStore();
  const { isSettingsDialogOpen, toggleSettingsDialog } = useAppSettingsStore();
  const _ = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDragOver, isUploading, handleDragOver, handleDragLeave, handleDrop, triggerFileSelect } = useBookUpload();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isInitiating = useRef(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [selectedTagsForDelete, setSelectedTagsForDelete] = useState<string[]>([]);

  // 从URL获取选中的标签
  const selectedTagFromUrl = searchParams.get("tag") || "all";
  const { tags, filteredBooksByTag } = useTagsManagement(booksWithStatus, selectedTagFromUrl);
  const { filteredBooks } = useBooksFilter(filteredBooksByTag, searchQuery);
  const { viewMode, showNewTagDialog, handleCloseNewTagDialog } = useLibraryUI();
  const { handleBookDelete, handleBookUpdate } = useBooksOperations(refreshBooks);

  useTheme({ systemUIVisible: true, appThemeColor: "base-200" });
  useUICSS();

  useEffect(() => {
    if (isInitiating.current) return;
    isInitiating.current = true;

    const initLibrary = async () => {
      try {
        await refreshBooks();
        setLibraryLoaded(true);
      } catch (error) {
        console.error("Error initializing library:", error);
        setLibraryLoaded(true);
      }
    };

    initLibrary();
    return () => {
      isInitiating.current = false;
    };
  }, [refreshBooks]);

  const clearSelectedTags = useCallback(() => {
    setSelectedTagsForDelete([]);
  }, []);

  const { handleEditTagCancel, editingTag } = useTagsOperations({
    booksWithStatus,
    handleBookUpdate,
    refreshBooks,
    selectedTag: selectedTagFromUrl,
    handleTagSelect: (tagId: string) => {
      if (tagId === "all") {
        navigate("/");
      } else {
        navigate(`/?tag=${tagId}`);
      }
    },
    selectedTagsForDelete,
    tags,
    clearSelectedTags,
  });

  const visibleBooks = filteredBooks;
  const hasBooks = libraryLoaded && visibleBooks.length > 0;
  const hasLibraryBooks = libraryLoaded && booksWithStatus.length > 0;

  if (!insets || !libraryLoaded) {
    return null;
  }

  return (
    <div
      className={clsx(
        "flex h-dvh w-full bg-transparent transition-all duration-200",
        isDragOver && "bg-neutral-50 dark:bg-neutral-900/20",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-50/80 backdrop-blur-sm dark:bg-neutral-900/40">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-neutral-400 border-dashed bg-white/90 px-30 py-16 shadow-lg dark:border-neutral-500 dark:bg-neutral-800/90">
            <UploadIcon className="h-12 w-12 text-neutral-600 dark:text-neutral-400" />
            <div className="text-center">
              <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                {_("Drop files to upload")}
              </h3>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">{_("Release to upload your books")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-60px)] flex-1 flex-col p-3">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h3 className="font-bold text-3xl dark:border-neutral-700">
            {selectedTagFromUrl === "all"
              ? "我的图书"
              : tags.find((t) => t.id === selectedTagFromUrl)?.name || "我的图书"}
          </h3>
          <Button onClick={triggerFileSelect} disabled={isUploading} variant="soft" size="sm">
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border border-white/30 border-t-white" />
                {_("Uploading...")}
              </>
            ) : (
              <>
                <Plus size={16} />
                {_("Add Book")}
              </>
            )}
          </Button>
        </div>

        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <Spinner loading />
          </div>
        )}

        {hasBooks ? (
          <div className="flex-1 overflow-y-auto pb-8">
            <div className="mx-auto">
              {searchQuery.trim() && (
                <div className="mb-4 text-base-content/70 text-sm">
                  {_("Found {{count}} book(s) for '{{query}}'", { count: visibleBooks.length, query: searchQuery })}
                </div>
              )}

              {viewMode === "grid" ? (
                <div className="grid 3xl:grid-cols-8 grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                  {visibleBooks.map((book) => (
                    <BookItem
                      key={book.id}
                      book={book}
                      viewMode={viewMode}
                      availableTags={tags}
                      onDelete={handleBookDelete}
                      onUpdate={handleBookUpdate}
                      onRefresh={refreshBooks}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleBooks.map((book) => (
                    <BookItem
                      key={book.id}
                      book={book}
                      viewMode={viewMode}
                      availableTags={tags}
                      onDelete={handleBookDelete}
                      onUpdate={handleBookUpdate}
                      onRefresh={refreshBooks}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : hasLibraryBooks && searchQuery.trim() ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 px-2 text-center">
            <div className="text-base-content/50 text-lg">
              {_("No books found for '{{query}}'", { query: searchQuery })}
            </div>
            <div className="mt-2 text-base-content/40 text-sm">{_("Try searching with different keywords")}</div>
          </div>
        ) : (
          <div className="flex-1 px-2">
            <Upload />
          </div>
        )}
      </div>

      <CreateTagDialog
        isOpen={showNewTagDialog}
        onClose={handleCloseNewTagDialog}
        books={booksWithStatus}
        selectedTag={selectedTagFromUrl}
        filteredBooksByTag={filteredBooksByTag}
        onBookUpdate={handleBookUpdate}
        onRefreshBooks={refreshBooks}
      />

      <EditTagDialog
        isOpen={!!editingTag}
        onClose={handleEditTagCancel}
        tag={editingTag}
        books={booksWithStatus}
        onBookUpdate={handleBookUpdate}
        onRefreshBooks={refreshBooks}
      />

      <SettingsDialog open={isSettingsDialogOpen} onOpenChange={toggleSettingsDialog} />
    </div>
  );
}
