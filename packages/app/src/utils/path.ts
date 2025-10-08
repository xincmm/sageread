import { appDataDir } from "@tauri-apps/api/path";

export async function extractRelativePathFromAppData(fullPath: string): Promise<string> {
  const appDataDirPath = await appDataDir();
  const normalizedFullPath = fullPath.replace(/\\/g, "/");
  const normalizedAppDataDir = appDataDirPath.replace(/\\/g, "/");

  if (normalizedFullPath.startsWith(normalizedAppDataDir)) {
    let relativePath = normalizedFullPath.substring(normalizedAppDataDir.length);
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.substring(1);
    }
    return relativePath;
  }

  return fullPath;
}

function resolveRelativePath(relativePath: string, baseDir: string): string {
  const normalizedBase = baseDir.replace(/\\/g, "/");
  const normalizedRelative = relativePath.replace(/\\/g, "/");

  const baseParts = normalizedBase.split("/").filter((p) => p);
  const relativeParts = normalizedRelative.split("/").filter((p) => p);

  for (const part of relativeParts) {
    if (part === "..") {
      baseParts.pop();
    } else if (part !== ".") {
      baseParts.push(part);
    }
  }

  return `/${baseParts.join("/")}`;
}

/**
 * 将markdown中的相对图片路径转换为相对于appDataDir的路径
 * 例如: ../Images/img.jpg -> books/xxx/EPUB/Images/img.jpg
 *
 * @param markdownContent - markdown内容
 * @param absoluteMdFilePath - md文件的绝对路径
 */
export async function resolveMarkdownImagePaths(markdownContent: string, absoluteMdFilePath: string): Promise<string> {
  // 从绝对路径中获取文件所在目录
  const normalizedPath = absoluteMdFilePath.replace(/\\/g, "/");
  const mdFileDir = normalizedPath.substring(0, normalizedPath.lastIndexOf("/"));

  const appDataDirPath = await appDataDir();
  const normalizedAppDataDir = appDataDirPath.replace(/\\/g, "/");
  const appDataPrefix = normalizedAppDataDir.endsWith("/") ? normalizedAppDataDir : `${normalizedAppDataDir}/`;

  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const htmlImageRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/g;

  let result = markdownContent;

  result = result.replace(markdownImageRegex, (match, alt, src) => {
    if (src.startsWith("./") || src.startsWith("../")) {
      try {
        const absolutePath = resolveRelativePath(src, mdFileDir);
        if (absolutePath.startsWith(appDataPrefix)) {
          const relativePath = absolutePath.substring(appDataPrefix.length);
          return `![${alt}](${relativePath})`;
        }
        console.warn(`Path does not start with appDataDir: ${absolutePath}`);
      } catch (error) {
        console.warn(`Failed to resolve image path: ${src}`, error);
      }
    }
    return match;
  });

  result = result.replace(htmlImageRegex, (match, src) => {
    if (src.startsWith("./") || src.startsWith("../")) {
      try {
        const absolutePath = resolveRelativePath(src, mdFileDir);
        if (absolutePath.startsWith(appDataPrefix)) {
          const relativePath = absolutePath.substring(appDataPrefix.length);
          return match.replace(src, relativePath);
        }
      } catch (error) {
        console.warn(`Failed to resolve image path: ${src}`, error);
      }
    }
    return match;
  });

  return result;
}

/** 将相对路径转换为完整的文件系统路径 */
export async function getFullPathFromAppData(relativePath: string): Promise<string> {
  const appDataDirPath = await appDataDir();
  const normalizedAppDataDir = appDataDirPath.replace(/\\/g, "/");
  const normalizedRelativePath = relativePath.replace(/\\/g, "/");

  const appDataPrefix = normalizedAppDataDir.endsWith("/") ? normalizedAppDataDir : `${normalizedAppDataDir}/`;

  const cleanRelativePath = normalizedRelativePath.startsWith("/")
    ? normalizedRelativePath.substring(1)
    : normalizedRelativePath;

  return `${appDataPrefix}${cleanRelativePath}`;
}
