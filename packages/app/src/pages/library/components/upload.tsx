import { Upload as UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBookUpload } from "@/hooks/use-book-upload";
import { useTranslation } from "@/hooks/use-translation";
import { FILE_ACCEPT_FORMATS } from "@/services/constants";
import { useThemeStore } from "@/store/theme-store";

export default function Upload() {
  const { isDarkMode } = useThemeStore();
  const _ = useTranslation();
  const { isDragOver, isUploading, handleDragOver, handleDragLeave, handleDrop, handleFileSelect, triggerFileSelect } =
    useBookUpload();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-8">
      <p className="mb-4 font-bold text-2xl">书库空空如也，您可以导入您的书籍并随时阅读。</p>
      <div
        className={`relative flex w-full max-w-150 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ${
          isDragOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-neutral-300 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:border-neutral-600 dark:bg-gradient-to-br dark:from-neutral-800/30 dark:to-neutral-800/70"
        }
          ${isUploading ? "pointer-events-none opacity-50" : "hover:border-neutral-400 dark:hover:border-neutral-500"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={FILE_ACCEPT_FORMATS}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        <div className="pointer-events-none flex w-full items-center justify-center gap-2 p-4">
          <div className="flex flex-1 flex-col items-center justify-center gap-14 rounded-2xl bg-white p-8 shadow-1 dark:bg-neutral-800">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-700">
              {isUploading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-400 border-t-blue-500" />
              ) : (
                <UploadIcon className="h-8 w-8 text-neutral-500 dark:text-neutral-400" />
              )}
            </div>

            <div className="space-y-2 text-center">
              <h2 className="font-medium text-neutral-900 text-xl dark:text-neutral-100">
                {isUploading ? _("Uploading...") : _("Drag and drop books to upload")}
              </h2>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">
                {_("Supported formats: {{formats}}", { formats: FILE_ACCEPT_FORMATS })}
              </p>
            </div>

            <div className="relative">
              <Button
                variant="outline"
                size="lg"
                disabled={isUploading}
                onClick={triggerFileSelect}
                className="pointer-events-auto rounded-full border-neutral-300 bg-white px-8 py-3 text-base hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                {_("Import books")}
              </Button>
            </div>
          </div>

          <div className="hidden h-60 w-36 flex-shrink-0 items-center justify-center sm:flex">
            <img
              src="/reading-expert.png"
              alt="Reading Expert"
              className={`h-full w-full object-contain transition-all duration-200 ${
                isDarkMode ? "opacity-80 brightness-110 contrast-90 hue-rotate-180 invert" : "opacity-90"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
