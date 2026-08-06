# OFF website

Astro 7 and `@cloudflare/nimbus-docs` 0.7.1 power the OFF marketing and
documentation site.

- `/` is the Market Terminal marketing surface.
- `/docs/...` contains curated current documentation.
- `scripts/materialize-docs.mjs` mirrors an explicit allowlist of canonical
  repository Markdown before linting and builds. Generated MDX is ignored and
  must not be edited directly.
- `OFF_SITE_URL` is the canonical-origin contract. Local development defaults
  to `http://localhost:4321`; deployable builds require the exact HTTPS Sites
  origin.

## Commands

```sh
npm run lint:docs
npm run typecheck
npm run build
npm run test:sites
npm run verify
OFF_SITE_URL=https://open-finance-format.madebyhenry.chatgpt.site npm run build:deploy
```

The Astro build emits static assets into `dist/client`. The packaging step adds
`dist/server/index.js` and `dist/.openai/hosting.json` for Sites.
