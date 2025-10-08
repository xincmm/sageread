import type { ViewSettings } from "@/types/book";
import type { FoliateView } from "@/types/view";
import { getMaxInlineSize } from "@/utils/config";
import { getStyles } from "@/utils/style";

export interface LayoutDimensions {
  width: number;
  height: number;
}

export class StyleManager {
  private currentSettings: ViewSettings;
  private currentStyles: any;
  private lastUpdateTime = 0;
  private updateDebounceTimer: NodeJS.Timeout | null = null;

  constructor(
    private view: FoliateView,
    initialSettings: ViewSettings,
  ) {
    this.currentSettings = { ...initialSettings };
    this.currentStyles = {};
  }

  updateSettings(newSettings: Partial<ViewSettings>): void {
    const changed = Object.keys(newSettings).some(
      (key) => this.currentSettings[key as keyof ViewSettings] !== newSettings[key as keyof ViewSettings],
    );

    if (changed) {
      this.currentSettings = { ...this.currentSettings, ...newSettings };
      this.applyStyles();
    }
  }

  updateLayout(dimensions: LayoutDimensions): void {
    if (!this.view?.renderer) return;

    const layout = this.calculateLayout(dimensions);

    // Apply layout attributes
    this.view.renderer.setAttribute("max-column-count", String(layout.maxColumnCount));
    this.view.renderer.setAttribute("max-inline-size", `${layout.maxInlineSize}px`);
    this.view.renderer.setAttribute("max-block-size", `${layout.maxBlockSize}px`);
    this.view.renderer.setAttribute("gap", `${this.currentSettings.gapPercent || 4}%`);

    // Apply flow mode
    if (this.currentSettings.scrolled) {
      this.view.renderer.setAttribute("flow", "scrolled");
    } else {
      this.view.renderer.removeAttribute("flow");
    }

    // Apply animation
    if (this.currentSettings.animated) {
      this.view.renderer.setAttribute("animated", "");
    } else {
      this.view.renderer.removeAttribute("animated");
    }
  }

  private calculateLayout(dimensions: LayoutDimensions): {
    maxColumnCount: number;
    maxInlineSize: number;
    maxBlockSize: number;
  } {
    const isVertical = !!this.currentSettings.vertical;
    const containerSize = isVertical ? dimensions.height : dimensions.width;
    const blockSize = isVertical ? dimensions.width : dimensions.height;

    const gapPercent = this.currentSettings.gapPercent || 4;
    const g = 1 / 100;
    const gapPx = (-g / (g - 1)) * containerSize * (gapPercent / 100);

    let computedMaxInlineSize = this.currentSettings.maxInlineSize || getMaxInlineSize(this.currentSettings);
    let computedMaxColumnCount = this.currentSettings.maxColumnCount || 2;
    const computedMaxBlockSize = this.currentSettings.maxBlockSize || Math.max(blockSize, 1440);
    const columnMode = this.currentSettings.columnMode || "auto";

    // For scrolled mode, use full container width
    if (this.currentSettings.scrolled) {
      computedMaxInlineSize = Math.max(containerSize, 720);
    } else {
      if (columnMode === "one") {
        computedMaxColumnCount = 1;
        computedMaxInlineSize = Math.max(containerSize, 720);
      } else if (columnMode === "two") {
        computedMaxColumnCount = 2;
        const target = Math.floor(containerSize / 2 - gapPx);
        computedMaxInlineSize = Math.max(320, target);
      }
    }

    return {
      maxColumnCount: computedMaxColumnCount,
      maxInlineSize: computedMaxInlineSize,
      maxBlockSize: computedMaxBlockSize,
    };
  }

  applyStyles(): void {
    if (!this.view?.renderer) return;

    // Debounce style updates to prevent excessive reflows
    const now = Date.now();
    if (now - this.lastUpdateTime < 50) {
      // 50ms debounce
      if (this.updateDebounceTimer) {
        clearTimeout(this.updateDebounceTimer);
      }
      this.updateDebounceTimer = setTimeout(() => {
        this.doApplyStyles();
        this.lastUpdateTime = now;
      }, 50);
      return;
    }

    this.doApplyStyles();
    this.lastUpdateTime = now;
  }

  private doApplyStyles(): void {
    if (!this.view?.renderer) return;

    try {
      const styles = getStyles(this.currentSettings);
      this.view.renderer.setStyles?.(styles);
      this.currentStyles = styles;
    } catch (error) {
      console.error("Error applying styles:", error);
    }
  }

  updateTheme(): void {
    this.applyStyles();
  }

  dispose(): void {
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
      this.updateDebounceTimer = null;
    }
  }

  getCurrentSettings(): ViewSettings {
    return { ...this.currentSettings };
  }

  getCurrentStyles(): any {
    return { ...this.currentStyles };
  }
}
