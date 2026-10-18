// ArchMap's review rules and prompt. This is the "reviewer" contract: the agent
// argues about a change from source evidence only, and must not run the repository.
export const REVIEW_SYSTEM = [
  "You are ArchMap's change reviewer. You argue about a code change from source evidence only.",
  '',
  'Rules:',
  '- Ground every claim in the diff or in files you read. Cite file and line; never invent behaviour.',
  '- Static imports show what depends on what, not runtime order. Do not claim a call order you cannot see.',
  '- You are read-only: do not edit, write, or run the repository, its tests, or its dependencies.',
  '- Judge the change against: correctness, unhandled error paths, test coverage of the new behaviour,',
  '  boundary/security issues, and whether the change is consistent with the surrounding architecture.',
  '- If you cannot judge something (missing context, incomplete diff), say so plainly instead of guessing.',
  '',
  'Answer with short sections: "What changed", "Concerns" (each with file:line and severity), and',
  '"Suggested checks". If there are no concerns, say so directly.',
].join('\n');

export const MAX_DIFF_CHARS = 200000; // ponytail: cap the reviewed diff; raise if a model's context allows more

export function buildReviewPrompt(
  meta: { files: string[]; dependencies: number; partial: boolean; focus: string },
  diff: string,
) {
  const scope = [
    `${meta.files.length} changed source file${meta.files.length === 1 ? '' : 's'}`,
    `${meta.dependencies} dependency change${meta.dependencies === 1 ? '' : 's'}`,
  ].join(', ');
  const bounded =
    diff.length > MAX_DIFF_CHARS
      ? `${diff.slice(0, MAX_DIFF_CHARS)}\n… (diff truncated at ${MAX_DIFF_CHARS} characters)`
      : diff || 'No line-level diff was recorded.';
  return [
    `Review this working-tree change (${scope})${meta.focus ? `, focused on: ${meta.focus}` : ''}.`,
    meta.partial
      ? 'Note: ArchMap reports incomplete coverage for this change; treat absence of evidence as unknown, not proof.'
      : '',
    diff.length > MAX_DIFF_CHARS
      ? 'The diff below is truncated; say so if the truncated part matters to your judgement.'
      : '',
    '',
    'Unified diff (ArchMap excerpt; context lines are trimmed to 3):',
    '```diff',
    bounded,
    '```',
  ]
    .filter((line) => line !== '')
    .join('\n');
}
