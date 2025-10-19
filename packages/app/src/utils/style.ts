import { type CustomTheme, type Palette, generateDarkPalette, generateLightPalette, themes } from "@/styles/themes";
import type { ViewSettings } from "@/types/book";
import { getOSPlatform } from "./misc";

const getFontStyles = (
  serif: string,
  sansSerif: string,
  monospace: string,
  defaultFont: string,
  defaultCJKFont: string,
  fontSize: number,
  minFontSize: number,
  fontWeight: number,
  overrideFont: boolean,
) => {
  // 为了确保字体正确应用，我们直接使用指定的字体
  // CJK 字体通过 defaultCJKFont 单独处理
  const fontStyles = `
    html {
      --serif-font: "${serif}", serif;
      --sans-serif-font: "${sansSerif}", sans-serif;
      --monospace-font: "${monospace}", monospace;
      --cjk-font: "${defaultCJKFont}", sans-serif;
    }
    html, body {
      font-family: ${defaultFont.toLowerCase() === "serif" ? `"${serif}"` : `"${sansSerif}"`}, "${defaultCJKFont}", ${defaultFont.toLowerCase() === "serif" ? "serif" : "sans-serif"} ${overrideFont ? "!important" : ""};
      font-size: ${fontSize}px !important;
      font-weight: ${fontWeight};
      -webkit-text-size-adjust: none;
      text-size-adjust: none;
    }
    font[size="1"] {
      font-size: ${minFontSize}px;
    }
    font[size="2"] {
      font-size: ${minFontSize * 1.5}px;
    }
    font[size="3"] {
      font-size: ${fontSize}px;
    }
    font[size="4"] {
      font-size: ${fontSize * 1.2}px;
    }
    font[size="5"] {
      font-size: ${fontSize * 1.5}px;
    }
    font[size="6"] {
      font-size: ${fontSize * 2}px;
    }
    font[size="7"] {
      font-size: ${fontSize * 3}px;
    }
    /* hardcoded inline font size */
    [style*="font-size: 16px"], [style*="font-size:16px"] {
      font-size: 1rem !important;
    }
    body * {
      ${overrideFont ? "font-family: revert !important;" : ""}
    }
    
  `;
  return fontStyles;
};

const getColorStyles = (overrideColor: boolean, invertImgColorInDark: boolean, themeCode: ThemeCode) => {
  const { bg, fg, primary, isDarkMode } = themeCode;
  const colorStyles = `
    html {
      --theme-bg-color: ${bg};
      --theme-fg-color: ${fg};
      --theme-primary-color: ${primary};
      color-scheme: ${isDarkMode ? "dark" : "light"};
    }
    html, body {
      color: ${fg};
    }
    html[has-background], body[has-background] {
      --background-set: var(--theme-bg-color);
    }
    html {
      background-color: var(--theme-bg-color, transparent);
      background: var(--background-set, none);
    }
    div, p, h1, h2, h3, h4, h5, h6 {
      ${overrideColor ? `background-color: ${bg} !important;` : ""}
      ${overrideColor ? `color: ${fg} !important;` : ""}
    }
    pre, span { /* inline code blocks */
      ${overrideColor ? `background-color: ${bg} !important;` : ""}
    }
    a:any-link {
      ${overrideColor ? `color: ${primary};` : isDarkMode ? "color: lightblue;" : ""}
      text-decoration: none;
    }
    body.pbg {
      ${isDarkMode ? `background-color: ${bg} !important;` : ""}
    }
    img {
      ${isDarkMode && invertImgColorInDark ? "filter: invert(100%);" : ""}
      ${!isDarkMode && overrideColor ? "mix-blend-mode: multiply;" : ""}
    }
    /* inline images */
    p img, span img, sup img {
      mix-blend-mode: ${isDarkMode ? "screen" : "multiply"};
    }
    /* override inline hardcoded text color */
    *[style*="color: rgb(0,0,0)"], *[style*="color: rgb(0, 0, 0)"],
    *[style*="color: #000"], *[style*="color: #000000"], *[style*="color: black"],
    *[style*="color:rgb(0,0,0)"], *[style*="color:rgb(0, 0, 0)"],
    *[style*="color:#000"], *[style*="color:#000000"], *[style*="color:black"] {
      color: ${fg} !important;
    }
    /* for the Gutenberg eBooks */
    #pg-header * {
      color: inherit !important;
    }
    .x-ebookmaker, .x-ebookmaker-cover, .x-ebookmaker-coverpage {
      background-color: unset !important;
    }
    /* for the Feedbooks eBooks */
    .chapterHeader, .chapterHeader * {
      border-color: unset;
      background-color: ${bg} !important;
    }
  `;
  return colorStyles;
};

