# BuildSee product study — October 16, 2026

Inspected the live public site in a browser, including OpenCode and PostHog examples, selected guided flows, advanced steps, and inspected their source evidence. The private workspace redirected to the accounts site and a security challenge; its authenticated generation and integrations could not be exercised.

## Observed

- Architecture entities represent responsibilities, services, data stores, and boundaries, rather than one node for every imported file.
- Named flows describe a feature or operation. The OpenCode tool-call flow has 12 explained steps; each step selects a meaningful connection and exposes its source code and commit reference.
- The inspector supports both component selection and connection evidence.
- Multiple named flows coexist on a single architecture map. PostHog separates ingestion, playback, and export workflows.
- Canvas navigation, fitting, and source inspection are coordinated with walkthrough selection.

## Published workflow, not privately verified

The product describes connecting repositories/services, asking an agent to inspect code, reviewing proposed nodes/edges/evidence, accepting changes, and iterating. It advertises live provider integrations. These claims are documented at https://buildsee.dev/ and https://buildsee.dev/about; the private workflows were not tested.

## ArchMap changes

Keep the module graph as a detail view. Add a compact responsibility overview, source-derived call-site flows, explicit provenance, and an optional model-backed proposal flow that never applies a change without review. Validate model references against collected source evidence. Show structural grouping as inferred, lexical call order as a code walkthrough, and model interpretations as unverified.

The user rejected the green theme, while retaining the overall design language. Replace it with neutral graphite, warm-white text, and a restrained blue accent. Use Anatomy for an original source-tracing instrument, not as a replacement for the functional architecture canvas.
