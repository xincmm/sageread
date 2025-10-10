export interface SimpleBook {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  filePath: string;
  coverPath?: string;

  fileSize: number;
  language: string;

  tags?: string[];

  createdAt: number;
  updatedAt: number;
}

export interface BookUploadData {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  fileSize: number;
  language: string;
  tempFilePath: string;
  coverTempFilePath?: string;
  metadata: any;
  derivedFiles?: Array<{
    tempFilePath: string;
    filename: string;
  }>;
}

export interface BookQueryOptions {
  limit?: number;
  offset?: number;
  searchQuery?: string;
  tags?: string[];
  sortBy?: "title" | "author" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface BookUpdateData {
  title?: string;
  author?: string;
  tags?: string[];
}

export interface BookStatus {
  bookId: string;
  status: "unread" | "reading" | "completed";
  progressCurrent: number;
  progressTotal: number;
  location: string;
  lastReadAt?: number;
  startedAt?: number;
  completedAt?: number;
  metadata?: {
    vectorization?: BookVectorizationMeta;
    [k: string]: any;
  };
  createdAt: number;
  updatedAt: number;
}

export interface BookStatusUpdateData {
  status?: "unread" | "reading" | "completed";
  progressCurrent?: number;
  progressTotal?: number;
  location?: string;
  lastReadAt?: number;
  startedAt?: number;
  completedAt?: number;
  metadata?: {
    vectorization?: BookVectorizationMeta;
    [k: string]: any;
  };
}

export interface BookWithStatus extends SimpleBook {
  status?: BookStatus;
}

export interface BookWithUrls extends SimpleBook {
  fileUrl: string;
  coverUrl?: string;
}

export interface BookWithStatusAndUrls extends BookWithStatus {
  fileUrl: string;
  coverUrl?: string;
}

export type BookFormat = "EPUB" | "PDF" | "MOBI" | "CBZ" | "FB2" | "FBZ";

// ---- Vectorization metadata (stored under book_status.metadata.vectorization) ----
export type VectorizationStatus = "idle" | "processing" | "success" | "failed";

export interface BookVectorizationMeta {
  status: VectorizationStatus;
  model: string;
  dimension: number;
  chunkCount: number;
  version: number;
  startedAt?: number;
  finishedAt?: number;
  updatedAt: number;
}
