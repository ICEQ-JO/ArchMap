export type Job = { userId: string; prompt: string };
export const pending: Job[] = [];
export function enqueue(job: Job) {
  pending.push(job);
  return { id: `job-${pending.length}`, status: 'pending' };
}
