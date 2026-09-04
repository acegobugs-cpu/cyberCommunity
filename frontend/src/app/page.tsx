export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Cyber Club Portal
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
          The central hub for cybersecurity clubs, universities, and technical
          communities. Learn, compete, and collaborate.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-8">
          <a
            href="https://community.cyberclubportal.com"
            className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <h2 className="font-semibold">Community</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Forums, groups, and direct messaging.
            </p>
          </a>
          <a
            href="https://learn.cyberclubportal.com"
            className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <h2 className="font-semibold">Learn</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Courses, modules, and progress tracking.
            </p>
          </a>
          <a
            href="https://challenges.cyberclubportal.com"
            className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <h2 className="font-semibold">Challenges</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Contests, CTFs, and leaderboards.
            </p>
          </a>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">Admin</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Manage users, tenants, and settings.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
