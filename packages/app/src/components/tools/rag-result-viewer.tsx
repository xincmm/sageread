import { Markdown } from "@/components/prompt-kit/markdown";
import { memo } from "react";

interface RagResultItem {
  related_chapter_titles: string;
  content: string;
}

interface RagResultViewerProps {
  results: RagResultItem[];
}

const RagResultViewerComponent = ({ results }: RagResultViewerProps) => {
  if (!results || results.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-neutral-500 text-sm dark:text-neutral-400">暂无结果</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex-1 divide-y divide-neutral-200 overflow-auto dark:divide-neutral-700">
        {results.map((item, index) => (
          <div key={index} className="space-y-2 px-3 pt-1 pb-3">
            <div className="flex items-center">
              <span className="mt-2 line-clamp-1 flex-1 overflow-hidden font-medium text-neutral-800 dark:text-neutral-100">
                {item.related_chapter_titles}
              </span>
            </div>
            <div className="text-neutral-700 dark:text-neutral-200">
              <Markdown>{item.content}</Markdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RagResultViewer = memo(RagResultViewerComponent);
