import { HIGHLIGHT_COLOR_HEX } from "@/services/constants";
import { useAppSettingsStore } from "@/store/app-settings-store";
import type { HighlightColor, HighlightStyle } from "@/types/book";
import clsx from "clsx";
import React from "react";
import { FaCheckCircle } from "react-icons/fa";

const styles = ["highlight", "underline", "squiggly"] as HighlightStyle[];
const colors = ["red", "violet", "blue", "green", "yellow"] as HighlightColor[];

interface HighlightOptionsProps {
  isVertical: boolean;
  style: React.CSSProperties;
  selectedStyle: HighlightStyle;
  selectedColor: HighlightColor;
  onHandleHighlight: (update: boolean) => void;
}

const HighlightOptions: React.FC<HighlightOptionsProps> = ({
  style,
  isVertical,
  selectedStyle: _selectedStyle,
  selectedColor: _selectedColor,
  onHandleHighlight,
}) => {
  const { settings, setSettings } = useAppSettingsStore();
  const globalReadSettings = settings.globalReadSettings;
  const [selectedStyle, setSelectedStyle] = React.useState<HighlightStyle>(_selectedStyle);
  const [selectedColor, setSelectedColor] = React.useState<HighlightColor>(_selectedColor);

  const handleSelectStyle = (style: HighlightStyle) => {
    globalReadSettings.highlightStyle = style;
    setSettings(settings);
    setSelectedStyle(style);
    setSelectedColor(globalReadSettings.highlightStyles[style]);
    onHandleHighlight(true);
  };

  const handleSelectColor = (color: HighlightColor) => {
    globalReadSettings.highlightStyle = selectedStyle;
    globalReadSettings.highlightStyles[selectedStyle] = color;
    setSettings(settings);
    setSelectedColor(color);
    onHandleHighlight(true);
  };

  // Helper function to get color styles
  const getColorStyle = (color: HighlightColor, isSelected: boolean) => {
    const colorHex = HIGHLIGHT_COLOR_HEX[color];
    if (!isSelected) return {};

    return {
      backgroundColor: colorHex,
      textDecorationColor: colorHex,
    };
  };

  return (
    <div
      className={clsx(
        "highlight-options absolute flex items-center justify-between gap-2",
        isVertical ? "flex-col" : "flex-row",
      )}
      style={style}
    >
      <div
        className={clsx("flex gap-2", isVertical ? "flex-col" : "flex-row")}
        style={isVertical ? { width: 28 } : { height: 28 }}
      >
        {styles.map((styleType) => {
          const isSelected = selectedStyle === styleType;
          const colorStyle = isSelected ? getColorStyle(selectedColor, true) : {};

          return (
            <button
              key={styleType}
              onClick={() => handleSelectStyle(styleType)}
              className="flex items-center justify-center rounded-full bg-gray-700 p-0 dark:bg-neutral-600"
              style={{ width: 28, height: 28, minHeight: 28 }}
            >
              <div
                style={{
                  width: 16,
                  height: styleType === "squiggly" ? 18 : 16,
                  ...(styleType === "highlight" && colorStyle.backgroundColor
                    ? { backgroundColor: colorStyle.backgroundColor }
                    : {}),
                  ...(styleType === "underline" && colorStyle.textDecorationColor
                    ? { textDecorationColor: colorStyle.textDecorationColor }
                    : {}),
                  ...(styleType === "squiggly" && colorStyle.textDecorationColor
                    ? { textDecorationColor: colorStyle.textDecorationColor }
                    : {}),
                }}
                className={clsx(
                  "w-4 p-0 text-center leading-none",
                  styleType === "highlight" && (isSelected ? "pt-[2px]" : "bg-gray-300 pt-[2px]"),
                  (styleType === "underline" || styleType === "squiggly") && "text-gray-300 underline decoration-2",
                  styleType === "underline" && !isSelected && "decoration-gray-300",
                  styleType === "squiggly" && (isSelected ? "decoration-wavy" : "decoration-gray-300 decoration-wavy"),
                )}
              >
                A
              </div>
            </button>
          );
        })}
      </div>

      <div
        className={clsx(
          "flex items-center justify-center gap-2 rounded-3xl bg-gray-700 dark:bg-neutral-600",
          isVertical ? "flex-col py-2" : "flex-row px-2",
        )}
        style={isVertical ? { width: 28 } : { height: 28 }}
      >
        {colors.map((color) => {
          const isSelected = selectedColor === color;
          const colorHex = HIGHLIGHT_COLOR_HEX[color];

          return (
            <button
              key={color}
              onClick={() => handleSelectColor(color)}
              style={{
                width: 16,
                height: 16,
                backgroundColor: !isSelected ? colorHex : "transparent",
              }}
              className="rounded-full p-0"
            >
              {isSelected && <FaCheckCircle size={16} style={{ color: colorHex }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HighlightOptions;
