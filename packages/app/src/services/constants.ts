import type {
  BookFont,
  BookLayout,
  BookSearchConfig,
  BookStyle,
  HighlightColor,
  ScreenConfig,
  TTSConfig,
  TranslatorConfig,
  ViewConfig,
  ViewSettings,
} from "@/types/book";
import type { ReadSettings, SystemSettings } from "@/types/settings";
import type { UserDailyTranslationQuota, UserStorageQuota } from "@/types/user";
import { getDefaultMaxBlockSize, getDefaultMaxInlineSize } from "@/utils/config";
import { stubTranslation as _ } from "@/utils/misc";

export const LOCAL_BOOKS_SUBDIR = "Readest/Books";
export const CLOUD_BOOKS_SUBDIR = "Readest/Books";

// export const SUPPORTED_FILE_EXTS = ["epub", "mobi", "azw", "azw3", "fb2", "zip", "cbz", "pdf", "txt"];
export const SUPPORTED_FILE_EXTS = ["epub"];
export const FILE_ACCEPT_FORMATS = SUPPORTED_FILE_EXTS.map((ext) => `.${ext}`).join(", ");
export const BOOK_UNGROUPED_NAME = "";
export const BOOK_UNGROUPED_ID = "";

export const SUPPORTED_IMAGE_EXTS = ["png", "jpg", "jpeg"];
export const IMAGE_ACCEPT_FORMATS = SUPPORTED_IMAGE_EXTS.map((ext) => `.${ext}`).join(", ");

export const DEFAULT_SYSTEM_SETTINGS: Partial<SystemSettings> = {
  keepLogin: false,
  autoUpload: true,
  alwaysOnTop: false,
  openBookInNewWindow: false,
  alwaysShowStatusBar: false,
  autoCheckUpdates: true,
  screenWakeLock: false,
  openLastBooks: false,
  lastOpenBooks: [],
  autoImportBooksOnOpen: false,
  telemetryEnabled: true,
  libraryViewMode: "grid",
  librarySortBy: "updated",
  librarySortAscending: false,
  libraryCoverFit: "crop",

  lastSyncedAtBooks: 0,
  lastSyncedAtConfigs: 0,
  lastSyncedAtNotes: 0,
  uiFontFamily: "",
  uiFontSize: 14,
  uiFontWeight: 400,
};

export const DEFAULT_READSETTINGS: ReadSettings = {
  sideBarWidth: "15%",
  isSideBarPinned: false,
  notebookWidth: "25%",
  isNotebookPinned: false,
  autohideCursor: true,
  translationProvider: "deepl",
  translateTargetLang: "EN",

  customThemes: [],
  highlightStyle: "highlight",
  highlightStyles: {
    highlight: "yellow",
    underline: "green",
    squiggly: "blue",
  },
};

export const DEFAULT_MOBILE_READSETTINGS: Partial<ReadSettings> = {
  sideBarWidth: "25%",
  isSideBarPinned: false,
};

export const DEFAULT_BOOK_FONT: BookFont = {
  serifFont: "Georgia",
  sansSerifFont: "Helvetica",
  monospaceFont: "Consolas",
  defaultFont: "Serif",
  defaultCJKFont: "ChillHuoFangSong",
  defaultFontSize: 16,
  minimumFontSize: 8,
  fontWeight: 400,
};

export const DEFAULT_BOOK_LAYOUT: BookLayout = {
  marginTopPx: 44,
  marginBottomPx: 44,
  marginLeftPx: 16,
  marginRightPx: 16,
  compactMarginTopPx: 16,
  compactMarginBottomPx: 16,
  compactMarginLeftPx: 16,
  compactMarginRightPx: 16,
  gapPercent: 5,
  columnMode: "auto",
  scrolled: true,
  disableClick: true,
  swapClickArea: false,
  volumeKeysToFlip: false,
  continuousScroll: false,
  maxColumnCount: 2,
  maxInlineSize: getDefaultMaxInlineSize(),
  maxBlockSize: getDefaultMaxBlockSize(),
  animated: false,
  writingMode: "auto",
  vertical: false,
  rtl: false,
  scrollingOverlap: 0,
  allowScript: false,
};

