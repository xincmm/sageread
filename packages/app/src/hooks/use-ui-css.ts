import { useAppSettingsStore } from "@/store/app-settings-store";
import { useEffect, useState } from "react";

// This hook allows you to inject custom CSS into the reader UI.
// Note that the book content is rendered in an iframe, so UI CSS won't affect book rendering.
export const useUICSS = (bookId?: string) => {
  const { settings } = useAppSettingsStore();
  const globalViewSettings = settings.globalViewSettings;
  const [styleElement, setStyleElement] = useState<HTMLStyleElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (styleElement) {
      styleElement.remove();
    }

    const rawCSS = globalViewSettings?.userUIStylesheet || "";

    const newStyleEl = document.createElement("style");
    newStyleEl.textContent = rawCSS.replace("foliate-view", `#foliate-view-${bookId}`);
    document.head.appendChild(newStyleEl);
    setStyleElement(newStyleEl);

    return () => {
      newStyleEl.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalViewSettings?.userUIStylesheet, bookId]);
};