const getLayoutStyles = (
  overrideLayout: boolean,
  paragraphMargin: number,
  lineSpacing: number,
  wordSpacing: number,
  letterSpacing: number,
  textIndent: number,
  justify: boolean,
  hyphenate: boolean,
  zoomLevel: number,
  writingMode: string,
  vertical: boolean,
) => {
  const layoutStyle = `
  @namespace epub "http://www.idpf.org/2007/ops";
  html {
    --default-text-align: ${justify ? "justify" : "start"};
    hanging-punctuation: allow-end last;
    orphans: 2;
    widows: 2;
  }
  [align="left"] { text-align: left; }
  [align="right"] { text-align: right; }
  [align="center"] { text-align: center; }
  [align="justify"] { text-align: justify; }
  :is(hgroup, header) p {
      text-align: unset;
      hyphens: unset;
  }
  pre {
      white-space: pre-wrap !important;
      tab-size: 2;
  }
  html, body {
    ${writingMode === "auto" ? "" : `writing-mode: ${writingMode} !important;`}
    text-align: var(--default-text-align);
    max-height: unset;
  }
  body {
    overflow: unset;
    zoom: ${zoomLevel};
  }
  svg, img {
    height: auto;
    width: auto;
    background-color: transparent !important;
  }
  /* enlarge the clickable area of links */
  a {
    position: relative !important;
  }
  a::before {
    content: '';
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
  }
  p, blockquote, dd, div:not(:has(*:not(b, a, em, i, strong, u, span))) {
    line-height: ${lineSpacing} ${overrideLayout ? "!important" : ""};
    word-spacing: ${wordSpacing}px ${overrideLayout ? "!important" : ""};
    letter-spacing: ${letterSpacing}px ${overrideLayout ? "!important" : ""};
    text-indent: ${vertical ? textIndent * 1.2 : textIndent}em ${overrideLayout ? "!important" : ""};
    ${justify ? `text-align: justify ${overrideLayout ? "!important" : ""};` : ""}
    ${!justify && overrideLayout ? "text-align: unset !important;" : ""};
    -webkit-hyphens: ${hyphenate ? "auto" : "manual"};
    hyphens: ${hyphenate ? "auto" : "manual"};
    -webkit-hyphenate-limit-before: 3;
    -webkit-hyphenate-limit-after: 2;
    -webkit-hyphenate-limit-lines: 2;
    hanging-punctuation: allow-end last;
    widows: 2;
  }
  p:has(> img:only-child), p:has(> span:only-child > img:only-child),
  p:has(> img:not(.has-text-siblings)),
  p:has(> a:first-child + img:last-child) {
    text-indent: initial !important;
  }
  blockquote[align="center"], div[align="center"],
  p[align="center"], dd[align="center"],
  li p, ol p, ul p {
    text-indent: initial !important;
  }
  p {
    ${vertical ? `margin-left: ${paragraphMargin}em ${overrideLayout ? "!important" : ""};` : ""}
    ${vertical ? `margin-right: ${paragraphMargin}em ${overrideLayout ? "!important" : ""};` : ""}
    ${!vertical ? `margin-top: ${paragraphMargin}em ${overrideLayout ? "!important" : ""};` : ""}
    ${!vertical ? `margin-bottom: ${paragraphMargin}em ${overrideLayout ? "!important" : ""};` : ""}
  }
  div {
    ${vertical && overrideLayout ? `margin-left: ${paragraphMargin}em !important;` : ""}
    ${vertical && overrideLayout ? `margin-right: ${paragraphMargin}em !important;` : ""}
    ${!vertical && overrideLayout ? `margin-top: ${paragraphMargin}em !important;` : ""}
    ${!vertical && overrideLayout ? `margin-bottom: ${paragraphMargin}em !important;` : ""}
  }
  h1, h2, h3, h4, h5, h6 {
    text-align: initial;
    padding-bottom: 0.35em ${overrideLayout ? "!important" : ""};
  }

  :is(h1, h2, h3, h4, h5, h6, header, hgroup):has(+ :is(hr, [role="separator"], [class*="divider" i], [class*="separator" i], [class*="line" i])) {
    padding-bottom: 0.6em ${overrideLayout ? "!important" : ""};
  }

  :is(h1, h2, h3, h4, h5, h6, header, hgroup)
    + :is(hr, [role="separator"], [class*="divider" i], [class*="separator" i], [class*="line" i]) {
    margin-top: 1.6em ${overrideLayout ? "!important" : ""};
  }

  :is(h1, h2, h3, h4, h5, h6, header, hgroup)
    + :is(div, p, section, header, hgroup):has(> :is(hr, [role="separator"], [class*="divider" i], [class*="separator" i], [class*="line" i])) {
    margin-top: 1.6em ${overrideLayout ? "!important" : ""};
  }

  :lang(zh), :lang(ja), :lang(ko) {
    widows: 1;
    orphans: 1;
  }

  pre {
    white-space: pre-wrap !important;
  }

  .epubtype-footnote,
  aside[epub|type~="endnote"],
  aside[epub|type~="footnote"],
  aside[epub|type~="note"],
  aside[epub|type~="rearnote"] {
    display: none;
  }

  /* Now begins really dirty hacks to fix some badly designed epubs */
  img.pi {
    ${vertical ? "transform: rotate(90deg);" : ""}
    ${vertical ? "transform-origin: center;" : ""}
    ${vertical ? "height: 2em;" : ""}
    ${vertical ? `width: ${lineSpacing}em;` : ""}
    ${vertical ? "vertical-align: unset;" : ""}
  }

  .duokan-footnote-content,
  .duokan-footnote-item {
    display: none;
  }

  .calibre {
    color: unset;
  }

  /* inline images without dimension */
  sup img {
    height: 1em;
  }
  img.has-text-siblings {
    height: 1em;
    vertical-align: baseline;
  }
  .ie6 img {
    width: auto;
    height: auto;
  }
  .duokan-footnote img {
    width: 0.8em;
    height: 0.8em;
  }

  /* workaround for some badly designed epubs */
  div.left *, p.left * { text-align: left; }
  div.right *, p.right * { text-align: right; }
  div.center *, p.center * { text-align: center; }
  div.justify *, p.justify * { text-align: justify; }

  .nonindent, .noindent {
    text-indent: unset !important;
  }
`;
  return layoutStyle;
};

