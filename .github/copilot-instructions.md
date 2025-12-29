<!-- .github/copilot-instructions.md -->
# Copilot / AI Agent Instructions for this repository

Short, actionable guidance to make an AI coding agent productive quickly in this NestJS codebase.

## Big-picture architecture
- NestJS monolith organized by feature under `src/modules/*` (e.g. `user`, `auth`, `file`, `admin`, `contact`).
- Shared logic lives under `src/shared` and `src/common`:
  - `shared/schemas` — Mongoose schemas used across modules
  - `shared/repositories` — repository abstraction (see `BaseRepository`) used by services
  - `common/services` — cross-cutting services (Stripe, Email, etc.)
- App entry: `src/main.ts` sets a global prefix `api/v1`, enables CORS, Swagger (`/api-docs`) and applies global guards, interceptors and filters.

## Key conventions & patterns (do not change without reason)
- Global guard: JWT protection is applied globally in `main.ts` with `JwtAuthGuard`. Use the `@Public()` decorator to expose endpoints.
- Role-based access: use `@Roles(...)` metadata; `roles.guard.ts` reads it.
- Repositories: extend `BaseRepository<T>` (`src/shared/repositories/base.repository.ts`) — it validates ObjectId strings and supports `populate`, `paginate`, and common CRUD helpers. Follow the same API when adding repositories/services.
- DTOs live in `modules/*/dto`. Controllers are in `modules/*/controllers` and services in `modules/*/services`.
- Environment-driven config: `src/config/configuration.ts` centralizes env keys and defaults. Prefer reading config via `ConfigService` and the same key paths (e.g., `stripe.secretKey`).

## Critical developer workflows
- Install deps: `yarn install`
- Run dev server (watch): `yarn start:dev` (uses `nest start --watch`)
- Build for production: `yarn build` then `yarn start:prod` (runs `node dist/main`)
- Tests: unit `yarn test`, e2e `yarn test:e2e`, coverage `yarn test:cov`
- Lint: `yarn lint` (uses `eslint` and `eslint.config.mjs`)

Notes for debugging: the codebase uses `ts-node` and `tsconfig-paths` for tests; test debugging script: `test:debug` in `package.json`.

## Important environment variables (refer to `src/config/configuration.ts`)
- Database: `MONGODB_URI` (default `mongodb://localhost:27017/file-management`)
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- Uploads: `UPLOAD_PATH`, `MAX_FILE_SIZE` (mimetype limits enforced via `multer.config.ts`)
- Email: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME` / `EMAIL_USER`, `MAIL_PASSWORD` / `EMAIL_PASS`, `MAIL_FROM_ADDRESS`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

Tip: many keys have sane defaults for local development; integration tests or CI should set explicit values for DB and secrets.

## Integrations & external services
- MongoDB via Mongoose (`@nestjs/mongoose` + `mongoose`) — models live under `shared/schemas`.
- Stripe integration is wrapped in `src/common/services/stripe.service.ts` (use `ConfigService` key `stripe.secretKey`).
- Email: `nodemailer` configs live in `configuration.ts` and `common/services/email.service.ts`.
- File uploads: uses `multer` with diskStorage; default `./uploads` directory created at startup (`src/config/multer.config.ts`).
- Websockets / Socket.IO: project includes `@nestjs/platform-socket.io` and `socket.io`.

## Code examples / patterns to follow
- Making a new repository: extend `BaseRepository<T>` and use its `paginate()` and `findById(id, { populate: [...] })` signature.
- Public route example: annotate controller method with `@Public()` to avoid global JWT guard.
- Use `ConfigService` to read nested keys: `this.configService.get<string>('stripe.secretKey')`.

## Tests & CI considerations
- Unit tests use Jest + ts-jest (see `package.json` and `test/jest-e2e.json`).
- E2E tests assume the app can be bootstrapped in the test environment; prefer using a test MongoDB instance (or a mocked connection) in CI.

## Small implementation gotchas found
- `multer.config.ts` sets `limits.fileSize = 10 * 1024 * 1024` (10 MB) but the inline comment says `2 MB` — double-check limits when changing file upload logic.
- `main.ts` uses certificate paths for production — production deployments expect existing SSL files at `/home/.../ssl` or will fallback to HTTP.

## Where to look for common tasks or patterns
- API routes overview: `README.md` (contains route list and which require auth)
- Global behavior and guards: `src/main.ts` & `src/common/guards/*`
- Repo helpers: `src/shared/repositories/base.repository.ts`
- Config and env defaults: `src/config/configuration.ts` and `src/config/multer.config.ts`

If anything in this file is unclear or if you want additional examples (e.g., a short template for adding a new repository + tests), tell me which area you'd like expanded and I will update this file. ✅
