import { Input } from "@/components/ui/input";
import type { BookSearchConfig, BookSearchResult } from "@/types/book";
import { isCJKStr } from "@/utils/lang";
import { createRejecttFilter } from "@/utils/node";
import { Search } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { useReaderStoreApi } from "./reader-provider";

const MINIMUM_SEARCH_TERM_LENGTH_DEFAULT = 2;
const MINIMUM_SEARCH_TERM_LENGTH_CJK = 1;

interface SearchBarProps {
  isVisible: boolean;
  searchTerm: string;
  onSearchResultChange: (results: BookSearchResult[]) => void;
  onSearchTermChange: (term: string) => void;
  onHideSearchBar: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  isVisible,
  searchTerm,
  onSearchResultChange,
  onSearchTermChange,
  onHideSearchBar,
}) => {
  const store = useReaderStoreApi();
  const view = store.getState().view;
  const config = store.getState().config;
  const bookData = store.getState().bookData;
  const progress = store.getState().progress;
  const queuedSearchTerm = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputFocusedRef = useRef(false);

  const primaryLang = bookData?.book?.primaryLanguage || "en";
  const searchConfig = config?.searchConfig! as BookSearchConfig;

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.onblur = () => {
        inputFocusedRef.current = false;
      };
      inputRef.current.onfocus = () => {
        inputFocusedRef.current = true;
      };
      inputRef.current.focus();
    }
  }, [isVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (inputRef.current && inputFocusedRef.current) {
          inputRef.current.blur();
        } else {
          onHideSearchBar();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onHideSearchBar]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    queuedSearchTerm.current = value;
    onSearchTermChange(value);
    // Only clear search if input is empty
    if (!value.trim()) {
      resetSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (exceedMinSearchTermLength(searchTerm)) {
        handleSearch(searchTerm);
      }
    }
  };

  const exceedMinSearchTermLength = (searchTerm: string) => {
    const minLength = isCJKStr(searchTerm) ? MINIMUM_SEARCH_TERM_LENGTH_CJK : MINIMUM_SEARCH_TERM_LENGTH_DEFAULT;

    return searchTerm.length >= minLength;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const handleSearch = useCallback(
    async (term: string) => {
      const { pageinfo } = progress!;
      const index = searchConfig.scope === "section" ? pageinfo.current : undefined;
      const generator = await view?.search({
        ...searchConfig,
        index,
        query: term,
        acceptNode: createRejecttFilter({
          tags: primaryLang.startsWith("ja") ? ["rt"] : [],
        }),
      });
      const results: BookSearchResult[] = [];
      let lastProgressLogTime = 0;

      const processResults = async () => {
        for await (const result of generator!) {
          if (typeof result === "string") {
            if (result === "done") {
              onSearchResultChange([...results]);
            }
          } else {
            if (result.progress) {
              const now = Date.now();
              if (now - lastProgressLogTime >= 1000) {
                lastProgressLogTime = now;
              }
              if (queuedSearchTerm.current !== term) {
                resetSearch();
                return;
              }
            } else {
              results.push(result);
              onSearchResultChange([...results]);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      };

      processResults();
    },
    [progress, searchConfig],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const resetSearch = useCallback(() => {
    onSearchResultChange([]);
    view?.clearSearch();
  }, [view]);

  return (
    <div className="relative p-2">
      <div className="relative">
        <Search size={16} className="-translate-y-1/2 absolute top-1/2 left-3 z-10 text-gray-500" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          spellCheck={false}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="按回车键搜索..."
          className="h-8 w-full rounded-full pr-12 pl-10"
        />
      </div>
    </div>
  );
};

export default SearchBar;
