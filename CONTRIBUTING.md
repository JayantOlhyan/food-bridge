# Contributing to FoodBridge

Thank you for contributing to **FoodBridge**! We welcome improvements to the safety-first matching engine, frontend UX, AI memory insights, tests, and deployment tooling.

## Development Workflow

1. **Fork & Clone** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Install dependencies** (requires Node.js 18+):
   ```bash
   npm install
   ```
3. **Run the local dev stack**:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:4000`
4. **Verify all quality gates** before opening a Pull Request:
   ```bash
   npm run check
   ```
   This runs TypeScript typechecking, ESLint, the full Vitest suite (server + client), and the Vite production build.

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(scope): ...` — New feature
- `fix(scope): ...` — Bug fix
- `test(scope): ...` — Adding or updating tests
- `docs(scope): ...` — Documentation updates
- `ci(scope): ...` — CI/CD workflow changes
- `build(scope): ...` — Build, Docker, or dependency changes
- `chore(scope): ...` — Maintenance and config updates

## Safety & Determinism Rules

- Never allow AI memory adjustments to override food-safety eligibility, NGO capacity, operating hours, dietary compatibility, or travel ETA hard filters.
- Any state transition (`POSTED → ACCEPTED → COLLECTED → DELIVERED / CANCELLED / EXPIRED`) must remain atomic inside a MongoDB transaction.
