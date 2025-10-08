import { listFonts } from "@/services/font-service";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { isCJKEnv } from "./misc";

const basicGoogleFonts = [
  { family: "Bitter", weights: "ital,wght@0,100..900;1,100..900" },
  { family: "Fira Code", weights: "wght@300..700" },
  { family: "Literata", weights: "ital,opsz,wght@0,7..72,200..900;1,7..72,200..900" },
  { family: "Merriweather", weights: "ital,opsz,wght@0,18..144,300..900;1,18..144,300..900" },
  { family: "Noto Sans", weights: "ital,wght@0,100..900;1,100..900" },
  { family: "Open Sans", weights: "ital,wght@0,300..800;1,300..800" },
  { family: "Roboto", weights: "ital,wght@0,100..900;1,100..900" },
  { family: "Vollkorn", weights: "ital,wght@0,400..900;1,400..900" },
];

const cjkGoogleFonts = [
  { family: "LXGW WenKai TC", weights: "" },
  { family: "Noto Sans SC", weights: "" },
  { family: "Noto Sans TC", weights: "" },
  { family: "Noto Serif JP", weights: "" },
];

const getAdditionalBasicFontLinks = () => `
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${basicGoogleFonts
    .map(({ family, weights }) => `family=${encodeURIComponent(family)}${weights ? `:${weights}` : ""}`)
    .join("&")}&display=swap" crossorigin="anonymous">
`;

const getAdditionalCJKFontLinks = () => `
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans-webfont@1.0.4/misans-l3/misans-l3/result.min.css" crossorigin="anonymous" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${cjkGoogleFonts
    .map(({ family, weights }) => `family=${encodeURIComponent(family)}${weights ? `:${weights}` : ""}`)
    .join("&")}&display=swap" crossorigin="anonymous" />
`;

let cachedLocalFontUrl: string | null = null;

const getLocalFontUrl = async (): Promise<string | null> => {
  if (cachedLocalFontUrl) {
    return cachedLocalFontUrl;
  }

  try {
    const dataDir = await appDataDir();
    const fontPath = `${dataDir}/fonts/LXGWWenKai-Medium.woff2`;
    const fontUrl = convertFileSrc(fontPath);
    cachedLocalFontUrl = fontUrl;
    return fontUrl;
  } catch (error) {
    console.error("[Font] Failed to get local font URL:", error);
    return null;
  }
};

