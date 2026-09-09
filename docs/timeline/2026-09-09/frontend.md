# Frontend — 2026-09-09

**Path:** `frontend/` · **Framework:** Next.js 16.3.4 (App Router), React 19.2.8, TypeScript 5, Tailwind CSS 4 · **Status:** auth + members + settings wired to backend; all other content static or mock

## Tooling

| Item | Value |
| :-- | :-- |
| Scripts | `npm run dev` (port 3000), `build`, `start`, `lint` |
| devDeps | `eslint 9` + `eslint-config-next 16.3.4`, `@types/*`, `puppeteer-core ^25.10`, `selenium-webdriver ^4.48` |
| `tsconfig.json` | strict, target ES2017, alias `@/* → ./src/*` |
| `postcss.config.mjs` | `@tailwindcss/postcss` |
| `eslint.config.mjs` | `eslint-config-next/core-web-vitals` + `/typescript`; ignores `.next/`, `out/`, `build/`, `next-env.d.ts` |
| `AGENTS.md` / `CLAUDE.md` | auto-generated Next 16 agent rules block; `CLAUDE.md` just references `@AGENTS.md` |
| Not in Docker Compose | run separately with `npm run dev` |

### Environment variables

| Var | Default | Used in |
| :-- | :-- | :-- |
| `NEXT_PUBLIC_GATEWAY_URL` | `http://localhost:8080` | `lib/gateway.ts`, `app/api/members/route.ts` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `cyberclubportal.com` | `next.config.ts`, `lib/subdomains.ts` |

### `next.config.ts`
- `experimental.serverActions.allowedOrigins`: `ROOT_DOMAIN`, `www.`, `community.`, `learn.`, `challenges.` + ROOT_DOMAIN.
- `allowedDevOrigins`: `localhost`, `portal.localhost`, `community.localhost`, `learn.localhost`, `challenges.localhost`, `cyberclubportal.com`.

## Source layout

```
src/
├── proxy.ts                      # Next 16 middleware (renamed from middleware.ts in Next 16)
├── app/
│   ├── layout.tsx                # root layout: AuthProvider, SiteHeader, SiteFooter, fonts, data-subdomain
│   ├── page.tsx                  # landing
│   ├── globals.css               # theme tokens + htb-* utility classes
│   ├── (portal)/{signin,signup,dashboard,announcements,events,members,settings}/page.tsx
│   ├── community/{layout,page}.tsx
│   ├── learn/page.tsx
│   ├── challenges/page.tsx
│   └── api/{signup,signin,users,users/[id],portal/info,setting,members,announcements,events}/route.ts
├── components/                   # site-header, site-footer, announcement-card, event-card, member-avatar,
│                                 # activity-feed, stats-bar, terminal-block, nav-item.ts
└── lib/                          # api.ts, gateway.ts, auth-context.tsx, subdomains.ts, types.ts,
                                  # enriched-types.ts, mock-data.ts
```

## Middleware — `src/proxy.ts`

Next.js 16 uses `proxy.ts` as the middleware file name, so this **is** active. `matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]`.
Skips `/_next*`, `/api*`, paths containing `.`, `/favicon.ico`. Otherwise `extractSubdomain(host)`; if recognised, sets **response** header `x-subdomain`. No rewrites/redirects — subdomains do not change which page renders; pages live under fixed paths (`/community`, `/learn`, `/challenges`).

## Subdomains — `lib/subdomains.ts`

`SUBDOMAINS = { PORTAL:"portal", COMMUNITY:"community", LEARN:"learn", CHALLENGES:"challenges", WWW:"www" }`, `SUBDOMAIN_PATHS = { portal:"", community:"/community", learn:"/learn", challenges:"/challenges", www:"" }`.
`extractSubdomain(host)` handles `<sub>.cyberclubportal.com` and `<sub>.localhost[:port]`; returns `null` for unknown labels. Root layout reads `headers().get("host")` and sets `<html data-subdomain>`; `SiteHeader` shows portal nav only when subdomain is `portal`/`www`/null.

## Pages

