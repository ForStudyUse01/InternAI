# InternAI

Internship recruitment and career-readiness platform connecting **students**, **companies / recruiters** and **platform administrators**. It parses resumes, produces explainable ATS-style scores, analyses skill gaps, matches students to internships, ranks applicants and carries each application through interviews to a final decision, all in one system.

> Design principle: numeric hiring outputs (resume score, match %, ranking) stay **deterministic and explainable**. Optional language models improve extraction and presentation only; they never decide scores or hiring outcomes. Core features keep working when optional infrastructure (Redis, Postgres, AI providers, SMTP) is unavailable.

## Features

| Role | Capabilities |
|---|---|
| Student / Intern | Profile and resume upload (PDF / DOCX / TXT), ATS-style resume score with deductions, skill-gap analysis and learning roadmap, internship recommendations, application tracking, interview rooms, chat, certifications, 3D portfolio |
| Company owner / CEO / HR | Company portal, internship posting, candidate search and compare, configurable hiring-score templates, applicant pipeline, interview scheduling, analytics and PDF reports |
| Administrator | Company verification, certification review, user moderation, platform oversight |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, GSAP, Three.js / React Three Fiber |
| Backend | Node.js 20, Express 4, Socket.IO (chat and interview signalling) |
| Database | MongoDB (Mongoose); optional PostgreSQL analytics store |
| Cache | Upstash Redis with in-memory fallback |
| AI | Groq / Hugging Face (optional) with local-heuristic fallback; optional Python resume scorer (`backend/scorer`) |
| Storage | Local disk or Cloudinary |
| Testing | Jest + Supertest (backend), Vitest + Testing Library and Playwright (frontend) |
| Deployment | Render (API), Netlify / Vercel (web), Docker for the backend |

## Repository structure

```
.
├── backend/                 Express API (modular monolith, see backend/ARCHITECTURE.md)
│   ├── src/
│   │   ├── app.js           Express app: middleware, health, module mounting
│   │   ├── server.js        HTTP server, MongoDB, sockets bootstrap
│   │   ├── seed.js          Database seed CLI
│   │   ├── registry/        Module registry and route mounting
│   │   ├── shared/          Shared kernel: config, db, middleware, utils, AI, cache, storage, sockets
│   │   └── modules/         Feature modules: authentication, students, companies, internships,
│   │                        applications, ats-scoring, ai, interviews, notifications, reports,
│   │                        chat, portfolio, admin, ...
│   ├── scorer/              Optional Python resume-scoring microservice
│   ├── scripts/             Seed and verification scripts
│   ├── tests/               Jest test suites
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/                Next.js application
│   ├── app/                 Routes: public pages, auth, dashboards (intern / company / admin),
│   │                        interview, portfolio
│   ├── components/          UI components
│   ├── lib/                 API clients, portals, helpers
│   ├── public/              Static assets, PWA icons, service worker
│   ├── scripts/             Asset and data generators
│   └── tests/               Unit, integration and Playwright e2e tests
├── deployment-guard/        Pre-deploy release gate (routes, security, AI, performance checks)
├── render.yaml              Render blueprint for the API
├── netlify.toml             Netlify config for the frontend
└── package.json             Root helper scripts
```

## Getting started

### Prerequisites

- Node.js 20.x and npm
- MongoDB (local or Atlas)
- Python 3.10+ (only for the optional resume scorer)

### 1. Backend

```bash
cd backend
cp .env.example .env        # set MONGO_URI and JWT_SECRET at minimum
npm install
npm run dev                 # http://localhost:5000
```

Seed demo data (also runs automatically in development when `AUTO_SEED=true`):

```bash
npm run seed
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_BASE_URL points at the backend
npm install
npm run dev                 # http://localhost:3000
```

### 3. Optional Python scorer

```bash
cd backend
npm run scorer:install
npm run scorer:dev          # http://localhost:5002/health
```

Then set `SCORER_ENABLED=true` and `SCORER_BASE_URL=http://localhost:5002` in `backend/.env`.

## Environment variables

Backend (`backend/.env.example`):

- **Required:** `MONGO_URI`, `JWT_SECRET`
- **Recommended in production:** `CLIENT_URL`, `JWT_REFRESH_SECRET`
- **Optional:** feature flags (`ENABLE_AI`, `ENABLE_CHAT`, `ENABLE_INTERVIEW_ROOMS`, ...), Redis (`UPSTASH_REDIS_*`), Postgres (`DATABASE_URL`), Cloudinary storage, `GROQ_API_KEY`, `HUGGINGFACE_API_KEY`, SMTP settings

Frontend (`frontend/.env.example`): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`

Never commit real `.env` files; only the `*.example` templates are tracked.

## Testing

```bash
# Backend (Jest)
cd backend && npm test

# Frontend unit / integration (Vitest)
cd frontend && npm test

# Frontend end-to-end (Playwright)
cd frontend && npm run test:e2e
```

## Deployment

- **Pre-deploy gate:** `npm run deploy:guard` (or `:frontend` / `:backend` / `:json`) runs the checks in `deployment-guard/`. It also runs automatically before the backend starts and before the frontend builds.
- **API:** Render, configured by `render.yaml` (root dir `backend`, health check `/health`). Secrets are set in the Render dashboard.
- **Web:** Netlify (`netlify.toml`, base `frontend`) or Vercel (`frontend/vercel.json`).
- **Docker:** `backend/Dockerfile` and `backend/docker-compose.yml`.

## Security notes

- JWT access and refresh tokens use separate secrets; refresh tokens are stored hashed.
- Passwords are hashed with bcrypt; email is verified by OTP before account creation.
- Helmet, CORS allow-listing, rate limiting, Mongo query sanitisation and request validation are applied globally.
- Uploaded files (resumes, certificates, logos) are runtime data and are not part of the repository.

## Further reading

- [`backend/ARCHITECTURE.md`](backend/ARCHITECTURE.md): module layout and API mounting
- [`backend/README.md`](backend/README.md): API route groups
- [`deployment-guard/README.md`](deployment-guard/README.md): release-gate checks