export const getFootnoteStyles = () => `
  .duokan-footnote-content,
  .duokan-footnote-item {
    display: block !important;
  }

  body {
    padding: 1em !important;
  }

  a:any-link {
    text-decoration: none;
    padding: unset;
    margin: unset;
  }

  ol {
    margin: 0;
    padding: 0;
  }

  p, li, blockquote, dd {
    margin: unset !important;
    text-indent: unset !important;
  }
`;

const getTranslationStyles = (showSource: boolean) => `
  .translation-source {
  }
  .translation-target {
  }
  .translation-target.hidden {
    display: none !important;
  }
  .translation-target-block {
    display: block !important;
    ${showSource ? "margin: 0.5em 0 !important;" : ""}
  }
  .translation-target-toc {
    display: block !important;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export interface ThemeCode {
  bg: string;
  fg: string;
  primary: string;
  palette: Palette;
  isDarkMode: boolean;
}

export const getThemeCode = () => {
  let themeMode = "auto";
  let themeColor = "default";
  let systemIsDarkMode = false;
  let customThemes: CustomTheme[] = [];
  if (typeof window !== "undefined") {
    themeColor = localStorage.getItem("themeColor") || "default";
    themeMode = localStorage.getItem("themeMode") || "auto";
    customThemes = JSON.parse(localStorage.getItem("customThemes") || "[]");
    systemIsDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  const isDarkMode = themeMode === "dark" || (themeMode === "auto" && systemIsDarkMode);
  let currentTheme = themes.find((theme) => theme.name === themeColor);
  if (!currentTheme) {
    const customTheme = customThemes.find((theme) => theme.name === themeColor);
    if (customTheme) {
      currentTheme = {
        name: customTheme.name,
        label: customTheme.label,
        colors: {
          light: generateLightPalette(customTheme.colors.light),
          dark: generateDarkPalette(customTheme.colors.dark),
        },
      };
    }
  }
  if (!currentTheme) currentTheme = themes[0];
  const defaultPalette = isDarkMode ? currentTheme!.colors.dark : currentTheme!.colors.light;
  return {
    bg: defaultPalette["base-100"],
    fg: defaultPalette["base-content"],
    primary: defaultPalette.primary,
    palette: defaultPalette,
    isDarkMode,
  } as ThemeCode;
};

const getScrollbarStyles = (themeCode: ThemeCode) => {
  const scrollbarStyles = `
    /* 自定义滚动条样式 - 应用到iframe内容 */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #afb0b3;
      border-radius: 10px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #9ca0a5;
    }
    
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    
    /* 针对滚动模式优化 */
    html[data-flow="scrolled"] ::-webkit-scrollbar {
      width: 8px;
    }
    
    html[data-flow="scrolled"] ::-webkit-scrollbar-thumb {
      background: ${themeCode.isDarkMode ? "#555" : "#afb0b3"};
      border-radius: 4px;
    }
    
    html[data-flow="scrolled"] ::-webkit-scrollbar-thumb:hover {
      background: ${themeCode.isDarkMode ? "#666" : "#9ca0a5"};
    }
  `;
  return scrollbarStyles;
};

export const getStyles = (viewSettings: ViewSettings, themeCode?: ThemeCode) => {
  if (!themeCode) {
    themeCode = getThemeCode();
  }
  const layoutStyles = getLayoutStyles(
    viewSettings.overrideLayout!,
    viewSettings.paragraphMargin!,
    viewSettings.lineHeight!,
    viewSettings.wordSpacing!,
    viewSettings.letterSpacing!,
    viewSettings.textIndent!,
    viewSettings.fullJustification!,
    viewSettings.hyphenation!,
    viewSettings.zoomLevel! / 100.0,
    viewSettings.writingMode!,
    viewSettings.vertical!,
  );
  const fontStyles = getFontStyles(
    viewSettings.serifFont!,
    viewSettings.sansSerifFont!,
    viewSettings.monospaceFont!,
    viewSettings.defaultFont!,
    viewSettings.defaultCJKFont!,
    viewSettings.defaultFontSize!,
    viewSettings.minimumFontSize!,
    viewSettings.fontWeight!,
    viewSettings.overrideFont!,
  );
  const colorStyles = getColorStyles(viewSettings.overrideColor!, viewSettings.invertImgColorInDark!, themeCode);
  const translationStyles = getTranslationStyles(viewSettings.showTranslateSource!);
  const scrollbarStyles = getScrollbarStyles(themeCode);
  const userStylesheet = viewSettings.userStylesheet!;
  return `${layoutStyles}\n${fontStyles}\n${colorStyles}\n${translationStyles}\n${scrollbarStyles}\n${userStylesheet}`;
};

export const applyTranslationStyle = (viewSettings: ViewSettings) => {
  const styleId = "translation-style";

  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  const styleElement = document.createElement("style");
  styleElement.id = styleId;
  styleElement.textContent = getTranslationStyles(viewSettings.showTranslateSource);

  document.head.appendChild(styleElement);
};

export const transformStylesheet = (vw: number, vh: number, css: string) => {
  const isMobile = ["ios", "android"].includes(getOSPlatform());
  const fontScale = isMobile ? 1.25 : 1;
  const ruleRegex = /([^{]+)({[^}]+})/g;
  css = css.replace(ruleRegex, (match, selector, block) => {
    const hasTextAlignCenter = /text-align\s*:\s*center\s*[;$]/.test(block);
    const hasTextIndentZero = /text-indent\s*:\s*0(?:\.0+)?(?:px|em|rem|%)?\s*[;$]/.test(block);

    if (hasTextAlignCenter) {
      block = block.replace(/(text-align\s*:\s*center)(\s*;|\s*$)/g, "$1 !important$2");
      if (hasTextIndentZero) {
        block = block.replace(/(text-indent\s*:\s*0(?:\.0+)?(?:px|em|rem|%)?)(\s*;|\s*$)/g, "$1 !important$2");
      }
      return selector + block;
    }
    return match;
  });
  // replace absolute font sizes with rem units
  // replace vw and vh as they cause problems with layout
  // replace hardcoded colors
  css = css
    .replace(/font-size\s*:\s*xx-small/gi, "font-size: 0.6rem")
    .replace(/font-size\s*:\s*x-small/gi, "font-size: 0.75rem")
    .replace(/font-size\s*:\s*small/gi, "font-size: 0.875rem")
    .replace(/font-size\s*:\s*medium/gi, "font-size: 1rem")
    .replace(/font-size\s*:\s*large/gi, "font-size: 1.2rem")
    .replace(/font-size\s*:\s*x-large/gi, "font-size: 1.5rem")
    .replace(/font-size\s*:\s*xx-large/gi, "font-size: 2rem")
    .replace(/font-size\s*:\s*xxx-large/gi, "font-size: 3rem")
    .replace(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi, (_, px) => {
      const rem = Number.parseFloat(px) / fontScale / 16;
      return `font-size: ${rem}rem`;
    })
    .replace(/font-size\s*:\s*(\d+(?:\.\d+)?)pt/gi, (_, pt) => {
      const rem = Number.parseFloat(pt) / fontScale / 12;
      return `font-size: ${rem}rem`;
    })
    .replace(/(\d*\.?\d+)vw/gi, (_, d) => `${(Number.parseFloat(d) * vw) / 100}px`)
    .replace(/(\d*\.?\d+)vh/gi, (_, d) => `${(Number.parseFloat(d) * vh) / 100}px`)
    .replace(/[\s;]color\s*:\s*black/gi, "color: var(--theme-fg-color)")
    .replace(/[\s;]color\s*:\s*#000000/gi, "color: var(--theme-fg-color)")
    .replace(/[\s;]color\s*:\s*#000/gi, "color: var(--theme-fg-color)")
    .replace(/[\s;]color\s*:\s*rgb\(0,\s*0,\s*0\)/gi, "color: var(--theme-fg-color)");
  return css;
};

export const applyImageStyle = (document: Document) => {
  document.querySelectorAll("img").forEach((img) => {
    const parent = img.parentNode;
    if (!parent || parent.nodeType !== Node.ELEMENT_NODE) return;
    const hasTextSiblings = Array.from(parent.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (hasTextSiblings) {
      img.classList.add("has-text-siblings");
    }
  });
};

export const applyFixedlayoutStyles = (document: Document, viewSettings: ViewSettings, themeCode?: ThemeCode) => {
  if (!themeCode) {
    themeCode = getThemeCode();
  }
  const { bg, fg, primary, isDarkMode } = themeCode;
  const overrideColor = viewSettings.overrideColor!;
  const invertImgColorInDark = viewSettings.invertImgColorInDark!;

  const existingStyleId = "fixed-layout-styles";
  let style = document.getElementById(existingStyleId) as HTMLStyleElement;
  if (style) {
    style.remove();
  }
  style = document.createElement("style");
  style.id = existingStyleId;
  style.textContent = `
    html {
      --theme-bg-color: ${bg};
      --theme-fg-color: ${fg};
      --theme-primary-color: ${primary};
      color-scheme: ${isDarkMode ? "dark" : "light"};
    }
    body {
      position: relative;
      background-color: var(--theme-bg-color);
    }
    img, canvas {
      ${isDarkMode && invertImgColorInDark ? "filter: invert(100%);" : ""}
      ${!isDarkMode && overrideColor ? "mix-blend-mode: multiply;" : ""}
    }
    img.singlePage {
      position: relative;
    }
  `;
  document.head.appendChild(style);
};
