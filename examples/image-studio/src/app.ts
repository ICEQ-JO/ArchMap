import { generateImage } from './api/generate.js';
import { getGeneration } from './api/status.js';

// Illustrative application entry point. This fixture is analyzed, never executed.
export const routes = {
  'POST /api/generate': generateImage,
  'GET /api/generations/:id': getGeneration,
};
