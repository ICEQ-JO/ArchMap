export const objects = new Map<string, Uint8Array>();
export async function saveImage(bytes: Uint8Array) {
  const id = `image-${objects.size + 1}`;
  objects.set(id, bytes);
  return `/images/${id}`;
}
