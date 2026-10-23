# AI Internship Platform Backend

Backend API for an AI Internship Platform built with Node.js, Express, MongoDB, and Mongoose.

## Features
- JWT authentication with role-based access (`intern`, `company`, `admin`)
- Intern OTP email verification flow
- Company verification workflow (`pending`, `verified`, `rejected`)
- Resume upload + dummy parser + resume scoring
- Skill gap analysis + internship recommendation
- Company-side AI candidate matching
- Internship CRUD, applications, feedback, and admin management APIs

## Setup
1. Copy `.env.example` to `.env` and update values.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run API:
   ```bash
   npm run dev
   ```
4. Seed sample data:
   ```bash
   npm run seed
   ```

## API Prefix
- Base: `/api`

## Main Route Groups
- `POST /api/auth/intern/send-otp`
- `POST /api/auth/intern/verify-otp`
- `POST /api/auth/intern/signup`
- `POST /api/auth/company/signup`
- `POST /api/auth/intern/login`
- `POST /api/auth/company/login`
- `POST /api/auth/admin/login`

- `GET /api/intern/profile`
- `PUT /api/intern/profile`
- `POST /api/intern/resume/upload`
- `GET /api/intern/resume/score`
- `POST /api/intern/skill-gap`
- `GET /api/intern/recommendations`
- `POST /api/intern/apply/:internshipId`
- `GET /api/intern/applications`
- `GET /api/intern/feedback`
- `POST /api/intern/report-company`

- `GET /api/company/profile`
- `PUT /api/company/profile`
- `POST /api/company/internships`
- `GET /api/company/internships`
- `PATCH /api/company/internships/:id`
- `DELETE /api/company/internships/:id`
- `GET /api/company/internships/:id/applicants`
- `GET /api/company/internships/:id/matched-candidates`
- `PATCH /api/company/applications/:applicationId/stage`
- `POST /api/company/applications/:applicationId/feedback`

- `GET /api/internships`
- `GET /api/internships/:id`

- `POST /api/ai/parse-resume`
- `POST /api/ai/resume-score`
- `POST /api/ai/skill-gap`
- `POST /api/ai/recommendations`
- `POST /api/ai/match-candidates`

- `GET /api/admin/users`
- `GET /api/admin/internships`
- `GET /api/admin/companies`
- `PATCH /api/admin/companies/:companyId/verification`
- `POST /api/admin/reports`
- `GET /api/admin/reports`
- `PATCH /api/admin/reports/:reportId/resolve`

## AI Integration Notes
The current AI logic is intentionally deterministic and modular under `src/services/ai.service.js`.
Comments mark where to integrate Gemini/OpenAI for:
- Resume extraction
- Resume scoring
- Skill gap reasoning
- Recommendation ranking
- Applicant ranking

## Resume Scorer Service (sieve.ai model)

This project now includes a Python scorer microservice in `server/scorer/` using `model.joblib` and `vectorizer.pickle` from sieve.ai.

### Env vars
- `SCORER_ENABLED=true|false`
- `SCORER_BASE_URL=http://localhost:5002`
- `SCORER_TIMEOUT_MS=5000`

### Docker run (API + scorer)
From `server/`:
```bash
docker compose up --build
```

When `SCORER_ENABLED=true` and scorer is unavailable, intern resume score endpoints return a clear `503 Resume scorer unavailable` error.

When `SCORER_ENABLED=false`, backend uses deterministic Node fallback scoring.
