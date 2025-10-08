import { uploadFontByPath, uploadFontData } from "@/services/font-service";
import { open } from "@tauri-apps/plugin-dialog";
import type React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useFontUpload(onSuccess?: () => void) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const importFontsByPath = useCallback(
    async (filePaths: string[]) => {
      const failedFiles = [];
      const successFonts = [];

      for (const filePath of filePaths) {
        try {
          const fontInfo = await uploadFontByPath(filePath);
          successFonts.push(fontInfo);
        } catch (error) {
          console.error("Font upload error:", error);
          const fileName = filePath.split(/[\\/]/).pop() || filePath;
          failedFiles.push(fileName);
        }
      }

      if (failedFiles.length > 0) {
        toast.error(`上传失败: ${failedFiles.join(", ")}`);
      }

      if (successFonts.length > 0) {
        onSuccess?.();
      }
    },
    [onSuccess],
  );

  const importFonts = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      const failedFiles = [];
      const successFonts = [];

      for (const file of files) {
        try {
          const fontInfo = await uploadFontData(file);
          successFonts.push(fontInfo);
        } catch (error) {
          console.error("Font upload error:", error);
          failedFiles.push(file.name);
        }
      }

      setIsUploading(false);

      if (failedFiles.length > 0) {
        toast.error(`上传失败: ${failedFiles.join(", ")}`);
      }

      if (successFonts.length > 0) {
        onSuccess?.();
      }
    },
    [onSuccess],
  );

  const handleDroppedFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const supportedFiles = files.filter((file) => {
        return file.name.endsWith(".woff2") || file.name.endsWith(".ttf");
      });

      if (supportedFiles.length === 0) {
        toast.error("只支持 .woff2 或 .ttf 格式的字体文件");
        return;
      }

      await importFonts(supportedFiles);
    },
    [importFonts],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      handleDroppedFiles(files);
    },
    [handleDroppedFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      handleDroppedFiles(files);
    },
    [handleDroppedFiles],
  );

  const triggerFileSelect = useCallback(async () => {
    try {
      const filePaths = await open({
        multiple: true,
        filters: [
          {
            name: "Font Files",
            extensions: ["woff2", "ttf"],
          },
        ],
      });

      if (!filePaths) return;

      setIsUploading(true);
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      await importFontsByPath(paths);
      setIsUploading(false);
    } catch (error) {
      console.error("Failed to select files:", error);
      toast.error("选择文件失败");
      setIsUploading(false);
    }
  }, [importFontsByPath]);

  return {
    isDragOver,
    isUploading,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    handleDroppedFiles,
    triggerFileSelect,
  };
}
