import { projectSchema, type Answer, type Project } from '../../shared/schema';
export async function request<T>(url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Cannot reach the local ArchMap server. Start it with npm run dev, then retry.',
    );
  }
  const data = await response.json().catch(() => ({
    error: 'The local server returned an unexpected response. Restart ArchMap and try again.',
  }));
  if (!response.ok) throw new Error(data.error || 'Request failed. Try again.');
  return data;
}
export async function loadProject(example: boolean, path = '.', focus = '') {
  return projectSchema.parse(
    await request(
      example ? '/api/example?view=architecture' : '/api/analyze',
      example ? undefined : { path, view: 'architecture', focus },
    ),
  );
}
export const ask = (project: Project, question: string, selectedId?: string) =>
  request<Answer>('/api/explain', { projectId: project.id, question, selectedId });
export const getStatus = () =>
  request<{ root: string; ai: boolean; model: string | null }>('/api/status');
