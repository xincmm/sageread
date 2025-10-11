/// <reference types="vite/client" />

// Type augmentations for better TypeScript support
declare module "foliate-js/epubcfi.js" {
  export function collapse(location: any, end?: boolean): string;
  export function compare(cfi1: string, cfi2: string): number;
}

declare module "foliate-js/overlayer.js" {
  export const Overlayer: {
    highlight: any;
    underline: any;
    squiggly: any;
  };
}

declare module "foliate-js/footnotes.js" {
  export class FootnoteHandler {
    handle(bookDoc: BookDoc, event: Event): Promise<void>;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }
}

declare module "foliate-js/view.js" {
  export function wrappedFoliateView(element: Element): any;
}

declare module "foliate-js/comic-book.js" {
  export function makeComicBook(loader: any, file: File): Promise<any>;
}

declare module "foliate-js/fb2.js" {
  export function makeFB2(file: File | Blob): Promise<any>;
}

declare module "foliate-js/epub.js" {
  export class EPUB {
    constructor(loader: any);
    init(): Promise<any>;
  }
}

declare module "foliate-js/pdf.js" {
  export function makePDF(file: File): Promise<any>;
}


declare module "foliate-js/mobi.js" {
  export function isMOBI(file: File): Promise<boolean>;
  export class MOBI {
    constructor(options: { unzlib: any });
    open(file: File): Promise<any>;
  }
}

declare module "foliate-js/vendor/fflate.js" {
  export const unzlibSync: any;
}