| Route | Type | Data | Notes |
| :-- | :-- | :-- | :-- |
| `/` | server, `force-dynamic` | `api.get` of `/api/members`, `/api/announcements`, `/api/events`, `/api/portal/info` | Hero, `StatsBar`, pinned + 3 recent announcements, top-5 members by points, upcoming events, `ActivityFeed`, `TerminalBlock`. Degrades gracefully if gateway is down. |
| `/signin` | client | `useAuth().signin` | fields `#email`, `#password`; redirects `/dashboard`; errors shown with `.text-htb-red` |
| `/signup` | client | `useAuth().signup` | fields `#username` (min 3), `#email`, `#password` (min 8, client-side only) |
| `/dashboard` | client | `/api/members`, `/api/portal/info` | redirects to `/signin` if no token; finds current user by email in enriched members; shows rank/points/skills, role, quick links |
| `/announcements` | server | `/api/announcements` | mock data, sorted pinned→date |
| `/events` | server | `/api/events` | mock data, sorted by `startsAt` |
| `/members` | server | `/api/members` | table (#, avatar/email, role badge, country, points, status); row links are `href="#"` |
| `/settings` | client | `GET /api/setting` (falls back to `mockDb.settings`), `POST /api/setting` | theme `hacker/neon/dark`, language `en/es/fr/de/ja`, `notifications_enabled` toggle |
| `/community` | server | static | six forum categories + four groups, hard-coded |
| `/learn` | server | static | four courses with fake progress bars |
| `/challenges` | server | static | four CTFs; Join/Notify buttons inert |

`(portal)` is a route group with no layout of its own.

## API route handlers (`src/app/api/**`)

`forwardToGateway(req, {service, backendPath})` (`lib/gateway.ts`): builds `${GATEWAY_URL}${backendPath}${search}`, copies all request headers except `host`, `content-length`, `connection`, `accept-encoding`, adds `X-Service-Name: <service>`, forwards body for non-GET/HEAD, `cache:"no-store"`. Network failure → `502 {error:"gateway unreachable", gateway, service, detail}`. Response passes status/body through, dropping `content-encoding`, `transfer-encoding`, `connection`, `keep-alive`.

| Handler | Methods | Backend | Works today? |
| :-- | :-- | :-- | :-- |
| `api/signup` | POST | identity `POST /signup` | yes (201 + token) |
| `api/signin` | POST | identity `POST /signin` | yes; wrong credentials surface as 500 from identity |
| `api/users` | GET | portal `GET /users` | yes for role `USER` (ADMIN → 403) |
| `api/users/[id]` | GET | portal `GET /users/{id}` | **no such backend endpoint** |
| `api/portal/info` | GET | portal `GET /portal/info` | yes |
| `api/setting` | GET, POST | portal `/setting` | POST yes (ADMIN only); **GET has no backend** → settings page falls back to mock |
| `api/members` | GET | direct `fetch(GATEWAY_URL/users, {X-Service-Name: portal})` **without Authorization** | gateway sees unauthenticated → routes to identity → non-2xx → falls back to `mockDb.memberProfiles`. Then enriches each member with mock rank/points/skills/status/country/avatarColor (defaults `rank 999, points 0, status offline, country "?"` when unmatched). Returns `EnrichedMember[]`. |
| `api/announcements` | GET, POST | none (in-memory `mockDb.announcements`; POST prepends and returns 201) | mock |
| `api/events` | GET | none (`mockDb.events`) | mock |

## Auth — `lib/auth-context.tsx` + `lib/api.ts`

- `AuthProvider` wraps the app; `useAuth()` → `{ user, token, loading, signin, signup, signout }`.
- Storage: `localStorage["ccp.auth"] = { user: {id, username, email}, token }`; read on mount.
- `signin(email, password)` → `api.post("/api/signin")` → `AuthResponse{accessToken, tokenType, expiresIn}`; `decodeJwtSubject(token)` (base64 payload, no signature/expiry check) supplies `user.id`; username derived locally.
- `signup(username, email, password)` → `api.post("/api/signup")`, same handling.
- `signout()` clears storage.
- `configureApi({ getToken })` lets `api.get/post/put/del` add `Authorization: Bearer <token>` and `Content-Type: application/json`; non-2xx → `throw new ApiError(message, status, body)`.

## Types

`lib/types.ts`: `User{id, username, email}`, `AuthResponse{accessToken, tokenType, expiresIn}`, `SignupRequest`, `SigninRequest`, `Member{service_name, username, email, role, created_at}`, `PortalInfo{userId, serviceName, role, message}`, `SettingData{theme, notifications_enabled, language_code}`.
`lib/enriched-types.ts`: `EnrichedMember extends Member { id, bio, rank, points, skills[], status:"online"|"offline"|"away", country, joined_at, avatarColor }`.

## Mock data — `lib/mock-data.ts`

- 8 member profiles (`u1` root_operator … `u8` cr4sh_ov3rride) with bio, rank, points, skills, status, country, joinedAt, `serviceRoles[]`.
- 4 announcements (`a1` pinned DEF CON prep, `a2` weekly CTF, `a3` new course, `a4` maintenance alert) with `type ∈ info|alert|event|ctf`.
- 3 events (`e1` H@ck Week 2026, `e2` Web Exploitation Workshop, `e3` PicoCTF mirror).
- `settings` (`allowSelfSignup`, `allowInvites`, `requireUniversityEmail`, `primaryColor #9fef00`, `emailNotifications`, `discordWebhook`).
- Helpers `findMemberByEmail/ByUsername/ById`, export `mockDb`.

## Components

| Component | Props | Purpose |
| :-- | :-- | :-- |
| `SiteHeader` (client) | `{subdomain, nav: NavItem[]}` | logo, portal nav (Home/Members/News/Events/Settings — Settings only when role is ADMIN), subdomain nav, Sign in/Join or username/Sign out, mobile toggle |
| `SiteFooter` | `{nav}` | blurb, service links, resource links, fake build hash/uptime |
| `AnnouncementCard` | `{announcement, expanded?}` | type badge, pinned star, 2-line clamp |
| `EventCard` | `{event}` | calendar block + details + RSVP count |
| `MemberAvatar` | `{name, color?, status?, size?}` | initials, hashed colour, status dot |
| `ActivityFeed` (client) | `{members}` | fake `tail -f activity.log` ticker (4 s) |
| `StatsBar` | `{memberCount, onlineCount, eventCount, announcementCount}` | four stat tiles |
| `TerminalBlock` (client) | `{lines}` | typewriter animation |
| `nav-item.ts` | `NavItem = {key, label, href}` | root layout defines `SUBDOMAIN_NAV` with absolute `https://<sub>.cyberclubportal.com` links |

## Styling — `globals.css`

Tailwind 4 `@theme` tokens `htb-bg #0a0e14`, `htb-bg-elevated`, `htb-bg-card`, `htb-border`, `htb-text #d4d4d4`, `htb-green #9fef00`, `htb-red`, `htb-amber`, `htb-cyan`, `htb-purple`, `htb-magenta`, `htb-blue`; fonts Geist (`--font-inter`) and JetBrains Mono (`--font-jetbrains-mono`) via `next/font/google`. Utility classes `.htb-card`, `.htb-button(-primary|-secondary|-ghost|-danger)`, `.htb-input`, `.htb-label`, `.htb-badge-*`, `.htb-glow`, `.htb-scanline`, `.htb-grid-bg`; animations `htb-pulse`, `htb-blink`, `htb-flicker`.

## Test scripts (manual, not in `npm test`)

- `browser-test.mjs` — Puppeteer with `/usr/bin/firefox`, opens `http://localhost:3000/signup`, fills unique user, clicks "Create account", waits 5 s, logs requests/console/`.text-htb-red`/`.text-htb-green`; prints `"NO API REQUESTS - THIS IS THE BUG"` if no `/api/` call was seen.
- `selenium-test.mjs` — spawns geckodriver on 4444, same flow, wraps `window.fetch` into `window.__apiRequests`.
Both were written to reproduce a "signup does not call the API" bug; whether it still reproduces depends on the running stack.

## Observations

- `api/members` never sends the user's token, so real members are practically never returned; the members list is mock-backed in practice.
- `/settings` GET and `/users/{id}` have no backend; `/setting` POST requires ADMIN while every signed-up user is `USER`.
- No client-side JWT expiry handling — after 15 minutes every backend call returns identity 5xx/portal 401 until sign-out.
- Portal nav "News" points at `/announcements`; announcements/events are not persisted anywhere.
- Subdomain nav uses hard-coded `https://*.cyberclubportal.com` URLs even in dev.
