"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Renders author-written markdown. Authors are trusted (ADMIN) but a
 * compromised account must not become stored XSS for every learner, so the
 * output is sanitised with the default rehype-sanitize schema.
 */
export function MarkdownView({ source, className = "" }: { source: string; className?: string }) {
  return (
    <div className={`htb-prose ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
