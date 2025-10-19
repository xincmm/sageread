import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURATED_FONTS, DEFAULT_BOOK_FONT } from "@/services/constants";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useFontStore } from "@/store/font-store";
import { useThemeStore } from "@/store/theme-store";
import { getMaxInlineSize } from "@/utils/config";
import { isCJKEnv } from "@/utils/misc";
import { getStyles } from "@/utils/style";
import { Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { MdCheck, MdOutlineDarkMode, MdOutlineLightMode } from "react-icons/md";
import { TbSunMoon } from "react-icons/tb";
import { FontSizeSlider } from "./font-size-slider";
import { useReaderStore, useReaderStoreApi } from "./reader-provider";

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 32;
const FONT_SIZE_STEP = 2;

const SettingsDropdown = () => {
  const store = useReaderStoreApi();
  const { themeMode, setThemeMode } = useThemeStore();
  const { settings, setSettings } = useAppSettingsStore();
  const openDropdown = useReaderStore((state) => state.openDropdown);
  const setOpenDropdown = useReaderStore((state) => state.setOpenDropdown)!;
  const { fonts: customFontList, systemFonts, loadFonts, loadSystemFonts } = useFontStore();

  const globalViewSettings = settings.globalViewSettings;
  const view = store.getState().view;
  const isSettingsDropdownOpen = openDropdown === "settings";

  const customFonts = useMemo(
    () =>
      customFontList.map((font) => {
        const fontFamily = font.fontFamily || font.name;
        return {
          id: `custom-${font.name}`,
          name: font.displayName || font.name,
          serif: fontFamily,
          sansSerif: fontFamily,
          cjk: fontFamily,
        };
      }),
    [customFontList],
  );

  const systemFontOptions = useMemo(
    () =>
      systemFonts.map((font) => ({
        id: `system-${font.family}`,
        name: font.family,
        serif: font.family,
        sansSerif: font.family,
        cjk: font.family,
      })),
    [systemFonts],
  );

  const allFonts = useMemo(() => [...CURATED_FONTS, ...systemFontOptions, ...customFonts], [customFonts, systemFontOptions]);

  useEffect(() => {
    loadFonts();
    loadSystemFonts();
  }, [loadFonts, loadSystemFonts]);

  useEffect(() => {
    const currentFontExists = allFonts.some(
      (font) =>
        font.serif === globalViewSettings.serifFont &&
        font.sansSerif === globalViewSettings.sansSerifFont &&
        font.cjk === globalViewSettings.defaultCJKFont,
    );

    if (!currentFontExists && customFonts.length > 0) {
      const { settings: currentSettings } = useAppSettingsStore.getState();
      setSettings({
        ...currentSettings,
        globalViewSettings: {
          ...currentSettings.globalViewSettings,
          serifFont: DEFAULT_BOOK_FONT.serifFont,
          sansSerifFont: DEFAULT_BOOK_FONT.sansSerifFont,
          defaultCJKFont: DEFAULT_BOOK_FONT.defaultCJKFont,
        },
      });
    }
  }, [allFonts, customFonts.length, globalViewSettings, setSettings]);

  const currentFontId =
    allFonts.find(
      (font) =>
        font.serif === globalViewSettings.serifFont &&
        font.sansSerif === globalViewSettings.sansSerifFont &&
        font.cjk === globalViewSettings.defaultCJKFont,
    )?.id || "comfortable";

  const handleToggleSettingsDropdown = (isOpen: boolean) => {
    setOpenDropdown(isOpen ? "settings" : null);
  };

  const updateGlobalViewSettings = useCallback(
    (updater: (settings: typeof globalViewSettings) => typeof globalViewSettings) => {
      const { settings: currentSettings } = useAppSettingsStore.getState();
      const currentGlobalSettings = currentSettings.globalViewSettings;
      const updatedSettings = updater(currentGlobalSettings);
      setSettings({
        ...currentSettings,
        globalViewSettings: updatedSettings,
      });
      const currentView = store.getState().view;
      currentView?.renderer.setStyles?.(getStyles(updatedSettings));
      return updatedSettings;
    },
    [store, setSettings],
  );

  const applyScrolledMode = useCallback(
    (newScrolled: boolean) => {
      const updated = updateGlobalViewSettings((settings) => ({ ...settings, scrolled: newScrolled }));
      if (!view?.renderer) return;

      const applyNow = () => {
        if (view?.renderer) {
          const contents = view.renderer.getContents?.();
          const ready = Array.isArray(contents) && contents.length > 0 && contents[0]?.doc;
          if (!ready) {
            setTimeout(applyNow, 80);
            return;
          }
          view.renderer.setAttribute("flow", newScrolled ? "scrolled" : "paginated");
          view.renderer.setAttribute("max-inline-size", `${getMaxInlineSize(updated)}px`);
          view.renderer.setStyles?.(getStyles(updated));
        }
      };
      applyNow();
    },
    [updateGlobalViewSettings, view],
  );

  const handleFontSizeChange = useCallback(
    (newSize: number) => {
      const clampedSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, newSize));
      updateGlobalViewSettings((settings) => ({ ...settings, defaultFontSize: clampedSize }));
    },
    [updateGlobalViewSettings],
  );

  const handleFontChange = useCallback(
    (fontId: string) => {
      const selectedFont = allFonts.find((f) => f.id === fontId);
      if (!selectedFont) return;
      updateGlobalViewSettings((settings) => ({
        ...settings,
        serifFont: selectedFont.serif,
        sansSerifFont: selectedFont.sansSerif,
        defaultCJKFont: selectedFont.cjk,
      }));
    },
    [updateGlobalViewSettings, allFonts],
  );

  const handleIncrease = () => {
    handleFontSizeChange(globalViewSettings.defaultFontSize + FONT_SIZE_STEP);
  };

  const handleDecrease = () => {
    handleFontSizeChange(globalViewSettings.defaultFontSize - FONT_SIZE_STEP);
  };

  const isCJK = isCJKEnv();

  // 暂时注释掉分栏相关的函数和变量
  /*
  const handleSetColumnMode = useCallback(
    (mode: "auto" | "one" | "two") => {
      updateGlobalViewSettings((settings) => ({ ...settings, columnMode: mode }));
    },
    [updateGlobalViewSettings],
  );

  const currentColumnMode = globalViewSettings.columnMode;
  */

  return (
    <DropdownMenu open={isSettingsDropdownOpen} onOpenChange={handleToggleSettingsDropdown}>
      <DropdownMenuTrigger asChild>
        <button
          className="btn btn-ghost flex h-8 min-h-8 w-8 items-center justify-center rounded-full p-0 outline-none focus:outline-none focus-visible:ring-0"
          title="字体大小设置"
        >
          <Settings2 size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-3" align="end" side="bottom" sideOffset={4}>
        <div className="space-y-4">
          <div>
            <div className="mb-3 font-medium text-sm">字体系列</div>
            {(() => {
              const selected = allFonts.find((f) => f.id === currentFontId);
              const triggerFontFamily = selected ? (isCJK ? selected.cjk : selected.serif) : undefined;
              const triggerFontWeight = selected?.id === "classic" ? "normal" : (undefined as any);
              return (
                <Select value={currentFontId} onValueChange={handleFontChange}>
                  <SelectTrigger
                    className="h-8 w-full focus:outline-none focus:ring-0"
                    style={{ fontFamily: triggerFontFamily, fontWeight: triggerFontWeight }}
                  >
                    <SelectValue placeholder="选择字体" />
                  </SelectTrigger>
                  <SelectContent className="w-full dark:border-neutral-700 dark:bg-neutral-800">
                    {allFonts.map((font) => (
                      <SelectItem key={font.id} value={font.id}>
                        <span
                          className="truncate"
                          style={{
                            fontFamily: isCJK ? font.cjk : font.serif,
                            fontWeight: font.id === "classic" ? "normal" : (undefined as any),
                          }}
                        >
                          {font.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>

          <div>
            <div className="mb-3 font-medium text-sm">字体大小</div>
            <div className="flex items-center justify-center gap-4">
              <button
                className="btn btn-sm size-8 cursor-pointer rounded-md border bg-muted hover:bg-muted/70 disabled:bg-muted disabled:opacity-50"
                onClick={handleDecrease}
                disabled={globalViewSettings.defaultFontSize <= FONT_SIZE_MIN}
                title="减小字体大小"
              >
                <span className="flex items-center justify-center text-xs">A</span>
              </button>

              <FontSizeSlider
                value={[globalViewSettings.defaultFontSize]}
                onValueChange={(value: number[]) => handleFontSizeChange(value[0]!)}
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={FONT_SIZE_STEP}
                showTooltip={true}
                tooltipContent={(value) => `${value}px`}
              />
              <button
                className="btn btn-sm size-8 cursor-pointer rounded-md border bg-muted hover:bg-muted/70 disabled:bg-muted disabled:opacity-50"
                onClick={handleIncrease}
                disabled={globalViewSettings.defaultFontSize >= FONT_SIZE_MAX}
                title="增大字体大小"
              >
                <span className="flex items-center justify-center text-lg">A</span>
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 font-medium text-sm">阅读模式</div>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <button
                  className={`btn btn-sm flex h-8 flex-1 items-center justify-between rounded-md px-3 ${
                    globalViewSettings.scrolled
                      ? "border-none bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border bg-muted text-primary hover:bg-muted/70"
                  }`}
                  onClick={() => applyScrolledMode(true)}
                  title="滚动模式"
                >
                  <span className="text-sm">滚动</span>
                  {globalViewSettings.scrolled && <MdCheck size={16} />}
                </button>
                <button
                  className={`btn btn-sm flex h-8 flex-1 items-center justify-between rounded-md px-3 ${
                    !globalViewSettings.scrolled
                      ? "border-none bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border bg-muted text-primary hover:bg-muted/70"
                  }`}
                  onClick={() => applyScrolledMode(false)}
                  title="分页模式"
                >
                  <span className="text-sm">分页</span>
                  {!globalViewSettings.scrolled && <MdCheck size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 font-medium text-sm">主题模式</div>
            <div className="flex items-center gap-4">
              <button
                className={`btn btn-sm flex size-8 items-center justify-center rounded-md ${
                  themeMode === "auto"
                    ? "border-none bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border bg-muted text-primary hover:bg-muted/70"
                }`}
                onClick={() => setThemeMode("auto")}
                title="自动模式"
              >
                <TbSunMoon size={16} />
              </button>
              <button
                className={`btn btn-sm flex size-8 items-center justify-center rounded-md border ${
                  themeMode === "light"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-primary hover:bg-muted/70"
                }`}
                onClick={() => setThemeMode("light")}
                title="浅色模式"
              >
                <MdOutlineLightMode size={16} />
              </button>
              <button
                className={`btn btn-sm flex size-8 items-center justify-center rounded-md border ${
                  themeMode === "dark"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-primary hover:bg-muted/70"
                }`}
                onClick={() => setThemeMode("dark")}
                title="深色模式"
              >
                <MdOutlineDarkMode size={16} />
              </button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsDropdown;
