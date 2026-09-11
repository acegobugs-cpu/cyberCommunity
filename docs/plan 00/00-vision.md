# Level 0 — Vision

## Problem

University cyber-security clubs run on a patchwork of Discord servers, Google Drive folders, ad-hoc CTF platforms and spreadsheets. Knowledge is lost every graduation cycle, onboarding is manual, and there is no single place where a member's identity, learning progress and competition history live together.

## Goal

Build the **Cyber Club Portal**: one platform, one login, four functional areas —

| Area | What members get |
| :-- | :-- |
| **Portal** | The club's front door: home page, member directory, announcements/events, admin controls, personal settings |
| **Community** | Forums, interest groups, messaging |
| **Learn** | Structured courses made of ordered lessons; later progress tracking and quizzes |
| **Challenge** | Contests, CTFs, an automated judge, leaderboards |

## Who it is for

- **Members** — students who register with an e-mail address and consume content.
- **Admins** — club officers who publish content and manage members.
- **Operators** — the small team that deploys and runs the platform (initially the same people who write it).

## Design principles

1. **One identity, many services.** A user logs in once; every area recognises the same user and its own role for that user.
2. **Areas evolve independently.** Each functional area is its own deployable service with its own data. A rewrite of Challenge must not touch Learn.
3. **Boring, well-understood technology.** Spring Boot, PostgreSQL, Next.js. No exotic infrastructure until the need is proven.
4. **Single database, hard boundaries.** One PostgreSQL instance to keep operations cheap, but a schema per service and no cross-schema queries — data crosses service boundaries only over HTTP.
5. **Security at the edge, trust inside.** Tokens are verified once at the gateway; internal services trust a shared secret and propagated identity headers rather than re-parsing tokens.
6. **Run everything locally with one command.** A contributor with Docker (or a JDK + Postgres) must be able to bring the whole platform up.
7. **Ship vertically.** Deliver the thinnest end-to-end slice first (register → login → see an authorised page), then widen.

## Non-goals (for the first release)

- Federated / social login (OAuth2, OIDC, SSO). E-mail + password first; keep the door open.
- Horizontal autoscaling, multi-region, Kubernetes.
- Real-time features (websockets, live chat).
- Mobile apps.
- Multi-tenancy across *different* clubs/universities. One deployment = one club. (We will keep naming neutral so this can change.)

## Success criteria for v1

- A new member can register, log in, and land on a dashboard that shows their role.
- An admin can see the member list and save portal settings.
- Courses and lessons can be created and read through an API.
- Community and Challenge services exist as running skeletons with the same security plumbing, ready to receive features.
- `docker compose up` (backend) + `npm run dev` (frontend) brings everything up on a laptop.
