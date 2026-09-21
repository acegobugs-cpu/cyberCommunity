# Level 0 — Goals (Learn)

## Problem

Club knowledge lives in scattered slides, Discord pins and "ask the seniors". New members have no path from zero to their first CTF; seniors repeat the same intro sessions every semester; nobody can see who has learned what.

## Goal

A learning area where a member can pick a **roadmap** ("Web Exploitation Track"), work through its **paths** module by module, prove understanding with **quizzes**, practise on real targets in **labs**, and build real **projects** on their own machine — with progress that survives the semester and is visible on their dashboard.

## Personas

| Persona | Role in Learn | Needs |
| :-- | :-- | :-- |
| **Learner** | `USER` | browse catalogue, enroll, read/watch lessons, take quizzes, start labs and submit flags, build projects on their own machine, solve code exercises in the browser, see progress |
| **Author** (club officer) | `ADMIN` | create/edit/publish roadmaps, paths, modules, lessons (with folder trees of documents / tutorial videos), quizzes, labs, exercises |
| **Operator** | infra | run the lab-runner safely, cap resource usage, see who has labs running |

## Glossary

| Term | Meaning |
| :-- | :-- |
| **Roadmap** | An ordered, published list of courses forming a track. Linear: course *n* is recommended after *n−1*; `required` marks courses that count toward roadmap completion. |
| **Course** | A self-contained unit with a difficulty, tags and a syllabus of modules. Can exist outside any roadmap. |
| **Module** | An ordered section inside a course grouping related lessons. |
| **Lesson** | The atomic learning step. Typed: `READING` (markdown), `VIDEO` (URL + notes), `QUIZ`, `LAB`, `PROJECT`, `EXERCISE`. Any lesson may carry a **document tree** (folders/files of markdown and tutorial videos, rendered like a repository). Completion rules depend on the type. |
| **Quiz** | Attached to a `QUIZ` lesson. Questions with single/multi-choice options; a pass score gates completion. |
| **Lab** | Attached to a `LAB` lesson. A container image plus ordered **tasks**, each with a flag. The learner starts a **session** (isolated instance with TTL), solves tasks, submits flags. |
| **Project** | *(final 2026-09-21)* A `PROJECT` lesson: something the learner **builds on their own computer, in their own repo** — e.g. "a multi-service Java web app with subdomain routing" — following the lesson's body and document tree (either as the last step of a module that walks through the build lesson by lesson, or as a stand-alone specification). **Learn stores nothing about the result and grades nothing**: completion is self-attested like a reading. Showing it off and getting feedback happens in the Community service. |
| **Exercise** | *(L7)* An `EXERCISE` lesson: a code scaffold held by the platform (dependencies, tests and part of the implementation present); the learner edits an allowed set of files in the browser and runs the club's tests through the judge, task by task. Completes when every required task passes. The only lesson type that executes learner code. |
| **Enrollment** | Learner ↔ course relation; created explicitly (or implicitly on first lesson completion). |
| **Progress** | Per-lesson completion; course % = completed / total lessons; roadmap % = weighted over `required` courses. |

## Design principles (in addition to Plan 00's)

1. **Content is data, not code.** Everything an author writes is stored in the `learn` schema as markdown/JSON and editable from the UI. No redeploy to publish a course.
2. **Draft → published.** Roadmaps and courses have a `published` flag; learners only ever see published content. Authors see everything.
3. **Completion is explicit and typed.** A reading, video or project is complete when the learner says so; a quiz when passed; a lab when all required tasks are solved; an exercise when all required tasks' tests pass.
4. **Labs are disposable and isolated.** One container set per learner per session, hard TTL, resource limits, no shared state. Nothing the learner does in a lab can touch the platform.
5. **Grading stays in Java** wherever it is a comparison (quiz answers, flag hashes). Only *running untrusted things* leaves the JVM.
6. **The frontend has one door into Learn**: the BFF route `POST /api/learn/graphql`.

## Non-goals (Plan 01)

- Code-execution exercises are **in** scope as L7 (after the lab-runner), not deferred to Plan 02; Plan 02 reuses the same judge.
- Certificates/badges, gamification, leaderboards (Challenge domain).
- Live sessions, video hosting/transcoding (media pipeline plan), comments/discussion on lessons (Community).
- Multi-language content, versioning of published paths, SCORM/xAPI import.
- Anything about the *result* of a project: storing repo URLs, grading, approval, rubrics, peer showcase, author notes. Learn only delivers the specification and records "done"; the rest is Community.
- Hosting or running learners' *project* code (they build on their own machine). Running learner code happens only for `EXERCISE` lessons, through the judge, inside the lab-runner's isolation.
- VPN access to labs (WireGuard) — published host port in v1; VPN arrives with Challenge's CTF needs.

## Success criteria (end of Plan 01)

- A learner signs in, opens `/learn`, enrolls in a published roadmap, completes a reading, passes a quiz, starts a lab, submits a correct flag, follows a project's document tree and marks it built — and the dashboard shows the resulting progress.
- An author creates all of the above from the UI without touching the database.
- Two learners can run the same lab simultaneously without seeing each other's instance; every instance is destroyed at TTL.
- `learn` has an integration test suite covering the authorization matrix; `lab-runner` has unit tests for its state machine and an integration test against a local Docker daemon.
