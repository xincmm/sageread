import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { Search } from "lucide-react";

export interface ModelFilterOptions {
  searchTerm: string;
}

interface ModelFilterProps {
  filters: ModelFilterOptions;
  onFiltersChange: (filters: ModelFilterOptions) => void;
  totalCount: number;
  filteredCount: number;
}

export default function ModelFilter({ filters, onFiltersChange, totalCount, filteredCount }: ModelFilterProps) {
  const _ = useTranslation();

  const handleFilterChange = (key: keyof ModelFilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400 dark:text-neutral-500" />
        <Input
          placeholder={_("Search models...")}
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
          className="h-8 pl-9"
        />
      </div>

      <div className="flex items-center justify-between text-gray-500 text-xs dark:text-neutral-400">
        <span>{_("Showing {{filteredCount}} of {{totalCount}} models", { filteredCount, totalCount })}</span>
      </div>
    </div>
  );
}
