import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore } from "@/store/theme-store";
import type { ThemeMode } from "@/styles/themes";
import { appDataDir } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import clsx from "clsx";
import { Check, ChevronDownIcon, Copy, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";

export default function GeneralSettings() {
  const [dataPath, setDataPath] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const { themeMode, autoScroll, swapSidebars, setThemeMode, setAutoScroll, setSwapSidebars } = useThemeStore();

  const themeModeOptions = [
    { value: "auto" as ThemeMode, label: "系统" },
    { value: "light" as ThemeMode, label: "亮色" },
    { value: "dark" as ThemeMode, label: "暗色" },
  ];

  useEffect(() => {
    appDataDir().then(async (path) => {
      setDataPath(path);
      try {
        const appDataDirPath = await appDataDir();
        const directoryExists = await exists(appDataDirPath);

        if (!directoryExists) {
          await mkdir(appDataDirPath, { recursive: true });
        }
      } catch (error) {
        console.error("An error occurred:", error);
      }
    });
  }, []);

  const handleShowInFinder = async () => {
    try {
      await openPath(dataPath);
    } catch (error) {
      console.error("Failed to open in Finder:", error);
    }
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(dataPath);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const getCurrentThemeModeLabel = () => {
    return themeModeOptions.find((option) => option.value === themeMode)?.label || "系统";
  };

  return (
    <div className="space-y-8 p-4 pt-3">
      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">外观</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text dark:text-neutral-200">明暗模式</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">选择明暗模式偏好</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="w-32 justify-between">
                  {getCurrentThemeModeLabel()}
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {themeModeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleThemeModeChange(option.value)}
                    className={clsx("my-0.5", themeMode === option.value ? "bg-accent" : "")}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text dark:text-neutral-200">自动滚动</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">聊天时自动滚动到最新消息</p>
            </div>
            <Checkbox
              checked={autoScroll}
              onCheckedChange={(checked) => setAutoScroll(checked === true)}
              className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text dark:text-neutral-200">对调侧边栏</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">将聊天和笔记侧边栏位置对调</p>
            </div>
            <Checkbox
              checked={swapSidebars}
              onCheckedChange={(checked) => setSwapSidebars(checked === true)}
              className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4">
        <h2 className="text mb-4 dark:text-neutral-200">数据文件夹</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-sm dark:text-neutral-200">应用数据</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-background px-2 py-1 text-sm dark:bg-neutral-700 dark:text-neutral-300">
                  {dataPath}
                </span>
                <Button size="sm" variant="soft" onClick={handleCopyPath} className="size-6 p-0">
                  {isCopied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                </Button>
                <Button size="sm" variant="soft" onClick={handleShowInFinder} className="size-6 p-0">
                  <FolderOpen className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
