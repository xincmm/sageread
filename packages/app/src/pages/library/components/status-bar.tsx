import { useTranslation } from "@/hooks/use-translation";
import { Grid3X3, List } from "lucide-react";

interface StatusBarProps {
  totalBooks: number;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export default function StatusBar({ totalBooks, viewMode, onViewModeChange }: StatusBarProps) {
  const _ = useTranslation();

  return (
    <div className="fixed right-6 bottom-6 z-40">
      <div className="flex items-center space-x-3 rounded-full border border-base-300 bg-base-100 px-4 py-2 shadow-lg">
        <div className="flex items-center space-x-2 text-base-content text-sm">
          <span className="text-xs opacity-70">{_("Total")}</span>
          <span className="font-medium">{totalBooks}</span>
        </div>

        <div className="h-4 w-px bg-base-300" />

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`rounded-lg p-2 transition-colors ${
              viewMode === "grid" ? "bg-primary text-primary-content" : "text-base-content hover:bg-base-200"
            }`}
            title={_("Grid View")}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`rounded-lg p-2 transition-colors ${
              viewMode === "list" ? "bg-primary text-primary-content" : "text-base-content hover:bg-base-200"
            }`}
            title={_("List View")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
