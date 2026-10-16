import { createServer, type RequestListener } from 'node:http';

// Cookies are shared across localhost ports. Other development apps can leave
// more than Node's default 16 KiB here even though ArchMap uses no cookies.
// Keep a finite ceiling while tolerating a typical shared development profile.
export const MAX_HEADER_BYTES = 128 * 1024;

export function createLocalServer(listener: RequestListener) {
  return createServer({ maxHeaderSize: MAX_HEADER_BYTES }, listener);
}
