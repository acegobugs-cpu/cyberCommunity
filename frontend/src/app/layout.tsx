import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { extractSubdomain, SUBDOMAIN_PATHS, SUBDOMAINS } from "@/lib/subdomains";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Relative paths work on every host (localhost, *.localhost, production
// subdomains) because each area is also mounted at a path.
const SUBDOMAIN_NAV = [
  { key: SUBDOMAINS.PORTAL, label: "Portal", href: "/" },
  { key: SUBDOMAINS.COMMUNITY, label: "Community", href: SUBDOMAIN_PATHS[SUBDOMAINS.COMMUNITY] },
  { key: SUBDOMAINS.LEARN, label: "Learn", href: SUBDOMAIN_PATHS[SUBDOMAINS.LEARN] },
  { key: SUBDOMAINS.CHALLENGES, label: "Challenges", href: SUBDOMAIN_PATHS[SUBDOMAINS.CHALLENGES] },
];

export const metadata = {
  title: "Cyber Club Portal",
  description:
    "The central hub for cybersecurity clubs, universities, and technical communities.",
};

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
      data-subdomain={subdomain ?? "portal"}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <SiteHeader
            subdomain={subdomain}
            nav={SUBDOMAIN_NAV}
          />
          <div className="flex-1 flex flex-col">{children}</div>
          <SiteFooter nav={SUBDOMAIN_NAV} />
        </AuthProvider>
      </body>
    </html>
  );
}
