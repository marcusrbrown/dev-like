# Stack — 37signals

> Profiled as of 2026-07-16 · consent tier: self-published · full bibliography in [sources.md](sources.md).

Vanilla, server-first Rails: fight hard before adding gems or JS dependencies; Hotwire
(Turbo/Stimulus) for the front end with #nobuild import maps instead of a JS bundler;
Propshaft for assets; solid_cache/solid_queue/solid_cable running on the existing relational
database instead of adding Redis; Minitest with fixtures; deploy with Kamal directly to
VMs/bare metal, no Kubernetes
[[vanilla Rails stack]](https://dev.37signals.com/a-vanilla-rails-stack-is-plenty/). Kamal 2
replaced Traefik with a purpose-built kamal-proxy for gapless, imperative deployments
[[Kamal 2]](https://dev.37signals.com/kamal-2/).
