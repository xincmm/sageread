import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFontUpload } from "@/hooks/use-font-upload";
import {
  type FontInfo,
  type SystemFontInfo,
  deleteFont,
  downloadFont,
  setFontMetadata,
} from "@/services/font-service";
import { DEFAULT_BOOK_FONT } from "@/services/constants";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useFontStore } from "@/store/font-store";
import { applyUiFont } from "@/utils/font";
import clsx from "clsx";
import { Loader2, SquarePen, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const SYSTEM_DEFAULT_VALUE = "__system__";

const formatPreviewStyle = (family: string) => ({
  fontFamily: family,
});

interface FontOption {
  id: string;
  label: string;
  family: string;
  source: "system" | "custom";
  info?: SystemFontInfo | FontInfo;
}

export default function FontManager() {
  const { settings, setSettings } = useAppSettingsStore();
  const { fonts, systemFonts, isLoading, isSystemLoading, loadFonts, refreshFonts, loadSystemFonts } = useFontStore();
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingFont, setEditingFont] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");

  useEffect(() => {
    loadFonts();
    loadSystemFonts();
  }, [loadFonts, loadSystemFonts]);

  const { isDragOver, isUploading, handleDragOver, handleDragLeave, handleDrop, triggerFileSelect } =
    useFontUpload(refreshFonts);

  const handleDownload = async () => {
    if (!downloadUrl.trim()) {
      toast.error("请输入字体文件 URL");
      return;
    }

    if (!downloadUrl.endsWith(".woff2") && !downloadUrl.endsWith(".ttf")) {
      toast.error("只支持 .woff2 或 .ttf 格式");
      return;
    }

    setIsDownloading(true);
    try {
      await downloadFont(downloadUrl);
      toast.success("字体下载成功");
      setDownloadUrl("");
      await refreshFonts();
    } catch (error) {
      toast.error(`下载失败: ${error}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteFont(filename);
      toast.success("字体已删除");
      await refreshFonts();
    } catch (error) {
      toast.error(`删除失败: ${error}`);
    }
  };

  const handleEditClick = (font: FontInfo) => {
    setEditingFont(font.filename);
    setEditDisplayName(font.displayName || font.name);
  };

  const handleSaveEdit = async (filename: string) => {
    try {
      const fontFamily = filename.replace(".woff2", "");
      await setFontMetadata(filename, fontFamily, editDisplayName);
      toast.success("字体信息已更新");
      setEditingFont(null);
      await refreshFonts();
    } catch (error) {
      toast.error(`保存失败: ${error}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingFont(null);
    setEditDisplayName("");
  };

  const systemFontOptions = useMemo<FontOption[]>(
    () =>
      systemFonts.map((font) => ({
        id: `system-${font.family}`,
        label: font.family,
        family: font.family,
        source: "system" as const,
        info: font,
      })),
    [systemFonts],
  );

  const customFontOptions = useMemo<FontOption[]>(
    () =>
      fonts.map((font) => {
        const family = font.fontFamily || font.name;
        return {
          id: `custom-${font.filename}`,
          label: font.displayName || font.name,
          family,
          source: "custom" as const,
          info: font,
        };
      }),
    [fonts],
  );

  const readerFontOptions = useMemo(
    () => [...systemFontOptions, ...customFontOptions],
    [systemFontOptions, customFontOptions],
  );

  const uiFontValue = settings.uiFontFamily?.trim() || SYSTEM_DEFAULT_VALUE;

  const currentReaderFont = settings.globalViewSettings?.serifFont?.trim();
  const readerFontValue =
    readerFontOptions.find((opt) => opt.family === currentReaderFont)?.family || SYSTEM_DEFAULT_VALUE;

  const updateSettings = (updater: (current: typeof settings) => typeof settings) => {
    const { settings: currentSettings } = useAppSettingsStore.getState();
    const updated = updater(currentSettings);
    setSettings(updated);
    return updated;
  };

  const handleUiFontChange = (value: string) => {
    const selectedFont = value === SYSTEM_DEFAULT_VALUE ? "" : value;
    updateSettings((current) => ({
      ...current,
      uiFontFamily: selectedFont,
    }));
    applyUiFont(selectedFont || undefined);
  };

  const handleReaderFontChange = (value: string) => {
    const targetFont =
      value === SYSTEM_DEFAULT_VALUE
        ? DEFAULT_BOOK_FONT.serifFont
        : readerFontOptions.find((opt) => opt.family === value)?.family || DEFAULT_BOOK_FONT.serifFont;

    const updated = updateSettings((current) => ({
      ...current,
      globalViewSettings: {
        ...current.globalViewSettings,
        serifFont: targetFont,
        sansSerifFont: targetFont,
        defaultCJKFont: targetFont,
      },
    }));

    if (updated.globalViewSettings.overrideFont) {
      toast.success(`阅读字体已切换为 ${targetFont}`);
    }
  };

  return (
    <div className="space-y-6 p-4 pt-3">
      <section className="space-y-4 rounded-lg bg-muted/80 p-4 pt-3">
        <h2 className="text mb-4 dark:text-neutral-200">字体管理</h2>

        <div className="space-y-3 rounded-md border border-neutral-200/70 bg-background p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div>
            <p className="font-medium text-sm text-neutral-800 dark:text-neutral-100">应用字体</p>
            <p className="text-neutral-500 text-xs dark:text-neutral-400">选择界面和系统使用的字体</p>
          </div>
          {isSystemLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : (
            <Select value={uiFontValue} onValueChange={handleUiFontChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="系统默认">
                  {uiFontValue === SYSTEM_DEFAULT_VALUE ? "系统默认" : uiFontValue}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                <SelectGroup>
                  <SelectItem value={SYSTEM_DEFAULT_VALUE}>系统默认</SelectItem>
                  {systemFontOptions.map((font) => (
                    <SelectItem key={font.id} value={font.family}>
                      <span className="truncate" style={formatPreviewStyle(font.family)}>
                        {font.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-3 rounded-md border border-neutral-200/70 bg-background p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div>
            <p className="font-medium text-sm text-neutral-800 dark:text-neutral-100">阅读默认字体</p>
            <p className="text-neutral-500 text-xs dark:text-neutral-400">设置阅读器使用的默认字体</p>
          </div>
          {isSystemLoading && readerFontOptions.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : (
            <Select value={readerFontValue} onValueChange={handleReaderFontChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="系统默认">
                  {readerFontValue === SYSTEM_DEFAULT_VALUE ? "系统默认" : readerFontValue}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80 overflow-y-auto">
                <SelectGroup>
                  <SelectItem value={SYSTEM_DEFAULT_VALUE}>系统默认</SelectItem>
                  <SelectLabel className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">系统字体</SelectLabel>
                  {systemFontOptions.map((font) => (
                    <SelectItem key={font.id} value={font.family}>
                      <span className="truncate" style={formatPreviewStyle(font.family)}>
                        {font.label}
                      </span>
                    </SelectItem>
                  ))}
                  {customFontOptions.length > 0 ? (
                    <>
                      <SelectLabel className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        已安装字体
                      </SelectLabel>
                      {customFontOptions.map((font) => (
                        <SelectItem key={font.id} value={font.family}>
                          <span className="truncate" style={formatPreviewStyle(font.family)}>
                            {font.label}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  ) : null}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-4 rounded-md border border-neutral-200/70 bg-background p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div>
            <p className="font-medium text-sm text-neutral-800 dark:text-neutral-100">安装自定义字体</p>
            <p className="text-neutral-500 text-xs dark:text-neutral-400">拖拽或粘贴字体文件，支持 .woff2 / .ttf</p>
          </div>
          <div
            className={clsx(
              "flex flex-col items-center justify-center rounded-md border-2 border-dashed p-5 transition-colors",
              isDragOver ? "border-primary bg-primary/10" : "border-neutral-300 dark:border-neutral-700",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mb-2 h-6 w-6 text-neutral-400" />
            <p className="mb-2 text-neutral-600 text-xs dark:text-neutral-400">拖拽 .woff2 或 .ttf 字体文件到此处</p>
            <Button size="xs" onClick={triggerFileSelect} disabled={isUploading}>
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isUploading ? "处理中..." : "选择文件"}</span>
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="输入字体 URL (支持 .woff2 或 .ttf 格式)"
              value={downloadUrl}
              className="h-8"
              onChange={(e) => setDownloadUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleDownload();
                }
              }}
            />
            <Button variant="soft" onClick={handleDownload} disabled={isDownloading} className="h-8">
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDownloading ? "下载中..." : "下载"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium text-neutral-700 text-sm dark:text-neutral-300">已安装的字体</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : fonts.length === 0 ? (
            <div className="rounded-md bg-neutral-100 p-3 text-center text-neutral-500 text-sm dark:bg-neutral-800 dark:text-neutral-400">
              暂无已安装的字体
            </div>
          ) : (
            <div className="space-y-2">
              {fonts.map((font) => (
                <div key={font.filename} className="flex items-center justify-between rounded-md border px-3 py-2">
                  {editingFont === font.filename ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="h-8 flex-1 text-sm"
                        placeholder="输入字体显示名称"
                      />
                      <Button size="xs" onClick={() => handleSaveEdit(font.filename)} className="h-8">
                        确定
                      </Button>
                      <Button size="xs" variant="outline" onClick={handleCancelEdit} className="h-8">
                        取消
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 py-1">
                        <p className="font-medium text-sm dark:text-neutral-200">{font.displayName || font.name}</p>
                        <p className="text-neutral-500 text-xs dark:text-neutral-400">
                          {font.fontFamily ? `Font Family: ${font.fontFamily}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="flex size-7 items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          onClick={() => handleEditClick(font)}
                          title="编辑名称"
                        >
                          <SquarePen className="h-4 w-4" />
                        </button>
                        <button
                          className="flex size-7 items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          onClick={() => handleDelete(font.filename)}
                          title="删除字体"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
