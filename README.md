# Diwali · Five Lights

A Diwali effects experience on an isometric grid: five familiar forms (diya, anar, chakri, kandil and kamal), each on its own island with its own effect.

Designed and directed by Shubham Shinde; built with AI. Showcase write-up: https://studioshubham.vercel.app/journal/diwali-isometric-motion/

## Run it

The site is static and lives in `dist/`. Serve that folder:

```bash
npx serve dist
```

## Tests

```bash
for t in tests/*.cjs; do node "$t"; done
```

## Layout

- `dist/`: the site (`index.html`, `app.js`, effects, three.js in `dist/vendor`, Inter in `dist/fonts`)
- `dist/diya-study.html`, `dist/study/`: effect studies
- `docs/`: notes on the studies and plans
- `tests/`: motion, fire and fountain physics tests
