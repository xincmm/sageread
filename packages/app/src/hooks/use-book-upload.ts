import type React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/hooks/use-translation";
import { uploadBook } from "@/services/book-service";
import { FILE_ACCEPT_FORMATS } from "@/services/constants";
import { useLibraryStore } from "@/store/library-store";
import { getFilename, listFormater } from "@/utils/book";
import { eventDispatcher } from "@/utils/event";

export function useBookUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { refreshBooks } = useLibraryStore();
  const _ = useTranslation();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleDropedFiles(files);
  }, []);

  const handleDropedFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const supportedFiles = files.filter((file) => {
        const fileExt = file.name.split(".").pop()?.toLowerCase();
        return FILE_ACCEPT_FORMATS.includes(`.${fileExt}`);
      });

      if (supportedFiles.length === 0) {
        eventDispatcher.dispatch("toast", {
          message: _("No supported files found. Supported formats: {{formats}}", {
            formats: FILE_ACCEPT_FORMATS,
          }),
          type: "error",
        });
        return;
      }

      await importBooks(supportedFiles);
    },
    [_],
  );

  const importBooks = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      const failedFiles = [];
      const successBooks = [];

      for (const file of files) {
        try {
          const newBook = await uploadBook(file);
          successBooks.push(newBook);
        } catch (error) {
          const baseFilename = getFilename(file.name);
          failedFiles.push(baseFilename);
        }
      }

      setIsUploading(false);

      // Show error message for failed imports
      if (failedFiles.length > 0) {
        eventDispatcher.dispatch("toast", {
          message: _("Failed to import book(s): {{filenames}}", {
            filenames: listFormater(false).format(failedFiles),
          }),
          type: "error",
        });
      }

      // Show success message for successfully imported books
      if (successBooks.length > 0) {
        toast.success(_("Successfully imported {{count}} book(s)", { count: successBooks.length }));
        await refreshBooks();
      }
    },
    [_, refreshBooks],
  );

  const selectFiles = useCallback((): Promise<FileList | null> => {
    return new Promise((resolve) => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = FILE_ACCEPT_FORMATS;
      fileInput.multiple = true;
      fileInput.click();

      fileInput.onchange = () => {
        resolve(fileInput.files);
      };
    });
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      handleDropedFiles(files);
    },
    [handleDropedFiles],
  );

  const triggerFileSelect = useCallback(async () => {
    const files = await selectFiles();
    if (files) {
      handleDropedFiles(Array.from(files));
    }
  }, [selectFiles, handleDropedFiles]);

  return {
    isDragOver,
    isUploading,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    handleDropedFiles,
    triggerFileSelect,
  };
}
