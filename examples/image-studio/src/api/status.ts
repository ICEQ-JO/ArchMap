import { findGeneration } from '../services/database.js';
export function getGeneration(id: string) {
  return findGeneration(id);
}
