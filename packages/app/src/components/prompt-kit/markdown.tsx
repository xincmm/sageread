import { processTextWithAnnotations } from "@/components/markdown";
import { cn } from "@/lib/utils";
import { getFullPathFromAppData } from "@/utils/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { marked } from "marked";
import { memo, useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import { CodeBlock, CodeBlockCode } from "./code-block";

export type MarkdownProps = {
  children: string;
  id?: string;
  className?: string;
  components?: Partial<Components>;
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "plaintext";
}

// 检查是否是相对于appDataDir的路径
function isAppDataRelativePath(src: string): boolean {
  return src.startsWith("books/");
}

const INITIAL_COMPONENTS: Partial<Components> = {
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line || props.node?.position?.start.line === props.node?.position?.end.line;

    if (isInline) {
      return (
        <span className={cn("rounded-sm bg-primary-foreground px-1 font-mono text-sm", className)} {...props}>
          {children}
        </span>
      );
    }

    const language = extractLanguage(className);

    return (
      <CodeBlock className={className}>
        <CodeBlockCode code={children as string} language={language} />
      </CodeBlock>
    );
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>;
  },
  text: function TextComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "span");
  },
  span: function SpanComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "span");
  },
  p: function ParagraphComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "p");
  },
  div: function DivComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "div");
  },
  strong: function StrongComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "strong");
  },
  em: function EmComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "em");
  },
  li: function LiComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "li");
  },
  ul: function UlComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "ul");
  },
  ol: function OlComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "ol");
  },
  blockquote: function BlockquoteComponent({ children, ...props }) {
    return processTextWithAnnotations(children, props, "blockquote");
  },
  h1: function H1Component({ children, ...props }) {
    return processTextWithAnnotations(children, props, "h1");
  },
  h2: function H2Component({ children, ...props }) {
    return processTextWithAnnotations(children, props, "h2");
  },
  h3: function H3Component({ children, ...props }) {
    return processTextWithAnnotations(children, props, "h3");
  },
  h4: function H4Component({ children, ...props }) {
    return processTextWithAnnotations(children, props, "h4");
  },
  h5: function H5Component({ children, ...props }) {
    return processTextWithAnnotations(children, props, "h5");
  },
  h6: function H6Component({ children, ...props }) {
    return processTextWithAnnotations(children, props, "h6");
  },
};

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string;
    components?: Partial<Components>;
  }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks, remarkCjkFriendly]} components={components}>
        {content}
      </ReactMarkdown>
    );
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content;
  },
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

function MarkdownComponent({ children, id, className, components }: MarkdownProps) {
  const generatedId = useId();
  const blockId = id ?? generatedId;
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);

  const finalComponents = useMemo(() => {
    const imgComponent = function ImgComponent({
      src,
      alt,
      ...props
    }: { src?: string; alt?: string; [key: string]: any }) {
      const [resolvedSrc, setResolvedSrc] = useState<string>(src || "");

      useEffect(() => {
        if (!src) {
          return;
        }

        // 处理相对于appDataDir的路径
        if (isAppDataRelativePath(src)) {
          getFullPathFromAppData(src)
            .then((fullPath) => {
              const tauriSrc = convertFileSrc(fullPath);
              setResolvedSrc(tauriSrc);
            })
            .catch((error) => {
              console.warn(`Failed to resolve app-data path: ${src}`, error);
              setResolvedSrc(src);
            });
        } else {
          // 其他路径直接使用
          setResolvedSrc(src);
        }
      }, [src]);

      return <img src={resolvedSrc} alt={alt} {...props} />;
    };

    return {
      ...INITIAL_COMPONENTS,
      img: imgComponent,
      ...components,
    };
  }, [components]);

  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock key={`${blockId}-block-${index}`} content={block} components={finalComponents} />
      ))}
    </div>
  );
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = "Markdown";

export { Markdown };
