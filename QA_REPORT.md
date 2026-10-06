# V28 QA Report

## Requested changes verified in source

- Council no longer opens from a fist.
- Council opens only from the explicit **Open Council** button or MediaPipe `indexPointing`.
- The wave gesture remains only a greeting response and does not open the council.
- Removed the old on-screen instruction telling the user to wave and close their fist.
- Added **Open Council** beside **Tell them about today**.
- Live camera is rendered at full opacity with normal blending and no blur/multiply haze.
- Council backdrop is transparent/no backdrop blur so the camera remains visible.
- Council is now a compact centered dialogue box rather than a near-full-screen modal.
- The initial issue input and the realtime character discussion use the same council dialogue box.
- Comments continue appearing sequentially in that box, so the user can read the discussion unfold.
- The existing deliberate pauses remain so the council takes roughly 1–2 minutes rather than dumping replies instantly.
- Gemini voice requests now use `gemini-3.5-flash-lite` first, with configured-model and multiple current Flash fallbacks.
- Transient Gemini failures (429/5xx/408) are retried with short exponential backoff.
- If all Gemini attempts fail, a local deterministic council voice/conclusion fallback still produces a result instead of showing an empty council.

## Automated checks run

- `node --check api/council.js` — PASS
- Council API mock: configured model returns 503, fallback model returns successful voice + question — PASS
- Council API mock: all models return 503, local final fallback returns a conclusion/action — PASS
- Verified fallback model call sequence — PASS
- Verified no salary amount is emitted by the fallback conclusion — PASS
- Verified source no longer contains fist-to-council behavior — PASS
- Verified source uses `result.indexPointing` for gesture opening — PASS
- Verified CSS override sets camera opacity to 1 and normal blending — PASS
- Verified council backdrop has no blur — PASS

## Build limitation

A clean `npm install` / `npm run build` could not be executed in this environment because the npm registry package was not available in the local cache. The code was still checked with Node syntax validation and targeted mocked API tests. Vercel must perform the final dependency install and production build.
