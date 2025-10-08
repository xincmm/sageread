import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoHideControlsOptions {
  delay?: number;
  keepVisible?: boolean;
}

export const useAutoHideControls = ({
  delay = 5000,
  keepVisible = false,
}: UseAutoHideControlsOptions = {}) => {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hideAfterDelay = useCallback(() => {
    if (keepVisible) return;

    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, delay);
  }, [clearTimer, delay, keepVisible]);

  const showControls = useCallback(() => {
    setIsVisible(true);
    clearTimer();
  }, [clearTimer]);

  const handleMouseEnter = useCallback(() => {
    isHoveringRef.current = true;
    showControls();
  }, [showControls]);

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    hideAfterDelay();
  }, [hideAfterDelay]);

  useEffect(() => {
    hideAfterDelay();

    return () => {
      clearTimer();
    };
  }, [hideAfterDelay, clearTimer]);

  useEffect(() => {
    if (keepVisible) {
      showControls();
    } else if (!isHoveringRef.current) {
      hideAfterDelay();
    }
  }, [keepVisible, hideAfterDelay, showControls]);

  return {
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    showControls,
    scheduleHide: hideAfterDelay,
  };
};
