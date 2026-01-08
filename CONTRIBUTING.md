# Contributing to StewardChMS

Thank you for your interest in contributing to **StewardChMS**.

This project exists to serve churches with excellence, integrity, and clarity. Contributions are welcome, but must follow the guidelines below to keep the codebase maintainable, secure, and aligned with the project’s purpose.

---

## ✝️ Guiding Principles

StewardChMS is built as an expression of faith in **the Lord Jesus Christ** and a commitment to Christian stewardship.

All contributions should aim to:
- Serve the Church well
- Be clear, honest, and maintainable
- Reflect excellence and care in design and implementation

---

## 🧭 Source of Truth

Before contributing, **read these documents**:

- `docs/spec.md` – Product and feature specification (**authoritative**)
- `docs/cursor-rules.md` – Development rules and guardrails
- `docs/decisions.md` – Architectural and design decisions

If a feature or behavior is **not defined in `spec.md`**, it should not be implemented without discussion.

---

## 🛠️ Development Workflow

StewardChMS follows a **phased, incremental development model**.

### General Rules
- Work in **small, focused changes**
- Do **not** refactor unrelated code
- Do **not** introduce breaking changes without discussion
- Prefer clarity over cleverness
- Keep commits scoped and descriptive

### Required Workflow
1. Review the spec
2. Propose a plan (what will change and why)
3. Implement changes
4. Run all checks locally
5. Update documentation if needed
6. Submit a pull request

---

## 🧪 Quality Standards

All contributions must meet the following before being accepted:

- ✅ Application builds successfully
- ✅ Database migrations run cleanly
- ✅ Linting and type checks pass
- ✅ Tests are added for new logic
- ✅ No failing or skipped tests
- ✅ No TODOs that break functionality

> A contribution is not complete if the build is broken.

---

## 🔐 Security & Data Sensitivity

StewardChMS handles sensitive church and financial data.

Contributors **must**:
- Follow secure coding practices
- Avoid logging sensitive data
- Respect role-based access controls
- Never bypass authentication or authorization checks

Security-related issues should be reported privately.

---

## 🧱 Coding Guidelines

### Frontend
- Use React with TypeScript
- Prefer functional components
- Validate forms with Zod
- Keep UI components small and composable
- Follow existing Tailwind and shadcn/ui patterns

### Backend
- Validate inputs with shared schemas
- Enforce RBAC at API boundaries
- Keep business logic out of route handlers
- Write explicit, readable queries
- Log meaningful audit events

---

## 🧾 Commits & Pull Requests

### Commit Messages
Use clear, descriptive commit messages:

feat: add household relationship model
fix: enforce role check on donation endpoint
docs: update spec for worship planning


### Pull Requests
Each PR should include:
- Summary of changes
- Why the change is needed
- Any assumptions made
- Screenshots or examples (for UI changes)

Large or architectural changes should be discussed before implementation.

---

## 🧠 Decisions & Assumptions

If you make a design or architectural decision:
- Document it in `docs/decisions.md`
- Explain why the decision was made
- List alternatives considered

This helps keep the project consistent over time.

---

## 🚫 What Not to Do

- Do not add features outside the spec
- Do not silently refactor large areas
- Do not bypass RBAC
- Do not commit secrets or credentials
- Do not merge broken builds

---

## 🤝 Final Note

StewardChMS is built to help churches steward people, time, and resources faithfully.

Thank you for contributing your time and skill to something that serves the Church and honors God.

> “Whatever you do, do it heartily, as to the Lord, and not unto men.”  
> — Colossians 3:23
