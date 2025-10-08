import { Plus } from "lucide-react";

import { useBookUpload } from "@/hooks/use-book-upload";
import { useTranslation } from "@/hooks/use-translation";

interface UploadItemProps {
  viewMode?: "grid" | "list";
}

export default function UploadItem({ viewMode = "grid" }: UploadItemProps) {
  const _ = useTranslation();
  const { isDragOver, isUploading, handleDragOver, handleDragLeave, handleDrop, triggerFileSelect } = useBookUpload();

  return (
    <div
      className={`relative cursor-pointer border-2 border-dashed transition-all duration-200 ${
        viewMode === "grid" ? "aspect-[3/4]" : "h-20"
      } ${
        isDragOver
          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
          : "border-neutral-300 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800/50"
      }
        ${isUploading ? "pointer-events-none opacity-50" : "hover:border-neutral-400 dark:hover:border-neutral-500"}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileSelect}
    >
      <div className="flex h-full items-center justify-center">
        <div
          className={`flex items-center justify-center gap-2 text-center ${
            viewMode === "grid" ? "flex-col" : "flex-row"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border border-neutral-400 border-t-blue-500" />
            ) : (
              <Plus className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            )}
          </div>
          <p className="text-neutral-600 text-xs dark:text-neutral-400">
            {isUploading ? _("Uploading...") : _("Add Book")}
          </p>
        </div>
      </div>
    </div>
  );
}
