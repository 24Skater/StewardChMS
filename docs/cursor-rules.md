# StewardChMS – Cursor Rules

These are non-negotiable.

1) Follow docs/spec.md exactly.
2) Work in phases. Stop after each phase and summarize.
3) Before coding: provide a short plan (files, schema, endpoints, routes).
4) Never refactor unrelated code.
5) Every phase must end with:
   - App runs locally
   - DB migrations succeed
   - Lint + typecheck pass
   - Tests added for core logic
6) If uncertain, make a reasonable assumption and log it in docs/decisions.md.
7) No broken builds.
