import Link from "next/link";
import { extractSubdomain } from "@/lib/subdomains";
import { headers } from "next/headers";

const SUBDOMAIN_NAV = [
  { key: "portal", label: "Portal", href: "https://cyberclubportal.com" },
  {
    key: "community",
    label: "Community",
    href: "https://community.cyberclubportal.com",
  },
  { key: "learn", label: "Learn", href: "https://learn.cyberclubportal.com" },
  {
    key: "challenges",
    label: "Challenges",
    href: "https://challenges.cyberclubportal.com",
  },
];

export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const host = headerList.get("host") ?? null;
  const subdomain = extractSubdomain(host);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            Learn
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {SUBDOMAIN_NAV.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={
                  item.key === subdomain
                    ? "font-semibold underline"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                }
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
    </div>
  );
}
