import { authenticate } from '../services/auth.js';
import { reserveCredits } from '../services/credits.js';
import { enqueue } from '../services/queue.js';

export async function generateImage(token: string, prompt: string) {
  const user = authenticate(token);
  if (!prompt.trim()) throw new Error('A prompt is required.');
  reserveCredits(user.id, 1);
  return enqueue({ userId: user.id, prompt });
}
