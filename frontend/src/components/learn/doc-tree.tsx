"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LessonDocFieldsFragment } from "@/graphql/generated";
import { MarkdownView } from "@/components/learn/markdown-view";
import { VideoEmbed } from "@/components/learn/video-embed";

type Doc = LessonDocFieldsFragment;

type Node = { name: string; path: string; doc?: Doc; children: Node[] };

/** Fold slash-separated paths into a tree; folder order follows first appearance (= author's position order). */
export function buildTree(docs: Doc[]): Node[] {
  const root: Node = { name: "", path: "", children: [] };
  for (const d of docs) {
    const parts = d.path.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      let next = cur.children.find((c) => c.path === path);
      if (!next) {
        next = { name: part, path, children: [] };
        cur.children.push(next);
      }
      if (i === parts.length - 1) next.doc = d;
      cur = next;
    });
  }
  return root.children;
}

/**
 * Repository-style browser for a lesson's document tree: folders/files on the
 * left, the selected DOC (markdown) or VIDEO (player + notes) on the right.
 * The selection lives in `?doc=<path>` so a spec page can be linked directly.
 */
export function DocTree({ docs }: { docs: Doc[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tree = useMemo(() => buildTree(docs), [docs]);
  const byPath = useMemo(() => new Map(docs.map((d) => [d.path, d])), [docs]);

  const wanted = params.get("doc");
  const selected = (wanted && byPath.get(wanted)) || docs[0];
  // folders the user toggled by hand; the selected doc's ancestors are always open on top of that
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const ancestors = folderAncestors(selected?.path);
  const open = new Set([...ancestors.filter((a) => !toggled.has(a)), ...[...toggled].filter((t) => !ancestors.includes(t))]);

  if (docs.length === 0) return null;

  function select(path: string) {
    const q = new URLSearchParams(params.toString());
    q.set("doc", path);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }

  /** Toggle = flip membership in the manual set; for an ancestor that means "collapse despite selection". */
  function toggle(path: string) {
    setToggled((o) => {
      const n = new Set(o);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  }

  return (
    <div className="htb-card overflow-hidden grid md:grid-cols-[260px_1fr]">
      <nav className="border-b md:border-b-0 md:border-r border-htb-border bg-htb-bg-elevated/40 py-2 htb-mono text-xs max-h-[70vh] overflow-auto">
        <div className="px-3 pb-2 text-[0.65rem] uppercase tracking-widest text-htb-text-dim">
          {docs.length} file{docs.length === 1 ? "" : "s"}
        </div>
        <TreeLevel nodes={tree} depth={0} open={open} selected={selected?.path ?? ""} onToggle={toggle} onSelect={select} />
      </nav>
      <section className="p-5 min-w-0">
        {selected && (
          <>
            <div className="flex items-center gap-2 mb-3 htb-mono text-xs text-htb-text-dim">
              <span className={`htb-badge ${selected.kind === "VIDEO" ? "htb-badge-cyan" : "htb-badge-green"}`}>{selected.kind.toLowerCase()}</span>
              <span className="truncate">{selected.path}</span>
            </div>
            <h3 className="htb-heading text-xl text-htb-text mb-4">{selected.title}</h3>
            {selected.kind === "VIDEO" && selected.videoUrl && (
              <div className="mb-4">
                <VideoEmbed url={selected.videoUrl} />
              </div>
            )}
            {selected.contentMd && <MarkdownView source={selected.contentMd} />}
          </>
        )}
      </section>
    </div>
  );
}

function folderAncestors(path: string | undefined): string[] {
  if (!path) return [];
  const parts = path.split("/");
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("/"));
}

function TreeLevel({
  nodes,
  depth,
  open,
  selected,
  onToggle,
  onSelect,
}: {
  nodes: Node[];
  depth: number;
  open: Set<string>;
  selected: string;
  onToggle: (p: string) => void;
  onSelect: (p: string) => void;
}) {
  return (
    <ul>
      {nodes.map((n) => {
        const isFolder = n.children.length > 0;
        const isOpen = open.has(n.path);
        const active = n.path === selected;
        return (
          <li key={n.path}>
            <button
              onClick={() => (isFolder && !n.doc ? onToggle(n.path) : onSelect(n.path))}
              style={{ paddingLeft: `${0.75 + depth * 0.9}rem` }}
              className={`w-full text-left flex items-center gap-1.5 py-1 pr-3 truncate ${
                active ? "text-htb-green bg-htb-green/10" : "text-htb-text-muted hover:text-htb-text hover:bg-htb-bg-hover"
              }`}
            >
              <span className="text-htb-text-dim w-3">{isFolder ? (isOpen ? "▾" : "▸") : n.doc?.kind === "VIDEO" ? "▶" : "·"}</span>
              <span className="truncate">{n.name}</span>
            </button>
            {isFolder && isOpen && (
              <TreeLevel nodes={n.children} depth={depth + 1} open={open} selected={selected} onToggle={onToggle} onSelect={onSelect} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
