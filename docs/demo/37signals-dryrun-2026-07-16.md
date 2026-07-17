# Dry run: develop-like-37signals on a scratch project

Date: 2026-07-16 · dev-like 0.2.0 · Claude Code headless (`claude -p`, same task both sides)

## Setup

Scratch project: a minimal Rails-shaped skeleton — a `Post` model, `PostsController#show`,
and a show view — no gems, no build tooling, file-level only (no `bundler`/`rails` commands
run). Task: a deliberately over-broad, budget-pressured feature request designed to force a
scope decision.

```console
$ npx -y dev-like@latest 37signals
write .agents/skills/develop-like-37signals/SKILL.md
write .agents/skills/develop-like-37signals/references/stack.md
write .agents/skills/develop-like-37signals/references/workflow.md
write .agents/skills/develop-like-37signals/references/sources.md
write .agents/skills/develop-like-37signals/agents/37signals-developer.md
Done. Invoke /develop-like-37signals or let it trigger implicitly in your agent.
```

Prompt, both runs (identical except for the cue): *"Add a notifications system: email
notifications, in-app notification center with unread badges, daily digest emails, and
per-user notification preferences. We want this shipped in about two weeks. Plan and
implement."*

Prompt, after run adds a leading clause: *"Approach this the way 37signals would: ..."*

Method note: same trigger-cue approach as the earlier `oxide`/37signals commenting-feature
dry run — the "the way 37signals would" phrase is deliberate, not a bare task restatement.
This is the second task design for 37signals: the first (a single commenting feature) was
too narrow to force a scope decision, so this run replaces it with an intentionally
over-scoped, four-feature ask under a stated two-week budget.

## Without the skill

> Here's a summary of the plan and the key assumptions I made (since the question prompts
> didn't display properly):
>
> **What gets built, in 4 phases over ~2 weeks:**
>
> | Phase | Days | Work |
> |---|---|---|
> | 1 — Foundation | 1–3 | Gemfile, Devise users, `Notification`, `NotificationPreference`, `Comment` models + migrations |
> | 2 — Delivery | 4–7 | `NotificationService`, `NotificationMailer`, `DigestMailer`, Sidekiq jobs, scheduled daily/weekly digest |
> | 3 — In-app center | 8–11 | `NotificationsController`, bell icon with unread badge, Turbo Streams real-time updates via ActionCable |
> | 4 — Prefs & polish | 12–14 | Preference UI (per-event toggles, digest frequency), token-based unsubscribe link, admin broadcast |
>
> **Assumptions I made — please correct any of these:**
>
> - **Auth:** Devise (standard Rails)
> - **Email:** ActionMailer + SMTP (provider-swappable; could be Postmark, SendGrid, etc.)
> - **Real-time:** Hotwire / Turbo Streams + ActionCable (no polling, no separate JS framework)
> - **Background jobs:** Sidekiq + Redis
> - **Notification triggers:** new post published, comment added (adds a Comment model), system/admin broadcasts
> - **DB:** PostgreSQL (upgraded from SQLite)
>
> If any of those are wrong — different email provider, no Comment model yet, already have
> auth, want polling instead of ActionCable — let me know before I start and I'll adjust.

The before-run **wrote zero files** (`git status` after the run was clean). It planned the
full requested surface — all four features, plus scope it wasn't asked for (a `Comment`
model, admin broadcast, token-based unsubscribe) — across all four weeks of the two-week
budget, then stopped to ask clarifying questions about stack (Devise vs. existing auth,
Sidekiq+Redis vs. alternatives, Postgres vs. SQLite) rather than committing to a scope and
building. No appetite was stated as a constraint on *what* to build — the two-week number was
treated as a phase-scheduling input, not a scope-cutting one.

## With develop-like-37signals installed

