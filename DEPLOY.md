# V21 deployment

Build command: `npm run build`

Vercel environment variables:
- `GEMINI_API_KEY` — required for chat
- `GEMINI_MODEL` — optional; defaults to `gemini-2.5-flash`

If chat says Gemini cannot answer, inspect the Vercel Function Logs for `/api/chat`. The endpoint now returns clearer authentication/quota/model errors.