export const DEFAULT_BOOK_STYLE: BookStyle = {
  zoomLevel: 100,
  paragraphMargin: 1,
  lineHeight: 1.6,
  wordSpacing: 0,
  letterSpacing: 0,
  textIndent: 0,
  fullJustification: true,
  hyphenation: true,
  invertImgColorInDark: false,
  theme: "light",
  overrideFont: true,
  overrideLayout: false,
  overrideColor: false,
  codeHighlighting: false,
  codeLanguage: "auto-detect",
  userStylesheet: "",
  userUIStylesheet: "",
};

export const DEFAULT_MOBILE_VIEW_SETTINGS: Partial<ViewSettings> = {
  fullJustification: false,
  animated: true,
  defaultFont: "Sans-serif",
  marginBottomPx: 16,
};

export const DEFAULT_CJK_VIEW_SETTINGS: Partial<ViewSettings> = {
  fullJustification: true,
  textIndent: 2,
};

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  sideBarTab: "toc",
  uiLanguage: "",
  sortedTOC: false,

  doubleBorder: false,
  borderColor: "red",

  showHeader: true,
  showFooter: true,
  showBarsOnScroll: false,
  showRemainingTime: false,
  showRemainingPages: false,
  showPageNumber: true,
};

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  ttsRate: 1.3,
  ttsVoice: "",
  ttsLocation: "",
};

export const DEFAULT_TRANSLATOR_CONFIG: TranslatorConfig = {
  translationEnabled: false,
  translationProvider: "deepl",
  translateTargetLang: "",
  showTranslateSource: true,
};

export const DEFAULT_SCREEN_CONFIG: ScreenConfig = {
  screenOrientation: "auto",
};

export const DEFAULT_BOOK_SEARCH_CONFIG: BookSearchConfig = {
  scope: "book",
  matchCase: false,
  matchWholeWords: false,
  matchDiacritics: false,
};

export const SYSTEM_SETTINGS_VERSION = 1;

export const SERIF_FONTS = ["Georgia", "Times New Roman"];

export const NON_FREE_FONTS = ["Georgia", "Times New Roman"];

export const CJK_SERIF_FONTS = [_("ChillHuoFangSong")];

export const CJK_SANS_SERIF_FONTS: string[] = [];

// 精选字体列表 - 类似微信读书的简化选择
export const CURATED_FONTS = [
  {
    id: "system",
    name: "系统默认",
    nameEn: "System Default",
    serif: "system-ui",
    sansSerif: "system-ui",
    cjk: "system-ui",
  },
  {
    id: "comfortable",
    name: "寒蝉活宋体",
    nameEn: "ChillHuoFangSong",
    serif: "Georgia",
    sansSerif: "Helvetica",
    cjk: "ChillHuoFangSong",
  },
  {
    id: "classic",
    name: "经典衬线",
    nameEn: "Classic Serif",
    serif: "Times New Roman",
    sansSerif: "Arial",
    cjk: "SimSun",
  },
  {
    id: "modern",
    name: "现代无衬线",
    nameEn: "Modern Sans",
    serif: "Helvetica",
    sansSerif: "Helvetica",
    cjk: "PingFang SC",
  },
  {
    id: "elegant",
    name: "优雅楷体",
    nameEn: "Elegant",
    serif: "Georgia",
    sansSerif: "Helvetica",
    cjk: "STKaiti",
  },
];

export const FONT_SIZE_PRESETS = [
  { label: "较小", size: 14 },
  { label: "标准", size: 16 },
  { label: "较大", size: 18 },
  { label: "大", size: 20 },
  { label: "超大", size: 24 },
];

export const SANS_SERIF_FONTS = ["Helvetica", "Arial"];

export const MONOSPACE_FONTS = ["Consolas", "Courier New"];

