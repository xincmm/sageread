import { save } from "@tauri-apps/plugin-dialog";
import { useCallback } from "react";

interface DownloadImageOptions {
  defaultFileName?: string;
  title?: string;
}

export const useDownloadImage = () => {
  const downloadImage = useCallback(async (imageUrl: string, options?: DownloadImageOptions) => {
    if (!imageUrl) {
      console.warn("No image URL provided for download");
      return false;
    }

    try {
      const urlWithoutQuery = imageUrl.split("?")[0];
      const lastDotIndex = urlWithoutQuery.lastIndexOf(".");
      const extension = lastDotIndex !== -1 ? urlWithoutQuery.substring(lastDotIndex + 1).toLowerCase() : "jpg";

      let defaultFileName = "image";
      if (options?.defaultFileName) {
        defaultFileName = options.defaultFileName;
      } else if (options?.title) {
        defaultFileName = options.title.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "_");
      }

      const path = await save({
        defaultPath: `${defaultFileName}.${extension}`,
        filters: [
          {
            name: "Image Files",
            extensions: ["jpg", "jpeg", "png", "gif", "webp"],
          },
        ],
      });

      if (path) {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const { writeFile } = await import("@tauri-apps/plugin-fs");
        await writeFile(path, uint8Array);

        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to download image:", error);
      return false;
    }
  }, []);

  return { downloadImage };
};
