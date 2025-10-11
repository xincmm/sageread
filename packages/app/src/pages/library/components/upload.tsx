import { Button } from "@/components/ui/button";
import { useBookUpload } from "@/hooks/use-book-upload";
import { useThemeStore } from "@/store/theme-store";
import { FILE_ACCEPT_FORMATS } from "@/services/constants";
import { Upload as UploadIcon } from "lucide-react";

export default function Upload() {
  const { isDarkMode } = useThemeStore();
  const { isDragOver, isUploading, handleDragOver, handleDragLeave, handleDrop, handleFileSelect, triggerFileSelect } =
    useBookUpload();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-8">
      <p className="mb-4 font-bold text-2xl">书库空空如也，您可以导入您的书籍并随时阅读</p>
      <div
        className={`relative flex w-full max-w-140 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ${
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
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl p-8 py-12 shadow-1 ">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-700">
              {isUploading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-400 border-t-blue-500" />
              ) : (
                <UploadIcon className="h-8 w-8 text-neutral-500 dark:text-neutral-400" />
              )}
            </div>

            <div className="space-y-2 text-center">
              <h2 className="font-medium text-neutral-900 text-xl dark:text-neutral-100">
                {isUploading ? "上传中..." : "拖拽书籍到此处上传"}
              </h2>
              <p className="text-neutral-600 text-sm dark:text-neutral-400">支持的格式：{FILE_ACCEPT_FORMATS}</p>
            </div>

            <div className="relative">
              <Button
                variant="outline"
                size="lg"
                disabled={isUploading}
                onClick={triggerFileSelect}
                className="pointer-events-auto rounded-full border-neutral-300 bg-white px-8 py-3 text-base hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                导入书籍
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