export const FALLBACK_FONTS: string[] = [];

export const WINDOWS_FONTS = [
  "Arial",
  "Arial Black",
  "Bahnschrift",
  "Calibri",
  "Cambria",
  "Cambria Math",
  "Candara",
  "ChillHuoFangSong",
  "Comic Sans MS",
  "Consolas",
  "Constantia",
  "Corbel",
  "Courier New",
  "Ebrima",
  "FangSong",
  "Franklin Gothic Medium",
  "Gabriola",
  "Gadugi",
  "Georgia",
  "Heiti",
  "HoloLens MDL2 Assets",
  "Impact",
  "Ink Free",
  "Javanese Text",
  "KaiTi",
  "Leelawadee UI",
  "Lucida Console",
  "Lucida Sans Unicode",
  "Malgun Gothic",
  "Marlett",
  "Microsoft Himalaya",
  "Microsoft JhengHei",
  "Microsoft New Tai Lue",
  "Microsoft PhagsPa",
  "Microsoft Sans Serif",
  "Microsoft Tai Le",
  "Microsoft YaHei",
  "Microsoft Yi Baiti",
  "MingLiU",
  "MingLiU-ExtB",
  "Mongolian Baiti",
  "MS Gothic",
  "MS Mincho",
  "MV Boli",
  "Myanmar Text",
  "Nirmala UI",
  "NSimSun",
  "Palatino Linotype",
  "PMingLiU",
  "Segoe MDL2 Assets",
  "Segoe Print",
  "Segoe Script",
  "Segoe UI",
  "Segoe UI Historic",
  "Segoe UI Emoji",
  "Segoe UI Symbol",
  "SimHei",
  "SimSun",
  "SimSun-ExtB",
  "Sitka",
  "Sylfaen",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "XiHeiti",
  "Yu Gothic",
  "Yu Mincho",
];

export const MACOS_FONTS = [
  "American Typewriter",
  "Andale Mono",
  "Arial",
  "Arial Black",
  "Arial Narrow",
  "Arial Rounded MT Bold",
  "Arial Unicode MS",
  "Avenir",
  "Avenir Next",
  "Avenir Next Condensed",
  "Baskerville",
  "BiauKai",
  "Big Caslon",
  "Bodoni 72",
  "Bodoni 72 Oldstyle",
  "Bodoni 72 Smallcaps",
  "Bradley Hand",
  "Brush Script MT",
  "Chalkboard",
  "Chalkboard SE",
  "Chalkduster",
  "Charter",
  "ChillHuoFangSong",
  "Cochin",
  "Comic Sans MS",
  "Copperplate",
  "Courier",
  "Courier New",
  "Didot",
  "DIN Alternate",
  "DIN Condensed",
  "FangSong",
  "Futura",
  "Geneva",
  "Georgia",
  "Gill Sans",
  "Heiti SC",
  "Heiti TC",
  "Helvetica",
  "Helvetica Neue",
  "Herculanum",
  "Hiragino Sans",
  "Hiragino Mincho",
  "Hoefler Text",
  "Impact",
  "Kaiti SC",
  "Kaiti TC",
  "Kozuka Gothic Pro",
  "Kozuka Mincho Pro",
  "Lucida Grande",
  "Luminari",
  "Marker Felt",
  "Menlo",
  "Microsoft Sans Serif",
  "Monaco",
  "Noteworthy",
  "Optima",
  "Palatino",
  "Papyrus",
  "PingFang HK",
  "PingFang SC",
  "PingFang TC",
  "Phosphate",
  "Rockwell",
  "Savoye LET",
  "SignPainter",
  "Skia",
  "Snell Roundhand",
  "Songti SC",
  "Songti TC",
  "STFangsong",
  "STKaiti",
  "STSong",
  "STXihei",
  "Tahoma",
  "Times",
  "Times New Roman",
  "Trattatello",
  "Trebuchet MS",
  "Verdana",
  "XiHeiti",
  "Yu Mincho",
  "Zapfino",
];

