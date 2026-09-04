export const metadata = {
  title: "Challenges — Cyber Club Portal",
};

const CTFS = [
  {
    title: "Web Exploitation Sprint",
    status: "live",
    time: "ends in 4h 12m",
    participants: 234,
    difficulty: "junior",
  },
  {
    title: "Crypto 200: Beyond RSA",
    status: "live",
    time: "ends in 1d 8h",
    participants: 89,
    difficulty: "intermediate",
  },
  {
    title: "PwnMe: ROP Workshop",
    status: "upcoming",
    time: "starts in 3d",
    participants: 156,
    difficulty: "advanced",
  },
  {
    title: "OSINT Dojo",
    status: "upcoming",
    time: "starts in 1w",
    participants: 312,
    difficulty: "beginner",
  },
];

const DIFF: Record<string, string> = {
  beginner: "htb-badge htb-badge-cyan",
  junior: "htb-badge htb-badge-cyan",
  intermediate: "htb-badge htb-badge-amber",
  advanced: "htb-badge htb-badge-red",
};

const STATUS: Record<string, string> = {
  live: "htb-badge htb-badge-green",
  upcoming: "htb-badge htb-badge-purple",
};

export default function ChallengesHome() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 w-full">
      <div className="mb-8">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
          &gt; ./challenges --live
        </div>
        <h1 className="htb-heading text-3xl text-htb-text mt-1">
          CTFs & Challenges
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Compete in live competitions. Climb the leaderboard.
        </p>
      </div>

      <div className="space-y-3">
        {CTFS.map((c) => (
          <div
            key={c.title}
            className="htb-card htb-card-interactive p-5 flex items-center gap-4"
          >
            <div className="hidden sm:flex flex-col items-center justify-center bg-htb-bg-elevated border border-htb-border rounded w-16 h-16 shrink-0">
              <span className="htb-mono text-[0.6rem] uppercase tracking-widest text-htb-green">
                ctf
              </span>
              <span className="htb-heading text-2xl text-htb-text">
                {c.participants}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={STATUS[c.status]}>{c.status}</span>
                <span className={DIFF[c.difficulty]}>{c.difficulty}</span>
              </div>
              <h3 className="htb-heading text-base text-htb-text">{c.title}</h3>
              <div className="htb-mono text-xs text-htb-text-dim mt-0.5">
                {c.time} · {c.participants} participants
              </div>
            </div>
            <button className="htb-button htb-button-secondary shrink-0">
              {c.status === "live" ? "Join" : "Notify me"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
