import type { BookDoc } from "@/lib/document";
import { DocumentLoader, EXTS } from "@/lib/document";
import type {
  BookQueryOptions,
  BookStatus,
  BookStatusUpdateData,
  BookUpdateData,
  BookUploadData,
  BookVectorizationMeta,
  BookWithStatus,
  BookWithStatusAndUrls,
  SimpleBook,
} from "@/types/simple-book";

export interface TocNode {
  id: string;
  play_order: number;
  title: string;
  src: string;
  children: TocNode[];
}
import { formatAuthors, formatTitle, getPrimaryLanguage } from "@/utils/book";
import { partialMD5 } from "@/utils/md5";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { appDataDir, tempDir } from "@tauri-apps/api/path";
import { join } from "@tauri-apps/api/path";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";

export async function uploadBook(file: File): Promise<SimpleBook> {
  try {
    const format = getBookFormat(file.name);
    if (!["EPUB", "MOBI", "AZW", "AZW3", "CBZ", "FB2", "FBZ"].includes(format)) {
      throw new Error(`不支持的文件格式: ${format}`);
    }

    const bookHash = await partialMD5(file);
    const tempDirPath = await tempDir();
    const tempFileName = `temp_${bookHash}.${format.toLowerCase()}`;
    const tempFilePath = await join(tempDirPath, tempFileName);
    const fileData = await file.arrayBuffer();
    await writeFile(tempFilePath, new Uint8Array(fileData));

    const defaultMetadata = getDefaultMetadata(file.name);
    const bookDoc = shouldParseWithDocumentLoader(format)
      ? await tryParseBookDocument(fileData, file.name)
      : null;
    const metadata = {
      ...defaultMetadata,
      ...(bookDoc?.metadata ?? {}),
    };

    const formattedTitle = formatTitle(metadata.title) || getFileNameWithoutExt(file.name);
    const formattedAuthor = formatAuthors(metadata.author) || "Unknown";
    const normalizedLanguage = normalizeLanguage(metadata.language);
    metadata.language = normalizedLanguage;
    const primaryLanguage = normalizedLanguage || "en";

    let coverTempFilePath: string | undefined;
    if (bookDoc) {
      try {
        const coverBlob = await bookDoc.getCover();
        if (coverBlob) {
          const coverTempFileName = `cover_${bookHash}.jpg`;
          const coverTempPath = await join(tempDirPath, coverTempFileName);
          const coverArrayBuffer = await coverBlob.arrayBuffer();
          await writeFile(coverTempPath, new Uint8Array(coverArrayBuffer));
          coverTempFilePath = coverTempPath;
        }
      } catch (e) {
        console.warn("无法提取封面:", e);
      }
    }

    let derivedFiles: BookUploadData["derivedFiles"];
    if (["MOBI", "AZW", "AZW3"].includes(format) && bookDoc) {
      const derivedEpubPath = await createDerivedEpubFromBookDoc(bookDoc, {
        tempDirPath,
        bookHash,
        title: formattedTitle,
        author: formattedAuthor,
        language: primaryLanguage,
      });
      if (derivedEpubPath) {
        derivedFiles = [
          {
            tempFilePath: derivedEpubPath,
            filename: "book.epub",
          },
        ];
      }
    }

    const uploadData: BookUploadData = {
      id: bookHash,
      title: formattedTitle,
      author: formattedAuthor,
      format,
      fileSize: file.size,
      language: primaryLanguage,
      tempFilePath: tempFilePath,
      coverTempFilePath,
      metadata,
      ...(derivedFiles?.length ? { derivedFiles } : {}),
    };

    const result = await invoke<SimpleBook>("save_book", { data: uploadData });
    return result;
  } catch (error) {
    console.error("书籍上传失败:", error);
    throw new Error(`上传失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

const DOCUMENT_LOADER_SUPPORTED_FORMATS: SimpleBook["format"][] = ["EPUB", "MOBI", "AZW", "AZW3", "CBZ", "FB2", "FBZ"];

function shouldParseWithDocumentLoader(format: SimpleBook["format"]): boolean {
  return DOCUMENT_LOADER_SUPPORTED_FORMATS.includes(format);
}

function getDefaultMetadata(fileName: string) {
  return {
    title: getFileNameWithoutExt(fileName),
    author: "Unknown",
    language: "en",
  };
}

function normalizeLanguage(language: BookDoc["metadata"]["language"], fallback = "en"): string {
  const candidate = Array.isArray(language) ? language.find(isValidLanguageTag) : language;
  return isValidLanguageTag(candidate) ? candidate! : fallback;
}

function isValidLanguageTag(tag: string | undefined | null): tag is string {
  if (!tag) return false;
  try {
    Intl.getCanonicalLocales(tag);
    return true;
  } catch {
    return false;
  }
}

async function tryParseBookDocument(fileData: ArrayBuffer, fileName: string): Promise<BookDoc | null> {
  try {
    return await parseBookDocument(fileData, fileName);
  } catch (error) {
    console.warn("解析书籍文件失败，使用默认元数据:", error);
    return null;
  }
}

interface DerivedEpubOptions {
  tempDirPath: string;
  bookHash: string;
  title: string;
  author: string;
  language: string;
}

interface DerivedChapter {
  title: string;
  content: string;
}

interface SimpleEpubMetadata {
  title: string;
  author: string;
  language: string;
  identifier: string;
}

const DERIVED_ZIP_OPTIONS = {
  lastAccessDate: new Date(0),
  lastModDate: new Date(0),
};

const escapeXml = (str: string) =>
  (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

async function createDerivedEpubFromBookDoc(bookDoc: BookDoc, options: DerivedEpubOptions): Promise<string | null> {
  try {
    const chapters = await extractChaptersFromBookDoc(bookDoc);
    if (!chapters.length) {
      return null;
    }

    const blob = await buildSimpleEpub(chapters, {
      title: options.title,
      author: options.author,
      language: options.language || "en",
      identifier: options.bookHash,
    });
    const arrayBuffer = await blob.arrayBuffer();
    const derivedTempPath = await join(options.tempDirPath, `derived_epub_${options.bookHash}.epub`);
    await writeFile(derivedTempPath, new Uint8Array(arrayBuffer));
    return derivedTempPath;
  } catch (error) {
    console.warn("生成 MOBI 衍生 EPUB 失败:", error);
    return null;
  }
}

async function extractChaptersFromBookDoc(bookDoc: BookDoc): Promise<DerivedChapter[]> {
  const sections = bookDoc.sections ?? [];
  if (!sections.length) return [];

  const serializer = new XMLSerializer();
  const tocTitleMap = buildSectionTitleMap(bookDoc);
  const chapters: DerivedChapter[] = [];

  for (let index = 0; index < sections.length; index++) {
    const section: any = sections[index];
    if (typeof section?.createDocument !== "function") continue;

    try {
      const created = await section.createDocument();
      const doc = ensureDocument(created);
      if (!doc) continue;

      sanitizeChapterDocument(doc);
      const body = doc.querySelector("body");
      const content = body?.innerHTML?.trim() || serializer.serializeToString(doc);
      if (!content) continue;

      const tocLabel = tocTitleMap.get(index);
      const heading = pickHeadingTitle(doc);
      const title = (tocLabel || heading || `第${index + 1}章`).trim() || `第${index + 1}章`;

      chapters.push({
        title,
        content,
      });
    } catch (error) {
      console.warn("读取 MOBI 章节失败:", error);
    }
  }

  return chapters;
}

function ensureDocument(input: unknown): Document | null {
  if (!input) return null;
  if (typeof (input as Document).querySelector === "function") {
    return input as Document;
  }
  if (typeof input === "string") {
    return new DOMParser().parseFromString(input, "application/xhtml+xml");
  }
  if (typeof (input as { toString: () => string }).toString === "function") {
    return new DOMParser().parseFromString((input as { toString: () => string }).toString(), "application/xhtml+xml");
  }
  return null;
}

function buildSectionTitleMap(bookDoc: BookDoc): Map<number, string> {
  const map = new Map<number, string>();
  const tocItems = bookDoc.toc ?? [];
  const splitHref = bookDoc.splitTOCHref?.bind(bookDoc);

  const traverse = (items: any[]) => {
    for (const item of items) {
      if (!item?.href || typeof item.href !== "string") continue;
      if (splitHref) {
        try {
          const parts = splitHref(item.href);
          const ref = parts?.[0];
          if (typeof ref === "number" && !map.has(ref)) {
            const label = typeof item.label === "string" ? item.label.trim() : "";
            if (label) {
              map.set(ref, label);
            }
          }
        } catch {
          // ignore split errors
        }
      }
      if (Array.isArray(item?.subitems) && item.subitems.length) {
        traverse(item.subitems);
      }
    }
  };

  traverse(tocItems);
  return map;
}

function pickHeadingTitle(doc: Document): string | undefined {
  const heading = doc.querySelector("h1, h2, h3, h4, h5, h6");
  return heading?.textContent?.trim() || undefined;
}

function sanitizeChapterDocument(doc: Document): void {
  const removableSelectors = [
    "script",
    "style",
    "link",
    "img",
    "video",
    "audio",
    "source",
    "picture",
    "iframe",
    "object",
    "embed",
    "svg",
  ];

  removableSelectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((el) => el.remove());
  });

  doc.querySelectorAll<HTMLElement>("[src^='blob:']").forEach((el) => el.removeAttribute("src"));
}

async function buildSimpleEpub(chapters: DerivedChapter[], metadata: SimpleEpubMetadata): Promise<Blob> {
  const { ZipWriter, BlobWriter, TextReader } = await import("@zip.js/zip.js");

  const zipWriter = new ZipWriter(new BlobWriter("application/epub+zip"), {
    extendedTimestamp: false,
  });
  await zipWriter.add("mimetype", new TextReader("application/epub+zip"), DERIVED_ZIP_OPTIONS);

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  await zipWriter.add("META-INF/container.xml", new TextReader(containerXml.trim()), DERIVED_ZIP_OPTIONS);

  const manifestItems = chapters
    .map(
      (_, index) =>
        `<item id="chap${index + 1}" href="OEBPS/chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`,
    )
    .join("\n");

  const spineItems = chapters.map((_, index) => `<itemref idref="chap${index + 1}"/>`).join("\n");

  const navPoints = chapters
    .map(
      (chapter, index) => `<navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
  <navLabel><text>${escapeXml(chapter.title)}</text></navLabel>
  <content src="./OEBPS/chapter${index + 1}.xhtml" />
</navPoint>`,
    )
    .join("\n");

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(metadata.identifier)}" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle><text>${escapeXml(metadata.title)}</text></docTitle>
  <docAuthor><text>${escapeXml(metadata.author)}</text></docAuthor>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`;
  await zipWriter.add("toc.ncx", new TextReader(tocNcx.trim()), DERIVED_ZIP_OPTIONS);

  const cssContent = `
body { line-height: 1.6; font-size: 1em; font-family: serif; text-align: justify; }
p { text-indent: 2em; margin: 0; }
h1, h2, h3, h4, h5, h6 { text-indent: 0; }
`;
  await zipWriter.add("style.css", new TextReader(cssContent.trim()), DERIVED_ZIP_OPTIONS);

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]!;
    const chapterContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${metadata.language}">
  <head>
    <title>${escapeXml(chapter.title)}</title>
    <link rel="stylesheet" type="text/css" href="../style.css"/>
  </head>
  <body>${chapter.content}</body>
</html>`;
    await zipWriter.add(`OEBPS/chapter${i + 1}.xhtml`, new TextReader(chapterContent.trim()), DERIVED_ZIP_OPTIONS);
  }

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:language>${escapeXml(metadata.language)}</dc:language>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    <dc:identifier id="book-id">${escapeXml(metadata.identifier)}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestItems}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`;
  await zipWriter.add("content.opf", new TextReader(contentOpf.trim()), DERIVED_ZIP_OPTIONS);

  return zipWriter.close();
}

export async function getBooks(options: BookQueryOptions = {}): Promise<SimpleBook[]> {
  try {
    const result = await invoke<SimpleBook[]>("get_books", { options });
    return result;
  } catch (error) {
    console.error("获取书籍列表失败:", error);
    throw new Error(`获取书籍列表失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function getBookById(id: string): Promise<SimpleBook | null> {
  try {
    const result = await invoke<SimpleBook | null>("get_book_by_id", { id });
    return result;
  } catch (error) {
    console.error("获取书籍详情失败:", error);
    throw new Error(`获取书籍详情失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function convertBookWithStatusUrls(book: BookWithStatus): Promise<BookWithStatusAndUrls> {
  try {
    const appDataDirPath = await appDataDir();
    const absoluteFilePath = book.filePath.startsWith("/") ? book.filePath : `${appDataDirPath}/${book.filePath}`;

    const absoluteCoverPath = book.coverPath
      ? book.coverPath.startsWith("/")
        ? book.coverPath
        : `${appDataDirPath}/${book.coverPath}`
      : undefined;

    const fileUrl = convertFileSrc(absoluteFilePath);
    const coverUrl = absoluteCoverPath ? await createCoverUrl(absoluteCoverPath) : undefined;

    return {
      ...book,
      fileUrl,
      coverUrl,
    };
  } catch (error) {
    console.error("Error converting book URLs for:", book.title, error);
    throw error;
  }
}

export async function loadReadableBookFile(
  book: Pick<SimpleBook, "filePath" | "format">,
  bookId: string,
): Promise<File> {
  const appDataDirPath = await appDataDir();
  const candidates: Array<{ path: string; filename: string }> = [];

  if (book.filePath) {
    const formatKey = book.format as keyof typeof EXTS;
    const defaultExt = EXTS[formatKey] ?? book.format.toLowerCase();
    const originalFilename = book.filePath.split("/").pop() || `book.${defaultExt}`;
    candidates.push({
      path: book.filePath,
      filename: originalFilename,
    });
  }

  if (!candidates.length) {
    throw new Error("书籍文件路径缺失");
  }

  for (const candidate of candidates) {
    const absolutePath = candidate.path.startsWith("/")
      ? candidate.path
      : `${appDataDirPath}/${candidate.path}`;
    try {
      const fileContent = await readFile(absolutePath);
      const buffer = fileContent instanceof Uint8Array ? fileContent : new Uint8Array(fileContent as ArrayBuffer);
      return new File([buffer], candidate.filename, {
        type: getFileMimeType(candidate.filename),
      });
    } catch (error) {
      console.warn(`加载文件失败: ${candidate.path}`, error);
      continue;
    }
  }

  throw new Error("无法加载书籍文件");
}

export async function getBookWithStatusById(id: string): Promise<BookWithStatusAndUrls | null> {
  try {
    const bookWithStatus = await invoke<BookWithStatus | null>("get_book_with_status_by_id", { id });
    if (!bookWithStatus) return null;

    return await convertBookWithStatusUrls(bookWithStatus);
  } catch (error) {
    console.error("获取书籍详情失败:", error);
    throw new Error(`获取书籍详情失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function updateBook(id: string, updateData: BookUpdateData): Promise<SimpleBook> {
  try {
    const result = await invoke<SimpleBook>("update_book", {
      id,
      updateData: {
        ...updateData,
        updatedAt: Date.now(),
      },
    });
    return result;
  } catch (error) {
    console.error("更新书籍失败:", error);
    throw new Error(`更新书籍失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function deleteBook(id: string): Promise<void> {
  try {
    await invoke("delete_book", { id });
  } catch (error) {
    console.error("删除书籍失败:", error);
    throw new Error(`删除书籍失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function searchBooks(
  query: string,
  options: Omit<BookQueryOptions, "searchQuery"> = {},
): Promise<SimpleBook[]> {
  try {
    const searchOptions: BookQueryOptions = {
      ...options,
      searchQuery: query,
    };
    return await getBooks(searchOptions);
  } catch (error) {
    console.error("搜索书籍失败:", error);
    throw new Error(`搜索失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function getBookStatus(bookId: string): Promise<BookStatus | null> {
  try {
    const result = await invoke<BookStatus | null>("get_book_status", { bookId });
    return result;
  } catch (error) {
    console.error("获取书籍状态失败:", error);
    throw new Error(`获取书籍状态失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function updateBookStatus(bookId: string, updateData: BookStatusUpdateData): Promise<BookStatus> {
  try {
    const result = await invoke<BookStatus>("update_book_status", { bookId, updateData });
    return result;
  } catch (error) {
    console.error("更新书籍状态失败:", error);
    throw new Error(`更新书籍状态失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function getBooksWithStatus(options: BookQueryOptions = {}): Promise<BookWithStatus[]> {
  try {
    const result = await invoke<BookWithStatus[]>("get_books_with_status", { options });
    return result;
  } catch (error) {
    console.error("获取书籍列表失败:", error);
    throw new Error(`获取书籍列表失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

// 默认的获取书籍函数，包含状态信息
export const getLibraryBooks = getBooksWithStatus;

export async function updateBookProgress(
  bookId: string,
  current: number,
  total: number,
  location?: string,
): Promise<BookStatus> {
  return updateBookStatus(bookId, {
    progressCurrent: current,
    progressTotal: total,
    location: location || "",
    lastReadAt: Date.now(),
  });
}

export interface EpubIndexReport {
  db_path: string;
  book_title: string;
  book_author: string;
  total_chunks: number;
  vector_dimension: number;
}

export interface EpubIndexResult {
  success: boolean;
  message: string;
  report?: EpubIndexReport;
}

export async function indexEpub(
  bookId: string,
  params: { dimension?: number; embeddingsUrl?: string; model?: string; apiKey?: string | null },
): Promise<EpubIndexResult> {
  const { dimension = 1024, embeddingsUrl, model = "local-embed", apiKey = null } = params;

  const res = await invoke<EpubIndexResult>("plugin:epub|index_epub", {
    bookId,
    dimension,
    embeddingsUrl,
    model,
    apiKey,
  });
  return res;
}

export async function convertBookToMdbook(bookId: string, overwrite = true): Promise<{ outputDir: string }> {
  const res = await invoke<{ success: boolean; message: string; outputDir?: string }>("plugin:epub|convert_to_mdbook", {
    bookId,
    overwrite,
  });
  if (!res?.success || !res.outputDir) {
    throw new Error(res?.message || "转换失败");
  }
  return { outputDir: res.outputDir };
}

// 解析 TOC 目录结构
export async function parseToc(bookId: string): Promise<TocNode[]> {
  console.log("parseToc: bookId=", bookId);
  try {
    const tocNodes = await invoke<TocNode[]>("plugin:epub|parse_toc", {
      bookId,
    });
    return tocNodes;
  } catch (error) {
    console.log("解析 TOC 失败:", error);
    throw new Error(error instanceof Error ? error.message : "解析 TOC 失败");
  }
}

// Merge-update vectorization metadata without clobbering other metadata fields
export async function updateBookVectorizationMeta(
  bookId: string,
  patch: Partial<BookVectorizationMeta>,
): Promise<BookStatus> {
  const current = await getBookStatus(bookId);
  const prevVec = current?.metadata?.vectorization ?? {};
  const nextVec: BookVectorizationMeta = {
    // Defaults if creating from scratch
    status: "idle",
    model: "",
    dimension: 0,
    chunkCount: 0,
    version: 1,
    ...prevVec,
    ...patch,
    updatedAt: Date.now(),
  } as BookVectorizationMeta;

  const newMetadata = {
    ...(current?.metadata ?? {}),
    vectorization: nextVec,
  } as BookStatus["metadata"];

  return updateBookStatus(bookId, { metadata: newMetadata });
}

async function parseBookDocument(fileData: ArrayBuffer, fileName: string): Promise<BookDoc | null> {
  const file = new File([fileData], fileName, {
    type: getFileMimeType(fileName),
  });
  const loader = new DocumentLoader(file);
  const { book } = await loader.open();
  return book ?? null;
}

function getBookFormat(fileName: string): SimpleBook["format"] {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "epub":
      return "EPUB";
    case "pdf":
      return "PDF";
    case "mobi":
      return "MOBI";
    case "azw":
      return "AZW";
    case "azw3":
      return "AZW3";
    case "cbz":
      return "CBZ";
    case "fb2":
      return "FB2";
    case "fbz":
      return "FBZ";
    default:
      return "EPUB";
  }
}

export function getFileMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "epub":
      return "application/epub+zip";
    case "pdf":
      return "application/pdf";
    case "mobi":
      return "application/x-mobipocket-ebook";
    case "azw":
      return "application/vnd.amazon.ebook";
    case "azw3":
      return "application/x-mobi8-ebook";
    case "cbz":
      return "application/vnd.comicbook+zip";
    case "fb2":
      return "application/x-fictionbook+xml";
    case "fbz":
      return "application/x-zip-compressed-fb2";
    default:
      return "application/octet-stream";
  }
}

function getFileNameWithoutExt(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

async function createCoverUrl(path: string): Promise<string | undefined> {
  try {
    const bytes = await readFile(path);
    if (!bytes) return undefined;
    const data = normalizeToUint8Array(bytes);
    if (!data?.length) return undefined;
    const mime = getMimeFromFilename(path);
    return bytesToDataUrl(data, mime);
  } catch (error) {
    console.warn("读取封面文件失败，回退 convertFileSrc:", error);
    try {
      return convertFileSrc(path);
    } catch (err) {
      console.warn("convertFileSrc 加载封面失败:", err);
      return undefined;
    }
  }
}

function normalizeToUint8Array(value: unknown): Uint8Array | undefined {
  if (!value) return undefined;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value);
  return undefined;
}

function bytesToDataUrl(bytes: Uint8Array, mime = "application/octet-stream"): string {
  if (typeof window === "undefined" && typeof Buffer !== "undefined") {
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mime};base64,${base64}`;
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = window.btoa(binary);
  return `data:${mime};base64,${base64}`;
}

function getMimeFromFilename(path: string): string {
  const ext = path.toLowerCase().split(".").pop();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}
