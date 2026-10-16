export function authenticate(token: string) {
  if (!token) throw new Error('Authentication required.');
  return { id: 'example-user' };
}
