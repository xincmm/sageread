import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/hooks/use-translation";
import { appDataDir } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";

import { Check, Copy, ExternalLink, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";

export default function GeneralSettings() {
  const [dataPath, setDataPath] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const _ = useTranslation();

  useEffect(() => {
    appDataDir().then(async (path) => {
      setDataPath(path);
      try {
        const appDataDirPath = await appDataDir();
        console.log("Target directory is:", appDataDirPath);

        const directoryExists = await exists(appDataDirPath);

        console.log("Directory exists:", directoryExists);

        if (!directoryExists) {
          await mkdir(appDataDirPath, { recursive: true });
          console.log("Directory did not exist, created it.");
        }

        console.log("Successfully wrote config file!");
      } catch (error) {
        console.error("An error occurred:", error);
      }
    });
  }, []);
  const handleCheckUpdates = () => {
    console.log("Check for updates");
  };

  const handleOpenLogs = () => {
    console.log("Open logs");
  };

  const handleShowInFinder = async () => {
    try {
      await openPath(dataPath);
    } catch (error) {
      console.error("Failed to open in Finder:", error);
    }
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(dataPath);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleReset = () => {
    if (confirm(_("Are you sure you want to reset to factory settings? This action is irreversible."))) {
      console.log("Reset to factory settings");
    }
  };

  return (
    <div className="space-y-8 p-4 pt-3">
      <section className="rounded-lg bg-muted/80 p-4 ">
        <h2 className="text mb-4 dark:text-neutral-200">{_("General")}</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-neutral-200 border-b pb-4 dark:border-neutral-700">
            <span className="text-sm dark:text-neutral-200">{_("App Version")}</span>
            <div className="text-neutral-600 text-xs dark:text-neutral-400">v0.6.8</div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm dark:text-neutral-200">{_("Check for Updates")}</span>
              <p className="text-neutral-600 text-xs dark:text-neutral-400">
                {_("Check if a newer version of Jan is available.")}
              </p>
            </div>
            <Button onClick={handleCheckUpdates} size="xs" variant="soft">
              {_("Check for Updates")}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4 ">
        <h2 className="text mb-4 dark:text-neutral-200">{_("Data Folder")}</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-neutral-200 border-b pb-4 dark:border-neutral-700">
            <div>
              <span className="text-sm dark:text-neutral-200">{_("App Data")}</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-background px-2 py-1 text-sm dark:bg-neutral-700 dark:text-neutral-300">
                  {dataPath}
                </span>
                <Button size="sm" variant="ghost" onClick={handleCopyPath} className="size-6 p-0">
                  {isCopied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm dark:text-neutral-200">{_("App Logs")}</span>
              <p className="text-neutral-600 text-xs dark:text-neutral-400">{_("View detailed logs of the App.")}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOpenLogs} variant="outline" size="xs">
                <ExternalLink className="size-4" />
                {_("Open Logs")}
              </Button>
              <Button onClick={handleShowInFinder} variant="soft" size="xs">
                <FolderOpen className="h-4 w-4" />
                {_("Show in Finder")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-muted/80 p-4 ">
        <h2 className="text mb-4 dark:text-neutral-200">{_("Advanced")}</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm dark:text-neutral-200">{_("Experimental Features")}</span>
              <p className="text-neutral-600 text-xs dark:text-neutral-400">
                {_("Enable experimental features. They may be unstable or change at any time.")}
              </p>
            </div>
            <div className="flex items-center">
              <Checkbox id="experimental-features" defaultChecked={false} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm dark:text-neutral-200">{_("Reset To Factory Settings")}</span>
              <p className="text-neutral-600 text-xs dark:text-neutral-400">
                {_(
                  "Restore application to its initial state, erasing all models and chat history. This action is irreversible and recommended only if the application is corrupted.",
                )}
              </p>
            </div>
            <Button onClick={handleReset} size="xs" variant="destructive">
              {_("Reset")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
