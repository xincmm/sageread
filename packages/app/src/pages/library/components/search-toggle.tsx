import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { Search } from "lucide-react";

interface SearchToggleProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SearchToggle({ searchQuery, onSearchChange }: SearchToggleProps) {
  const _ = useTranslation();

  return (
    <div className="relative">
      <Search
        className="-translate-y-1/2 absolute top-1/2 left-3 transform text-gray-500 dark:text-neutral-400"
        size={16}
      />
      <Input
        type="text"
        placeholder={_("Search")}
        value={searchQuery}
        onChange={onSearchChange}
        className="h-8 w-full rounded-full border bg-muted pr-4 pl-8 shadow-none foucs:outline-none placeholder:font-light placeholder:text-neutral-500 focus-visible:ring-0 dark:text-neutral-200 dark:placeholder:text-neutral-400"
      />
    </div>
  );
}
