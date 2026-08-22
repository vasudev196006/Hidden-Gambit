import React from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmoteItem {
  id: string;
  emoji: string;
  label: string;
}

export const EMOTE_LIST: EmoteItem[] = [
  { id: "thinking", emoji: "🤔", label: "Thinking" },
  { id: "bluffing", emoji: "😈", label: "Bluffing" },
  { id: "suspicious", emoji: "🔍", label: "Suspicious" },
  { id: "busted", emoji: "💥", label: "Busted!" },
  { id: "gotcha", emoji: "🎯", label: "Gotcha!" },
  { id: "shook", emoji: "😱", label: "Shook" },
  { id: "checkmate", emoji: "👑", label: "Crown" },
  { id: "gg", emoji: "🤝", label: "GG" },
];

interface EmotePickerProps {
  onSelectEmote: (emote: EmoteItem) => void;
  disabled?: boolean;
}

export const EmotePicker: React.FC<EmotePickerProps> = ({ onSelectEmote, disabled = false }) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 bg-secondary/30 rounded-lg border border-border/50 scrollbar-none">
      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 pl-1 pr-2 border-r border-border shrink-0">
        <Smile className="h-3.5 w-3.5 text-primary" /> React:
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {EMOTE_LIST.map((item) => (
          <button
            key={item.id}
            disabled={disabled}
            onClick={() => onSelectEmote(item)}
            className="p-1.5 rounded-md hover:bg-primary/20 active:scale-125 transition-all text-base disabled:opacity-40 disabled:hover:bg-transparent"
            title={item.label}
          >
            {item.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