const getAdditionalCJKFontFaces = (localFontUrl?: string | null) => `
  ${
    localFontUrl
      ? `@font-face {
    font-family: "LXGW WenKai GB Screen";
    font-display: swap;
    src: local("LXGW WenKai GB Screen"), local("霞鹜文楷 GB Screen"), url("${localFontUrl}") format("woff2");
    font-weight: 400;
    font-style: normal;
  }`
      : ""
  }
  @font-face {
    font-family: "FangSong";
    font-display: swap;
    src: local("Fang Song"), local("FangSong"), local("Noto Serif CJK"), local("Source Han Serif SC VF"), url("https://db.onlinewebfonts.com/t/2ecbfe1d9bfc191c6f15c0ccc23cbd43.eot");
    src: url("https://db.onlinewebfonts.com/t/2ecbfe1d9bfc191c6f15c0ccc23cbd43.eot?#iefix") format("embedded-opentype"),
    url("https://db.onlinewebfonts.com/t/2ecbfe1d9bfc191c6f15c0ccc23cbd43.woff2") format("woff2"),
    url("https://db.onlinewebfonts.com/t/2ecbfe1d9bfc191c6f15c0ccc23cbd43.woff") format("woff"),
    url("https://db.onlinewebfonts.com/t/2ecbfe1d9bfc191c6f15c0ccc23cbd43.ttf") format("truetype"),
    url("https://db.onlinewebfonts.com/t/2ecbfe1d9bfc191c6f15c0ccc23cbd43.svg#FangSong") format("svg");
  }
  @font-face {
    font-family: "Kaiti";
    font-display: swap;
    src: local("Kai"), local("KaiTi"), local("AR PL UKai"), local("LXGW WenKai GB Screen"), url("https://db.onlinewebfonts.com/t/1ee9941f1b8c128110ca4307dda59917.eot");
    src: url("https://db.onlinewebfonts.com/t/1ee9941f1b8c128110ca4307dda59917.eot?#iefix")format("embedded-opentype"),
    url("https://db.onlinewebfonts.com/t/1ee9941f1b8c128110ca4307dda59917.woff2")format("woff2"),
    url("https://db.onlinewebfonts.com/t/1ee9941f1b8c128110ca4307dda59917.woff")format("woff"),
    url("https://db.onlinewebfonts.com/t/1ee9941f1b8c128110ca4307dda59917.ttf")format("truetype"),
    url("https://db.onlinewebfonts.com/t/1ee9941f1b8c128110ca4307dda59917.svg#STKaiti")format("svg");
  }
  @font-face {
    font-family: "Heiti";
    font-display: swap;
    src: local("Hei"), local("SimHei"), local("WenQuanYi Zen Hei"), local("Source Han Sans SC VF"), url("https://db.onlinewebfonts.com/t/a4948b9d43a91468825a5251df1ec58d.eot");
    src: url("https://db.onlinewebfonts.com/t/a4948b9d43a91468825a5251df1ec58d.eot?#iefix")format("embedded-opentype"),
    url("https://db.onlinewebfonts.com/t/a4948b9d43a91468825a5251df1ec58d.woff2")format("woff2"),
    url("https://db.onlinewebfonts.com/t/a4948b9d43a91468825a5251df1ec58d.woff")format("woff"),
    url("https://db.onlinewebfonts.com/t/a4948b9d43a91468825a5251df1ec58d.ttf")format("truetype"),
    url("https://db.onlinewebfonts.com/t/a4948b9d43a91468825a5251df1ec58d.svg#WenQuanYi Micro Hei")format("svg");
  }
  @font-face {
    font-family: "XiHeiti";
    font-display: swap;
    src: local("PingFang SC"), local("Microsoft YaHei"), local("WenQuanYi Micro Hei"), local("FZHei-B01"), url("https://db.onlinewebfonts.com/t/4f0b783ba4a1b381fc7e7af81ecab481.eot");
    src: url("https://db.onlinewebfonts.com/t/4f0b783ba4a1b381fc7e7af81ecab481.eot?#iefix")format("embedded-opentype"),
    url("https://db.onlinewebfonts.com/t/4f0b783ba4a1b381fc7e7af81ecab481.woff2")format("woff2"),
    url("https://db.onlinewebfonts.com/t/4f0b783ba4a1b381fc7e7af81ecab481.woff")format("woff"),
    url("https://db.onlinewebfonts.com/t/4f0b783ba4a1b381fc7e7af81ecab481.ttf")format("truetype"),
    url("https://db.onlinewebfonts.com/t/4f0b783ba4a1b381fc7e7af81ecab481.svg#STHeiti J Light")format("svg");
}
`;

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
  let links = getAdditionalBasicFontLinks();

  const customFontsFaces = await loadAllCustomFonts();

  if (customFontsFaces) {
    const customFontsStyle = document.createElement("style");
    customFontsStyle.textContent = customFontsFaces;
    document.head.appendChild(customFontsStyle);
  }

  if (mountCJKFonts) {
    const localFontUrl = await getLocalFontUrl();

    const style = document.createElement("style");
    style.textContent = getAdditionalCJKFontFaces(localFontUrl);
    document.head.appendChild(style);

    links = `${links}\n${getAdditionalCJKFontLinks()}`;
  }

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(links, "text/html");

  Array.from(parsedDocument.head.children).forEach((child) => {
    if (child.tagName === "LINK") {
      const link = document.createElement("link");
      link.rel = child.getAttribute("rel") || "";
      link.href = child.getAttribute("href") || "";
      link.crossOrigin = child.getAttribute("crossorigin") || "";

      document.head.appendChild(link);
    }
  });
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
      const localFontUrl = await getLocalFontUrl();
      const style = document.createElement("style");
      style.id = "cjk-fonts-main-app";
      style.textContent = getAdditionalCJKFontFaces(localFontUrl);
      document.head.appendChild(style);
    }

    let links = getAdditionalBasicFontLinks();
    if (isCJK) {
      links = `${links}\n${getAdditionalCJKFontLinks()}`;
    }

    const parser = new DOMParser();
    const parsedDocument = parser.parseFromString(links, "text/html");

    Array.from(parsedDocument.head.children).forEach((child) => {
      if (child.tagName === "LINK") {
        const link = document.createElement("link");
        link.rel = child.getAttribute("rel") || "";
        link.href = child.getAttribute("href") || "";
        link.crossOrigin = child.getAttribute("crossorigin") || "";
        document.head.appendChild(link);
      }
    });
  } catch (error) {
    console.error("[Font] Failed to load fonts to main app:", error);
  }
};
