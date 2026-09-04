export const metadata = {
  title: "Learn — Cyber Club Portal",
};

const COURSES = [
  {
    title: "Practical Binary Exploitation",
    desc: "12 modules · mitigations, ROP, kernel",
    progress: 33,
    tag: "advanced",
  },
  {
    title: "Web Exploitation Fundamentals",
    desc: "8 modules · OWASP, XSS, SSRF, SQLi",
    progress: 75,
    tag: "intermediate",
  },
  {
    title: "Reverse Engineering with Ghidra",
    desc: "10 modules · x86_64, control flow",
    progress: 10,
    tag: "intermediate",
  },
  {
    title: "Network Pentesting 101",
    desc: "6 modules · scanning, pivoting, AD",
    progress: 0,
    tag: "beginner",
  },
];

const TAG: Record<string, string> = {
  beginner: "htb-badge htb-badge-cyan",
  intermediate: "htb-badge htb-badge-amber",
  advanced: "htb-badge htb-badge-red",
};

export default function LearnHome() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 w-full">
      <div className="mb-8">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
          &gt; learn --list
        </div>
        <h1 className="htb-heading text-3xl text-htb-text mt-1">
          Learning Tracks
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Structured paths for skill development, from beginner to pro.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {COURSES.map((c) => (
          <div
            key={c.title}
            className="htb-card htb-card-interactive p-5"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="htb-heading text-lg text-htb-text leading-tight">
                {c.title}
              </h3>
              <span className={TAG[c.tag]}>{c.tag}</span>
            </div>
            <p className="htb-mono text-xs text-htb-text-muted">{c.desc}</p>

            <div className="mt-4">
              <div className="flex items-center justify-between htb-mono text-[0.65rem] text-htb-text-dim uppercase tracking-wider mb-1.5">
                <span>progress</span>
                <span className="text-htb-green">{c.progress}%</span>
              </div>
              <div className="h-1.5 bg-htb-bg rounded overflow-hidden">
                <div
                  className="h-full bg-htb-green"
                  style={{ width: `${c.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
