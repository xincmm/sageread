import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFontUpload } from "@/hooks/use-font-upload";
import { type FontInfo, deleteFont, downloadFont, setFontMetadata } from "@/services/font-service";
import { useFontStore } from "@/store/font-store";
import clsx from "clsx";
import { Loader2, SquarePen, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function FontManager() {
  const { fonts, isLoading, loadFonts, refreshFonts } = useFontStore();
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingFont, setEditingFont] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");

  useEffect(() => {
    loadFonts();
  }, [loadFonts]);

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

  return (
    <div className="space-y-6 p-4 pt-3">
      <section className="rounded-lg bg-muted/80 p-4 pt-3">
        <h2 className="text mb-4 dark:text-neutral-200">字体管理</h2>

        <div
          className={clsx(
            "mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragOver ? "border-primary bg-primary/10" : "border-neutral-300 dark:border-neutral-700",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mb-2 h-8 w-8 text-neutral-400" />
          <p className="mb-2 text-neutral-600 text-sm dark:text-neutral-400">拖拽 .woff2 或 .ttf 字体文件到此处</p>
          <Button size="xs" onClick={triggerFileSelect} disabled={isUploading}>
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isUploading ? "处理中..." : "选择文件"}</span>
          </Button>
        </div>

        <div className="mb-4 flex gap-2 border-b pb-4">
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

        <div className="space-y-2">
          <h3 className="font-medium text-neutral-700 text-sm dark:text-neutral-300">已安装的字体</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : fonts.length === 0 ? (
            <div className="rounded-md bg-neutral-100 p-4 text-center text-neutral-500 text-sm dark:bg-neutral-800 dark:text-neutral-400">
              暂无已安装的字体
            </div>
          ) : (
            <div className="space-y-3">
              {fonts.map((font) => (
                <div key={font.filename} className="flex h-[48px] items-center justify-between border-b px-0 py-4">
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
                      <div className="flex-1 py-2">
                        <p className="font-medium text-sm dark:text-neutral-200">{font.name}</p>
                        <p className="text-neutral-500 text-xs dark:text-neutral-400">
                          {font.fontFamily ? `Font Family: ${font.fontFamily}` : ""}
                        </p>
                      </div>
                      <div className="flex">
                        <div
                          className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          onClick={() => handleEditClick(font)}
                        >
                          <SquarePen className="h-4 w-4" />
                        </div>
                        <div
                          className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          onClick={() => handleDelete(font.filename)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </div>
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
