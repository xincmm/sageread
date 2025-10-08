import { getBookStatus, updateBookStatus } from "@/services/book-service";
import { throttle } from "@/utils/throttle";
import { useCallback, useEffect } from "react";
import { useReaderStore } from "../components/reader-provider";

export const useProgressAutoSave = (bookId: string) => {
  const progress = useReaderStore((state) => state.progress);
  const location = useReaderStore((state) => state.location);

  const updateBookProgressWithStatus = useCallback(async () => {
    const currentProgress = progress;
    if (!currentProgress || !currentProgress.pageinfo || !location) {
      return;
    }

    try {
      const progressCurrent = currentProgress.pageinfo.current;
      const progressTotal = currentProgress.pageinfo.total;
      const now = Date.now();
      const currentStatus = await getBookStatus(bookId);

      let newStatus: "unread" | "reading" | "completed" = "reading";
      if (progressCurrent >= progressTotal) {
        newStatus = "completed";
      } else if (progressCurrent > 0) {
        newStatus = "reading";
      }

      const updateData: Parameters<typeof updateBookStatus>[1] = {
        status: newStatus,
        progressCurrent,
        progressTotal,
        location,
        lastReadAt: now,
      };

      if (!currentStatus?.startedAt && progressCurrent > 0) {
        updateData.startedAt = now;
      }

      if (newStatus === "completed" && !currentStatus?.completedAt) {
        updateData.completedAt = now;
      }

      await updateBookStatus(bookId, updateData);
    } catch (error) {
      console.error("Failed to update book progress:", error);
    }
  }, [bookId, progress, location]);

  const performSave = useCallback(async () => {
    await updateBookProgressWithStatus();
  }, [updateBookProgressWithStatus]);

  const immediateSaveConfig = performSave;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const saveProgress = useCallback(throttle(performSave, 5000), [performSave]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    saveProgress();
    return () => {
      immediateSaveConfig().catch((error) => {
        console.error(`Failed to save progress on cleanup for book ${bookId}:`, error);
      });
    };
  }, [progress, bookId, saveProgress, immediateSaveConfig]);
};
