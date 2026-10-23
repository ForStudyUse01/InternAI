# Backend Architecture — Modular Monolith

Single deployable Node.js application organized into **feature modules** with a **shared kernel**. Each module is structured so it can be extracted into a standalone microservice later with minimal effort.

## Principles

- **One process, one deployment** — not microservices yet
- **Module boundaries** — routes, controllers, services, models, validators, constants per domain
- **Shared kernel** — cross-cutting infrastructure only in `shared/`
- **Legacy shims** — old import paths (`src/controllers/*`, `src/services/*`, etc.) re-export from modules during transition
- **API stability** — all existing `/api/*` and `/api/v1/*` routes unchanged

## Folder Structure

```
src/
├── app.js                 # Express app (global middleware, health, module mount)
├── server.js              # HTTP server + MongoDB + sockets bootstrap
├── seed.js                # Database seed CLI
├── registry/
│   └── index.js           # Module registry + mountModularApi()
├── shared/                # Shared kernel (extractable infra only)
│   ├── config/            # platform.config, feature-flags, mailer, env.schema
│   ├── database/          # MongoDB connection
│   ├── middleware/        # auth, roles, errors, upload, validation
│   ├── utils/             # AppError, api-response, jwt, asyncHandler, etc.
│   ├── infrastructure/    # AI providers, cache, storage, postgres, bootstrap
│   ├── socket/            # Chat + interview WebSocket handlers
│   ├── logger/            # Structured console logger
│   ├── constants/         # Global enums, roles, brand, validation-rules
│   └── data/              # Seed scripts + seed data
└── modules/
    ├── authentication/    # Auth, JWT, OTP, User model
    ├── students/          # Intern profiles, resume, ATS, certifications
    ├── companies/         # Company portal, HR, analytics, access control
    ├── internships/       # Internship listings
    ├── applications/      # Application pipeline
    ├── ats-scoring/       # Hiring score templates
    ├── ai/                # AI recommendations, skill gap, matching
    ├── interviews/        # Interview rooms + scheduling workflow
    ├── notifications/     # In-app + email notification queue
    ├── email/             # Email templates
    ├── reports/           # PDF report generation
    ├── calendar/          # Personal calendar
    ├── analytics/         # Activity logging
    ├── admin/             # Platform administration
    ├── chat/              # Realtime messaging
    ├── portfolio/         # 3D portfolios
    ├── skills/            # Skill taxonomy
    └── candidates/        # Recruiter candidate search
```

## Module Anatomy

Each module follows the same layout:

```
modules/<name>/
├── index.js           # Module metadata + router export
├── routes/            # Express routers
├── controllers/       # Thin HTTP handlers
├── services/          # Business logic
├── models/            # Mongoose schemas (domain-owned)
├── validators/        # Request validation (where applicable)
├── constants/         # Module-specific constants
└── data/              # Static templates (optional)
```

## Cross-Module Communication

Modules must **not** import another module's internal files directly when avoidable. During transition, cross-domain calls use:

1. **Legacy service shims** at `src/services/<name>.service.js`
2. **Public service interfaces** (future: explicit `modules/<x>/index.js` exports)

Future extraction targets:

| Module | Future service |
|--------|----------------|
| `ai` | AI Service |
| `email` + `notifications` | Notification / Email Service |
| `reports` | Report Service |
| `notifications` | Notification Service |

## API Mounting

`registry/index.js` mounts modules at:

| Path | Module |
|------|--------|
| `/auth` | authentication |
| `/intern` | students |
| `/company` | companies |
| `/companies` | companies (public) |
| `/internships` | internships |
| `/applications` | applications |
| `/ai` | ai |
| `/interview` | interviews |
| `/calendar` | calendar |
| `/admin` | admin |
| `/chat` | chat |
| `/portfolios` | portfolio |
| `/skills` | skills |
| `/candidates` | candidates |

Mounted at both `/api` and `/api/v1`.

## Standardized Responses

Use shared helpers:

```javascript
const { sendSuccess, sendError } = require("../shared/utils/api-response");
const AppError = require("../shared/utils/AppError");
const asyncHandler = require("../shared/utils/asyncHandler");
const logger = require("../shared/logger");
```

## Environment Variables

Documented in `shared/config/env.schema.js`. Grouped by: server, database, auth, email, AI, storage, cache, features.

## Migration Scripts

- `scripts/modular-monolith-migrate.mjs` — initial structure migration (run once)
- `scripts/modular-monolith-fix-imports.mjs` — cross-module import repair

## Development

```bash
npm run dev      # nodemon (no deploy guard)
npm start        # production start with deploy guard
npm run seed     # reset + seed demo data
```
