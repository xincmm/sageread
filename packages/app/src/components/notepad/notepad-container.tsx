import { useState } from "react";
import { NotepadContent } from "./notepad-content";
import { NotepadHeader } from "./notepad-header";

export type NotepadTab = "notes" | "annotations";

interface NotepadContainerProps {
  bookId: string;
}

export const NotepadContainer = ({ bookId }: NotepadContainerProps) => {
  const [activeTab, setActiveTab] = useState<NotepadTab>("notes");

  return (
    <div className="flex h-full flex-col bg-background">
      <NotepadHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        <NotepadContent activeTab={activeTab} bookId={bookId} />
      </div>
    </div>
  );
};
