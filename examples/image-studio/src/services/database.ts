export const users = new Map([['example-user', { credits: 10 }]]);
const generations: Record<string, unknown> = {};
export function saveGeneration(value: unknown) {
  const id = `generation-${Object.keys(generations).length + 1}`;
  generations[id] = value;
  return { id, ...value as object };
}
export function findGeneration(id: string) {
  return generations[id] ?? null;
}
