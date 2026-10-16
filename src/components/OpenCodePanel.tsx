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
  const active = useRef(true);
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
    request('/api/opencode/status')
      .then((raw) => {
        if (active.current) setConnection(agentConnectionSchema.parse(raw));
      })
      .catch((e) => {
        if (active.current) setError(e.message);
      });
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
    <div className="opencode-panel">
      <Cable size={25} />
      <h2>Follow your coding session.</h2>
      <p>
        Capture source before a task. Review the actual repository changes when OpenCode finishes.
      </p>
      {!root ? (
        <p>Open a local repository first.</p>
      ) : !sameRoot ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const next = agentConnectionSchema.parse(
                await request('/api/opencode/connect', { path: root, baseUrl, username, password }),
              );
              if (active.current) {
                setConnection(next);
                setPassword('');
              }
            });
          }}
        >
          {connection.connected && (
            <p>Another repository is connected. Connecting here replaces its in-memory baseline.</p>
          )}
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
          <button className="button primary" disabled={pending}>
            {pending ? <LoaderCircle size={14} className="spinning" /> : <Cable size={14} />}{' '}
            Connect OpenCode
          </button>
          <p>
            Start OpenCode yourself in this repository, using <code>opencode --port 4096</code>.
            ArchMap connects to its existing local HTTP server.
          </p>
        </form>
      ) : (
        <>
          <div className="agent-link-status">
            <span className="live-dot" /> Connected · {connection.baseUrl}
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
            className="text-button"
            disabled={pending}
            onClick={() => void act(refreshSessions)}
          >
            <RefreshCw size={13} /> Refresh sessions
          </button>
          {!sessions.length && (
            <p>No sessions in this repository yet. Create one in OpenCode, then refresh.</p>
          )}
          <button
            className="button primary"
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
            <section className="tracked-task" aria-label="Tracked coding task">
              <span className="change-status">
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
                className="small-button"
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
            className="text-button"
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
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <p className="opencode-disclosure">
        <ShieldCheck size={14} /> Read-only connection. No prompts, tools, or source are sent to
        OpenCode. Credentials and one baseline stay in server memory for up to an hour. Changes from
        other editors are included; session attribution is not proven.
      </p>
    </div>
  );
}
