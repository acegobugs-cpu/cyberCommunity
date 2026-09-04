"use client";

import { useEffect, useState } from "react";

type Line = {
  prompt?: boolean;
  success?: boolean;
  muted?: boolean;
  text: string;
  className?: string;
};

export function TerminalBlock({ lines }: { lines: Line[] }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    if (visibleCount >= lines.length) return;
    const line = lines[visibleCount];
    if (!line) return;

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setCurrentText(line.text.slice(0, idx));
      if (idx >= line.text.length) {
        clearInterval(interval);
        setTimeout(() => {
          setVisibleCount((c) => c + 1);
          setCurrentText("");
        }, 350);
      }
    }, 22);

    return () => clearInterval(interval);
  }, [visibleCount, lines]);

  return (
    <div className="htb-card overflow-hidden htb-scanline">
      <div className="flex items-center gap-2 border-b border-htb-border bg-htb-bg-elevated px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-htb-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-htb-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-htb-green/70" />
        </div>
        <div className="flex-1 text-center htb-mono text-[0.65rem] text-htb-text-dim uppercase tracking-widest">
          operator@cyber-club ~ /portal
        </div>
      </div>

      <div className="bg-htb-bg-card p-5 htb-mono text-sm space-y-1.5 min-h-[280px]">
        {lines.slice(0, visibleCount).map((line, i) => (
          <div
            key={i}
            className={
              line.className ??
              (line.success
                ? "text-htb-green"
                : line.muted
                  ? "text-htb-text-dim"
                  : line.prompt
                    ? "text-htb-text"
                    : "text-htb-text-muted")
            }
          >
            {line.prompt && <span className="text-htb-green font-bold">$ </span>}
            {line.text}
          </div>
        ))}

        {visibleCount < lines.length && (
          <div className="text-htb-text">
            {lines[visibleCount]?.prompt && (
              <span className="text-htb-green font-bold">$ </span>
            )}
            <span>{currentText}</span>
            <span className="text-htb-green animate-htb-blink">█</span>
          </div>
        )}
      </div>
    </div>
  );
}
