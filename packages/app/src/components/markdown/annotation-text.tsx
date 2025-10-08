import React, { type ElementType, type ReactNode } from "react";
import { AnnotationPopover } from "./annotation-popover";
import { parseAnnotations } from "./annotation-utils";

type TagLike = ElementType;
type Props = Record<string, any>;

const AnnotationMark: React.FC<{ numberStr: string }> = ({ numberStr }) => (
  <AnnotationPopover chunkId={numberStr}>
    <span className="mx-1 cursor-pointer rounded-full bg-muted px-1.5 py-0.5 text-primary text-sm hover:underline">
      {numberStr}
    </span>
  </AnnotationPopover>
);

function renderAnnotatedText(text: string, keyPrefix: string): ReactNode {
  const parts = parseAnnotations(text);
  if (parts.length === 1 && typeof parts[0] === "string") return parts[0];
  return parts.map((part, i) =>
    typeof part === "string" ? part : <AnnotationMark key={`${keyPrefix}-${i}`} numberStr={part.number} />,
  );
}

export function processTextWithAnnotations(children: ReactNode, props?: Props, TagComponent: TagLike = "span") {
  const flatChildren = React.Children.toArray(children);
  if (
    flatChildren.length === 1 &&
    typeof flatChildren[0] === "string" &&
    (() => {
      const parts = parseAnnotations(flatChildren[0] as string);
      return parts.length === 1 && typeof parts[0] === "string";
    })()
  ) {
    return <TagComponent {...props}>{flatChildren[0]}</TagComponent>;
  }

  const processed = flatChildren.map((child, idx) => {
    if (typeof child === "string") {
      return renderAnnotatedText(child, String(idx));
    }
    return child;
  });

  return <TagComponent {...props}>{processed}</TagComponent>;
}
