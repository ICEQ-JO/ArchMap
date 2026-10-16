# Review architecture changes

Open a local JS/TS repository in the workspace and select **Changes** in the toolbar. Enter a local Git commit, branch, or tag as the baseline; `HEAD` is the default. Select **Compare changes** to read the baseline and rescan source on disk.

The comparison includes staged, unstaged, and untracked source files permitted by the reader's ignore rules. It does not change the checkout, index, editable map, or saved map. Git objects are read directly: no checkout, external diff/text-conversion commands, model request, project execution, or dependency installation is involved. External Git filesystem-monitor hooks are disabled during source discovery.

## Read the review

- **Graph:** inferred responsibility areas from both sides. `+` means added, `−` means removed, and `±` means an area contains changed source or its membership changed. Unmarked areas provide context. Dashed red connections were removed; muted mint connections were added. Selection filters changed files by area.
- **File list:** additions, modifications, and removals based on source content hashes. Filter by a path or filename. Renames appear as removal and addition.
- **Source evidence:** select a file to inspect exports before and after, plus source around the first changed line. Excerpts are limited context, not a full unified patch; further changes may exist.
- **Dependencies:** expanded entries show import evidence from the appropriate side. Matching ignores line movement and repeated identical imports. Changing an import to a type-only import is reported as a removed dependency kind and an added one.

Changes to source within an area mark it modified; this is not a claim that its architecture or behavior changed. Static imports are dependencies, not execution order. The review does not assert test results, security correctness, or runtime behavior.

## Focus on a feature

Use **Focus this review** for a path, symbol, responsibility name, or question such as “What changed in authentication?”. This is deterministic keyword matching across changed paths, exported names on both sides, inferred responsibility labels, and changed dependency references. It is not semantic question answering. Common auth/generation word forms are normalized.

The file list and static-dependency list narrow together. The graph retains matched responsibility areas and their direct neighbors for context. Selecting an area further restricts the focus; clear the area filter to return to all matching changes. No additional repository reads or model calls occur when filtering.

Expand **Read change brief** for concrete file and export changes. Each numbered file reference opens its before/after evidence. Unchanged exported names do not establish unchanged behavior. Context and coverage limitations remain visible, including the withholding of absence-based claims for incomplete scans.

## Coverage

Both sides use the existing limits: 400 source files, 256 KB per file, and 8 MB total. Source-language support and module-resolution limitations are the same as the normal scanner. The repository's feature focus, if set, prioritizes paths before these limits; the review focus searches only already inspected changes; it does not expand the source scan.

When either scan reports gaps (for example unresolved relative imports, skipped files, or a file limit), the review marks coverage incomplete. Addition, removal, and dependency-change claims are withheld because absence from a partial graph is insufficient evidence. Modifications to files inspected on both sides remain available. Historical symlinks and common credential paths are excluded; source access stays within the selected repository.

This is a fresh point-in-time scan, not a file watcher or atomic filesystem snapshot. Refresh comparisons after the coding agent has finished writing. Non-source configuration, migrations in unsupported languages, remote services, and test execution are outside this review.

## Development

The API is `POST /api/compare` with `{ "path": ".", "ref": "HEAD", "focus": "" }`. It enforces the same configured-root, Host, Origin, concurrency, and request-size boundaries as repository analysis. Responses are validated with `comparisonSchema` in `shared/schema.ts`.

- `server/git-snapshot.ts`: bounded historical blob reads, including historical root compiler options.
- `server/comparison.ts`: content/topology comparison and responsibility graph.
- `src/components/ChangesPanel.tsx`: separate, read-only review with accessible modal behavior.
- `src/components/Workbench.css`: workspace-only styling, separate from landing-page work.

The local source-review milestone is implemented. OpenCode session integration, model-written change explanations, architectural rule checking, and sending corrections to an agent remain future work.
