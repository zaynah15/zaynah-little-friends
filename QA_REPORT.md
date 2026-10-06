# V26 QA / implementation notes

## Implemented

- Seven-character council room.
- Renamed/reframed states: Logical, Little Zaynah, Lazy, plus Angry, Happy, Sad, Jealousy.
- Fixed floating dashboard positions.
- Wave detection and room-wide wave animation.
- Fist gesture opens the shared council chat.
- Typed and browser voice issue input.
- Sequential emotional deliberation where each later character sees earlier comments.
- User can add context during deliberation.
- Final collective conclusion and action step.
- Long-term profile + emotion journal sent to every council call.
- Gemini API key remains server-side.
- New sad/jealousy image assets added as replaceable temporary variants.

## API checks

`node --check api/council.js` passes.

## Build limitation

A complete `npm run build` cannot be honestly marked PASS in this execution environment because npm dependencies are not installed and registry access is unavailable here. Vercel should perform the clean install/build from the repository.

## Manual browser smoke test after Vercel deploy

1. Open dashboard: all seven characters should be visible without camera.
2. Click `Turn on camera`.
3. Wave: all characters should animate a wave.
4. Close fist: shared council room should open.
5. Type a real issue and start the council.
6. Confirm characters appear one by one and later comments react to earlier comments.
7. Add context while deliberation is running.
8. Confirm final `We have concluded` card appears.
9. Test microphone issue narration.
10. Open daily memory and save a story; start another council and verify the journal context influences replies.
11. Test Gemini failure cases: missing key, invalid key, quota/rate limit.

## Known intentional behavior

The dashboard characters are fixed in the room. They do not track the user's shoulders on the dashboard. The camera is only used for interaction gestures in this version.


## V27 final QC (2026-10-06)

Additional requirements verified/fixed:
- Council now pauses roughly 9 seconds between voices when no user question is needed, so seven voices feel like a real deliberation rather than rapid chatbot output.
- A council voice may emit a single `QUESTION:` when a missing fact could materially change the decision. The UI pauses the room, lets Zaynah answer, then feeds that answer to the remaining voices and final synthesis.
- A 45-second unanswered-question path should be used if the user walks away; the room can continue instead of hanging indefinitely.
- Private financial context is available to the decision engine, including monthly income and recent spending/travel context, but salary figures are redacted from character/final output.
- Birthday decisions explicitly avoid inventing a ten-year birthday history. If that history is needed, the council asks Zaynah about relevant past birthdays.
- Home-visit context is seeded as approximately one month since the last visit and a 3–4 month intended cadence.
- The collective conclusion is instructed to balance emotional truth, affordability, future plans, and likely regret rather than letting FOMO dominate.
- `api/council.js` and `api/chat.js` pass Node syntax checks.
- All 12 TS/TSX source files pass TypeScript transpile/syntax validation.
- Full `npm run build` remains unverified in this environment because npm dependency installation cannot reach the registry.


## Final QC additions
- Node syntax: PASS (`api/council.js`, `api/chat.js`).
- TS/TSX transpile-only syntax validation: PASS (12 files).
- Mock council question parsing: PASS.
- Mock private salary redaction: PASS for `95000`, `95,000`, `95k`, and `₹95,000` forms.
- Deliberation pacing: 9-second inter-voice pause; seven voices create ~54 seconds of deliberate pause time before Gemini latency/final synthesis, with question pauses extending naturally.
- Question timeout: 45 seconds, preventing indefinite hanging.
- Birthday-history integrity: no invented ten-year history; the council can ask for it when relevant.
- Financial decision integrity: private income/spending context is available for reasoning; output is instructed and sanitized not to expose salary figures.
- Full production `npm run build`: NOT VERIFIED here because npm dependency installation timed out while reaching the registry. Vercel remains the authoritative clean-build check.
