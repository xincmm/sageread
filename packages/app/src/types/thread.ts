import type { UIMessage } from "ai";

export interface Thread {
  id: string;
  book_id: string | null;
  title: string;
  metadata: string;
  messages: UIMessage[];
  created_at: number;
  updated_at: number;
}

export interface RawThread {
  id: string;
  book_id: string | null;
  title: string;
  metadata: string;
  messages: string;
  created_at: number;
  updated_at: number;
}

export interface ThreadSummary {
  id: string;
  book_id: string | null;
  title: string;
  message_count: number;
  created_at: number;
  updated_at: number;
}
