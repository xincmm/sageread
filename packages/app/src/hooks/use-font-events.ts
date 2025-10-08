import { useNotificationStore } from "@/store/notification-store";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { toast } from "sonner";

export function useFontEvents() {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    const unlistenStart = listen<{ filename: string }>("font-conversion-start", (event) => {
      const message = `开始转换字体: ${event.payload.filename}`;
      console.log("[FontEvents]", message);
      toast.info(message);
    });

    const unlistenComplete = listen<{ filename: string; success: boolean; duration_secs: number; error?: string }>(
      "font-conversion-complete",
      (event) => {
        const { filename, success, duration_secs, error } = event.payload;

        if (success) {
          const message = `字体转换完成: ${filename} (耗时: ${duration_secs.toFixed(1)}秒)`;
          addNotification(message);
          toast.success(message);
        } else {
          const errorMessage = `字体转换失败: ${error || "未知错误"}`;
          addNotification(errorMessage);
          toast.error(errorMessage);
        }
      },
    );

    return () => {
      unlistenStart.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, [addNotification]);
}
