# Level 3 — Frontend (Learn area)

Lives in `frontend/src/app/learn/**`; reached at `/learn` on any host and at `learn.<root-domain>`. Replaces the static placeholder page from Plan 00.

## 1. Single door: `POST /api/learn/graphql`

`frontend/src/app/api/learn/graphql/route.ts`:
```ts
export async function POST(req: NextRequest) {
  return forwardToGateway(req, { service: "learn", backendPath: "/graphql" });
}
```
The session cookie is turned into `Authorization` by `forwardToGateway` (Plan 00). Server components call the gateway directly through a small `learnQuery<T>(query, variables, token)` helper in `src/lib/data/learn.ts` built on `gatewayFetch` — same pattern as `data/members.ts`.

**Typing:** GraphQL Code Generator (`@graphql-codegen/cli` + `typescript-operations`) reads `learn/src/main/resources/graphql/schema.graphqls` and `frontend/src/graphql/**/*.graphql` and emits `src/graphql/generated.ts`. `npm run codegen` is part of `npm run lint`'s prerequisite in CI so schema drift fails the build. Client: plain `fetch` via `api.post("/api/learn/graphql", { query, variables })` — no Apollo/urql until caching is actually needed.

## 2. Pages

| Route | Type | Data (operation) | Purpose |
| :-- | :-- | :-- | :-- |
| `/learn` | server | `roadmaps`, `courses`, `myEnrollments` | catalogue: roadmap cards, course grid with difficulty/tag filters, "continue" strip |
| `/learn/roadmaps/[slug]` | server | `roadmap(slug)` | ordered courses with per-course progress, required badge, roadmap % |
| `/learn/courses/[slug]` | server + client island | `course(slug)` | syllabus (modules → lessons with type icon and status), enroll button, progress bar |
| `/learn/courses/[slug]/lessons/[id]` | client | `lesson(id)` + type-specific mutation | the lesson player (see §3) |
| `/learn/projects` | client | `myProjects` | learner's portfolio: every project they have a workspace for, repo links, shared flag, any author notes |
| `/learn/courses/[slug]/modules/[id]/showcase` | server | `module { project { showcase } }` | peers' shared builds for one project (only when `visibility = PEERS` and the caller has started the module); names enriched from the portal member list |
| `/learn/admin` | client, `isAdmin` only | author queries | content tree editor: roadmaps → courses → modules → lessons; publish toggles |
| `/learn/admin/courses/[id]` | client | `upsert*`, `reorder` | course editor: modules/lessons with drag-reorder; typed sub-editors (quiz builder, lab form with plaintext flags, **project form + spec tree editor on the module**) |
| `/learn/admin/projects/[id]/workspaces` | client | `projectWorkspaces`, `leaveProjectFeedback` | everyone's workspaces on one project; optional notes (no approve/reject) |
| `/learn/admin/labs` | client | `adminLabSessions`, `adminStopLab` | running sessions, force stop |

Auth gating: pages that need a session redirect to `/signin` when `useAuth().user` is null (client) or when `getSessionToken()` is null (server). Admin routes additionally check `isAdmin`; the backend enforces regardless.

## 3. Lesson player (by `type`)

| Type | UI | Completion action |
| :-- | :-- | :-- |
| `READING` | markdown body | "Mark complete" → `completeLesson` |
| `VIDEO` | embedded player (YouTube/Vimeo URL → iframe; direct URL → `<video>`), notes below | "Mark complete" |
| `QUIZ` | one question per step, radio/checkbox by `kind`, submit at end → score, pass/fail, retry | `submitQuiz` (auto-completes on pass) |
| `LAB` | brief; **Start lab** → status pill (STARTING/RUNNING, countdown to `expiresAt`), endpoint with copy button; task list with flag inputs; **Stop** | `startLab`, `submitFlag`, `stopLab`; polls `lesson { lab { mySession } }` every 3 s while STARTING/RUNNING |
| `PROJECT` | *(revised 2026-09-21)* brief, then the **spec viewer**: a two-pane file-tree browser built from `ProjectDoc.path` (folders fold from the segments; `DOC` renders markdown, `VIDEO` renders the embedded player + notes), deep-linkable via `?doc=<path>`. Below: deliverable checklist ("repo URL ✓ / write-up ✗") reading from the workspace | "Mark complete" → `completeLesson`, **disabled with the reason until `Project.deliverableMet`**. No submit, no review. |

**Project workspace card.** When the current module has a `project`, every lesson in that module (not only the `PROJECT` one) shows a persistent card at the top of the sidebar: project title → brief, repo URL field, notes field, **share with peers** toggle (only when `visibility = PEERS`), "open showcase" link, and any author note. Saves with `saveWorkspace` on blur. The artifact follows the learner through every step, and for spec-only projects it is the only interactive element besides the spec viewer.

Navigation: prev/next lesson across modules; sidebar syllabus with status icons; completing a lesson advances automatically.

## 4. Markdown

All `*_md` fields are author-written and rendered in the browser with `react-markdown` + `remark-gfm` + `rehype-sanitize` (default schema, allow `code` classes for highlighting via `rehype-highlight`). Authors are trusted (`ADMIN`) but sanitising is still mandatory — a compromised admin account must not become stored XSS for every learner. Images are external URLs until the media pipeline exists.

## 5. Components (new)

`RoadmapCard`, `CourseCard`, `ProgressBar`, `LessonTypeIcon`, `SyllabusTree`, `MarkdownView`, `QuizRunner`, `LabPanel` (status, countdown, endpoint, tasks), `ProjectSpecViewer` (file tree + document/video pane), `ProjectWorkspaceCard`, `ShowcaseGrid`, `ContentTreeEditor`, `QuizBuilder`, `LabForm`, `ProjectForm` (brief, deliverable, visibility, feedback), `SpecTreeEditor` (add folder/doc/video, rename path, reorder, markdown preview). Styling stays on `htb-*` tokens; lesson types map to badge colours (`READING` green, `VIDEO` cyan, `QUIZ` purple, `LAB` amber, `PROJECT` magenta); a module with a project shows a magenta "project" badge on the syllabus.

## 6. Dashboard integration

Portal dashboard's "Continue learning" card becomes real: `myEnrollments` → first course with progress < 1 → link to its next incomplete lesson. Requires the dashboard to call `/api/learn/graphql`; falls back to the catalogue link when the call fails.

## 7. Tests

- `npx tsc --noEmit`, `npm run lint`, `npm run codegen` (drift check).
- Playwright smoke (replaces the Puppeteer/Selenium scripts): sign in → open course → complete reading → progress bar increments; admin creates course → appears in catalogue after publish. Runs against the Compose stack.
