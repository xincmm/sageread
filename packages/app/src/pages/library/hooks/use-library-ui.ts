import { useCallback, useState } from "react";

export type ViewMode = "grid" | "list";

export const useLibraryUI = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);

  const toggleLibraryExpanded = useCallback(() => {
    setIsLibraryExpanded((prev) => !prev);
  }, []);

  const handleNewTagClick = useCallback(() => {
    setShowNewTagDialog(true);
  }, []);

  const handleCloseNewTagDialog = useCallback(() => {
    setShowNewTagDialog(false);
  }, []);

  return {
    viewMode,
    setViewMode,
    isLibraryExpanded,
    showNewTagDialog,
    toggleLibraryExpanded,
    handleNewTagClick,
    handleCloseNewTagDialog,
  };
};
