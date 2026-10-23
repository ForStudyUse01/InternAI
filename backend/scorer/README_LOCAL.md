# Local Scorer (No Docker)

Run model-backed scorer locally with Python.

## 1) Install scorer dependencies
From project root:
```powershell
npm run scorer:install
```

## 2) Start scorer service
In a separate terminal:
```powershell
npm run scorer:dev
```

Scorer health:
```powershell
curl http://localhost:5002/health
```

## 3) Start backend
In another terminal:
```powershell
npm run server:dev
```

Ensure `server/.env` has:
- `SCORER_ENABLED=true`
- `SCORER_BASE_URL=http://localhost:5002`

## Notes
- With Python 3.13, model loads with sklearn version warnings; scoring still runs.
- If scorer is down and `SCORER_ENABLED=true`, backend returns `503 Resume scorer unavailable`.
