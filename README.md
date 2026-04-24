# InternAI

InternAI is a full-stack platform for internship discovery and recruitment workflows.

## Monorepo Structure

- `client/` - React + TypeScript + Vite frontend
- `server/` - Node.js + Express + TypeScript backend

## Local Setup

### 1) Backend

1. Copy `server/.env.example` to `server/.env`
2. Set required values (see Environment section)
3. Run:
   - `cd server`
   - `npm install`
   - `npm run dev`

### 2) Frontend

1. Copy `client/.env.example` to `client/.env`
2. Set `VITE_API_BASE_URL`
3. Run:
   - `cd client`
   - `npm install`
   - `npm run dev`

## Environment

### Backend `.env`

Use:

- `PORT=5000`
- `MONGO_URI=<mongodb_atlas_or_local_connection>`
- `JWT_ACCESS_SECRET=<secure_secret>`
- `JWT_ACCESS_EXPIRES_IN=1d`
- `OTP_PROVIDER=mock`
- `SMTP_HOST=`
- `SMTP_PORT=`
- `SMTP_USER=`
- `SMTP_PASS=`
- `RESUME_MAX_FILE_SIZE_MB=5`

The backend also accepts `MONGODB_URI` for compatibility.

### Frontend `.env`

- `VITE_API_BASE_URL=http://localhost:5000/api/v1`

## Deploy

### MongoDB Atlas

1. Create Atlas cluster
2. Create DB user
3. Whitelist IP (`0.0.0.0/0` for testing)
4. Copy connection string to `MONGO_URI`

### Backend on Render

1. Create Render Web Service
2. Connect repository
3. Root directory: `server/`
4. Build: `npm install && npm run build`
5. Start: `npm run start`
6. Set env vars:
   - `MONGO_URI`
   - `JWT_ACCESS_SECRET`
   - `JWT_ACCESS_EXPIRES_IN`
   - `OTP_PROVIDER`
   - `SMTP_*` (optional)
   - `CLIENT_ORIGIN=<vercel_domain>`

Use `server/render.yaml` if you prefer Blueprint setup.

### Frontend on Vercel

1. Import project in Vercel
2. Root directory: `client/`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set env var:
   - `VITE_API_BASE_URL=<render_backend_url>/api/v1`

`client/vercel.json` is included for static build settings.

## Final QA Checklist

- Signup -> OTP verify -> Login
- Invalid OTP rejected
- Expired OTP rejected
- JWT invalid/expired rejected
- Role restrictions enforced
- Resume upload + parsed fetch works
- Recommendations deterministic and sorted
- Apply -> status update -> feedback flow works
- Pagination metadata returned on list APIs
