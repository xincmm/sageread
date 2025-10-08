import Popup from "@/components/popup";
import { Separator } from "@/components/ui/separator";
import type { HighlightColor, HighlightStyle } from "@/types/book";
import type { Position } from "@/utils/sel";
import clsx from "clsx";
import React, { useEffect, useMemo, useState } from "react";
import HighlightOptions from "./highlight-options";
import PopupButton from "./popup-button";

interface AnnotationPopupProps {
  dir: "ltr" | "rtl";
  isVertical: boolean;
  buttons: Array<{ label: string | undefined; Icon: React.ElementType; onClick: () => void }>;
  position: Position;
  trianglePosition: Position;
  highlightOptionsVisible: boolean;
  selectedStyle: HighlightStyle;
  selectedColor: HighlightColor;
  popupWidth: number;
  popupHeight: number;
  onHighlight: (update?: boolean) => void;
}

const OPTIONS_PADDING_PIX = 16;
const OPTIONS_SPACING = 8;

const AnnotationPopup: React.FC<AnnotationPopupProps> = ({
  dir,
  isVertical,
  buttons,
  position,
  trianglePosition,
  highlightOptionsVisible,
  selectedStyle,
  selectedColor,
  popupWidth,
  popupHeight,
  onHighlight,
}) => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate the best position for HighlightOptions
  const highlightOptionsStyle = useMemo(() => {
    if (!highlightOptionsVisible) return {};

    // Get the actual container dimensions
    // For absolute positioning, we need to consider the positioning context
    const viewportHeight = windowSize.height;
    const viewportWidth = windowSize.width;
    const optionsWidth = isVertical ? popupHeight : popupWidth;
    const optionsHeight = isVertical ? popupWidth : popupHeight;

    if (isVertical) {
      // For vertical layout, place left or right of the popup
      const spaceLeft = position.point.x;
      const spaceRight = viewportWidth - position.point.x;
      const needsSpace = optionsWidth + OPTIONS_PADDING_PIX;

      let left: number;
      if (trianglePosition.dir === "left" && spaceLeft >= needsSpace) {
        // Place to the left
        left = position.point.x - needsSpace;
      } else if (trianglePosition.dir === "right" && spaceRight >= needsSpace) {
        // Place to the right
        left = position.point.x + (popupHeight + OPTIONS_PADDING_PIX);
      } else {
        // Auto-choose based on available space
        left =
          spaceLeft > spaceRight
            ? position.point.x - needsSpace
            : position.point.x + (popupHeight + OPTIONS_PADDING_PIX);
      }

      // Ensure left position doesn't go beyond screen boundaries
      left = Math.max(OPTIONS_PADDING_PIX, Math.min(left, viewportWidth - optionsWidth - OPTIONS_PADDING_PIX));

      // Calculate top position to prevent vertical overflow
      let top = position.point.y;
      const bottomBoundary = top + optionsHeight;
      if (bottomBoundary > viewportHeight - OPTIONS_PADDING_PIX) {
        // If would overflow bottom edge, align to bottom edge with padding
        top = viewportHeight - optionsHeight - OPTIONS_PADDING_PIX;
      }
      // Ensure it doesn't go beyond top edge
      top = Math.max(OPTIONS_PADDING_PIX, top);

      return {
        width: `${optionsWidth}px`,
        height: `${optionsHeight}px`,
        left: `${left}px`,
        top: `${top}px`,
      };
    }

    // For horizontal layout, place above or below the popup
    const popupBottom = position.point.y + popupHeight;
    const spaceAbove = position.point.y;
    const spaceBelow = viewportHeight - popupBottom;
    const needsSpace = optionsHeight + OPTIONS_SPACING;

    let top: number;
    if (trianglePosition.dir === "up" && spaceAbove >= needsSpace) {
      // Place above the popup
      top = position.point.y - needsSpace;
    } else if (trianglePosition.dir === "down" && spaceBelow >= needsSpace) {
      // Place below the popup
      top = popupBottom + OPTIONS_SPACING;
    } else if (spaceBelow >= needsSpace) {
      // Prefer below if there's space
      top = popupBottom + OPTIONS_SPACING;
    } else if (spaceAbove >= needsSpace) {
      // Fallback to above
      top = position.point.y - needsSpace;
    } else {
      // If neither has enough space, place below and let it overflow
      top = popupBottom + OPTIONS_SPACING;
    }

    // Simple left/right alignment based on triangle direction
    let left = position.point.x;

    if (trianglePosition.dir === "left") {
      // Left align to popup's left edge
      left = position.point.x;
    } else if (trianglePosition.dir === "right") {
      // Right align to popup's right edge
      left = position.point.x + popupWidth - optionsWidth;
    }

    return {
      width: `${optionsWidth}px`,
      height: `${optionsHeight}px`,
      left: `${left}px`,
      top: `${Math.max(OPTIONS_PADDING_PIX, top)}px`,
    };
  }, [highlightOptionsVisible, isVertical, position, trianglePosition, popupWidth, popupHeight, windowSize]);

  return (
    <div dir={dir}>
      <Popup
        width={isVertical ? popupHeight : popupWidth}
        height={isVertical ? popupWidth : popupHeight}
        position={position}
        className="selection-popup border border-neutral-200 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      >
        <div
          className={clsx(
            "selection-buttons flex h-full items-center",
            isVertical ? "flex-col gap-1 px-1 py-2" : "flex-row gap-1 px-2 py-1",
          )}
        >
          {buttons.map((button, index) => (
            <React.Fragment key={index}>
              <PopupButton label={button.label} Icon={button.Icon} onClick={button.onClick} isVertical={isVertical} />
              {index === 2 && (
                <Separator
                  orientation={isVertical ? "horizontal" : "vertical"}
                  className={isVertical ? "my-1" : "mx-1"}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </Popup>
      {highlightOptionsVisible && (
        <HighlightOptions
          isVertical={isVertical}
          style={highlightOptionsStyle}
          selectedStyle={selectedStyle}
          selectedColor={selectedColor}
          onHandleHighlight={onHighlight}
        />
      )}
    </div>
  );
};

export default AnnotationPopup;
