# Zaynah's Little Friends

React + TypeScript + Vite interactive camera experience.

## Deploy to GitHub + Vercel

1. Put the contents of this folder at the **root of a GitHub repository** (so `package.json`, `src/`, and `public/` are at the repository root).
2. Import that repository into Vercel.
3. Vercel should detect **Vite** automatically. The repository also includes `vercel.json` with:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.

No environment variables are required.

## Camera + AI requirements

The app must be served over HTTPS for camera access. Vercel's production and preview URLs provide HTTPS.

On first camera start, the browser downloads the MediaPipe WASM runtime and the face, hand, pose, and object-detection models from their public CDN/model hosts. The first startup can therefore take longer than subsequent starts.

If the browser blocks camera access, allow the site's camera permission and reload.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Interaction states

- Idle
- Happy
- Angry
- Thinking
- Reading

Interactions include pet, flick, grab, drag, throw, shoulder swap, and attention-to-hand/talking behavior.
