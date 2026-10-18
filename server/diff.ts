// Unified diff computed from two in-memory file contents, so the patch matches
// exactly what the analyzer read (same-side source, untracked files included).
const MAX_MIDDLE_LINES = 2000; // ponytail: LCS only on the changed middle; beyond this, emit a bounded -/+ block

export function unifiedDiff(oldText: string, newText: string): string {
  if (oldText === newText) return '';
  const lines = (text: string) => (text === '' ? [] : text.split(/\r?\n/));
  const a = lines(oldText);
  const b = lines(newText);
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  )
    suffix++;
  const oldMid = a.slice(prefix, a.length - suffix);
  const newMid = b.slice(prefix, b.length - suffix);
  const context = 3;
  const lead = Math.min(context, prefix);
  const tail = Math.min(context, suffix);
  const start = prefix - lead;
  let oldMidShown = oldMid;
  let newMidShown = newMid;
  let omitted = 0;
  let body: string[];
  if (oldMid.length > MAX_MIDDLE_LINES || newMid.length > MAX_MIDDLE_LINES) {
    // ponytail: bound the plain fallback so one huge rewrite cannot emit an unbounded patch.
    oldMidShown = oldMid.slice(0, MAX_MIDDLE_LINES);
    newMidShown = newMid.slice(0, MAX_MIDDLE_LINES);
    omitted = oldMid.length - oldMidShown.length + (newMid.length - newMidShown.length);
    body = [...oldMidShown.map((l) => `-${l}`), ...newMidShown.map((l) => `+${l}`)];
    if (omitted) body.push(`\\ ${omitted} lines omitted from this large change`);
  } else body = lcsDiff(oldMid, newMid);
  const head = a.slice(start, prefix);
  const foot = a.slice(a.length - tail);
  // Counts describe exactly the lines shown, so the header never overstates the block.
  const oldCount = head.length + oldMidShown.length + foot.length;
  const newCount = head.length + newMidShown.length + foot.length;
  return [
    `@@ -${start + 1},${oldCount} +${start + 1},${newCount} @@`,
    ...head.map((l) => ` ${l}`),
    ...body,
    ...foot.map((l) => ` ${l}`),
  ].join('\n');
}

function lcsDiff(a: string[], b: string[]): string[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push(` ${a[i]}`);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(`-${a[i++]}`);
    else out.push(`+${b[j++]}`);
  }
  while (i < n) out.push(`-${a[i++]}`);
  while (j < m) out.push(`+${b[j++]}`);
  return out;
}
