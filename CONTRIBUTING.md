# Contributing

1. Install dependencies with `npm install`.
2. Run `npm test` before submitting changes.
3. Add or update tests for behavior changes.
4. Keep examples neutral and generic.
5. Run `npm run check` and `npm run example:basic` when changing CLI behavior or reports.
6. Run `npm run audit` when changing dependencies.
7. Use Conventional Commits for commit messages.

Useful local checks:

```bash
npm test
npm run check
npm run example:basic
npm run audit
npm run check:package
npm pack --dry-run
```

Release process details live in `docs/release.md`.
