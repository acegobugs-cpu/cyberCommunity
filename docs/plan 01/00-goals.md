# Level 0 — Goals (Learn)

## Problem

Club knowledge lives in scattered slides, Discord pins and "ask the seniors". New members have no path from zero to their first CTF; seniors repeat the same intro sessions every semester; nobody can see who has learned what.

## Goal

A learning area where a member can pick a **roadmap** ("Web Exploitation Track"), work through its **courses** module by module, prove understanding with **quizzes**, practise on real targets in **labs**, and finish with a reviewed **project** — with progress that survives the semester and is visible on their dashboard.

## Personas

| Persona | Role in Learn | Needs |
| :-- | :-- | :-- |
| **Learner** | `USER` | browse catalogue, enroll, read/watch lessons, take quizzes, start labs and submit flags, submit projects, see progress |
| **Author** (club officer) | `ADMIN` | create/edit/publish roadmaps, courses, modules, lessons, quizzes, labs, projects; review project submissions |
| **Operator** | infra | run the lab-runner safely, cap resource usage, see who has labs running |

## Glossary

| Term | Meaning |
| :-- | :-- |
| **Roadmap** | An ordered, published list of courses forming a track. Linear: course *n* is recommended after *n−1*; `required` marks courses that count toward roadmap completion. |
| **Course** | A self-contained unit with a difficulty, tags and a syllabus of modules. Can exist outside any roadmap. |
| **Module** | An ordered section inside a course grouping related lessons. |
| **Lesson** | The atomic learning step. Typed: `READING` (markdown), `VIDEO` (URL + notes), `QUIZ`, `LAB`, `PROJECT`. Completion rules depend on the type. |
| **Quiz** | Attached to a `QUIZ` lesson. Questions with single/multi-choice options; a pass score gates completion. |
| **Lab** | Attached to a `LAB` lesson. A container image plus ordered **tasks**, each with a flag. The learner starts a **session** (isolated instance with TTL), solves tasks, submits flags. |
| **Project** | A capstone attached to a course or roadmap: brief + rubric; learner submits a repo URL and/or write-up; an author reviews and approves or requests changes. |
| **Enrollment** | Learner ↔ course relation; created explicitly (or implicitly on first lesson completion). |
| **Progress** | Per-lesson completion; course % = completed / total lessons; roadmap % = weighted over `required` courses. |

## Design principles (in addition to Plan 00's)

1. **Content is data, not code.** Everything an author writes is stored in the `learn` schema as markdown/JSON and editable from the UI. No redeploy to publish a course.
2. **Draft → published.** Roadmaps and courses have a `published` flag; learners only ever see published content. Authors see everything.
3. **Completion is explicit and typed.** A reading is complete when the learner says so; a quiz when passed; a lab when all required tasks are solved; a project when approved.
4. **Labs are disposable and isolated.** One container set per learner per session, hard TTL, resource limits, no shared state. Nothing the learner does in a lab can touch the platform.
5. **Grading stays in Java** wherever it is a comparison (quiz answers, flag hashes). Only *running untrusted things* leaves the JVM.
6. **The frontend has one door into Learn**: the BFF route `POST /api/learn/graphql`.

## Non-goals (Plan 01)

- Code-execution exercises with automated tests (Plan 02's judge; lesson type reserved).
- Certificates/badges, gamification, leaderboards (Challenge domain).
- Live sessions, video hosting/transcoding (media pipeline plan), comments/discussion on lessons (Community).
- Multi-language content, versioning of published courses, SCORM/xAPI import.
- Peer review of projects (author review only).
- VPN access to labs (WireGuard) — published host port in v1; VPN arrives with Challenge's CTF needs.

## Success criteria (end of Plan 01)

- A learner signs in, opens `/learn`, enrolls in a published roadmap, completes a reading, passes a quiz, starts a lab, submits a correct flag, submits a project — and the dashboard shows the resulting progress.
- An author creates all of the above from the UI without touching the database.
- Two learners can run the same lab simultaneously without seeing each other's instance; every instance is destroyed at TTL.
- `learn` has an integration test suite covering the authorization matrix; `lab-runner` has unit tests for its state machine and an integration test against a local Docker daemon.
