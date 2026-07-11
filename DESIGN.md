# dev-like — Design Brief

> `/dev-like Every` → an installable `develop-like-every` skill + agent, distilled from a shop's
> public engineering exhaust. OSINT for dev culture, packaged to the open Agent Skills standard.

Status: brainstorm/scaffold (2026-07-11). Everything here is a decision with a default — argue
with the defaults, not the structure.

## 1. Positioning

**The gap is real.** As of July 2026, docs→skill generators exist (Firecrawl skill-gen, Skill
Seekers, skill-doc-generator MCP), OSINT dev-profilers exist (GitRoll — recruiting-oriented),
and culture-as-plugin exists (Every's compound-engineering-plugin, ~23k stars). Nobody combines
multi-source culture profiling → installable skill. That synthesis is the product.

**One-liner:** *"Steal the workflow, not the code. `npx dev-like every` and your agent develops
like the shops you admire — with receipts."*

The "with receipts" part is the differentiator AND the ethics story AND the marketing hook:
every claim in a generated skill carries a provenance link to the public source it came from.

## 2. Ecosystem constraints (facts, not opinions)

- **Spec:** agentskills.io — SKILL.md + YAML frontmatter (`name`, `description` required;
  `metadata` map for the rest; `allowed-tools` experimental). Name must match directory.
  Progressive disclosure: ~100-token metadata → <5k-token body → on-demand references/scripts.
- **`.agents/skills/` is the vendor-neutral project path** (Codex, Cursor, Copilot, Gemini CLI,
  Amp, opencode, Cline, Warp, +30 others). Claude Code uses `.claude/skills/`. `npx skills add`
  (skills.sh, Vercel) symlinks one canonical copy into all detected harnesses — 55 supported.
- **Claude Code:** commands merged into skills; a plugin named `dev-like` with a root SKILL.md
  yields the bare `/dev-like` slash command. `$ARGUMENTS`, `argument-hint`, `context: fork`
  available. Marketplace = repo with `.claude-plugin/marketplace.json`.
- **npm:** classic tokens revoked Dec 2025. Trusted publishing (OIDC from GitHub Actions) is
  the only sane CI publish path. Gotchas: exact workflow-filename match in npm settings, exact
  `repository.url` match, `npm >= 11.5.1`, `id-token: write`, `--provenance` on first publish.
- **Distribution reality:** skills are distributed from *git repos* (skills.sh indexes installs);
  npm is for the CLI tool, not the skill content. We ship both from one repo.

## 3. Architecture

Three artifacts, one repo:

```
dev-like (repo = plugin = marketplace = registry = CLI package)
├── skills/dev-like/          # THE skill: /dev-like router (works in any harness)
├── registry/                 # cached profiles: the moat
├── src/ + bin/               # npx dev-like CLI (thin installer/resolver)
└── site/                     # docs site (Astro, Impeccable-styled)
```

### 3.1 The skill (`/dev-like <target>`)

The skill is a **router** (Impeccable pattern: thin SKILL.md, one reference file per phase):

1. **Resolve** target against the registry index (aliases: `theo.gg` → `theo`, `Every` →
   `every`). Fetch via raw.githubusercontent.com — no server.
2. **Cache hit** → fetch `registry/<slug>/profile.md`, generate `develop-like-<slug>` skill
   into the project (`.agents/skills/` + `.claude/skills/` symlink), offer agent persona.
3. **Cache miss** → run the **collection workflow** (references/profiling.md): agent does live
   OSINT across the source taxonomy, builds a profile with provenance, distills to a skill,
   then **offers to PR the profile back to the registry**. Contribution flywheel built into
   the failure path.

### 3.2 The registry

```
registry/
├── index.json                # slug → aliases, kind (org|person), consent tier, updated
└── every/
    ├── entry.json            # metadata, aliases, sources[] with URLs + fetch dates
    ├── profile.md            # distilled culture doc, every claim cites a source
    └── skill/                # OPTIONAL prebuilt develop-like-every/ (zero-LLM install path)
```

Profiles are **markdown with provenance blocks**, not opaque prompts. Reviewable in PRs,
diffable, deletable (design-for-deletion: removing a target = `git rm registry/<slug>`).
`profile.md` is the cached expensive thing; skill generation from profile is cheap/local.

**Consent tiers** (ranked, displayed on every profile — legal safety and signal quality
correlate, use that):

| Tier | Meaning | Example |
|------|---------|---------|
| `self-published` | subject ships their own culture artifacts | Every (CEP plugin) |
| `stated` | first-party blogs/talks/docs | most eng-blog companies |
| `observed` | inferred from public repos/configs | linter configs, CI files |
| `social` | social posts, interviews by third parties | X threads, podcasts |

Opt-out: `registry/OPTOUT.md` + honored within 48h, no questions. Individuals (persons, not
orgs) require tier `stated` or better — no profiles built purely from social exhaust.

### 3.3 Source taxonomy (ranked by signal, encode in profiling.md)

Revealed preference beats stated preference: a `.rubocop.yml` outranks a blog post about
code quality.

1. Agent-config artifacts (CLAUDE.md, AGENTS.md, .cursor/rules, shipped skills/plugins)
2. Repo configs: linters, CI workflows, CONTRIBUTING, PR templates, review comments
3. First-party engineering blogs
4. Conference talks / podcast transcripts
5. Docs sites + changelogs (cadence = shipping culture)
6. Job postings (best point-in-time stack signal)
7. Social (X/Bluesky/Mastodon) — high noise, ToS-hostile; prefer official APIs/RSS/embeds
8. Personal dotfiles (individuals only)
9. HN/Reddit — use to *falsify* the official story, not build it

### 3.4 The CLI (`npx dev-like every`)

Thin. Zero postinstall (pnpm/bun ignore lifecycle scripts anyway). Node ≥ 20, minimal deps
(target: `yaml` + nothing else, vercel-labs/skills precedent). Does: resolve alias → fetch
registry → write/symlink skill into detected harness dirs → print what it did. The *agent*
skill does the smart work; the CLI is deterministic plumbing. Also: `dev-like validate`
(registry schema + frontmatter lint, doubles as our CI and contributors' pre-PR check).

### 3.5 Generated artifact format (steal CEP's shape)

`develop-like-<slug>/` output:

```
develop-like-every/
├── SKILL.md            # philosophy + workflow rules, provenance-linked
├── references/
│   ├── stack.md        # their stack + why (Rails, RubyLLM, pgvector...)
│   ├── workflow.md     # e.g. Every's brainstorm→plan→work→simplify→review→compound
│   └── sources.md      # full bibliography with fetch dates
└── agents/
    └── every-developer.md   # optional reviewer/pair persona
```

## 4. Multi-harness strategy

**Don't build Impeccable's per-harness compiler on day one.** Their build.js exists for
model-specific anti-slop rules; we don't have that requirement. Instead:

- Ship spec-compliant SKILL.md → native in 40+ harnesses.
- `npx skills add marcusrbrown/dev-like` covers cross-harness install (55 agents).
- Claude Code plugin manifest for the bare `/dev-like` command + marketplace listing.
- `HARNESSES.md` documents per-harness invocation (Codex `$dev-like`, Copilot `gh skill`, etc.).
- Add `.codex-plugin`/`.cursor-plugin` manifests later if install telemetry says people want
  them (Superpowers/CEP precedent). Third use before extraction.

## 5. Testing & evals (SotA-showcase requirement)

Two tiers, separated (everyone converged on this):

**Deterministic CI (every PR, free):** frontmatter lint (`skills-ref validate` + our own),
registry schema validation (JSON Schema), profile provenance check (every claim-block has a
source URL, every URL live-checked weekly not per-PR), generated-skill snapshot tests
(profile.md → skill generation is deterministic templating → snapshot it), link rot check
(scheduled).

**LLM evals (scheduled/on-demand, cents):** skill-creator-style paired runs — baseline vs
with-skill on fixture tasks ("add an endpoint" with/without develop-like-every; grader asserts
the workflow shape changed, e.g. plan-first, compound learnings doc written). Description
trigger evals: 10 should-trigger / 10 near-miss prompts, 3 reps, trigger-rate tracked.
Impeccable's trick: assert on **tool-call traces, not model prose**.

## 6. Distribution & launch surface

- **npm `dev-like`** via trusted publishing (release.yml, OIDC, provenance). Staged publish
  (`npm stage publish`) so a human approves each release with 2FA.
- **skills.sh**: automatic listing on first `npx skills add marcusrbrown/dev-like` installs;
  install badge in README; telemetry there is their (opt-out) system, not ours.
- **Claude marketplace**: own `.claude-plugin/marketplace.json` immediately; submit to
  `claude-plugins-community` once stable.
- **Docs site**: Astro Starlight, matching the Systematic precedent
  (marcusrbrown/systematic → https://fro.bot/systematic/). Published under
  **mrbro.dev/dev-like** via the existing marcusrbrown/mrbro.dev repo (fallback:
  marcusrbrown.com/dev-like via marcusrbrown.github.io). Site source lives in this repo
  (`site/`), built output deployed into the domain repo by CI. The site must *demonstrate*
  the product: registry browser generated from index.json, profile pages with receipts,
  before/after agent transcripts.

## 7. Metrics (GDPR-friendly, hard requirements)

Per Marcus's telemetry rules: **no CLI telemetry at all in v1** (skills.sh already measures
installs; don't duplicate). Docs site: **Marcus's self-hosted Umami instance** — the same
setup as the Systematic docs site (https://fro.bot/systematic/): cookieless, no PII, no
consent banner, self-hosted so the data never leaves his infra. Add a dev-like site to the
existing instance; one script tag. Optional: Umami's public share URL in the footer
(transparency as marketing). If we ever add CLI telemetry: opt-in flag, documented schema,
same self-hosted sink.

## 8. The thirsty feature set ("promote me in AI circles")

Engagement mechanics that are also legitimately useful:

1. **Registry PR flywheel** — cache misses end in "PR this profile back?" Every user who
   profiles a new shop becomes a contributor. Contributors get credited on the profile page.
2. **Provenance receipts** — screenshots of "every claim sourced" profiles are inherently
   shareable; it's the anti-slop position in a discourse that loves anti-slop positions.
3. **Profile cards** — OG-image cards per registry entry ("develop like Every — Rails,
   compound engineering, 80/20 plan-to-code") designed for X/Bluesky unfurls.
4. **Install badges** per generated skill (skills.sh embeds).
5. **The Theo paradox as content** — a `develop-like-theo` skill contradicts Theo's own
   "prompts are tech debt" take. Ship the profile WITH that tension documented in it.
   Quote-tweet bait of the highest grade, and it's honest.
6. **"Profile your own shop" CTA** — shops PR their own `self-published`-tier profiles
   (Key Values dynamics, but the artifact is executable).
7. **Launch essay**: "I taught my agent to develop like Every" — walkthrough + receipts.

## 9. Risks / open questions

- **Fidelity vs utility axis:** high-fidelity mimicry may be worse than distilled principles.
  Default: profiles capture *principles + workflow shape*, not prompt-pile trivia.
- **Staleness:** profiles date fast (Every migrated CEP layout twice in 6 months). `entry.json`
  carries `updated` + source fetch dates; skill body says "profiled as of <date>".
- **X/YouTube sourcing:** ToS-hostile. Use official APIs/RSS/transcript APIs only; document it.
- **Individuals + GDPR:** persons are personal data. Consent-tier floor (`stated`+), opt-out
  path, professional-persona-only scope. Written into CONTRIBUTING before launch, not after.
- **Copyright:** extract facts/patterns, never reproduce prose. Provenance links, not excerpts
  beyond quotation-scale.
- **Name collision:** `npx skills` (tool) vs `npx dev-like` (ours) — fine, but the skill
  name `dev-like` and package name `dev-like` must stay aligned (npm name is free as of
  scaffold date — claim it early).

## 10. Roadmap

- **v0.1 (scaffold, this commit):** repo skeleton, /dev-like SKILL.md router + references,
  registry schema + `every` and `theo` seed entries, validate script, CI, plugin manifest.
- **v0.2:** flesh out both seed profiles with full provenance; CLI resolve+install path;
  first LLM eval fixtures.
- **v0.3:** docs site + registry browser; trusted-publish release.yml live; npm claim.
- **v1.0:** PR-back flow polished, 5+ registry entries, launch essay, marketplace submission.
