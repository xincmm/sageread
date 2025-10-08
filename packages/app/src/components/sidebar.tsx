import CreateTagDialog from "@/pages/library/components/create-tag-dialog";
import EditTagDialog from "@/pages/library/components/edit-tag-dialog";
import SearchToggle from "@/pages/library/components/search-toggle";
import TagList from "@/pages/library/components/tag-list";
import { useBooksOperations } from "@/pages/library/hooks/use-books-operations";
import { useLibraryUI } from "@/pages/library/hooks/use-library-ui";
import { useTagsManagement } from "@/pages/library/hooks/use-tags-management";
import { useTagsOperations } from "@/pages/library/hooks/use-tags-operations";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useLibraryStore } from "@/store/library-store";
import clsx from "clsx";
import { BarChart3, Brain, ChevronDown, ChevronRight, Library, Lightbulb, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface ActionButtonItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchQuery, booksWithStatus, refreshBooks, setSearchQuery } = useLibraryStore();
  const { toggleSettingsDialog } = useAppSettingsStore();
  const selectedTagFromUrl = searchParams.get("tag") || "all";
  const { tags, filteredBooksByTag } = useTagsManagement(booksWithStatus, selectedTagFromUrl);
  const { isLibraryExpanded, toggleLibraryExpanded, handleNewTagClick, showNewTagDialog, handleCloseNewTagDialog } =
    useLibraryUI();
  const { handleBookUpdate } = useBooksOperations(refreshBooks);

  const [selectedTagsForDelete, setSelectedTagsForDelete] = useState<string[]>([]);
  const sidebarRef = useRef<HTMLElement>(null);

  const clearSelectedTags = useCallback(() => {
    setSelectedTagsForDelete([]);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectedTagsForDelete.length > 0 &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSelectedTagsForDelete([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedTagsForDelete]);

  const { handleTagContextMenu, handleEditTagCancel, editingTag } = useTagsOperations({
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query && location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleTagClick = (tagId: string, event: React.MouseEvent) => {
    if (event.shiftKey) {
      setSelectedTagsForDelete((prev) => {
        if (prev.includes(tagId)) {
          return prev.filter((id) => id !== tagId);
        }
        return [...prev, tagId];
      });
    } else {
      setSelectedTagsForDelete([]);
      if (tagId === "all") {
        navigate("/");
      } else {
        navigate(`/?tag=${tagId}`);
      }
    }
  };

  const navigationItems: NavigationItem[] = [
    {
      path: "/",
      label: "图书馆",
      icon: Library,
    },
    {
      path: "/chat",
      label: "聊天",
      icon: Brain,
    },
    {
      path: "/skills",
      label: "技能库",
      icon: Lightbulb,
    },
    {
      path: "/statistics",
      label: "阅读统计",
      icon: BarChart3,
    },
  ];

  const actionButtons: ActionButtonItem[] = [
    {
      label: "设置",
      icon: Settings,
      onClick: toggleSettingsDialog,
    },
  ];

  return (
    <>
      <aside ref={sidebarRef} className="z-40 flex h-full w-48 select-none flex-col overflow-hidden border-neutral-200">
        <div className="p-1 pt-2 pl-2">
          <SearchToggle searchQuery={searchQuery} onSearchChange={handleSearchChange} />
        </div>

        <nav
          className="flex flex-1 flex-col space-y-1 overflow-y-auto px-1 py-4 pt-2 pl-2"
          onClick={(e) => {
            if (e.target === e.currentTarget && selectedTagsForDelete.length > 0) {
              setSelectedTagsForDelete([]);
            }
          }}
        >
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <div key={item.path}>
                {item.path === "/" ? (
                  <div className="flex w-full items-center">
                    <Link
                      to={item.path}
                      className={clsx(
                        "flex flex-1 items-center gap-2 rounded-md p-1 py-1 text-left text-sm transition-colors hover:bg-border",
                        isActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300",
                      )}
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <Icon size={16} className="flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      <button
                        onClick={toggleLibraryExpanded}
                        className="flex size-5 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      >
                        {isLibraryExpanded ? (
                          <ChevronDown size={16} className="flex-shrink-0" />
                        ) : (
                          <ChevronRight size={16} className="flex-shrink-0" />
                        )}
                      </button>
                    </Link>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-md p-1 py-1 text-left text-sm transition-colors hover:bg-border",
                      isActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300",
                    )}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                )}

                {item.path === "/" && isLibraryExpanded && (
                  <TagList
                    tags={tags}
                    selectedTag={selectedTagFromUrl}
                    selectedTagsForDelete={selectedTagsForDelete}
                    handleTagClick={handleTagClick}
                    handleTagContextMenu={handleTagContextMenu}
                    handleNewTagClick={handleNewTagClick}
                    books={booksWithStatus}
                    onBookUpdate={handleBookUpdate}
                    onRefresh={refreshBooks}
                  />
                )}
              </div>
            );
          })}
        </nav>
        <div className="space-y-1 px-2 py-3">
          {actionButtons.map((button, index) => {
            const Icon = button.icon;

            return (
              <button
                key={index}
                onClick={button.onClick}
                className="flex w-full items-center gap-2 rounded-md p-1 py-1 text-left text-neutral-600 text-sm hover:bg-border dark:text-neutral-300"
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="text-sm">{button.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

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
    </>
  );
}
