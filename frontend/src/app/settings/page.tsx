"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { SettingData } from "@/lib/types";
import { mockDb } from "@/lib/mock-data";

const THEMES = ["hacker", "neon", "dark"] as const;

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [setting, setSetting] = useState<SettingData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/signin");
      return;
    }
    let active = true;
    api
      .get<SettingData>("/api/setting")
      .then((s) => active && setSetting(s))
      .catch(() => {
        if (!active) return;
        const fallback = mockDb.settings;
        setSetting({
          theme: "hacker",
          notifications_enabled: fallback.emailNotifications,
          language_code: "en",
        });
      });
    return () => {
      active = false;
    };
  }, [user, authLoading, router]);

  if (authLoading || !setting) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="htb-mono text-htb-text-dim animate-htb-pulse">
          loading settings...
        </div>
      </main>
    );
  }

  async function save() {
    if (!setting) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.post("/api/setting", setting);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof SettingData>(
    key: K,
    value: SettingData[K],
  ) {
    setSetting((s) => (s ? { ...s, [key]: value } : s));
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 w-full">
      <div className="mb-8">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-text-dim">
          &gt; ./settings --configure
        </div>
        <h1 className="htb-heading text-3xl text-htb-text mt-1">
          Tenant Settings
        </h1>
        <p className="htb-mono text-sm text-htb-text-muted mt-2">
          Settings are persisted to the portal service via the gateway.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsSection
          title="appearance"
          desc="theme and language for this tenant"
        >
          <div>
            <label className="htb-label">theme</label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => update("theme", t)}
                  className={`htb-card htb-card-interactive p-3 text-left ${
                    setting.theme === t
                      ? "border-htb-green ring-1 ring-htb-green/40"
                      : ""
                  }`}
                >
                  <div className="htb-mono text-sm text-htb-text">{t}</div>
                  <div className="htb-mono text-[0.65rem] text-htb-text-dim">
                    {t === "hacker"
                      ? "default green on black"
                      : t === "neon"
                        ? "magenta + cyan accents"
                        : "minimal low-contrast"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="htb-label" htmlFor="lang">
              language
            </label>
            <select
              id="lang"
              value={setting.language_code}
              onChange={(e) => update("language_code", e.target.value)}
              className="htb-input"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </SettingsSection>

        <SettingsSection
          title="notifications"
          desc="how operators receive updates"
        >
          <Toggle
            label="Email notifications"
            desc="Send digest emails for new announcements and events"
            checked={setting.notifications_enabled}
            onChange={(v) => update("notifications_enabled", v)}
          />
        </SettingsSection>

        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={save}
            disabled={saving}
            className="htb-button htb-button-primary"
          >
            {saving ? "saving..." : "Save changes"}
            <span className="htb-mono">→</span>
          </button>
          {saved && (
            <span className="htb-mono text-xs text-htb-green animate-htb-flicker">
              ✓ saved successfully
            </span>
          )}
          {error && (
            <span className="htb-mono text-xs text-htb-red">
              ! {error}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

function SettingsSection({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="htb-card p-6">
      <div className="mb-4 pb-4 border-b border-htb-border">
        <div className="htb-mono text-xs uppercase tracking-widest text-htb-green">
          ## {title}
        </div>
        <div className="htb-mono text-xs text-htb-text-dim mt-1">{desc}</div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="htb-mono text-sm text-htb-text">{label}</div>
        <div className="htb-mono text-xs text-htb-text-dim mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full border transition-colors ${
          checked
            ? "bg-htb-green/20 border-htb-green"
            : "bg-htb-bg border-htb-border"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
            checked
              ? "left-[calc(100%-1.125rem)] bg-htb-green"
              : "left-0.5 bg-htb-text-dim"
          }`}
        />
      </button>
    </div>
  );
}
