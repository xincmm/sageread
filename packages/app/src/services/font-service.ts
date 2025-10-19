import { convertTtfToWoff2 } from "@/utils/font-converter";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { exists, mkdir, readDir, readTextFile, remove, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";

export interface FontInfo {
  name: string;
  filename: string;
  size: number;
  path: string;
  fontFamily?: string;
  displayName?: string;
}

export interface FontMetadata {
  filename: string;
  fontFamily: string;
  displayName?: string;
  uploadedAt: string;
}

type FontMetadataMap = Record<string, FontMetadata>;

export interface SystemFontInfo {
  family: string;
  isMonospace: boolean;
  sources: string[];
}

const FONTS_DIR = "fonts";
const FONTS_META_FILE = "fonts-meta.json";

async function getFontsDir(): Promise<string> {
  const dataDir = await appDataDir();
  return `${dataDir}/${FONTS_DIR}`;
}

async function ensureFontsDir(): Promise<void> {
  const fontsDir = await getFontsDir();
  const dirExists = await exists(fontsDir);

  if (!dirExists) {
    await mkdir(fontsDir, { recursive: true });
  }
}

async function getMetadataFilePath(): Promise<string> {
  const fontsDir = await getFontsDir();
  return `${fontsDir}/${FONTS_META_FILE}`;
}

async function loadFontMetadata(): Promise<FontMetadataMap> {
  try {
    const metaPath = await getMetadataFilePath();
    const fileExists = await exists(metaPath);

    if (!fileExists) {
      return {};
    }

    const content = await readTextFile(metaPath);
    return JSON.parse(content);
  } catch (error) {
    console.error("[FontService] Failed to load metadata:", error);
    return {};
  }
}

async function saveFontMetadata(metadata: FontMetadataMap): Promise<void> {
  try {
    const metaPath = await getMetadataFilePath();
    const content = JSON.stringify(metadata, null, 2);
    await writeTextFile(metaPath, content);
  } catch (error) {
    console.error("[FontService] Failed to save metadata:", error);
    throw error;
  }
}

export async function setFontMetadata(filename: string, fontFamily: string, displayName?: string): Promise<void> {
  const metadata = await loadFontMetadata();

  metadata[filename] = {
    filename,
    fontFamily,
    displayName,
    uploadedAt: new Date().toISOString(),
  };

  await saveFontMetadata(metadata);
}

export async function getFontMetadata(filename: string): Promise<FontMetadata | null> {
  const metadata = await loadFontMetadata();
  return metadata[filename] || null;
}

async function deleteFontMetadata(filename: string): Promise<void> {
  const metadata = await loadFontMetadata();
  delete metadata[filename];
  await saveFontMetadata(metadata);
}

export async function listFonts(): Promise<FontInfo[]> {
  try {
    await ensureFontsDir();
    const fontsDir = await getFontsDir();
    const entries = await readDir(fontsDir);
    const metadata = await loadFontMetadata();

    const fonts: FontInfo[] = [];

    for (const entry of entries) {
      if (entry.isFile && entry.name.endsWith(".woff2")) {
        const filename = entry.name;
        const filePath = `${fontsDir}/${filename}`;
        const meta = metadata[filename];

        fonts.push({
          name: meta?.displayName || meta?.fontFamily || filename.replace(".woff2", ""),
          filename,
          size: 0,
          path: filePath,
          fontFamily: meta?.fontFamily,
          displayName: meta?.displayName,
        });
      }
    }

    return fonts;
  } catch (error) {
    console.error("[FontService] Failed to list fonts:", error);
    return [];
  }
}

export async function uploadFont(file: File): Promise<FontInfo> {
  try {
    await ensureFontsDir();

    if (!file.name.endsWith(".woff2")) {
      throw new Error("Only .woff2 files are supported");
    }

    const fontsDir = await getFontsDir();
    const filename = file.name;
    const filePath = `${fontsDir}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    await writeFile(filePath, uint8Array);

    const fontInfo: FontInfo = {
      name: filename.replace(".woff2", ""),
      filename,
      size: file.size,
      path: filePath,
    };

    console.log("[FontService] Font uploaded:", fontInfo);
    return fontInfo;
  } catch (error) {
    console.error("[FontService] Failed to upload font:", error);
    throw error;
  }
}

export async function downloadFont(url: string, filename?: string): Promise<FontInfo> {
  try {
    await ensureFontsDir();

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download font: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    let uint8Array = new Uint8Array(arrayBuffer);

    let finalFilename = filename || url.split("/").pop() || "font.woff2";

    if (!finalFilename.endsWith(".woff2") && !finalFilename.endsWith(".ttf")) {
      throw new Error("Only .woff2 or .ttf files are supported");
    }

    if (finalFilename.endsWith(".ttf")) {
      const woff2Buffer = await convertTtfToWoff2(arrayBuffer);
      uint8Array = new Uint8Array(woff2Buffer);
      finalFilename = finalFilename.replace(/\.ttf$/i, ".woff2");
    }

    const fontsDir = await getFontsDir();
    const filePath = `${fontsDir}/${finalFilename}`;

    await writeFile(filePath, uint8Array);

    const fontInfo: FontInfo = {
      name: finalFilename.replace(".woff2", ""),
      filename: finalFilename,
      size: uint8Array.length,
      path: filePath,
    };

    console.log("[FontService] Font downloaded:", fontInfo);
    return fontInfo;
  } catch (error) {
    console.error("[FontService] Failed to download font:", error);
    throw error;
  }
}

export async function deleteFont(filename: string): Promise<void> {
  try {
    const fontsDir = await getFontsDir();
    const filePath = `${fontsDir}/${filename}`;

    await remove(filePath);
    await deleteFontMetadata(filename);
    console.log("[FontService] Font deleted:", filename);
  } catch (error) {
    console.error("[FontService] Failed to delete font:", error);
    throw error;
  }
}

export async function uploadFontByPath(filePath: string): Promise<FontInfo> {
  try {
    const result = await invoke<FontInfo>("upload_and_convert_font", {
      filePath,
    });

    console.log("[FontService] Font uploaded via Tauri:", result);
    return result;
  } catch (error) {
    console.error("[FontService] Failed to upload font via Tauri:", error);
    throw error;
  }
}

export async function uploadFontData(file: File): Promise<FontInfo> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const result = await invoke<FontInfo>("upload_font_data", {
      filename: file.name,
      data: Array.from(uint8Array),
    });

    console.log("[FontService] Font uploaded via data:", result);
    return result;
  } catch (error) {
    console.error("[FontService] Failed to upload font via data:", error);
    throw error;
  }
}

export async function listSystemFonts(): Promise<SystemFontInfo[]> {
  try {
    const fonts = await invoke<SystemFontInfo[]>("list_system_fonts");
    return fonts;
  } catch (error) {
    console.error("[FontService] Failed to list system fonts:", error);
    return [];
  }
}
