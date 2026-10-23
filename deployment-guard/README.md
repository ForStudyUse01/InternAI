# Deployment Guard

FAANG-style pre-deploy release gate. Blocks deployment when critical checks fail.

## Quick start

```bash
# Full platform validation (~10s)
npm run deploy:guard

# Target-specific
npm run deploy:guard:frontend
npm run deploy:guard:backend

# JSON report to stdout
npm run deploy:guard:json
```

## CI/CD flow

1. Functionality (routes, TypeScript, backend load)
2. AI consistency (validation, caching, confidence UI)
3. Test engine (timer, dedupe, proctor, scoring)
4. Interview system (auth, WebRTC, signaling)
5. Performance (cache config, optional live health probe)
6. UI stability (loading states, responsive patterns)
7. Security (auth, rate limits, access control)

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | `buildStatus: PASS` — deploy allowed |
| `1` | `buildStatus: FAIL` — deploy blocked |
| `2` | Guard crashed |

## Report output

Written to `deployment-guard/last-report.json`:

```json
{
  "buildStatus": "PASS",
  "failedChecks": [],
  "warnings": [],
  "performanceScore": 100,
  "aiReliabilityScore": 100,
  "uiStabilityScore": 100
}
```

## Optional live API probe

```bash
DEPLOY_GUARD_API_URL=http://localhost:5000 npm run deploy:guard
```

## Integration

- **Frontend:** `prebuild` runs guard before `next build`
- **Backend:** `prestart` runs guard before `node src/server.js`
- **Render:** `buildCommand` runs guard in `render.yaml`

Skip TypeScript check (faster smoke):

```bash
node deployment-guard/run.mjs --skip-tsc
```
