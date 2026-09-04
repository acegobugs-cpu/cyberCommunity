export const metadata = {
  title: "Community — Cyber Club Portal",
};

const FORUMS = [
  {
    title: "Web Exploitation",
    desc: "XSS, SSRF, SQLi, auth bypass",
    threads: 1248,
    posts: 8420,
    color: "green",
  },
  {
    title: "Binary Exploitation",
    desc: "ROP, shellcode, mitigations",
    threads: 412,
    posts: 2890,
    color: "cyan",
  },
  {
    title: "Reverse Engineering",
    desc: "Static & dynamic analysis",
    threads: 287,
    posts: 1543,
    color: "purple",
  },
  {
    title: "Cryptography",
    desc: "Math, ciphers, number theory",
    threads: 192,
    posts: 920,
    color: "amber",
  },
  {
    title: "OSINT",
    desc: "Open-source intelligence",
    threads: 156,
    posts: 612,
    color: "red",
  },
  {
    title: "Networking & Wireless",
    desc: "Pivoting, BGP, WiFi",
    threads: 98,
    posts: 410,
    color: "cyan",
  },
];

const COLOR: Record<string, string> = {
  green: "htb-badge htb-badge-green",
  cyan: "htb-badge htb-badge-cyan",
  purple: "htb-badge htb-badge-purple",
  amber: "htb-badge htb-badge-amber",
  red: "htb-badge htb-badge-red",
};

export default function CommunityHome() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 w-full">
      <div className="mb-8">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
          &gt; cd /community
        </div>
        <h1 className="htb-heading text-3xl text-htb-text mt-1">
          Community
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Forums, groups, and direct messaging for the Cyber Club.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FORUMS.map((f) => (
          <div
            key={f.title}
            className="htb-card htb-card-interactive p-5"
          >
            <span className={COLOR[f.color]}>{f.title.split(" ")[0]}</span>
            <h3 className="htb-heading text-lg text-htb-text mt-3">
              {f.title}
            </h3>
            <p className="htb-mono text-xs text-htb-text-muted mt-1">{f.desc}</p>
            <div className="mt-4 pt-4 border-t border-htb-border flex justify-between htb-mono text-[0.65rem] text-htb-text-dim uppercase tracking-wider">
              <span>{f.threads} threads</span>
              <span className="text-htb-green">{f.posts} posts</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 htb-card p-6">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-green">
          ## groups
        </div>
        <div className="grid gap-3 mt-4 sm:grid-cols-2">
          {["Binary Ninjas", "Web Squad", "OSINT Hunters", "Crypto Collective"].map(
            (g) => (
              <div
                key={g}
                className="htb-card p-3 flex items-center justify-between"
              >
                <div className="htb-mono text-sm text-htb-text">{g}</div>
                <span className="htb-mono text-[0.65rem] text-htb-text-dim">
                  12-48 members
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
