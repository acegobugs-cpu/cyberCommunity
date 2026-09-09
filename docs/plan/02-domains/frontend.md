# Domain — Frontend

**Level 2** · `frontend/` · Next.js App Router

## Responsibility

All user-facing UI plus a thin **BFF** (backend-for-frontend) layer so the browser only ever talks to its own origin. The BFF forwards to the gateway and, during early development, fills gaps with mock data so pages can be designed before their backends exist.

## Information architecture

| Area | Subdomain | Path | v1 data source |
| :-- | :-- | :-- | :-- |
| Portal home | `portal.` / `www.` / root | `/` | live members + portal info; mock announcements/events |
| Auth | portal | `/signin`, `/signup` | live (identity via gateway) |
| Dashboard | portal | `/dashboard` | live (`/api/portal/info`, `/api/members`) |
| Members | portal | `/members` | live list, mock enrichment (rank, points, skills, avatar) |
| Announcements / Events | portal | `/announcements`, `/events` | mock (backend v2) |
| Settings | portal | `/settings` | live save (`POST /api/setting`), mock defaults |
| Community | `community.` | `/community` | static placeholder |
| Learn | `learn.` | `/learn` | static placeholder |
| Challenges | `challenges.` | `/challenges` | static placeholder |

Portal pages live in a `(portal)` route group; `community/`, `learn/`, `challenges/` are plain segments. Subdomain awareness: `proxy.ts` (Next 16 middleware) extracts the subdomain and exposes it as `x-subdomain`; the root layout reads `Host` to set `data-subdomain` and choose the header navigation.

## BFF route handlers (`src/app/api/**`)

| Route | → Gateway | Service |
| :-- | :-- | :-- |
| `POST /api/signup`, `POST /api/signin` | `/signup`, `/signin` | identity |
| `GET /api/users`, `GET /api/users/[id]` | `/users`, `/users/{id}` | portal |
| `GET /api/portal/info` | `/portal/info` | portal |
| `GET|POST /api/setting` | `/setting` | portal |
| `GET /api/members` | `/users` then merge with mock profile data | portal + mock |
| `GET|POST /api/announcements`, `GET /api/events` | in-memory mock until Portal v2 | — |

`forwardToGateway(req, {service, backendPath})`: copy headers (minus hop-by-hop), add `X-Service-Name`, forward body, `cache: no-store`, 502 JSON when the gateway is unreachable.

## Auth on the client

- `AuthProvider` / `useAuth()` holds `{user, token}` in React state, persisted to `localStorage["ccp.auth"]`.
- `signin`/`signup` post to the BFF, decode the JWT `sub` for the user id, store token.
- `api.get/post/put/del` wrapper adds `Authorization: Bearer <token>` and throws `ApiError{status, body}`.
- Pages that need auth redirect to `/signin` when no token is present.

## Visual design

"Terminal / HTB" aesthetic: near-black background, `#9fef00` green accent, JetBrains Mono for headings and code, Geist for body. Tokens as Tailwind 4 `@theme` variables (`htb-*`), reusable classes `htb-card`, `htb-button-*`, `htb-badge-*`, `htb-input`, scanline/grid backgrounds, blink/flicker animations. Components: `SiteHeader`, `SiteFooter`, `AnnouncementCard`, `EventCard`, `MemberAvatar`, `StatsBar`, `ActivityFeed`, `TerminalBlock`.

## Types

Mirror backend DTOs exactly: `AuthResponse`, `Member`, `PortalInfo`, `SettingData`; `EnrichedMember` adds the presentation-only fields the mock layer supplies.

## Configuration

`NEXT_PUBLIC_GATEWAY_URL` (default `http://localhost:8080`), `NEXT_PUBLIC_ROOT_DOMAIN` (default `cyberclubportal.com`); `allowedDevOrigins` for `*.localhost`.

## Tests

Browser-level scripts (Puppeteer and Selenium against Firefox) that drive the signup form and assert an `/api/signup` call is made — used to reproduce/verify the critical auth path. Unit/component tests deferred.

## Later

Replace mock announcements/events/members-enrichment with Portal v2 endpoints; member detail page; token expiry handling; i18n behind the language selector; Dockerise the frontend into Compose.
