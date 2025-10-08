import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BookSearchResult } from "@/types/book";
import { Search } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { useReaderStore, useReaderStoreApi } from "./reader-provider";
import SearchBar from "./search-bar";
import SearchResults from "./search-results";

interface SearchDropdownProps {
  onNavigate?: () => void;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({ onNavigate }) => {
  const store = useReaderStoreApi();
  const view = store.getState().view;
  const bookData = store.getState().bookData;
  const openDropdown = useReaderStore((state) => state.openDropdown);
  const setOpenDropdown = useReaderStore((state) => state.setOpenDropdown);
  const [searchResults, setSearchResults] = useState<BookSearchResult[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const isSearchDropdownOpen = openDropdown === "search";

  if (!bookData) {
    return null;
  }

  const handleToggleSearchDropdown = (isOpen: boolean) => {
    setOpenDropdown?.(isOpen ? "search" : null);
    if (!isOpen) {
      setSearchResults(null);
      setSearchTerm("");
      setHasSearched(false);
    }
  };

  const handleSearchResultClick = useCallback(
    (cfi: string) => {
      setOpenDropdown?.(null);
      setSearchResults(null);
      setSearchTerm("");
      onNavigate?.();

      view?.goTo(cfi);

      if (view) {
        const clearSearchOnClick = () => {
          view.clearSearch();
          window.removeEventListener("message", handleIframeClick);
        };

        const handleIframeClick = (event: MessageEvent) => {
          if (event.data?.type === "iframe-single-click" && event.data?.bookId === bookData?.id) {
            clearSearchOnClick();
          }
        };

        window.addEventListener("message", handleIframeClick);
      }
    },
    [onNavigate, view, bookData?.id, setOpenDropdown],
  );

  const handleSearchResultChange = useCallback((results: BookSearchResult[]) => {
    setHasSearched(true);
    setSearchResults(results);
  }, []);

  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setHasSearched(false);
      setSearchResults(null);
    }
  }, []);

  const handleHideSearchBar = useCallback(() => {
    setOpenDropdown?.(null);
    setSearchResults(null);
    setSearchTerm("");
    setHasSearched(false);
  }, [setOpenDropdown]);

  return (
    <DropdownMenu open={isSearchDropdownOpen} onOpenChange={handleToggleSearchDropdown}>
      <DropdownMenuTrigger asChild>
        <button
          className="btn btn-ghost flex items-center justify-center rounded-full p-0 outline-none focus:outline-none focus-visible:ring-0"
          title="搜索"
        >
          <Search size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="end" side="bottom" sideOffset={4}>
        <div className="flex max-h-[calc(100vh-8rem)] flex-col">
          <div className="sticky top-0 z-10 flex-shrink-0">
            <SearchBar
              isVisible={isSearchDropdownOpen}
              searchTerm={searchTerm}
              onSearchResultChange={handleSearchResultChange}
              onSearchTermChange={handleSearchTermChange}
              onHideSearchBar={handleHideSearchBar}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {searchResults && searchResults.length > 0 ? (
              <div className="h-full overflow-y-auto">
                <SearchResults results={searchResults} onSelectResult={handleSearchResultClick} />
              </div>
            ) : hasSearched && searchResults && searchResults.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="p-12 text-center text-muted-foreground text-sm">未找到搜索结果</div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="p-12 text-center text-muted-foreground text-sm">输入搜索词以查找内容</div>
              </div>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SearchDropdown;