export const LINUX_FONTS = [
  "Arial",
  "Cantarell",
  "ChillHuoFangSong",
  "Comic Sans MS",
  "Courier New",
  "DejaVu Sans",
  "DejaVu Sans Mono",
  "DejaVu Serif",
  "Droid Sans",
  "Droid Sans Mono",
  "FangSong",
  "FreeMono",
  "FreeSans",
  "FreeSerif",
  "Georgia",
  "Heiti",
  "Impact",
  "Kaiti",
  "Liberation Mono",
  "Liberation Sans",
  "Liberation Serif",
  "Noto Mono",
  "Noto Sans",
  "Noto Sans JP",
  "Noto Sans CJK SC",
  "Noto Sans CJK TC",
  "Noto Serif",
  "Noto Serif JP",
  "Noto Serif CJK SC",
  "Noto Serif CJK TC",
  "Sazanami Gothic",
  "Sazanami Mincho",
  "Source Han Sans",
  "Source Han Serif",
  "Times New Roman",
  "Ubuntu",
  "Ubuntu Mono",
  "WenQuanYi Micro Hei",
  "WenQuanYi Zen Hei",
  "XiHeiti",
];

export const IOS_FONTS = [
  "Avenir",
  "Avenir Next",
  "ChillHuoFangSong",
  "Courier",
  "Courier New",
  "FangSong",
  "Georgia",
  "Heiti",
  "Helvetica",
  "Helvetica Neue",
  "Hiragino Mincho",
  "Hiragino Sans",
  "Kaiti",
  "Palatino",
  "PingFang SC",
  "PingFang TC",
  "San Francisco",
  "SF Pro Display",
  "SF Pro Rounded",
  "SF Pro Text",
  "Songti",
  "Times New Roman",
  "Verdana",
  "XiHeiti",
];

export const ANDROID_FONTS = [
  "Arial",
  "ChillHuoFangSong",
  "Droid Sans",
  "Droid Serif",
  "FangSong",
  "FZLanTingHei",
  "Georgia",
  "Heiti",
  "Kaiti",
  "Noto Sans",
  "Noto Sans CJK",
  "Noto Sans JP",
  "Noto Serif",
  "Noto Serif CJK",
  "Noto Serif JP",
  "PingFang SC",
  "Roboto",
  "Source Han Sans",
  "Source Han Serif",
  "STHeiti",
  "STSong",
  "Tahoma",
  "Verdana",
  "XiHeiti",
];

export const CJK_NAMES_PATTENS = /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;
export const CJK_EXCLUDE_PATTENS = new RegExp(
  ["AlBayan", "STIX", "Kailasa", "ITCTT", "Luminari", "Myanmar"].join("|"),
  "i",
);
export const CJK_FONTS_PATTENS = new RegExp(
  [
    "CJK",
    "TC$",
    "SC$",
    "HK",
    "JP",
    "TW",
    "Sim",
    "Kai",
    "Hei",
    "Yan",
    "Min",
    "Khai",
    "Yuan",
    "Song",
    "Ming",
    "FZ",
    "Huiwen",
    "KingHwa",
    "FangZheng",
    "WenQuanYi",
    "PingFang",
    "Hiragino",
    "Meiryo",
    "Source\\s?Han",
    "Yu\\s?Gothic",
    "Yu\\s?Mincho",
    "Mincho",
    "Nanum",
    "Malgun",
    "Gulim",
    "Dotum",
    "Batang",
    "Gungsuh",
    "OPPO sans",
    "ChillHuoFangSong",
    "Chill",
  ].join("|"),
  "i",
);

export const BOOK_IDS_SEPARATOR = "+";

export const DOWNLOAD_READEST_URL = "https://readest.com?utm_source=readest_web";

export const READEST_WEB_BASE_URL = "https://web.readest.com";

const LATEST_DOWNLOAD_BASE_URL = "https://download.readest.com/releases";

export const READEST_UPDATER_FILE = `${LATEST_DOWNLOAD_BASE_URL}/latest.json`;

