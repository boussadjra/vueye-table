# vueye-table agent guidance

Detailed context lives in [CLAUDE.md](./CLAUDE.md); decisions in [docs/adr](./docs/adr).

- Preserve the layer order: core ← vue ← headless ← styled ← vueye-table ← nuxt.
- Keep core framework-independent.
- Do not read browser globals in any package.
- Do not mutate data passed to a table.
- Report recovered input as a `TableIssue`.
- Keep dependencies in the package that uses them.
- Use ESM throughout; do not weaken strict typing.
- Use `feat/<name>` branches for features and `fix/<name>` branches for fixes.
- Update the docs and runnable examples when adding features or changing documented behavior.
- Record major public API decisions in a new ADR, and add a changeset for published changes.
- Run narrow checks first and `pnpm check` before finishing.
- Do not claim production readiness.
