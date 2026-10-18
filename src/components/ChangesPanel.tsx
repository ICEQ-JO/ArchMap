import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MarkerType } from '@xyflow/react';
import { ArrowLeft, Bot, GitCompareArrows, LoaderCircle, X } from 'lucide-react';
import {
  comparisonSchema,
  refsSchema,
  type Comparison,
  type FileChange,
  type Refs,
} from '../../shared/schema';
import { request } from '../lib/api';
import EvidenceCard from './EvidenceCard';
import { focusChanges, summarizeChanges } from '../../shared/change-focus';
import ArchitectureNode, { type ArchitectureFlowNode } from './ArchitectureNode';
import './ChangesPanel.css';

const nodeTypes = { architecture: ArchitectureNode };
type ReviewProps = {
  embedded?: boolean;
  root: string;
  focus: string;
  onClose: () => void;
  initialReport?: Comparison;
  sessionTitle?: string;
  sessionRequest?: string;
  onRefresh?: () => Promise<Comparison>;
};
export default function ChangesPanel(props: ReviewProps) {
  return (
    <ReactFlowProvider>
      <ChangesReview {...props} />
    </ReactFlowProvider>
  );
}
function ChangesReview({
  embedded = false,
  root,
  focus,
  onClose,
  initialReport,
  sessionTitle,
  sessionRequest,
  onRefresh,
}: ReviewProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!embedded) dialog.current?.showModal();
  }, [embedded]);
  useEffect(() => {
    if (!embedded || initialReport || started.current) return;
    started.current = true;
    void compare();
    // ponytail: single mount-time diff for the embedded review; user refresh re-runs it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, initialReport]);
  useEffect(() => {
    if (sessionTitle || !root) return;
    let active = true;
    request<unknown>(`/api/refs?path=${encodeURIComponent(root)}`)
      .then((r) => active && setRefs(refsSchema.parse(r)))
      .catch(() => active && setRefs(null));
    return () => {
      active = false;
    };
  }, [root, sessionTitle]);
  const [ref, setRef] = useState('HEAD');
  const [compareRef, setCompareRef] = useState('');
  const [refs, setRefs] = useState<Refs | null>(null);
  const [report, setReport] = useState<Comparison | null>(initialReport ?? null);
  const [busy, setBusy] = useState(false);
  const [agentReview, setAgentReview] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const focused = useMemo(
    () => (report ? focusChanges(report, filter, selectedArea) : null),
    [report, filter, selectedArea],
  );
  const files = focused?.files ?? [];
  const scoped = Boolean(filter.trim() || selectedArea);
  const selected = report?.files.find((f) => f.file === selectedFile);
  const nodes = useMemo<ArchitectureFlowNode[]>(
    () =>
      (report?.graph.nodes ?? [])
        .filter((module) => !scoped || focused?.nodeIds.has(module.id))
        .map((module) => {
          const area = report?.areas.find((a) => a.id === module.id);
          return {
            id: module.id,
            type: 'architecture',
            position: module.position,
            selected: module.id === selectedArea,
            className: area
              ? `review-node wm-review-${area.status}`
              : 'review-node review-unchanged',
            data: {
              module: {
                ...module,
                label: area
                  ? `${area.status === 'added' ? '+ ' : area.status === 'removed' ? '− ' : '± '}${module.label}`
                  : module.label,
              },
              focused: module.id === selectedArea,
              dimmed: false,
            },
          };
        }),
    [report, selectedArea, focused, scoped],
  );
  const edges = useMemo(
    () =>
      (report?.graph.edges ?? [])
        .filter(
          (edge) =>
            !scoped || (focused?.nodeIds.has(edge.source) && focused?.nodeIds.has(edge.target)),
        )
        .map((edge) => {
          const status = report?.relationships.find((r) => r.id === edge.id)?.status;
          const color =
            status === 'added' ? '#4a7757' : status === 'removed' ? '#a54735' : '#77776e';
          return {
            ...edge,
            label: status ? `${status}: ${edge.label}` : edge.label,
            markerEnd: { type: MarkerType.ArrowClosed, color },
            style: { stroke: color, strokeDasharray: status === 'removed' ? '6 4' : undefined },
            labelStyle: { fill: color, fontSize: 11 },
            labelBgStyle: { fill: '#ffffff' },
          };
        }),
    [report, scoped, focused],
  );
  async function compare() {
    setBusy(true);
    setError('');
    try {
      const next = comparisonSchema.parse(
        onRefresh
          ? await onRefresh()
          : await request('/api/compare', {
              path: root,
              ref,
              focus,
              ...(compareRef ? { compare: compareRef } : {}),
            }),
      );
      setReport(next);
      setSelectedFile(null);
      setSelectedArea(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed.');
    } finally {
      setBusy(false);
    }
  }
  const counts = (status: FileChange['status']) =>
    report?.files.filter((f) => f.status === status).length ?? 0;
  async function askAgent() {
    setReviewing(true);
    setError('');
    try {
      const result = await request<{ sessionId: string; text: string }>(
        '/api/opencode/agent-review',
        { focus: filter.trim() || focus },
      );
      setAgentReview(result.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The agent review failed.');
    } finally {
      setReviewing(false);
    }
  }
  const content = (
    <>
      <header className="wm-changes-header">
        <div>
          <GitCompareArrows size={18} />
          <strong>Review changes</strong>
          <span>Read-only · your working tree is untouched</span>
        </div>
        {!embedded && (
          <button
            autoFocus
            className="wm-small-button"
            onClick={onClose}
            aria-label="Close change review"
          >
            <X size={15} /> Close
          </button>
        )}
      </header>
      {sessionTitle ? (
        <div className="wm-session-review-context">
          <strong>{sessionTitle}</strong>
          <p>
            Working-tree baseline captured{' '}
            {report?.baseline.capturedAt
              ? new Date(report.baseline.capturedAt).toLocaleString()
              : 'at tracking start'}
            . Includes edits from all tools.
          </p>
          {sessionRequest && (
            <details>
              <summary>Request reported by OpenCode</summary>
              <p>{sessionRequest}</p>
            </details>
          )}
          <button className="wm-small-button" disabled={busy} onClick={() => void compare()}>
            {busy ? 'Refreshing…' : 'Refresh session review'}
          </button>
        </div>
      ) : (
        <form
          className="wm-changes-baseline"
          onSubmit={(e) => {
            e.preventDefault();
            void compare();
          }}
        >
          <datalist id="wm-review-refs">
            {refs?.refs.map((r) => (
              <option key={`${r.kind}:${r.name}`} value={r.name}>
                {r.kind}
              </option>
            ))}
            {refs?.recent.map((c) => (
              <option key={c.sha} value={c.sha}>
                {`${c.date} ${c.subject}`.slice(0, 80)}
              </option>
            ))}
          </datalist>
          <label>
            Base
            <input
              aria-label="Baseline revision"
              list="wm-review-refs"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              required
              maxLength={200}
              placeholder="HEAD, a branch, tag or commit"
            />
          </label>
          <span>→</span>
          <label>
            Compare
            <input
              aria-label="Compare revision"
              list="wm-review-refs"
              value={compareRef}
              onChange={(e) => setCompareRef(e.target.value)}
              maxLength={200}
              placeholder="working tree"
            />
          </label>
          <button className="wm-small-button" disabled={busy}>
            {busy ? (
              <LoaderCircle size={14} className="spinning" />
            ) : (
              <GitCompareArrows size={14} />
            )}
            {busy ? 'Comparing…' : 'Compare changes'}
          </button>
          <small title={root}>
            {refs
              ? `${refs.branch ?? 'detached HEAD'}${refs.dirty ? ' · uncommitted changes' : ' · clean'}${
                  focus ? ` · focus: ${focus}` : ''
                }`
              : root}
          </small>
        </form>
      )}
      {error && (
        <p role="alert" className="wm-changes-error">
          {error}
        </p>
      )}
      {report ? (
        <>
          <div
            className={`wm-review-verdict${report.partial ? ' wm-is-partial' : ''}`}
            role="status"
          >
            <strong>{summarizeChanges(report).text}</strong>
            {report.partial && (
              <span>Coverage is incomplete; absence-based claims are withheld.</span>
            )}
          </div>
          <section className="wm-review-agent" aria-label="Agent review">
            <div className="wm-review-agent-head">
              <span>
                <Bot size={15} /> Agent review
              </span>
              <small>
                OpenCode argues about this change. Evidence only; it never runs your code.
              </small>
            </div>
            <button
              className="wm-small-button"
              disabled={reviewing || busy}
              onClick={() => void askAgent()}
            >
              {reviewing ? <LoaderCircle size={14} className="spinning" /> : <Bot size={14} />}
              {reviewing ? 'OpenCode is reviewing…' : 'Ask OpenCode to review'}
            </button>
            <details className="wm-review-rules">
              <summary>ArchMap review rules</summary>
              <p>
                Cite file and line from the diff; treats static imports as dependencies, not runtime
                order; read-only (no edits, no test runs); judges error paths, test coverage and
                security; says “unknown” instead of guessing.
              </p>
            </details>
            {reviewing && (
              <p className="wm-review-agent-wait" role="status">
                Sending the change to your configured model. This can take a minute; it costs one
                model call.
              </p>
            )}
            {agentReview && <pre className="wm-review-agent-text">{agentReview}</pre>}
          </section>
          <div className="wm-changes-summary" role="status">
            <span>
              <b>{counts('added')}</b> added
            </span>
            <span>
              <b>{counts('modified')}</b> modified
            </span>
            <span>
              <b>{counts('removed')}</b> removed
            </span>
            <span>{report.dependencies.length} dependency changes</span>
            <small>
              {report.baseline.kind === 'working-tree'
                ? 'Tracking start'
                : report.baseline.revision.slice(0, 7)}{' '}
              → scanned {new Date(report.current.analyzedAt).toLocaleTimeString()}
            </small>
          </div>
          <div className="wm-changes-content">
            <div className="wm-changes-canvas">
              <ReactFlow
                key={report.current.analyzedAt + filter + (selectedArea ?? '')}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                deleteKeyCode={null}
                onNodeClick={(_, node) => {
                  setSelectedArea(node.id);
                  setSelectedFile(null);
                }}
                fitView
                fitViewOptions={{ padding: 0.25, maxZoom: 0.9 }}
                minZoom={0.08}
                colorMode="light"
              >
                <Background color="#deded8" gap={24} />
                <Controls showInteractive={false} />
              </ReactFlow>
              <div className="wm-changes-legend">
                <span>+ Added</span>
                <span>± Modified</span>
                <span>− Removed</span>
                <span>Unmarked: context</span>
              </div>
            </div>
            <aside className="wm-changes-details" aria-label="Change evidence">
              <div className="wm-changes-detail-scroll">
                {selected ? (
                  <>
                    <button className="wm-changes-back" onClick={() => setSelectedFile(null)}>
                      <ArrowLeft size={13} /> All changes
                    </button>
                    <span className={`wm-change-status wm-status-${selected.status}`}>
                      {selected.status}
                    </span>
                    <h2>{selected.file}</h2>
                    <div className="wm-changes-export-diff">
                      <span>Exports before: {selected.before?.exports.join(', ') || 'none'}</span>
                      <span>Exports after: {selected.after?.exports.join(', ') || 'none'}</span>
                    </div>
                    {selected.patch ? (
                      <div className="wm-changes-diff" aria-label="Unified diff">
                        {selected.patch.split('\n').map((line, index) => {
                          const kind = line.startsWith('@@')
                            ? 'hunk'
                            : line.startsWith('+')
                              ? 'add'
                              : line.startsWith('-')
                                ? 'del'
                                : 'ctx';
                          return (
                            <div key={index} className={`wm-diff-line wm-diff-${kind}`}>
                              {line || ' '}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p>No line-level changes recorded for this file in the inspected scope.</p>
                    )}
                  </>
                ) : (
                  <>
                    <h2>
                      {selectedArea
                        ? (report.areas.find((a) => a.id === selectedArea)?.label ??
                          'Unchanged area')
                        : 'What changed?'}
                    </h2>
                    <p>
                      Responsibility boundaries are inferred. Select a file to inspect
                      before-and-after source.
                    </p>
                    {selectedArea && (
                      <button className="wm-changes-back" onClick={() => setSelectedArea(null)}>
                        Clear area filter
                      </button>
                    )}
                    <label className="wm-changes-filter">
                      Focus this review
                      <input
                        aria-label="Filter changed files"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="What changed in authentication?"
                      />
                    </label>
                    <section className="wm-changes-brief" aria-label="Source change brief">
                      <span className="wm-change-status">LOCAL SOURCE SUMMARY</span>
                      <h3>
                        {files.length} matching {files.length === 1 ? 'file' : 'files'} ·{' '}
                        {focused?.dependencies.length ?? 0} dependency changes
                      </h3>
                      <p>
                        Matched by paths, exports, responsibility names, and changed dependency
                        references. The graph includes direct neighbors as context.
                      </p>
                      <details>
                        <summary>Read change brief</summary>
                        {focused?.brief.map((item, index) => (
                          <div key={item.file} className="wm-brief-item">
                            <button
                              onClick={() => setSelectedFile(item.file)}
                              aria-label={`Inspect change evidence for ${item.file}`}
                            >
                              [{index + 1}] {item.file}
                            </button>
                            <p>{item.text}</p>
                          </div>
                        ))}
                        {!files.length && (
                          <p>
                            No matching changes in this inspected scope. Try another feature or
                            clear the filters.
                          </p>
                        )}
                        {!!focused?.contextFiles.length && (
                          <p>
                            Related files in changed dependencies: {focused.contextFiles.join(', ')}
                            .
                          </p>
                        )}
                        <p>
                          {report.partial
                            ? 'Coverage is incomplete; absence-based claims are withheld.'
                            : 'Static source facts only. No runtime behavior or test results have been verified.'}
                        </p>
                      </details>
                    </section>
                    <div className="wm-changes-file-list">
                      {files.map((file) => (
                        <button key={file.file} onClick={() => setSelectedFile(file.file)}>
                          <span className={`wm-change-status wm-status-${file.status}`}>
                            {file.status}
                          </span>
                          <span>{file.file}</span>
                        </button>
                      ))}
                    </div>
                    {!files.length && (
                      <p className="changes-empty">
                        {report.files.length
                          ? 'No changed files match this filter.'
                          : report.partial
                            ? 'No modifications found in files inspected on both sides. Coverage is incomplete.'
                            : `No source changes between ${report.baseline.kind === 'working-tree' ? 'tracking start' : report.baseline.revision.slice(0, 7)} and ${report.baseline.kind === 'working-tree' ? 'your working tree' : 'the compared ref'}. Pick another base or compare ref above.`}
                      </p>
                    )}
                    {report.dependencies.length > 0 && (
                      <section className="wm-changes-dependencies">
                        <h3>Static dependencies</h3>
                        {(focused?.dependencies ?? []).map((d, i) => (
                          <details key={i}>
                            <summary>
                              <span className={`wm-change-status wm-status-${d.status}`}>
                                {d.status}
                              </span>
                              {d.source} → {d.target}
                            </summary>
                            <p>
                              {d.label} ·{' '}
                              {d.status === 'removed' ? 'Baseline source' : 'Working-tree source'}
                            </p>
                            <EvidenceCard evidence={d.evidence} />
                          </details>
                        ))}
                      </section>
                    )}
                  </>
                )}
                <details className="wm-changes-coverage" open={report.partial}>
                  <summary>
                    {report.partial
                      ? 'Incomplete coverage — read before reviewing'
                      : 'Scope & limitations'}
                  </summary>
                  <p>
                    Baseline: {report.baseline.filesScanned} files · working tree:{' '}
                    {report.current.filesScanned} files.
                  </p>
                  {report.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </details>
              </div>
            </aside>
          </div>
        </>
      ) : embedded && busy ? (
        <div className="wm-changes-start">
          <LoaderCircle size={30} className="spinning" />
          <h2>Comparing your working tree…</h2>
          <p>Reading source on disk against the baseline. This never runs your code.</p>
        </div>
      ) : (
        <div className="wm-changes-start">
          <GitCompareArrows size={30} />
          <h2>Understand the change.</h2>
          <p>
            Compare a local commit with source on disk. See affected responsibilities, dependencies,
            and the code behind them.
          </p>
          <p>
            HEAD includes staged, unstaged, and untracked source changes. Other languages and
            non-source configuration changes are outside this review.
          </p>
        </div>
      )}
    </>
  );
  return embedded ? (
    <section className="wm-changes-review wm-is-embedded" aria-label="Review architecture changes">
      {content}
    </section>
  ) : (
    <dialog
      ref={dialog}
      className="wm-changes-review"
      aria-label="Review architecture changes"
      onCancel={onClose}
    >
      {content}
    </dialog>
  );
}
