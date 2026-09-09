# Debug Session: auth-rate-limit-429
Status: [OPEN]
Date: 2026-09-09
Platform: TuniBac V2 — Render Free Tier (Neon + Cloudflare R2)
## Bug Description
Repeated Login → Logout → Login cycles return HTTP 429 "Too many requests, please try again later" during normal user behavior. Rate limit misfires.

## Constraints (from user)
- DO NOT disable rate limiting. Keep brute-force protection.
- No schema change / no destructive DB ops.
- Test deployed prod + local browser.
- Fix → commit → push → Render redeploy → verify.

## 3–5 Falsifiable Hypotheses
### H1. Backend limiter windowMs/max too aggressive (e.g. 5 req/15 min shared global)
  - Falsify if: limits already generous (>50/window) or scoped per-path correctly
### H2. Render proxy + trust proxy misconfigured → all users count as same IP
  - Falsify if: trust proxy correctly set 1, XFF last IP correct, keyGenerator includes user identifier
### H3. Logout requests counted against LOGIN limiter or login limiter is global (not path-specific)
  - Falsify if: limiter mounted ONLY on auth/login/register, NOT on logout or general routes
### H4. Frontend duplicate login requests (double-submit on Enter+click, useEffect retry, StrictMode)
  - Falsify if: 1 click → exactly 1 POST /api/auth/login in network tab
### H5. Login limiter counts SUCCESSFUL logins + LOGOUTS against same counter
  - Falsify if: only failed attempts counted OR successfulResetOnSuccess=true enabled
## Evidence Log
(To be filled by runtime instrumentation/network captures)

## Verdict
(Conclusion after evidence + fix + post-fix comparison)
