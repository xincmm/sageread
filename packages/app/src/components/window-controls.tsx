import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getOSPlatform } from "@/utils/misc";

const win = getCurrentWindow();

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 只在 Windows 平台显示窗口控制按钮
    const platform = getOSPlatform();
    setIsVisible(platform === "windows");

    if (platform === "windows") {
      // 获取初始最大化状态
      win.isMaximized().then(setIsMaximized);

      // 监听窗口状态变化
      const unlisten = win.onResized(() => {
        win.isMaximized().then(setIsMaximized);
      });

      return () => {
        unlisten.then(fn => fn());
      };
    }
  }, []);

  const handleMinimize = () => {
    win.minimize();
  };

  const handleToggleMaximize = async () => {
    const maximized = await win.isMaximized();
    if (maximized) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
    setIsMaximized(!maximized);
  };

  const handleClose = () => {
    win.close();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex h-7 items-center">
      <button
        onClick={handleMinimize}
        className="flex h-7 w-8 items-center justify-center text-neutral-700 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
        title="最小化"
      >
        <Minus className="size-4" />
      </button>
      
      <button
        onClick={handleToggleMaximize}
        className="flex h-7 w-8 items-center justify-center text-neutral-700 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
        title={isMaximized ? "还原" : "最大化"}
      >
        {isMaximized ? (
          <Square className="size-3.5" />
        ) : (
          <Maximize2 className="size-3.5" />
        )}
      </button>
      
      <button
        onClick={handleClose}
        className="flex h-7 w-8 items-center justify-center text-neutral-700 hover:bg-red-500 hover:text-white dark:text-neutral-400 dark:hover:bg-red-500 dark:hover:text-white"
        title="关闭"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
