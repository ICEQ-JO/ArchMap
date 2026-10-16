import { z } from 'zod';
import path from 'node:path';
import { analyze, resolveRoot } from './analyzer.js';
import { addChangeEvidence, compareProjects } from './comparison.js';
import {
  agentConnectionSchema,
  codingSessionSchema,
  type AgentConnection,
  type CodingSession,
  type Project,
} from '../shared/schema.js';

const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/);
const sessionSchema = codingSessionSchema.extend({ id: idSchema });
const phaseSchema = z.record(z.string(), z.object({ type: z.enum(['idle', 'busy', 'retry']) }));
const messagesSchema = z
  .array(
    z.object({
      info: z.object({
        id: z.string().max(200),
        role: z.enum(['user', 'assistant']),
        parentID: z.string().optional(),
        time: z.object({ created: z.number(), completed: z.number().optional() }),
      }),
      parts: z.array(
        z.object({
          type: z.string(),
          text: z.string().optional(),
          synthetic: z.boolean().optional(),
        }),
      ),
    }),
  )
  .max(100);

type Connection = { baseUrl: string; root: string; authorization?: string; expires: number };
type Capture = { project: Project; files: Map<string, string> };
type Tracking = NonNullable<AgentConnection['tracking']> & {
  baseline: Capture;
  focus: string;
  initialTurn: string;
  active: boolean;
};

