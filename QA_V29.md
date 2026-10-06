# V29 QC

- Final council UI now renders only the recommendation paragraph.
- Removed the visible `THEY TALKED...`, `We have concluded.`, and `What you can do:` text.
- Final Gemini prompt now asks for one short paragraph beginning naturally with `Zaynah, you should...` and containing the main `because...` reasoning.
- Server parser strips accidental `CONCLUSION:` / `ACTION:` labels from Gemini output.
- Local fallback conclusions were changed to the same direct recommendation style.
- `node --check api/council.js`: PASS.
- Full TypeScript build cannot run in this environment because npm dependencies are not installed; global `tsc` reports missing React/JSX modules for that reason.
