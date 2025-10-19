import { listFonts } from "@/services/font-service";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, resourceDir } from "@tauri-apps/api/path";
import { isCJKEnv } from "./misc";

let cachedBuiltInFontUrl: string | null = null;
const SYSTEM_FONT_FALLBACK =
  'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';
const DEFAULT_SERIF_FALLBACK = '"Geist", "Geist Fallback", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';

const quoteIfNeeded = (font: string) => {
  if (!font) return font;
  return /\s/.test(font) && !/^".*"$/.test(font) ? `"${font}"` : font;
};

const normalizeFontSize = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return null;
  }
  return `${value}px`;
};

const normalizeFontWeight = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return null;
  }
  return `${Math.round(value)}`;
};

export const applyUiFont = (fontFamily?: string | null, fontSize?: number | null, fontWeight?: number | null) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const sanitized = fontFamily?.trim();
  const fallbackSans = SYSTEM_FONT_FALLBACK;
  const fallbackSerif = DEFAULT_SERIF_FALLBACK;
  const cssFont = sanitized ? quoteIfNeeded(sanitized) : "";
  const resolvedSans = cssFont ? `${cssFont}, ${fallbackSans}` : fallbackSans;
  const resolvedSerif = cssFont ? `${cssFont}, ${fallbackSerif}` : fallbackSerif;

  root.style.setProperty("--font-sans", resolvedSans);
  root.style.setProperty("--font-serif", resolvedSerif);

  const normalizedSize = normalizeFontSize(fontSize);
  const normalizedWeight = normalizeFontWeight(fontWeight);

  if (normalizedSize) {
    root.style.setProperty("--app-font-size", normalizedSize);
    root.style.fontSize = normalizedSize;
    if (document.body) {
      document.body.style.fontSize = normalizedSize;
    }
  } else {
    root.style.removeProperty("--app-font-size");
    root.style.removeProperty("font-size");
    if (document.body) {
      document.body.style.removeProperty("font-size");
    }
  }

  if (normalizedWeight) {
    root.style.setProperty("--app-font-weight", normalizedWeight);
    root.style.fontWeight = normalizedWeight;
    if (document.body) {
      document.body.style.fontWeight = normalizedWeight;
    }
  } else {
    root.style.removeProperty("--app-font-weight");
    root.style.removeProperty("font-weight");
    if (document.body) {
      document.body.style.removeProperty("font-weight");
    }
  }

  root.style.fontFamily = resolvedSans;
  if (document.body) {
    document.body.style.fontFamily = resolvedSans;
  }
};

export const applyUiFontFromSettings = () => {
  try {
    const { settings } = useAppSettingsStore.getState();
    applyUiFont(settings.uiFontFamily, settings.uiFontSize, settings.uiFontWeight);
  } catch (error) {
    console.error("[Font] Failed to apply UI font from settings:", error);
  }
};

if (typeof window !== "undefined") {
  useAppSettingsStore.subscribe(
    (state) => ({
      fontFamily: state.settings.uiFontFamily,
      fontSize: state.settings.uiFontSize,
      fontWeight: state.settings.uiFontWeight,
    }),
    ({ fontFamily, fontSize, fontWeight }) => {
      applyUiFont(fontFamily, fontSize, fontWeight);
    },
  );
}

const getBuiltInFontUrl = async (): Promise<string> => {
  if (cachedBuiltInFontUrl) {
    return cachedBuiltInFontUrl;
  }

  try {
    const resDir = await resourceDir();
    console.log("[Font] resourceDir:", resDir);

    const fontPath = `${resDir}/resources/fonts/ChillHuoFangSong_Regular.woff2`;
    console.log("[Font] fontPath:", fontPath);

    const fontUrl = convertFileSrc(fontPath);
    console.log("[Font] fontUrl:", fontUrl);

    cachedBuiltInFontUrl = fontUrl;
    return fontUrl;
  } catch (error) {
    console.error("[Font] Failed to get built-in font URL:", error);
    return "";
  }
};

const getBuiltInFontFaces = async (): Promise<string> => {
  const fontUrl = await getBuiltInFontUrl();
  console.log("fontUrl", fontUrl);
  return `
  @font-face {
    font-family: "ChillHuoFangSong";
    font-display: swap;
    src: local("ChillHuoFangSong"), local("寒蝉活宋体"), url("${fontUrl}") format("woff2");
    font-weight: 400;
    font-style: normal;
  }
`;
};

async function loadAllCustomFonts(): Promise<string> {
  try {
    const fonts = await listFonts();
    const dataDir = await appDataDir();

    const fontFaces = fonts
      .map((font) => {
        const fontPath = `${dataDir}/fonts/${font.filename}`;
        const fontUrl = convertFileSrc(fontPath);
        const fontFamily = font.fontFamily || font.name;

        return `
  @font-face {
    font-family: "${fontFamily}";
    font-display: swap;
    src: url("${fontUrl}") format("woff2");
    font-weight: 400;
    font-style: normal;
  }`;
      })
      .join("\n");

    return fontFaces;
  } catch (error) {
    console.error("[Font] Failed to load custom fonts:", error);
    return "";
  }
}

export const mountAdditionalFonts = async (document: Document, isCJK = false) => {
  const mountCJKFonts = isCJK || isCJKEnv();

  const customFontsFaces = await loadAllCustomFonts();

  if (customFontsFaces) {
    const customFontsStyle = document.createElement("style");
    customFontsStyle.textContent = customFontsFaces;
    document.head.appendChild(customFontsStyle);
  }

  if (mountCJKFonts) {
    const builtInFontFaces = await getBuiltInFontFaces();
    const style = document.createElement("style");
    style.textContent = builtInFontFaces;
    document.head.appendChild(style);
  }
};

export const mountFontsToMainApp = async () => {
  try {
    const isCJK = isCJKEnv();

    const customFontsFaces = await loadAllCustomFonts();

    if (customFontsFaces) {
      const customFontsStyle = document.createElement("style");
      customFontsStyle.id = "custom-fonts-main-app";
      customFontsStyle.textContent = customFontsFaces;
      document.head.appendChild(customFontsStyle);
    }

    if (isCJK) {
      const builtInFontFaces = await getBuiltInFontFaces();
      const style = document.createElement("style");
      style.id = "builtin-fonts-main-app";
      style.textContent = builtInFontFaces;
      document.head.appendChild(style);
    }

    applyUiFontFromSettings();
  } catch (error) {
    console.error("[Font] Failed to load fonts to main app:", error);
  }
};
