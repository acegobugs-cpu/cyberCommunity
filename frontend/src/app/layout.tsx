import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { extractSubdomain, areaUrl, SUBDOMAINS } from "@/lib/subdomains";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Each area is a separate host (learn.<root>, …). URLs are derived from the
// current request host so they work on localhost:3000, *.localhost:3000 and
// production alike.
function buildSubdomainNav(host: string | null) {
  return [
    { key: SUBDOMAINS.PORTAL, label: "Portal", href: areaUrl(SUBDOMAINS.PORTAL, host) },
    { key: SUBDOMAINS.COMMUNITY, label: "Community", href: areaUrl(SUBDOMAINS.COMMUNITY, host) },
    { key: SUBDOMAINS.LEARN, label: "Learn", href: areaUrl(SUBDOMAINS.LEARN, host) },
    { key: SUBDOMAINS.CHALLENGES, label: "Challenges", href: areaUrl(SUBDOMAINS.CHALLENGES, host) },
  ];
}

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
  const nav = buildSubdomainNav(host);
  const portalBase = areaUrl(SUBDOMAINS.PORTAL, host, "");

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
            nav={nav}
            portalBase={portalBase}
          />
          <div className="flex-1 flex flex-col">{children}</div>
          <SiteFooter nav={nav} />
        </AuthProvider>
      </body>
    </html>
  );
}
