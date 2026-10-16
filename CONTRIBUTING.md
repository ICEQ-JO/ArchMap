# Contributing to ArchMap

Thanks for helping make codebases easier to understand.

Start with `npm install` and `npm run dev`. Read the README for the current analyzer's boundaries. Open an issue before a large architectural change; small focused fixes can go directly to a pull request.

Use a feature branch such as `feat/feature-scoped-analysis` or `fix/import-resolution`. Keep commits meaningful: one coherent behavior or supporting change per commit. Include the problem, resulting behavior, and validation in the pull request description.

Before submitting:

```bash
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For analyzer changes, include small source fixtures and assert what the evidence proves. For canvas changes, check desktop, narrow screens, keyboard focus, and reduced motion.

Keep these principles:

- An observed dependency requires source evidence. User-authored relationships are labeled manual.
- Imports do not establish runtime order. Model interpretations are not observed facts.
- Never execute the repository under analysis.
- Never send source to a model without an explicit question.
- Keep map files portable and validate them at input boundaries.
- Do not commit private repository maps, `.env` files, credentials, or provider keys.
