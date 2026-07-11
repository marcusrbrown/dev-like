# Collection workflow (cache miss)

Build a dev-culture profile from public sources. Revealed preference beats stated preference:
a `.rubocop.yml` outranks a blog post about valuing code quality.

## Source taxonomy — work top-down, stop when saturated

| # | Source | Signal | How |
|---|--------|--------|-----|
| 1 | Agent-config artifacts: CLAUDE.md, AGENTS.md, .cursor/rules, shipped skills/plugins | Highest — culture already machine-readable | GitHub code search across the org |
| 2 | Repo configs: linters, formatters, CI workflows, CONTRIBUTING.md, PR templates, CODEOWNERS | Very high — revealed preference | GitHub API, top repos by activity |
| 3 | First-party engineering blog posts | High — stated practice with detail | Site + RSS; vet for marketing gloss |
| 4 | Conference talks, podcast appearances | High — unscripted war stories | Official transcript/caption APIs only |
| 5 | Docs sites + changelogs | Medium-high — cadence = shipping culture | Fetch directly |
| 6 | Job postings | Medium-high for stack (point-in-time) | Careers page; note the date, they expire |
| 7 | Social posts (X/Bluesky/Mastodon) | Medium — noisy, ToS-hostile | Official APIs/RSS/embeds only; never scrape logged-in surfaces |
| 8 | Personal dotfiles | Medium — individuals only | Public repos |
| 9 | HN/Reddit commentary | Low — corroboration | Use to falsify the official story, not to build it |

## Rules

- Public, logged-out sources only. Respect robots.txt. Rate-limit. Official APIs over HTML.
- Record for every source: URL, fetch date, consent tier (`self-published` > `stated` >
  `observed` > `social`).
- Persons (not orgs): floor is `stated` tier; skip sources 7–9 as primary evidence.
- Check `registry/OPTOUT.md` first. Listed = stop and tell the user why.
- Time-box: ~10 high-value sources beat 50 shallow ones. Saturation = new sources repeat
  what you have.

## What to extract (the profile skeleton)

1. **Identity**: org or person, size, products, why their practice is worth mimicking.
2. **Stack**: languages, frameworks, infra — with evidence, not vibes.
3. **Workflow shape**: how work moves (planning ratio, review culture, AI-agent usage,
   deployment cadence). This is the core; a stack list without workflow is a StackShare page.
4. **Principles**: 5–10 quotable operating beliefs, each cited.
5. **Tensions/caveats**: where sources conflict, where practice contradicts stated belief
   (document it — e.g. a develop-like-theo skill contradicts Theo's "prompts are tech debt"
   position; ship the tension, it's honest).
