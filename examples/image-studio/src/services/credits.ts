import { users } from './database.js';
export function reserveCredits(userId: string, amount: number) {
  const user = users.get(userId);
  if (!user || user.credits < amount) throw new Error('Insufficient credits.');
  user.credits -= amount;
}
