import { useEffect, useRef, useState } from 'react';
import { Cable, GitCompareArrows, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import {
  agentConnectionSchema,
  codingSessionSchema,
  comparisonSchema,
  type AgentConnection,
  type CodingSession,
  type Comparison,
} from '../../shared/schema';
import { request } from '../lib/api';
import './OpenCodePanel.css';

export default function OpenCodePanel({
  root,
  focus,
  onReview,
  reviewedTurns,
}: {
  reviewedTurns: Set<string>;
  root: string;
  focus: string;
  onReview: (report: Comparison, title: string, request: string) => void;
}) {
  const [connection, setConnection] = useState<AgentConnection>({
    connected: false,
    tracking: null,
  });
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:4096');
  const [username, setUsername] = useState('opencode');
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState<CodingSession[]>([]);
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [autoFailed, setAutoFailed] = useState(false);
  const active = useRef(true);
  const autoTried = useRef(false);
  const onReviewRef = useRef(onReview);
  onReviewRef.current = onReview;
  const sameRoot = connection.connected && connection.root === root;
  const tracking = sameRoot ? connection.tracking : null;
  async function refreshSessions() {
    const next = z.array(codingSessionSchema).parse(await request('/api/opencode/sessions'));
    if (active.current) {
      setSessions(next);
      setSelected((id) => (next.some((s) => s.id === id) ? id : (next[0]?.id ?? '')));
    }
  }
  useEffect(() => {
    active.current = true;
    (async () => {
      let raw: AgentConnection;
      try {
        raw = agentConnectionSchema.parse(await request('/api/opencode/status'));
      } catch (e) {
        if (active.current) setError(e instanceof Error ? e.message : 'OpenCode status failed.');
        return;
      }
      if (!active.current) return;
      setConnection(raw);
      if (!root || (raw.connected && raw.root === root) || autoTried.current) return;
      autoTried.current = true;
      setDiscovering(true);
      try {
        const next = agentConnectionSchema.parse(
          await request('/api/opencode/auto', { path: root }),
        );
        if (active.current) {
          setConnection(next);
          setAutoFailed(false);
        }
      } catch {
        if (active.current) setAutoFailed(true);
      } finally {
        if (active.current) setDiscovering(false);
      }
    })();
    return () => {
      active.current = false;
    };
  }, [root]);
  useEffect(() => {
    if (sameRoot)
      void refreshSessions().catch((e) => {
        if (active.current) setError(e.message);
      });
  }, [sameRoot]);
  async function review(auto = false, state = connection) {
    if (pending && !auto) return;
    if (!auto) setPending(true);
    try {
      const report = comparisonSchema.parse(await request('/api/opencode/review', {}));
      if (active.current) {
        setError('');
        onReviewRef.current(
          report,
          state.tracking?.session.title ?? 'OpenCode session',
          state.tracking?.request ?? '',
        );
      }
    } catch (e) {
      if (active.current)
        setError(e instanceof Error ? e.message : 'Could not review this session.');
    } finally {
      if (!auto && active.current) setPending(false);
    }
  }
  useEffect(() => {
    if (!tracking) return;
    let cancelled = false,
      polling = false;
    async function poll() {
      if (cancelled || polling || document.visibilityState === 'hidden') return;
      polling = true;
      try {
        const next = agentConnectionSchema.parse(await request('/api/opencode/poll', {}));
        if (cancelled) return;
        setConnection(next);
        setError('');
        const turn = next.tracking;
        const key = turn ? `${turn.capturedAt}:${turn.turnId}` : '';
        if (turn?.state === 'ready' && !reviewedTurns.has(key)) {
          reviewedTurns.add(key);
          await review(true, next);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'OpenCode polling failed.');
      } finally {
        polling = false;
      }
    }
    const timer = window.setInterval(() => void poll(), 2500);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tracking?.capturedAt]);
  async function act(operation: () => Promise<void>) {
    setPending(true);
    setError('');
    try {
      await operation();
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : 'OpenCode operation failed.');
    } finally {
      if (active.current) setPending(false);
    }
  }
  return (
    <div className="wm-opencode-panel">
      <Cable size={25} />
      <h2>Follow your coding session.</h2>
      <p>
        Capture source before a task. Review the actual repository changes when OpenCode finishes.
      </p>
      {!root ? (
        <p>Open a local repository first.</p>
      ) : !sameRoot ? (
        <div className="wm-opencode-connect">
          {connection.connected && (
            <p>Another repository is connected. Connecting here replaces its in-memory baseline.</p>
          )}
          {discovering && (
            <p className="wm-opencode-discovering">
              <LoaderCircle size={14} className="spinning" /> Checking for a running OpenCode
              server…
            </p>
          )}
          {autoFailed && !discovering && (
            <p className="wm-subtle">No running OpenCode server found for this repository.</p>
          )}
          <button
            className="wm-button wm-primary"
            disabled={pending}
            onClick={() =>
              void act(async () => {
                const next = agentConnectionSchema.parse(
                  await request('/api/opencode/launch', { path: root }),
                );
                if (active.current) setConnection(next);
              })
            }
          >
            {pending ? <LoaderCircle size={14} className="spinning" /> : <Cable size={14} />}{' '}
            Connect OpenCode
          </button>
          <p className="wm-subtle">
            Starts <code>opencode serve</code> in this repository. Read-only; it never runs your
            repository's code. Prompts are sent only when you ask for a review.
          </p>
          <details className="wm-opencode-manual">
            <summary>Connect to a server you already started</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  const next = agentConnectionSchema.parse(
                    await request('/api/opencode/connect', {
                      path: root,
                      baseUrl,
                      username,
                      password,
                    }),
                  );
                  if (active.current) {
                    setConnection(next);
                    setPassword('');
                  }
                });
              }}
            >
              <label>
                Local OpenCode address
                <input
                  aria-label="OpenCode server address"
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </label>
              <details>
                <summary>Server authentication (optional)</summary>
                <label>
                  Username
                  <input
                    aria-label="OpenCode username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={100}
                  />
                </label>
                <label>
                  Password
                  <input
                    aria-label="OpenCode password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    maxLength={2000}
                  />
                </label>
              </details>
              <button className="wm-small-button" disabled={pending}>
                Connect to address
              </button>
            </form>
          </details>
        </div>
      ) : (
        <>
          <div className="wm-agent-link-status">
            <span className="wm-live-dot" /> Connected · {connection.baseUrl}
          </div>
          <label>
            Session
            <select
              aria-label="OpenCode session"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={pending}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <button
            className="wm-text-button"
            disabled={pending}
            onClick={() => void act(refreshSessions)}
          >
            <RefreshCw size={13} /> Refresh sessions
          </button>
          {!sessions.length && (
            <p>No sessions in this repository yet. Create one in OpenCode, then refresh.</p>
          )}
          <button
            className="wm-button wm-primary"
            disabled={pending || !selected}
            onClick={() =>
              void act(async () => {
                const next = agentConnectionSchema.parse(
                  await request('/api/opencode/track', { sessionId: selected, focus }),
                );
                if (active.current) {
                  setConnection(next);
                }
              })
            }
          >
            {pending ? (
              <LoaderCircle size={14} className="spinning" />
            ) : (
              <GitCompareArrows size={14} />
            )}
            {tracking ? 'Capture a new baseline' : 'Track next task'}
          </button>
          {tracking && (
            <section className="wm-tracked-task" aria-label="Tracked coding task">
              <span className="wm-change-status">
                {tracking.state === 'working'
                  ? 'SESSION WORKING'
                  : tracking.state === 'ready'
                    ? 'REVIEW READY'
                    : 'WAITING FOR NEXT TASK'}
              </span>
              <h3>{tracking.session.title}</h3>
              <p>
                Baseline captured {new Date(tracking.capturedAt).toLocaleTimeString()}. Includes
                existing uncommitted source.
              </p>
              {tracking.request && (
                <blockquote>
                  <span>Request reported by OpenCode</span>
                  {tracking.request}
                </blockquote>
              )}
              <button
                className="wm-small-button"
                disabled={pending || tracking.state === 'working'}
                onClick={() => void review()}
              >
                <GitCompareArrows size={14} /> Review changes since baseline
              </button>
              <p>
                Review opens automatically after observed activity returns to idle. Keep this panel
                open; switching away pauses polling.
              </p>
            </section>
          )}
          <button
            className="wm-text-button"
            disabled={pending}
            onClick={() =>
              void act(async () => {
                const next = agentConnectionSchema.parse(
                  await request('/api/opencode/disconnect', {}),
                );
                if (active.current) {
                  setConnection(next);
                  setSessions([]);
                }
              })
            }
          >
            Disconnect and clear baseline
          </button>
        </>
      )}
      {error && (
        <p className="wm-error-text" role="alert">
          {error}
        </p>
      )}
      <p className="wm-opencode-disclosure">
        <ShieldCheck size={14} /> Read-only connection: it never runs your repository. No prompts
        are sent until you ask for an agent review. Credentials and one baseline stay in server
        memory for up to an hour. Changes from other editors are included; session attribution is
        not proven.
      </p>
    </div>
  );
}
