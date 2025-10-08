import type { ViewSettings } from "@/types/book";

export type TransformContext = {
  bookId: string;
  viewSettings: ViewSettings;
  content: string;
  transformers: string[];
  reversePunctuationTransform?: boolean;
};

export type Transformer = {
  name: string;
  transform: (ctx: TransformContext) => Promise<string>;
};
