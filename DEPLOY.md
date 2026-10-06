# Deploy V27 to Vercel

## 1. Upload repository

Push the contents of this package to the GitHub repository used by the Vercel project.

## 2. Build settings

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

## 3. Environment variables

Set in **Production**:

- `GEMINI_API_KEY` = the actual Gemini API key from Google AI Studio.
- `GEMINI_MODEL` = optional. Recommended default is `gemini-3.8-flash`.

Do not put `gen-lang-client-...` or another Google project/client identifier into `GEMINI_MODEL`.

If `GEMINI_MODEL` is missing or invalid, the server falls back to `gemini-3.8-flash`.

## 4. Redeploy

After changing environment variables, create a fresh Production deployment. Environment variables are read by the serverless function at runtime/deployment and should not be exposed in browser code.

## 5. Smoke test

1. Open the dashboard without camera permission. All seven characters should already be visible.
2. Click **Turn on camera**.
3. Wave at the camera. All characters should wave.
4. Close your fist. The common council chat should open.
5. Type or speak an issue.
6. Watch each emotional self respond sequentially.
7. Add context during the discussion if a character asks a question or if you forgot a detail.
8. Wait for **We have concluded**.
9. Test the daily memory button and save a story.
10. Run another council and verify the journal is used as context.


### Council smoke test
- Open the council and enter a real decision or conflict.
- Watch one voice appear at a time; they should not all pop in immediately.
- If a voice asks a question, the room should pause and show an “Answer them” input.
- Answer it; later voices must visibly receive/build on the answer.
- After the final voice, the collective conclusion should appear.
- The conclusion should balance emotion with practical constraints and should not reveal private salary figures.
