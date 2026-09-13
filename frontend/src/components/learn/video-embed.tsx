/**
 * Embeds a lesson video. YouTube / Vimeo URLs become iframes; anything else is
 * treated as a direct media URL. Only http(s) URLs are accepted.
 */
export function VideoEmbed({ url }: { url: string }) {
  const embed = toEmbed(url);
  if (!embed) {
    return (
      <div className="htb-card p-4 htb-mono text-xs text-htb-red">! unsupported video URL</div>
    );
  }
  if (embed.kind === "iframe") {
    return (
      <div className="htb-card overflow-hidden aspect-video">
        <iframe
          src={embed.src}
          title="lesson video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      </div>
    );
  }
  return (
    <div className="htb-card overflow-hidden">
      <video src={embed.src} controls className="w-full" />
    </div>
  );
}

function toEmbed(raw: string): { kind: "iframe" | "video"; src: string } | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v");
    return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` } : null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` } : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : null;
  }
  return { kind: "video", src: u.toString() };
}
