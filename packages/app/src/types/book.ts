export type BookFormat = "EPUB" | "PDF" | "MOBI" | "AZW" | "AZW3" | "CBZ" | "FB2" | "FBZ";
export type BookNoteType = "bookmark" | "annotation" | "excerpt";
export type HighlightStyle = "highlight" | "underline" | "squiggly";
export type HighlightColor = "red" | "yellow" | "green" | "blue" | "violet";

export interface Book {
  id: string;
  filePath?: string;
  format: BookFormat;
  title: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;

  uploadedAt?: number | null;
  downloadedAt?: number | null;
  coverDownloadedAt?: number | null;

  lastUpdated?: number; // deprecated in favor of updatedAt
  progress?: [number, number]; // Add progress field: [current, total], 1-based page number
  primaryLanguage?: string;

  baseDir?: string;
}

export interface BookGroupType {
  id: string;
  name: string;
}

export interface PageInfo {
  current: number;
  next?: number;
  total: number;
}

// Remaining time of the book in minutes
export interface TimeInfo {
  section: number;
  total: number;
}

export interface BookNote {
  bookHash?: string;
  id: string;
  type: BookNoteType;
  cfi: string;
  text?: string;
  style?: HighlightStyle;
  color?: HighlightColor;
  note: string;
  context?: {
    before: string;
    after: string;
  };

  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface BooknoteGroup {
  id: number;
  href: string;
  label: string;
  booknotes: BookNote[];
}

export type WritingMode = "auto" | "horizontal-tb" | "horizontal-rl" | "vertical-rl";

export interface BookLayout {
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  marginPx?: number; // deprecated
  compactMarginTopPx: number;
  compactMarginBottomPx: number;
  compactMarginLeftPx: number;
  compactMarginRightPx: number;
  compactMarginPx?: number; // deprecated
  gapPercent: number;
  // Column mode for paginated layout: auto | one | two
  columnMode?: "auto" | "one" | "two";
  scrolled: boolean;
  disableClick: boolean;
  swapClickArea: boolean;
  volumeKeysToFlip: boolean;
  continuousScroll: boolean;
  maxColumnCount: number;
  maxInlineSize: number;
  maxBlockSize: number;
  animated: boolean;
  writingMode: WritingMode;
  vertical: boolean;
  rtl: boolean;
  scrollingOverlap: number;
  allowScript: boolean;
}

export interface BookStyle {
  zoomLevel: number;
  paragraphMargin: number;
  lineHeight: number;
  wordSpacing: number;
  letterSpacing: number;
  textIndent: number;
  fullJustification: boolean;
  hyphenation: boolean;
  invertImgColorInDark: boolean;
  theme: string;
  overrideFont: boolean;
  overrideLayout: boolean;
  overrideColor: boolean;
  codeHighlighting: boolean;
  codeLanguage: string;
  userStylesheet: string;
  userUIStylesheet: string;
}

export interface BookFont {
  serifFont: string;
  sansSerifFont: string;
  monospaceFont: string;
  defaultFont: string;
  defaultCJKFont: string;
  defaultFontSize: number;
  minimumFontSize: number;
  fontWeight: number;
}

export interface ViewConfig {
  sideBarTab: string;
  uiLanguage: string;
  sortedTOC: boolean;

  doubleBorder: boolean;
  borderColor: string;

  showHeader: boolean;
  showFooter: boolean;
  showRemainingTime: boolean;
  showRemainingPages: boolean;
  showPageNumber: boolean;
  showBarsOnScroll: boolean;
}

export interface TTSConfig {
  ttsRate: number;
  ttsVoice: string;
  ttsLocation: string;
}

export interface TranslatorConfig {
  translationEnabled: boolean;
  translationProvider: string;
  translateTargetLang: string;
  showTranslateSource: boolean;
}

export interface ScreenConfig {
  screenOrientation: "auto" | "portrait" | "landscape";
}

export interface ViewSettings
  extends BookLayout,
    BookStyle,
    BookFont,
    ViewConfig,
    TTSConfig,
    TranslatorConfig,
    ScreenConfig {}

export interface BookProgress {
  location: string;
  sectionId: number;
  sectionHref: string;
  sectionLabel: string;
  pageinfo: PageInfo;
  timeinfo: TimeInfo;
  range: Range;
}

export interface BookSearchConfig {
  scope: "book" | "section";
  matchCase: boolean;
  matchWholeWords: boolean;
  matchDiacritics: boolean;
  index?: number;
  query?: string;
  acceptNode?: (node: Node) => number;
}

export interface SearchExcerpt {
  pre: string;
  match: string;
  post: string;
}

export interface BookSearchMatch {
  cfi: string;
  excerpt: SearchExcerpt;
}

export interface BookSearchResult {
  label: string;
  subitems: BookSearchMatch[];
  progress?: number;
}

export interface BookConfig {
  bookHash?: string;
  progress?: [number, number]; // [current pagenum, total pagenum], 1-based page number
  location?: string;
  booknotes?: BookNote[];
  searchConfig?: Partial<BookSearchConfig>;
  viewSettings?: Partial<ViewSettings>;

  lastSyncedAtConfig?: number;
  lastSyncedAtNotes?: number;

  updatedAt: number;
}

export interface BookDataRecord {
  id: string;
  book_hash: string;
  user_id: string;
  updated_at: number | null;
  deleted_at: number | null;
}

export interface BooksGroup {
  id: string;
  name: string;
  books: Book[];

  updatedAt: number;
}
export interface BookContent {
  book: Book;
  file: File;
  config: BookConfig;
}