export function localOpenCodeUrl(input: string) {
  const url = new URL(input);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error(
      'Use a loopback HTTP origin, such as http://127.0.0.1:4096, without a path or embedded credentials.',
    );
  // Pin localhost to an IP instead of trusting DNS or following redirects.
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return url.origin;
}
async function readJson(
  connection: Connection,
  route: string,
  params: Record<string, string> = {},
) {
  const url = new URL(route, connection.baseUrl);
  url.searchParams.set('directory', connection.root);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: connection.authorization ? { Authorization: connection.authorization } : {},
    });
  } catch {
    throw new Error('Cannot reach OpenCode. Start its local server and check the address.');
  }
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'OpenCode authentication failed. Check its username and password.'
        : `OpenCode returned ${response.status}. Check that its HTTP API is available.`,
    );
  const reader = response.body?.getReader();
  if (!reader) throw new Error('OpenCode returned an empty response.');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024 * 1024)
        throw new Error('OpenCode response exceeded the 1 MB metadata limit.');
      chunks.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      throw new Error(
        'OpenCode returned unsupported JSON metadata. Check the server address and version.',
      );
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export class OpenCodeReview {
  private epoch = 0;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private connection: Connection | null = null;
  private tracking: Tracking | null = null;
  constructor(private allowedRoot: string) {}
  private current() {
    if (!this.connection || this.connection.expires < Date.now()) {
      this.disconnect();
      throw new Error(
        'Connect to OpenCode again. Connection and baseline data expire after one hour.',
      );
    }
    return this.connection;
  }
  private unchanged(connection: Connection) {
    if (this.connection !== connection)
      throw new Error('The OpenCode connection changed. Retry this operation.');
  }
  status(): AgentConnection {
    if (this.connection && this.connection.expires < Date.now()) this.disconnect();
    return agentConnectionSchema.parse({
      connected: Boolean(this.connection),
      baseUrl: this.connection?.baseUrl,
      root: this.connection?.root,
      tracking: this.tracking
        ? {
            session: this.tracking.session,
            capturedAt: this.tracking.capturedAt,
            expiresAt: this.tracking.expiresAt,
            state: this.tracking.state,
            request: this.tracking.request,
            turnId: this.tracking.turnId,
          }
        : null,
    });
  }
  disconnect() {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    this.epoch++;
    this.connection = null;
    this.tracking = null;
    return this.status();
  }
  async connect(input: { path: string; baseUrl: string; username: string; password: string }) {
    const epoch = ++this.epoch;
    const root = await resolveRoot(this.allowedRoot, input.path);
    const candidate: Connection = {
      baseUrl: localOpenCodeUrl(input.baseUrl),
      root,
      expires: Date.now() + 3600000,
      authorization: input.password
        ? `Basic ${Buffer.from(`${input.username}:${input.password}`).toString('base64')}`
        : undefined,
    };
    const remotePath = z
      .object({ directory: z.string() })
      .parse(await readJson(candidate, '/path'));
    if (!path.isAbsolute(remotePath.directory) || path.resolve(remotePath.directory) !== root)
      throw new Error('OpenCode must be scoped to the same repository folder as this map.');
    if (epoch !== this.epoch) throw new Error('The connection changed while connecting. Retry.');
    this.connection = candidate;
    this.tracking = null;
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => this.disconnect(), 3600000);
    this.expiryTimer.unref();
    return this.status();
  }
  async sessions(): Promise<CodingSession[]> {
    const connection = this.current();
    const sessions = z
      .array(sessionSchema)
      .max(500)
      .parse(await readJson(connection, '/session', { limit: '100' }));
    this.unchanged(connection);
    return sessions.filter(
      (s) => path.isAbsolute(s.directory) && path.resolve(s.directory) === connection.root,
    );
  }
  private async observation(connection: Connection, id: string) {
    const session = await readJson(connection, `/session/${id}`);
    const validSession = sessionSchema.parse(session);
    if (validSession.id !== id)
      throw new Error('OpenCode returned a different session. Refresh its session list.');
    if (
      !path.isAbsolute(validSession.directory) ||
      path.resolve(validSession.directory) !== connection.root
    )
      throw new Error('This OpenCode session belongs to a different repository.');
    const [phases, messages] = await Promise.all([
      readJson(connection, '/session/status'),
      readJson(connection, `/session/${id}/message`, { limit: '20' }),
    ]);
    const phase = phaseSchema.parse(phases)[id]?.type ?? 'idle';
    const parsed = messagesSchema.parse(messages);
    const user = parsed
      .filter((m) => m.info.role === 'user')
      .sort((a, b) => b.info.time.created - a.info.time.created)[0];
    return {
      session: validSession,
      phase,
      userId: user?.info.id ?? '',
      request:
        user?.parts
          .filter((p) => p.type === 'text' && !p.synthetic)
          .map((p) => p.text ?? '')
          .join('\n')
          .slice(0, 4000) ?? '',
      completed: Boolean(
        user &&
        parsed.some(
          (m) =>
            m.info.role === 'assistant' &&
            m.info.parentID === user.info.id &&
            m.info.time.completed,
        ),
      ),
    };
  }
  async track(id: string, focus = '') {
    idSchema.parse(id);
    const connection = this.current();
    const observation = await this.observation(connection, id);
    if (observation.phase !== 'idle')
      throw new Error(
        'Wait for this session to become idle, then capture a baseline before its next task.',
      );
    const files = new Map<string, string>();
    const project = await analyze(
      connection.root,
      'local',
      false,
      focus,
      undefined,
      true,
      (file, content) => files.set(file, content),
    );
    const after = await this.observation(connection, id);
    this.unchanged(connection);
    if (after.phase !== 'idle' || after.userId !== observation.userId)
      throw new Error(
        'The session started a task while the baseline was captured. Wait for idle and try again.',
      );
    this.tracking = {
      session: observation.session,
      capturedAt: project.analyzedAt,
      expiresAt: new Date(connection.expires).toISOString(),
      state: 'waiting',
      request: '',
      turnId: '',
      initialTurn: after.userId,
      active: false,
      baseline: { project, files },
      focus,
    };
    return this.status();
  }
  async poll() {
    const connection = this.current(),
      track = this.tracking;
    if (!track) return this.status();
    const observed = await this.observation(connection, track.session.id);
    this.unchanged(connection);
    if (this.tracking !== track) throw new Error('The tracked session changed.');
    if (observed.userId && observed.userId !== track.initialTurn) {
      if (observed.userId !== track.turnId && observed.phase === 'idle' && !observed.completed) {
        track.state = 'waiting';
        track.active = false;
      }
      track.turnId = observed.userId;
      track.request = observed.request;
    }
    if (observed.phase !== 'idle') {
      track.active = true;
      track.state = 'working';
    } else if (track.active || (track.turnId && observed.completed)) {
      track.state = 'ready';
      track.active = false;
    }
    return this.status();
  }
  async review() {
    const connection = this.current(),
      track = this.tracking;
    if (!track) throw new Error('Capture a session baseline first.');
    const observed = await this.observation(connection, track.session.id);
    if (observed.phase !== 'idle')
      throw new Error('The session is still working. Review after it becomes idle.');
    const files = new Map<string, string>();
    const current = await analyze(
      connection.root,
      'local',
      false,
      track.focus,
      undefined,
      true,
      (file, content) => files.set(file, content),
    );
    const after = await this.observation(connection, track.session.id);
    this.unchanged(connection);
    if (this.tracking !== track || after.phase !== 'idle' || after.userId !== observed.userId)
      throw new Error('The session changed during the scan. Wait for idle and refresh the review.');
    const report = addChangeEvidence(
      compareProjects(track.baseline.project, current, 'Working tree at tracking start'),
      track.baseline.files,
      files,
    );
    report.baseline.kind = 'working-tree';
    report.baseline.capturedAt = track.capturedAt;
    report.warnings.unshift(
      'Changes cover this repository since tracking began, including edits from other tools or people. They are not proven to be authored by this session. OpenCode metadata is context, not source or test evidence.',
    );
    return report;
  }
}
