# Releasing

GitHub is [`boussadjra/vueye-table`](https://github.com/boussadjra/vueye-table). npm holds six
packages that share one version: `@vueye-table/core`, `@vueye-table/vue`, `@vueye-table/headless`,
`@vueye-table/styled`, `vueye-table`, and `@vueye-table/nuxt`.

The Release workflow (`.github/workflows/release.yml`) only runs when `github.repository` is
`boussadjra/vueye-table`, never from a fork or a pull request.

## How a release happens

1. A pull request that changes a published package adds a changeset (`pnpm changeset`).
2. Merging it to `main` runs the full gate (`pnpm check:release`), then opens or updates a
   "chore: version packages" pull request that bumps every package together and writes the
   changelogs.
3. Merging that pull request runs the gate again and publishes with `pnpm publish:packages`, over
   npm trusted publishing (OIDC), with provenance. There is no npm token.
4. The same run tags the merge commit `v<version>` and creates a GitHub release with
   `pnpm release:tag`. The release notes are the `vueye-table` changelog entry for that version,
   followed by links to every published package. A prerelease is marked as one and never becomes
   the repository's "Latest" release.

Publishing only happens once the `release` environment variable `NPM_TRUSTED_PUBLISHING` is
`true`. Until then, step 3 does nothing, so a merge cannot fail before the packages exist.

Do not use `changeset publish`. `pnpm publish:packages` publishes in dependency order, skips any
package already on npm at that version (so a failed run can simply be re-run), and picks the
dist-tag. `pnpm release:tag` is idempotent the same way: it skips a tag or release that already
exists, and `pnpm release:tag --dry-run` prints the tag and notes without creating anything.

## Prerelease line

Changesets is in **pre mode** with the `alpha` tag (`.changeset/pre.json`), so the next Version PR
produces `3.0.0-alpha.1`, then `3.0.0-alpha.2`, and so on. Without pre mode, the pending `major`
changeset would turn `3.0.0-alpha.0` into a stable `3.0.0`.

Moving to beta changes the pre-mode tag and the version together, in this order, committed as one:

```sh
pnpm changeset pre exit
pnpm changeset pre enter beta
pnpm version:set 3.0.0-beta.0
```

Running `pnpm version:set` alone leaves pre mode at `alpha`, and the next Version PR would write an
alpha version back over the beta one. The first stable release is `pnpm changeset pre exit`
followed by a normal Version PR.

## Dist-tags

- **Until a stable 3.x exists**, every publish goes to `latest`, so `pnpm add vueye-table`
  resolves the newest 3.0 prerelease. `latest` on the unscoped `vueye-table` currently points at
  `2.0.0-alpha.14`; the first 3.0 publish replaces it. 1.x stays installable as `vueye-table@1`.
- **Once `3.0.0` is out**, `latest` holds the stable line and a prerelease goes under its own id
  (`beta`, `rc`). Older majors never count toward this.

`pnpm publish:packages --tag <tag>` overrides the policy for one run, and `--dry-run` prints the
plan without publishing.

## First publish

Trusted publishing cannot create a package that does not exist yet, so the first publish of the
`@vueye-table/*` packages uses a one-shot token:

1. Create the `vueye-table` organization on npm, which owns the `@vueye-table` scope.
2. In the repository settings, create an environment named `release`.
3. Create a short-lived granular npm token with publish rights to the `@vueye-table` scope and to
   `vueye-table`, and add it to the `release` environment as the secret `NPM_TOKEN`.
4. Run the Release workflow by hand (Actions, Release, Run workflow) with **first_publish**
   checked. It publishes the version currently on `main`, then tags it and creates its GitHub
   release.
5. On each package's npm settings page, attach a GitHub Actions trusted publisher:
   - Organization or user: `boussadjra`
   - Repository: `vueye-table`
   - Workflow filename: `release.yml`
   - Environment name: `release`
6. Delete the `NPM_TOKEN` secret and revoke the token. Set the `release` environment variable
   `NPM_TRUSTED_PUBLISHING` to `true`. Require 2FA and disallow tokens on every package.

From then on, releases go through the Version PR alone. A publish that logs `Skipped OIDC` means a
trusted publisher is missing or no longer matches the values above.

After a release, check the result:

```sh
npm view vueye-table version
npm dist-tag ls vueye-table
```

## Setting a version by hand

`pnpm version:set <version|release-type>` bumps every package and the root manifest together, for
example `pnpm version:set prerelease --preid alpha` or `pnpm version:set 3.0.0-rc.0 --dry-run`. Do
not use it and a Version PR for the same release.
