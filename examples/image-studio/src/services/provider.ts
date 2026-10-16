// Deterministic stand-in. No external provider is called by this example.
export async function requestImage(prompt: string) {
  return new TextEncoder().encode(`Illustrative image for: ${prompt}`);
}
