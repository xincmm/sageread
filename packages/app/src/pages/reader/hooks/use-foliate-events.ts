import type { FoliateView } from "@/types/view";
import { useEffect } from "react";

type FoliateEventHandler = {
  onLoad?: (event: Event) => void;
  onRelocate?: (event: Event) => void;
  onLinkClick?: (event: Event) => void;
  onRendererRelocate?: (event: Event) => void;
  onDrawAnnotation?: (event: Event) => void;
  onShowAnnotation?: (event: Event) => void;
};

export const useFoliateEvents = (view: FoliateView | null, handlers?: FoliateEventHandler) => {
  const onLoad = handlers?.onLoad;
  const onRelocate = handlers?.onRelocate;
  const onLinkClick = handlers?.onLinkClick;
  const onRendererRelocate = handlers?.onRendererRelocate;
  const onDrawAnnotation = handlers?.onDrawAnnotation;
  const onShowAnnotation = handlers?.onShowAnnotation;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!view) return;
    if (onLoad) view.addEventListener("load", onLoad);
    if (onRelocate) view.addEventListener("relocate", onRelocate);
    if (onLinkClick) view.addEventListener("link", onLinkClick);
    if (onRendererRelocate) view.renderer.addEventListener("relocate", onRendererRelocate);
    if (onDrawAnnotation) view.addEventListener("draw-annotation", onDrawAnnotation);
    if (onShowAnnotation) view.addEventListener("show-annotation", onShowAnnotation);

    return () => {
      if (onLoad) view.removeEventListener("load", onLoad);
      if (onRelocate) view.removeEventListener("relocate", onRelocate);
      if (onLinkClick) view.removeEventListener("link", onLinkClick);
      if (onRendererRelocate) view.renderer.removeEventListener("relocate", onRendererRelocate);
      if (onDrawAnnotation) view.removeEventListener("draw-annotation", onDrawAnnotation);
      if (onShowAnnotation) view.removeEventListener("show-annotation", onShowAnnotation);
    };
  }, [view]);
};
