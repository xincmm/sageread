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
import clsx from "clsx";
import { ChevronDownIcon } from "lucide-react";

export default function AppearanceSettings() {
  const {
    themeMode,
    themeColor,
    autoScroll,
    swapSidebars,

    setThemeMode,
    setThemeColor,
    setAutoScroll,
    setSwapSidebars,
  } = useThemeStore();

  const themeModeOptions = [
    { value: "auto" as ThemeMode, label: "System" },
    { value: "light" as ThemeMode, label: "Light" },
    { value: "dark" as ThemeMode, label: "Dark" },
  ];

  const themeColorOptions = [
    { value: "default", label: "Default" },
    { value: "perplexity", label: "Perplexity" },
    { value: "slack", label: "Slack" },
    { value: "corporate", label: "Corporate" },
    { value: "nature", label: "Nature" },
  ];

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const handleThemeColorChange = (color: string) => {
    setThemeColor(color);
  };

  const getCurrentThemeModeLabel = () => {
    return themeModeOptions.find((option) => option.value === themeMode)?.label || "System";
  };

  const getCurrentThemeColorLabel = () => {
    return themeColorOptions.find((option) => option.value === themeColor)?.label || "Default";
  };

  return (
    <div className="space-y-8 p-4 pt-3">
      <section className="rounded-lg bg-muted/80 p-4 ">
        <h2 className="text mb-4 dark:text-neutral-200">外观</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text dark:text-neutral-200">主题风格</span>
              <p className="mt-2 text-neutral-600 text-xs dark:text-neutral-400">选择您偏好的主题风格</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="w-32 justify-between">
                  {getCurrentThemeColorLabel()}
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {themeColorOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleThemeColorChange(option.value)}
                    className={clsx("my-0.5", themeColor === option.value ? "bg-accent" : "")}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
    </div>
  );
}
