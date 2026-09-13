"use client";

import { useState } from "react";
import { MarkdownView } from "@/components/learn/markdown-view";

/** Textarea with a live sanitised markdown preview (side-by-side on wide screens). */
export function MarkdownEditor({
  value,
  onChange,
  rows = 12,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [mode, setMode] = useState<"split" | "write" | "preview">("split");
  return (
    <div>
      <div className="flex gap-1 mb-1 htb-mono text-[0.65rem]">
        {(["write", "split", "preview"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-2 py-0.5 rounded ${mode === m ? "text-htb-green bg-htb-green/10" : "text-htb-text-dim hover:text-htb-text"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className={`grid gap-3 ${mode === "split" ? "lg:grid-cols-2" : ""}`}>
        {mode !== "preview" && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="htb-input htb-mono text-xs resize-y"
          />
        )}
        {mode !== "write" && (
          <div className="htb-card p-4 min-h-[6rem] overflow-auto">
            {value.trim() ? (
              <MarkdownView source={value} />
            ) : (
              <span className="htb-mono text-xs text-htb-text-dim">preview</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