export const READEST_CHANGELOG_FILE = `${LATEST_DOWNLOAD_BASE_URL}/release-notes.json`;

export const SYNC_PROGRESS_INTERVAL_SEC = 3;
export const SYNC_NOTES_INTERVAL_SEC = 5;
export const SYNC_BOOKS_INTERVAL_SEC = 5;
export const CHECK_UPDATE_INTERVAL_SEC = 24 * 60 * 60;

export const RELOAD_BEFORE_SAVED_TIMEOUT_MS = 300;

export const MAX_ZOOM_LEVEL = 500;
export const MIN_ZOOM_LEVEL = 50;
export const ZOOM_STEP = 10;

export const DEFAULT_STORAGE_QUOTA: UserStorageQuota = {
  free: 500 * 1024 * 1024,
  plus: 2 * 1024 * 1024 * 1024,
  pro: 10 * 1024 * 1024 * 1024,
};

export const DEFAULT_DAILY_TRANSLATION_QUOTA: UserDailyTranslationQuota = {
  free: 10 * 1024,
  plus: 100 * 1024,
  pro: 500 * 1024,
};

export const DOUBLE_CLICK_INTERVAL_THRESHOLD_MS = 250;
export const DISABLE_DOUBLE_CLICK_ON_MOBILE = true;
export const LONG_HOLD_THRESHOLD = 500;

export const HIGHLIGHT_COLOR_HEX: Record<HighlightColor, string> = {
  red: "#f87171", // red-400
  yellow: "#facc15", // yellow-400
  green: "#4ade80", // green-400
  blue: "#60a5fa", // blue-400
  violet: "#a78bfa", // violet-400
};

// 带透明度的高亮颜色（用于列表显示，匹配 overlayer 的 0.3 opacity）
export const HIGHLIGHT_COLOR_RGBA: Record<HighlightColor, string> = {
  red: "rgba(248, 113, 113, 0.3)", // red-400 with 30% opacity
  yellow: "rgba(250, 204, 21, 0.3)", // yellow-400 with 30% opacity
  green: "rgba(74, 222, 128, 0.3)", // green-400 with 30% opacity
  blue: "rgba(96, 165, 250, 0.3)", // blue-400 with 30% opacity
  violet: "rgba(167, 139, 250, 0.3)", // violet-400 with 30% opacity
};

export const CUSTOM_THEME_TEMPLATES = [
  {
    light: {
      fg: "#2b2b2b",
      bg: "#f3f3f3",
      primary: "#3c5a72",
    },
    dark: {
      fg: "#d0d0d0",
      bg: "#1a1c1f",
      primary: "#486e8a",
    },
  },
  {
    light: {
      fg: "#3f2f3c",
      bg: "#f5ecf8",
      primary: "#7b5291",
    },
    dark: {
      fg: "#d6cadd",
      bg: "#3a2c3d",
      primary: "#bda0cc",
    },
  },
  {
    light: {
      fg: "#2b2b2b",
      bg: "#defcd9",
      primary: "#00796b",
    },
    dark: {
      fg: "#c8e6c9",
      bg: "#273c33",
      primary: "#26a69a",
    },
  },
];

export const MIGHT_BE_RTL_LANGS = ["zh", "ja", "ko", "ar", "he", "fa", "ur", "dv", "ps", "sd", "yi", ""];

export const TRANSLATED_LANGS = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  nl: "Nederlands",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  pt: "Português",
  ru: "Русский",
  ar: "العربية",
  el: "Ελληνικά",
  uk: "Українська",
  pl: "Polski",
  tr: "Türkçe",
  hi: "हिन्दी",
  id: "Indonesia",
  vi: "Tiếng Việt",
  th: "ภาษาไทย",
  "zh-CN": "简体中文",
  "zh-TW": "正體中文",
};

export const SUPPORTED_LANGS: Record<string, string> = { ...TRANSLATED_LANGS, zh: "中文" };
