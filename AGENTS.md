# Working on ArchMap

Read README.md for the current product scope and DESIGN.md before changing the interface.

- The repository reader must never execute analyzed code or install its dependencies.
- Keep file access inside the configured root. Test traversal and symlink boundaries.
- Observed graph connections require source evidence; manual connections stay distinguishable.
- Imports establish static dependencies, not runtime order. Label model interpretations honestly.
- Keep model keys server-side. Inference happens only after an explicit user question.
- Validate portable project files using shared/schema.ts.
- Use meaningful feature branches and commits. Preserve merge history; don't inflate it with empty changes.
- Run relevant tests and npm run build. UI changes should cover desktop and narrow screens.