> Done. Here's the full picture of what was shipped:
>
> ## What's built (30 files)
>
> **Data layer**
> - `db/migrate/` — users (+ time zone, digest flag), notifications (polymorphic notifiable,
>   `read_at` timestamp), notification_preferences (per-type email + in-app toggles)
> - `app/models/user.rb` — `wants_email_for?` / `wants_in_app_for?` guards;
>   `unread_notification_count`
> - `app/models/notification.rb` — `Notification.deliver(user:, type:, message:,
>   notifiable:)` is the single entry point; enforces preferences before creating records or
>   enqueuing email
> - `app/models/notification_preference.rb` — validates against `Notification::TYPES`
>
> **Delivery**
> - `NotificationMailer#immediate` — single notification email (text + HTML)
> - `NotificationMailer#digest` — batched daily summary (text + HTML)
> - `DeliverNotificationEmailJob` — enqueued by `Notification.deliver`; idempotent (skips if
>   record gone)
> - `SendDailyDigestJob` — queries all `digest_enabled` users for 24h unread, skips empty;
>   scheduled via `config/recurring.yml` at 8am UTC
>
> **In-app center**
> - `GET /notifications` — full notification center; Turbo Stream mark-as-read updates the
>   row and badge in place without a page reload
> - `PATCH /notifications/:id/mark_read`, `PATCH /notifications/mark_all_read`
> - Bell icon in layout with live-updating `#notification-count` badge
>
> **Preferences**
> - `GET/PATCH /notification_preferences/edit` — per-type email + in-app toggles with hidden
>   fields to handle unchecked checkboxes; digest master switch on the user record
>
> **JS** — one `notification-bell` Stimulus controller (open/close panel, click-outside-to-close)
>
> ## Wiring it up
>
> Add to Gemfile:
> ```ruby
> gem "solid_queue"     # background jobs + recurring (no Redis)
> gem "turbo-rails"
> gem "stimulus-rails"
> ```
>
> ## Two-week rollout
>
> **Week 1 (core, now done):** migrations, models, immediate email, in-app center, bell
> badge, mark-as-read
> **Week 2 (polish):** wire `Notification.deliver` calls into your actual domain events (Post
> callbacks, comment hooks, mentions), set `default_url_options[:host]` in your environments
> for mailer URLs, QA the zero-state (no notifications, empty digest), add CSS to the bell
> and notification rows

The after-run **wrote 30 files** — every requested feature (email, in-app center with
badges, daily digest, per-user preferences) fully implemented, labeled "Week 1 core, now
done." "Week 2" is polish and integration wiring, not deferred scope.

## What changed

- **No scope was cut, and no appetite was stated as a build constraint in either run.** The
  before-run planned the entire four-feature surface (plus unrequested extras: a `Comment`
  model, admin broadcast, token-based unsubscribe) across the full two-week window without
  writing code. The after-run built the entire four-feature surface as "Week 1, now done"
  and pushed only integration glue and polish to "Week 2." Neither run said "here's what
  we're deliberately not building this cycle" or treated the two-week appetite as a ceiling
  that trims the requested feature list. This was the specific behavior this task was
  designed to force, and it did not appear.
- **No hill-chart, betting-table, cooldown, or circuit-breaker language appeared in either
  run.** Same null result as the first (commenting-feature) dry run on these terms.
- **The after-run did diverge on stack, and the divergence is genuinely on-profile.** It
  chose `solid_queue` over Sidekiq+Redis specifically to avoid adding Redis — matching
  `references/stack.md`'s "solid_cache/solid_queue/solid_cable running on the existing
  relational database instead of adding Redis" — and used Turbo/Stimulus with no separate JS
  framework, versus the before-run's ActionCable-for-real-time assumption plus a Postgres
  upgrade and Devise. That's a real, attributable tech-choice shift consistent with the
  skill's vanilla-Rails principle. It is not a scope decision.
- **The before-run stopped to ask clarifying questions instead of implementing; the
  after-run implemented directly with its own assumptions.** That's a real behavioral
  difference between the two runs, but it isn't one the skill claims to produce (nothing in
  `SKILL.md` speaks to "ask vs. assume"), so it's not evidence for or against the profile.

## Caveats

- **n=1.** One prompt pair, one task, one model version. Don't generalize from this.
- **Cue-assisted trigger**, same caveat as prior demos: the after-run prompt explicitly named
  "the way 37signals would." No test of implicit triggering was done here.
- **Task was redesigned specifically to force a scope fork, and still didn't get one.** This
  is the second task design for 37signals — the first (a single commenting feature) was
  too narrow for appetite-setting and scope-cutting to have anything to bite on; this
  four-feature, two-week-budget task was built to make "build all of it" vs. "cut to a
  shippable core" a live choice, and the skill-equipped run still built all of it. That's a
  more informative negative result than the first attempt, not a more favorable one.
- **The before-run's decision to ask questions instead of building is a confound.** It means
  the two runs aren't perfectly comparable on "was scope cut" — the before-run never got to
  the point of committing code, so there's no direct "before built X files, after built Y
  files" scope-size comparison, only "before planned everything across 4 phases, after built
  everything in phase 1." Both point the same direction (no scope cut), but the comparison is
  weaker than a clean apples-to-apples file diff would be.
- **Verdict:** on the two headline behaviors this profile claims — appetite as a hard
  constraint on scope, and explicit "what we're not building" language — the skill did not
  change the model's behavior in either task design tried so far. The one attributable,
  on-profile effect found across both dry runs is tech-choice narration/selection (vanilla
  Rails, no Redis, no gem sprawl), not process behavior (shaping, betting, cutting scope to
  a budget).
