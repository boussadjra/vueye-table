# Operations desk

A standalone Nuxt warehouse application for testing the published vueye-table beta packages.
It has its own dependency lockfile and installs all six packages at `3.0.0-beta.1` from npm. It does
not use workspace aliases or source builds.

## Run

Use Node **24.18.0** and pnpm **11.17.0**. From this directory:

```sh
pnpm install --frozen-lockfile
pnpm dev
# http://127.0.0.1:4310
```

The first API request creates `.data/operations.sqlite` with 100,000 generated orders and 2,000
stock items. Saves persist across page reloads and server restarts. The database is local and ignored
by Git. The app binds to localhost; it has no login or production deployment configuration.

For production-mode acceptance:

```sh
pnpm verify
pnpm test:http
pnpm start
# Default Nitro port: 3000. Set PORT=4310 to use the development URL.
```

`test:http` starts its own built server on port 4311, seeds a temporary database, checks it and
removes only that temporary database when finished. It never changes the operator's stock.

For the automated browser matrix after building:

```sh
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm test:browser
```

The browser runner starts its own server on port 4312 with a fresh temporary database. It checks
pointer row menus, accessible utility columns, lazy search contexts, keyboard traversal,
100k-by-24 navigation and receiving stream cleanup in all three browser engines. GitHub runs this
matrix on Linux after both Windows and Linux application checks pass, retaining failure traces
and screenshots for seven days. These checks do not establish screen-reader or native-device acceptance.

## Workflows

| Workspace        | Actual integration                                             | Difficult cases                                                                                                                      |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Orders           | SQLite search/sort, HTTP cursor pages, full table              | 100k server rows, delayed requests, stale searches, outage/retry, selection and variable-height details                              |
| Inventory        | Full spreadsheet, async SKU checks, transactional HTTP saves   | Immutable edits, invalid pastes, row constraints, duplicate SKUs, optimistic 409 conflicts, undo, insertion/deletion and persistence |
| Inventory stress | 100k frozen rows and 24 columns                                | Two-axis virtualization, Ctrl+End/Home, retained keyboard focus, bounded DOM, editing the final row                                  |
| Locations        | HTTP lazy warehouse/aisle/bin loads                            | Branch outage/retry, collapse during loading, descendant selection, search context                                                   |
| Receiving        | Composable + headless caption + styled table, real NDJSON HTTP | 1k/10k events, split text chunks, Arabic/accented text, literal HTML notes, restart/stop/unmount cleanup                             |

Inventory save requests acknowledge only the submitted batch. If the operator edits again while a
save is in flight, the app keeps the newer local edits pending and asks for a reload before another
save. **Reload saved stock discards local edits.** The competing-clerk control increments the
server revision of `stock-1`; it deliberately makes the current worksheet stale.

Nuxt 4.6.0 needs a Windows renderer workaround, documented in
[nuxt/nuxt#36467](https://github.com/nuxt/nuxt/issues/36467). Fixtures live in a plain application
utility module shared by the client, server and tests.

## Acceptance and beta

Read [ACCEPTANCE.md](./ACCEPTANCE.md) for the repeatable manual matrix and recorded results. Every
confirmed framework failure should have a repository issue with the package version, exact steps,
expected/actual result and a small regression case. Application mistakes and upstream Nuxt defects
are recorded separately.

The ordered fixes and release gates live in [tracker #114](https://github.com/boussadjra/vueye-table/issues/114).
The acceptance log preserves alpha.10's [accessible column counts #111](https://github.com/boussadjra/vueye-table/issues/111),
[pointer row menus #112](https://github.com/boussadjra/vueye-table/issues/112), and
[tree-filter prop updates #113](https://github.com/boussadjra/vueye-table/issues/113).

These fixes were published together in alpha.11. Alpha.12 adds the virtual tree keyboard-focus
and grid pointer/editor-focus fixes from [#118](https://github.com/boussadjra/vueye-table/issues/118)
and [#119](https://github.com/boussadjra/vueye-table/issues/119). Beta.1 includes all five fixes. The consumer pins beta.1, and
`node scripts/reproduce-column-semantics.mjs` must pass during verification. Rerun both automated
checks and browser workflows after every package-pin update. Passing this project is one beta gate; it does
not establish production readiness. The [beta contract](../../docs/guide/beta.md) records the API and
compatibility decisions. Manual screen-reader acceptance remains unrun.
