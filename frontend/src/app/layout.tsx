import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { extractSubdomain } from "@/lib/subdomains";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("host") ?? null;
  const subdomain = extractSubdomain(host);

  const titles: Record<string, string> = {
    portal: "Cyber Club Portal",
    www: "Cyber Club Portal",
    community: "Community — Cyber Club Portal",
    learn: "Learn — Cyber Club Portal",
    challenges: "Challenges — Cyber Club Portal",
  };

  return {
    title: titles[subdomain ?? "portal"] ?? "Cyber Club Portal",
    description: "Cyber Club Portal — cybersecurity club platform",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const host = headerList.get("host") ?? null;
  const subdomain = extractSubdomain(host);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold">
              Cyber Club Portal
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
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
