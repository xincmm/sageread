import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDownloadImage } from "@/hooks/use-download-image";
import { useTranslation } from "@/hooks/use-translation";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { Menu } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { Upload, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface EditInfoProps {
  book: BookWithStatusAndUrls;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (bookId: string, updates: BookUpdateData) => Promise<boolean>;
}

interface BookUpdateData {
  title?: string;
  author?: string;
  coverPath?: string;
}

export default function EditInfo({ book, isOpen, onClose, onSave }: EditInfoProps) {
  const _ = useTranslation();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { downloadImage } = useDownloadImage();

  const validation = useMemo(() => {
    const isTitleValid = title.trim().length > 0;
    const isAuthorValid = author.trim().length > 0;
    const isFormValid = isTitleValid && isAuthorValid;

    return {
      isTitleValid,
      isAuthorValid,
      isFormValid,
    };
  }, [title, author]);

  const handleImageDownload = useCallback(
    async (imageUrl: string, fileName?: string) => {
      await downloadImage(imageUrl, {
        title: fileName || title || book.title,
        defaultFileName: fileName || `${book.title}_cover`,
      });
    },
    [downloadImage, title, book.title],
  );

  const handleCoverUpload = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Image Files",
            extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp"],
          },
        ],
      });

      if (selected && selected !== null) {
        const path = Array.isArray(selected) ? selected[0] : selected;
        setCoverPath(path);
        setCoverPreview(path);
      } else {
        console.log("No file selected or dialog cancelled");
      }
    } catch (error) {
      console.error("Failed to select cover image:", error);
      console.error("Error details:", error);
    }
  }, []);

  const handleRemoveCover = useCallback(() => {
    setCoverPath(null);
    setCoverPreview(null);
  }, []);

  // 显示自定义图片右键菜单
  const showCustomImageMenu = useCallback(
    async (event: React.MouseEvent<HTMLImageElement>) => {
      event.preventDefault();

      const imageUrl = (event.target as HTMLImageElement).src;

      try {
        const menu = await Menu.new({
          items: [
            {
              id: "download-image",
              text: _("Download Image"),
              action: () => {
                handleImageDownload(imageUrl);
              },
            },
          ],
        });

        await menu.popup(new LogicalPosition(event.clientX, event.clientY));
      } catch (error) {
        console.error("Failed to show image context menu:", error);
      }
    },
    [_, handleImageDownload],
  );

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsLoading(true);
    try {
      const updates: BookUpdateData = {};

      if (title !== book.title) {
        updates.title = title.trim();
      }

      if (author !== book.author) {
        updates.author = author.trim();
      }

      if (coverPath) {
        updates.coverPath = coverPath;
      }

      if (Object.keys(updates).length > 0) {
        const success = await onSave(book.id, updates);
        if (success) {
          onClose();
        }
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to save book updates:", error);
    } finally {
      setIsLoading(false);
    }
  }, [book.id, book.title, book.author, title, author, coverPath, onSave, onClose]);

  const handleCancel = useCallback(() => {
    setTitle(book.title);
    setAuthor(book.author);
    setCoverPath(null);
    setCoverPreview(null);
    onClose();
  }, [book.title, book.author, onClose]);

  const getCurrentCover = () => {
    if (coverPreview) return coverPreview;
    if (book.coverUrl) return book.coverUrl;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{_("Edit Book Info")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 p-4">
          <div className="space-y-2">
            <Label>{_("Cover Image")}</Label>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="relative overflow-hidden">
                  <div className="aspect-[3/4] w-30">
                    {getCurrentCover() ? (
                      <>
                        <img
                          src={getCurrentCover()!}
                          alt={title}
                          className="h-full w-full object-cover"
                          onContextMenu={showCustomImageMenu}
                        />
                        {coverPreview && (
                          <button
                            onClick={handleRemoveCover}
                            className="-right-2 -top-2 absolute rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800">
                        <div className="text-center">
                          <div className="mb-1 text-lg text-neutral-500 dark:text-neutral-400">📖</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <Button variant="outline" size="sm" onClick={handleCoverUpload} className="w-full">
                  <Upload className="h-4 w-4" />
                  {getCurrentCover() ? _("Change Cover") : _("Upload Cover")}
                </Button>
                <p className="text-neutral-500 text-xs dark:text-neutral-400">
                  {_("Supported formats: PNG, JPG, GIF, WebP")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{_("Title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={_("Enter book title")}
              maxLength={256}
              className={`w-full ${!validation.isTitleValid ? "border-red-500 focus:border-red-500" : ""}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="author">{_("Author")}</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={_("Enter author name")}
              className={`w-full ${!validation.isAuthorValid ? "border-red-500 focus:border-red-500" : ""}`}
              maxLength={256}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {_("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !validation.isFormValid}>
            {isLoading ? _("Saving...") : _("Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
