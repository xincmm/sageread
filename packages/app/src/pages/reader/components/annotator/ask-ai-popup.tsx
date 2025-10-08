import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface AskAIPopupProps {
  style: React.CSSProperties;
  selectedText: string;
  onClose: () => void;
  onSendQuery: (query: string, selectedText: string) => void;
}

const AskAIPopup: React.FC<AskAIPopupProps> = ({ style, selectedText, onClose, onSendQuery }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      // Focus input when popup opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);

  const handleSend = () => {
    if (query.trim()) {
      onSendQuery(query.trim(), selectedText);
      setQuery(""); // Clear input after sending
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="ask-ai-popup absolute z-50 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      style={style}
    >
      <div className="space-y-3">
        {/* Selected text preview */}
        <div className="overflow-hidden rounded bg-neutral-50 p-2 text-neutral-600 text-xs dark:bg-neutral-700 dark:text-neutral-300">
          <div className="truncate">
            "{selectedText.length > 80 ? `${selectedText.slice(0, 80)}...` : selectedText}"
          </div>
        </div>

        {/* Query input with integrated send button */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="询问AI任何问题"
            className="h-9 w-full rounded-lg border border-neutral-200 py-2 pr-10 pl-3 text-sm focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder-neutral-400"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!query.trim()}
            className="absolute top-1.5 right-1 h-6 w-6 rounded-full p-0 disabled:opacity-50"
          >
            <ArrowUp size={10} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskAIPopup;
