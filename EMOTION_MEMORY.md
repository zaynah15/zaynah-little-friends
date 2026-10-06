# Emotion Memory

The app treats the characters as parts of Zaynah rather than independent assistants.

## Stable profile

`src/memory/memory.ts` seeds a stable personal profile. This is background context such as age, role, move, interests, past achievements and current growth themes.

## Daily journal

Each daily story is saved locally under `zaynah-little-friends-emotion-journal-v1`.

Entries contain:

- date
- raw story text
- inferred emotion/topic tags

The app keeps up to 365 entries.

## Council use

`journalMemory()` turns the raw journal into a compact context:

- total entries
- first entry date
- recurring themes
- recent coping-pattern entries
- recent stories

`/api/council.js` receives that context for every emotional voice and for the final synthesis.

## Memory rules

The model is explicitly instructed:

- use only supplied memories
- do not invent what worked before
- do not claim `you always...` without evidence
- distinguish stable profile from recent journal evidence
- use emotions as signals rather than failures
- never diagnose
- never shame body/weight/food

## Privacy

The current implementation uses browser localStorage. It is a prototype, not a secure medical or therapeutic journal. Do not store secrets in the journal. If this becomes a production product, add authentication, encrypted storage, clear retention controls and a proper privacy model.
