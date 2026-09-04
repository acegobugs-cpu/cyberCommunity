import type { NavItem } from "@/components/nav-item";

export function SiteFooter({ nav }: { nav: NavItem[] }) {
  return (
    <footer className="border-t border-htb-border bg-htb-bg-elevated">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
              &gt; whoami
            </div>
            <h3 className="htb-heading mt-2 text-xl text-htb-text">
              Cyber Club Portal
            </h3>
            <p className="mt-3 max-w-md text-sm text-htb-text-muted">
              The central hub for cybersecurity clubs, universities, and
              technical communities. Learn, compete, and collaborate across
              isolated service tenants.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="htb-badge htb-badge-green">
                <span className="h-1.5 w-1.5 rounded-full bg-htb-green animate-htb-pulse" />
                all systems operational
              </span>
            </div>
          </div>

          <div>
            <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
              &gt; services
            </div>
            <ul className="mt-3 space-y-2">
              {nav.map((n) => (
                <li key={n.key}>
                  <a
                    href={n.href}
                    className="htb-mono text-sm text-htb-text-muted hover:text-htb-green transition-colors"
                  >
                    → {n.label.toLowerCase()}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
              &gt; resources
            </div>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="#"
                  className="htb-mono text-sm text-htb-text-muted hover:text-htb-green transition-colors"
                >
                  → documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="htb-mono text-sm text-htb-text-muted hover:text-htb-green transition-colors"
                >
                  → api reference
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="htb-mono text-sm text-htb-text-muted hover:text-htb-green transition-colors"
                >
                  → status page
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="htb-mono text-sm text-htb-text-muted hover:text-htb-green transition-colors"
                >
                  → github
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="htb-divider mt-10 mb-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="htb-mono text-xs text-htb-text-dim">
            &copy; 2026 Cyber Club Portal · build
            <span className="text-htb-green"> a3f9e1b</span> · uptime
            <span className="text-htb-green"> 99.97%</span>
          </div>
          <div className="htb-mono text-xs text-htb-text-dim">
            <span className="animate-htb-blink text-htb-green">█</span> ready
          </div>
        </div>
      </div>
    </footer>
  );
}
