import { useAppSettingsStore } from "@/store/app-settings-store";
import { useThemeStore } from "@/store/theme-store";
import { type CustomTheme, type Palette, applyCustomTheme } from "@/styles/themes";
import { getOSPlatform } from "@/utils/misc";
import { useCallback, useEffect } from "react";

type UseThemeProps = {
  systemUIVisible?: boolean;
  appThemeColor?: keyof Palette;
};

export const useTheme = ({ systemUIVisible = true, appThemeColor = "base-100" }: UseThemeProps = {}) => {
  const { settings } = useAppSettingsStore();
  const {
    themeColor,
    isDarkMode,
    showSystemUI,
    dismissSystemUI,
    updateAppTheme,
    systemUIAlwaysHidden,
    setSystemUIAlwaysHidden,
  } = useThemeStore();

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    updateAppTheme(appThemeColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const handleSystemUIVisibility = useCallback(() => {
    const visible = systemUIVisible && !systemUIAlwaysHidden;
    if (visible) {
      showSystemUI();
    } else {
      dismissSystemUI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDarkMode, systemUIVisible]);

  useEffect(() => {
    handleSystemUIVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSystemUIVisibility]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    handleSystemUIVisibility();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleSystemUIVisibility();
      }
    };
    const handleOrientationChange = () => {
      if (getOSPlatform() === "ios") {
        // FIXME: This is a workaround for iPhone apps where the system UI is not visible in landscape mode
        // when the app is in fullscreen mode until we find a better solution to override the prefersStatusBarHidden
        // in the ViewController. Note that screen.orientation.type is not abailable in iOS before 16.4.
        const systemUIAlwaysHidden = screen.orientation?.type.includes("landscape");
        setSystemUIAlwaysHidden(systemUIAlwaysHidden);
        handleSystemUIVisibility();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    screen.orientation?.addEventListener("change", handleOrientationChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      screen.orientation?.removeEventListener("change", handleOrientationChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSystemUIVisibility]);

  useEffect(() => {
    const customThemes = settings.globalReadSettings?.customThemes ?? [];
    customThemes.forEach((customTheme: CustomTheme) => {
      applyCustomTheme(customTheme);
    });
    localStorage.setItem("customThemes", JSON.stringify(customThemes));
  }, [settings]);

  // useEffect(() => {
  //   const colorScheme = isDarkMode ? "dark" : "light";
  //   document.documentElement.style.setProperty("color-scheme", colorScheme);
  //   document.documentElement.style.setProperty("--overlayer-highlight-blend-mode", isDarkMode ? "lighten" : "normal");

  //   // Apply theme classes to document element
  //   document.documentElement.className = document.documentElement.className
  //     .split(" ")
  //     .filter((cls) => !cls.startsWith("theme-") && cls !== "dark")
  //     .join(" ");

  //   if (themeColor !== "default") {
  //     document.documentElement.classList.add(`theme-${themeColor}`);
  //   }

  //   if (isDarkMode) {
  //     document.documentElement.classList.add("dark");
  //   }
  // }, [themeColor, isDarkMode]);
};
