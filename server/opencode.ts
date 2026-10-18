import { z } from 'zod';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { analyze, resolveRoot } from './analyzer.js';
import { addChangeEvidence, compareProjects, compareRevisions } from './comparison.js';
import { REVIEW_SYSTEM, buildReviewPrompt } from './review-rules.js';
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
function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => (port ? resolve(port) : reject(new Error('No free local port.'))));
    });
  });
}
// `opencode serve` prints "opencode server listening on http://127.0.0.1:<port>"
// once ready, so the port does not have to be guessed.
function waitForOpenCodeUrl(child: ChildProcess, timeoutMs: number) {
  return new Promise<number>((resolve, reject) => {
    let buffer = '';
    const finish = (error: Error | null, port = 0) => {
      clearTimeout(timer);
      child.stdout?.off('data', onData);
      child.off('exit', onExit);
      child.off('error', onError);
      if (error) reject(error);
      else resolve(port);
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      const match = buffer.match(/https?:\/\/127\.0\.0\.1:(\d+)/);
      if (match) finish(null, Number(match[1]));
    };
    const onExit = (code: number | null) =>
      finish(new Error(`OpenCode exited before it was ready (code ${code ?? 'null'}).`));
    const onError = (error: Error) =>
      finish(new Error(`Could not start OpenCode: ${error.message}`));
    const timer = setTimeout(
      () => finish(new Error('OpenCode did not start within 25 seconds.')),
      timeoutMs,
    );
    child.stdout?.on('data', onData);
    child.once('exit', onExit);
    child.once('error', onError);
  });
}
export function openCodeCandidates() {
  const urls: string[] = [];
  const env = process.env.ARCHMAP_OPENCODE_URL || process.env.OPENCODE_URL;
  if (env) {
    try {
      urls.push(localOpenCodeUrl(env));
    } catch {
      // Ignore a malformed env override and fall back to the default ports.
    }
  }
  const port = Number(process.env.OPENCODE_PORT || process.env.ARCHMAP_OPENCODE_PORT);
  if (Number.isInteger(port) && port > 0 && port < 65536) urls.push(`http://127.0.0.1:${port}`);
  for (const p of [4096, 4097, 4098, 4099, 4100, 4095]) urls.push(`http://127.0.0.1:${p}`);
  return [...new Set(urls)];
}
async function readJson(
  connection: Connection,
  route: string,
  params: Record<string, string> = {},
  timeoutMs = 8000,
  init?: { method: string; body: unknown; timeoutMs?: number },
) {
  const url = new URL(route, connection.baseUrl);
  // Stay in the server's existing project. A directory override could initialize
  // another OpenCode instance (and its project plugins) before scope is verified.
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(init?.timeoutMs ?? timeoutMs),
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(connection.authorization ? { Authorization: connection.authorization } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
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
  private launched: ChildProcess | null = null;
  private launching: Promise<AgentConnection> | null = null;
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
    this.killLaunched();
    return this.status();
  }
  private killLaunched() {
    if (this.launched) {
      this.launched.kill('SIGTERM');
      this.launched = null;
    }
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
  // Find a local OpenCode server already scoped to this repository, so the
  // common case needs no address or credentials in the UI.
  async autoConnect(input: { path: string }) {
    const epoch = ++this.epoch;
    const root = await resolveRoot(this.allowedRoot, input.path);
    const probe = async (baseUrl: string) => {
      const connection: Connection = { baseUrl, root, expires: Date.now() + 3600000 };
      try {
        const remotePath = z
          .object({ directory: z.string() })
          .parse(await readJson(connection, '/path', {}, 700));
        return path.isAbsolute(remotePath.directory) && path.resolve(remotePath.directory) === root
          ? connection
          : null;
      } catch {
        return null;
      }
    };
    const found = (await Promise.all(openCodeCandidates().map(probe))).find(Boolean) ?? null;
    if (!found)
      throw new Error(
        'No local OpenCode server found for this repository. Start it with `opencode --port 4096` here, or enter an address.',
      );
    if (epoch !== this.epoch) throw new Error('The connection changed while connecting. Retry.');
    this.connection = found;
    this.tracking = null;
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => this.disconnect(), 3600000);
    this.expiryTimer.unref();
    return this.status();
  }
  // Launch a local OpenCode server scoped to this repository and connect to it,
  // so connecting needs no address or credentials. This starts the OpenCode dev
  // tool (loopback only); it never executes the analyzed repository's own code.
  async launch(input: { path: string }): Promise<AgentConnection> {
    const root = await resolveRoot(this.allowedRoot, input.path);
    if (this.connection?.root === root) return this.status();
    if (!this.launching)
      this.launching = this.startLaunched(root).finally(() => {
        this.launching = null;
      });
    return this.launching;
  }
  private async startLaunched(root: string): Promise<AgentConnection> {
    this.killLaunched();
    const port = await freePort();
    const child = spawn(
      process.env.OPENCODE_BIN || 'opencode',
      ['serve', '--port', String(port), '--hostname', '127.0.0.1'],
      { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
    );
    try {
      const ready = await waitForOpenCodeUrl(child, 25000);
      const candidate: Connection = {
        baseUrl: `http://127.0.0.1:${ready}`,
        root,
        expires: Date.now() + 3600000,
      };
      const remotePath = z
        .object({ directory: z.string() })
        .parse(await readJson(candidate, '/path'));
      if (!path.isAbsolute(remotePath.directory) || path.resolve(remotePath.directory) !== root)
        throw new Error('OpenCode started in a different folder than this repository.');
      this.launched = child;
      child.once('exit', () => {
        if (this.launched === child) this.launched = null;
      });
      this.epoch++;
      this.connection = candidate;
      this.tracking = null;
      if (this.expiryTimer) clearTimeout(this.expiryTimer);
      this.expiryTimer = setTimeout(() => this.disconnect(), 3600000);
      this.expiryTimer.unref();
      return this.status();
    } catch (error) {
      child.kill('SIGTERM');
      throw error;
    }
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
  // Ask the connected agent to argue about the change. Explicit user action only:
  // this sends the diff to the user's own model and never runs repository code.
  async agentReview(focus = '', model = process.env.ARCHMAP_OPENCODE_MODEL ?? '') {
    const connection = this.current();
    const report = this.tracking
      ? await this.review()
      : await compareRevisions(connection.root, 'HEAD', focus);
    const diff = report.files
      .map((file) =>
        [`### ${file.file} (${file.status})`, file.patch ?? 'No line-level diff recorded.'].join(
          '\n',
        ),
      )
      .join('\n\n');
    const prompt = buildReviewPrompt(
      {
        files: report.files.map((file) => file.file),
        dependencies: report.dependencies.length,
        partial: report.partial,
        focus,
      },
      diff,
    );
    const created = z.object({ id: idSchema }).parse(
      await readJson(connection, '/session', {}, 8000, {
        method: 'POST',
        body: { title: 'ArchMap review' },
        timeoutMs: 15000,
      }),
    );
    // Leave the model unset to use OpenCode's own default.
    const selected = model.trim();
    const slash = selected.indexOf('/');
    const chosen =
      slash > 0
        ? { providerID: selected.slice(0, slash), modelID: selected.slice(slash + 1) }
        : null;
    const reply = await readJson(connection, `/session/${created.id}/message`, {}, 0, {
      method: 'POST',
      // Read-only review: disable every tool that could change or run the repo.
      body: {
        system: REVIEW_SYSTEM,
        tools: { edit: false, write: false, patch: false, bash: false },
        ...(chosen ? { model: chosen } : {}),
        parts: [{ type: 'text', text: prompt }],
      },
      timeoutMs: 180000,
    });
    this.unchanged(connection);
    return { sessionId: created.id, text: assistantText(reply) };
  }
}

function assistantText(message: unknown) {
  const parsed = z
    .object({
      parts: z.array(z.object({ type: z.string(), text: z.string().optional() })).max(200),
    })
    .parse(message);
  const text = parsed.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text!.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
  if (!text) throw new Error('The agent returned no review text. Try again or check its model.');
  return text.slice(0, 20000);
}
