import type { BookSearchMatch, BookSearchResult, SearchExcerpt } from "@/types/book";
import type React from "react";
import useScrollToItem from "../hooks/use-scroll-to-item";
import { useReaderStoreApi } from "./reader-provider";

interface SearchResultItemProps {
  cfi: string;
  excerpt: SearchExcerpt;
  onSelectResult: (cfi: string) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ cfi, excerpt, onSelectResult }) => {
  const store = useReaderStoreApi();
  const progress = store.getState().progress;
  const { viewRef } = useScrollToItem(cfi, progress);

  return (
    <li
      ref={viewRef}
      className="my-2 cursor-pointer rounded-lg p-1 text-sm hover:bg-muted"
      onClick={() => onSelectResult(cfi)}
    >
      <div className="line-clamp-3">
        <span className="">{excerpt.pre}</span>
        <span className="font-bold text-red-500">{excerpt.match}</span>
        <span className="">{excerpt.post}</span>
      </div>
    </li>
  );
};
interface SearchResultsProps {
  results: BookSearchResult[] | BookSearchMatch[];
  onSelectResult: (cfi: string) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, onSelectResult }) => {
  return (
    <div className="search-results overflow-y-auto p-2 font-light font-sans text-sm">
      <ul>
        {results.map((result, index) => {
          if ("subitems" in result) {
            return (
              <ul key={`${index}-${result.label}`}>
                <h3 className="line-clamp-1 font-normal">{result.label}</h3>
                <ul>
                  {result.subitems.map((item, index) => (
                    <SearchResultItem
                      key={`${index}-${item.cfi}`}
                      cfi={item.cfi}
                      excerpt={item.excerpt}
                      onSelectResult={onSelectResult}
                    />
                  ))}
                </ul>
              </ul>
            );
          }
          return (
            <SearchResultItem
              key={`${index}-${result.cfi}`}
              cfi={result.cfi}
              excerpt={result.excerpt}
              onSelectResult={onSelectResult}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default SearchResults;
