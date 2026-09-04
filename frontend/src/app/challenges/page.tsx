export default function ChallengesHome() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Challenges</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Programming contests, CTFs, hackathons, and leaderboards.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["Contests", "CTFs", "Leaderboards"].map((feature) => (
          <div
            key={feature}
            className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="font-semibold">{feature}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Placeholder for {feature.toLowerCase()} feature.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
