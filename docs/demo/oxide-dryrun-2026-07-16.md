# Dry run: develop-like-oxide on a scratch project

Date: 2026-07-16 · dev-like 0.2.0 · Claude Code headless (`claude -p`, same task both sides)

## Setup

Scratch project: a single Rust file, `service.rs`, with a `ProfileService` that fetches a
user profile from a slow upstream API on every call. Task: add a caching layer.

```console
$ npx -y dev-like@latest oxide
write .agents/skills/develop-like-oxide/SKILL.md
write .agents/skills/develop-like-oxide/agents/oxide-developer.md
write .agents/skills/develop-like-oxide/references/sources.md
write .agents/skills/develop-like-oxide/references/stack.md
write .agents/skills/develop-like-oxide/references/workflow.md
Done. Invoke /develop-like-oxide or let it trigger implicitly in your agent.
```

Prompt, before run: *"Add a caching layer to service.rs so that fetch_profile doesn't hit
the slow upstream call on every request. Implement it."*

Prompt, after run: *"Approach this the way Oxide would: add a caching layer to service.rs
so that fetch_profile doesn't hit the slow upstream call on every request. Implement it."*

Method note: the "the way Oxide would" phrase is a deliberate trigger cue, not a bare task
restatement. An earlier dry run (`every-dryrun-2026-07-11.md`) found that implicit, generic
prompts don't reliably load a profile skill — you have to name the shop for the skill to
engage. This run carries that lesson forward rather than re-testing it.

## Without the skill

Output (trimmed to the decision summary the model gave):

> Key decisions made:
>
> - **`RwLock<HashMap>`** — read lock allows concurrent cache hits with no contention; write
>   lock is taken only on a miss when populating the cache
> - **`#[derive(Clone)]`** on `UserProfile` — necessary to return owned values from the cache
>   while keeping the entry
> - **Two-phase lock** (read then write on miss) — a concurrent miss by two threads will both
>   write the same value, which is harmless and avoids holding the write lock across the slow
>   upstream call
> - **Extracted `call_upstream`** — keeps the cache logic in `fetch_profile` readable and the
>   upstream stub separate

Resulting code (`fetch_profile`):

```rust
pub fn fetch_profile(&self, user_id: u64) -> UserProfile {
    // Read lock first so concurrent cache hits don't serialize
    if let Some(profile) = self.cache.read().unwrap().get(&user_id) {
        return profile.clone();
    }

    // Cache miss: call upstream, then promote to cache under write lock
    let profile = self.call_upstream(user_id);
    self.cache.write().unwrap().insert(user_id, profile.clone());
    profile
}
```

This has a real bug: between dropping the read guard and acquiring the write guard, two
concurrent callers can both observe a miss and both hit the (simulated) upstream call before
either one populates the cache. The model calls this "harmless" — it isn't wrong that the
final state converges, but it means the cache provides no de-duplication guarantee under
contention, which defeats part of the point of caching a slow call. No design rationale was
written anywhere except the terminal decision summary; nothing is versioned or reviewable.

## With develop-like-oxide installed

> Done. Here's the reasoning on the key decisions:
>
> **`RwLock` over `Mutex`** — a profile cache is read-heavy by definition. `RwLock` lets
> concurrent requests hit warm entries without blocking each other. `Mutex` would serialize
> everything including the fast path.
>
> **Double-check on the write path** — between dropping the read guard and acquiring the
> write guard, another thread can win the race and populate the entry. Without the
> re-check, two threads arriving concurrently on a cold entry both make the upstream call.
> The extra `cache.get()` on the write path is cheap; the upstream call is 200ms+.
>
> **`derive(Clone)` on `UserProfile`** — the cache owns the canonical copy; callers get
> their own. Avoids lifetime entanglement with the lock guard, which would force callers to
> hold the guard across whatever they do with the profile.
>
> **`unwrap()` on lock guards** — `RwLock::read()`/`write()` only return `Err` when the lock
> is poisoned, which happens only if a thread panicked while holding it. Propagating a
> poisoned cache would just mask the real failure; panicking is correct.

Resulting code (`fetch_profile`):

```rust
pub fn fetch_profile(&self, user_id: u64) -> UserProfile {
    {
        let cache = self.cache.read().unwrap();
        if let Some(profile) = cache.get(&user_id) {
            return profile.clone();
        }
    }
    // Re-check after acquiring write lock: another thread may have populated
    // this entry between dropping the read guard and acquiring the write guard.
    let mut cache = self.cache.write().unwrap();
    if let Some(profile) = cache.get(&user_id) {
        return profile.clone();
    }
    let profile = UserProfile {
        id: user_id,
        name: format!("user-{user_id}"),
        email: format!("user-{user_id}@example.com"),
    };
    cache.insert(user_id, profile.clone());
    profile
}
```

## What changed

- **The concurrency bug got fixed.** The after-run version re-checks the cache after
  acquiring the write lock, closing the race the before-run version explicitly (and
  wrongly) waved off as "harmless." This is the one unambiguous delta: more rigor applied to
  the same correctness question both runs identified.
- **The reasoning got more precise, not more Oxide-specific.** The after-run explanation is
  tighter (it justifies `RwLock` vs `Mutex`, the double-check, `Clone`, and `unwrap()`
  individually) but it reads as generic senior-Rust-engineer reasoning. Nothing in the
  after-run output is traceable to a specific source in the installed skill — no mention of
  RFDs, no "written decision record," no citation of `references/sources.md`.
- **No decision-doc artifact was produced.** The skill's core principle is "write it down" —
  an RFD-style record of options, reasoning, and determination, committed before code. Both
  runs went straight to code with a terminal-only rationale; the after-run did not create an
  RFD-shaped file, propose one, or even name the practice. Given `oxide`'s profile centers on
  written, versioned decisions before implementation, this is the most relevant miss.

## Caveats

- **n=1.** One prompt pair, one task, one model version. Don't generalize from this.
- **Cue-assisted trigger.** The after-run prompt explicitly named "the way Oxide would" —
  without that phrase, per the `every` dry run's finding, the skill likely wouldn't have
  loaded at all. This demo does not test implicit triggering; it assumes the lesson from the
  `every` run and applies it directly.
- **Partial signal, not a clean win.** The rigor delta (catching the race condition) is real
  and attributable to the skill's presence. But the profile's headline behavior — write the
  decision down first, in an RFD-shaped record, before touching code — did not show up in
  either run. If the demo's job is to show "does installing `oxide` make the agent write
  RFD-style decision docs," the honest answer here is no, not on this task with this prompt.
  A prompt that explicitly asked for "the RFD-style write-up first" might surface that
  behavior; this run didn't test that variant.
- **No file citations surfaced.** The after-run output never referenced
  `references/sources.md`, `references/workflow.md`, or any RFD by number, even though the
  installed `SKILL.md` cites RFD 1, RFD 5, RFD 107, and RFD 113 directly. Whether the model
  read those files and chose not to cite them, or didn't load them at all, isn't
  distinguishable from the transcript alone.
