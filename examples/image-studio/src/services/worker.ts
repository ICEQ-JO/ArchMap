import { pending } from './queue.js';
import { requestImage } from './provider.js';
import { saveImage } from './storage.js';
import { saveGeneration } from './database.js';

export async function processNextJob() {
  const job = pending.shift();
  if (!job) return;
  const image = await requestImage(job.prompt);
  const url = await saveImage(image);
  return saveGeneration({ userId: job.userId, url, status: 'complete' });
}
