# Theo Browne (t3.gg) — dev culture profile

Profiled: 2026-07-11 · Consent tier: **stated** (first-party docs, videos, OSS) · Kind: person
(professional persona only)

## Identity

Creator/founder (Ping.gg, UploadThing, T3 Chat, T3 Code), prolific developer-YouTuber
[[@t3dotgg]](https://www.youtube.com/@t3dotgg), author of the T3 Stack
[[create.t3.gg]](https://create.t3.gg/en/introduction/), ex-Twitch video infra.

## Principles (cited)

1. **Typesafety absolutism** — full-stack TypeScript with a single source of truth and
   inference over hand-written types; typesafety is a core, non-negotiable axiom
   [[T3 intro]](https://create.t3.gg/en/introduction/)
   [[types & Next.js]](https://t3.gg/blog/post/types-and-nextjs)
2. **"Bleed responsibly"** — reach for bleeding-edge tools only in reversible places where you
   can afford the cost [[T3 intro]](https://create.t3.gg/en/introduction/)
3. **Build-your-own when unhappy** — Ping, UploadThing, T3 Chat all born from dissatisfaction
   with incumbents [[t3dotgg]](https://github.com/t3dotgg)
4. **Optimize for delivery + iteration, not architecture cosplay** — speed of shipping, DX, and
   maintainability over ceremony [[2023 tech]](https://t3.gg/blog/post/2023-tech)
5. **Defaults are opinions** — create-t3-app's shipped choices (Next.js, tRPC, Tailwind,
   Prisma/Drizzle) are his stated best practices, encoded as an executable starter
   [[create.t3.gg]](https://create.t3.gg/en/introduction/)
   [[Drizzle support]](https://create.t3.gg/en/usage/drizzle)

## Stack

TypeScript everywhere; T3 Stack = Next.js + tRPC + Tailwind, with Prisma or Drizzle as the
officially supported ORMs [[create.t3.gg]](https://create.t3.gg/en/introduction/)
[[Drizzle]](https://create.t3.gg/en/usage/drizzle) [[t3-oss]](https://github.com/t3-oss).
Agent tooling: T3 Code, a web GUI for coding agents, is a current Ping product
[[t3code]](https://github.com/pingdotgg/t3code).

## Tensions — read before installing

**This skill is self-contradicting by its subject's own standards.** Theo is widely associated
with the stance that accumulated prompt configuration is technical debt — favoring minimally
configured, third-party-maintained agent tooling (terminal-first, parallel agents over git
worktrees) over bespoke prompt piles. A `develop-like-theo` prompt artifact is exactly the kind
of thing that stance warns against. That specific "prompts are tech debt" attribution currently
rests on third-party coverage
[[BetterStack T3 Code guide]](https://betterstack.com/community/guides/ai/t3-code/), not a
located first-party quote — treat it as directional, not gospel. Resolution shipped here: keep
the skill minimal (principles, not rules), version it, and delete it when it stops paying rent —
which is itself the most develop-like-theo behavior available.
