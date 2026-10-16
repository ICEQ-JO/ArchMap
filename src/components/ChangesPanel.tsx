import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MarkerType } from '@xyflow/react';
import { ArrowLeft, GitCompareArrows, LoaderCircle, X } from 'lucide-react';
import { comparisonSchema, type Comparison, type FileChange } from '../../shared/schema';
import { request } from '../lib/api';
import EvidenceCard from './EvidenceCard';
import { focusChanges } from '../../shared/change-focus';
import ArchitectureNode, { type ArchitectureFlowNode } from './ArchitectureNode';
import './ChangesPanel.css';

const nodeTypes = { architecture: ArchitectureNode };
export default function ChangesPanel({
  root,
  focus,
  onClose,
}: {
  root: string;
  focus: string;
  onClose: () => void;
}) {
  return (
    <ReactFlowProvider>
      <ChangesReview root={root} focus={focus} onClose={onClose} />
    </ReactFlowProvider>
  );
}
function ChangesReview({
  root,
  focus,
  onClose,
}: {
  root: string;
  focus: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const [ref, setRef] = useState('HEAD');
  const [report, setReport] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState(false);
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
            className: area ? `review-node review-${area.status}` : 'review-node review-unchanged',
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
            status === 'added' ? '#9acbba' : status === 'removed' ? '#e0a8a1' : '#999990';
          return {
            ...edge,
            label: status ? `${status}: ${edge.label}` : edge.label,
            markerEnd: { type: MarkerType.ArrowClosed, color },
            style: { stroke: color, strokeDasharray: status === 'removed' ? '6 4' : undefined },
            labelStyle: { fill: color, fontSize: 11 },
            labelBgStyle: { fill: '#20201e' },
          };
        }),
    [report, scoped, focused],
  );
  async function compare() {
    setBusy(true);
    setError('');
    try {
      const next = comparisonSchema.parse(
        await request('/api/compare', { path: root, ref, focus }),
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
  return (
    <dialog
      ref={dialog}
      className="changes-review"
      aria-label="Review architecture changes"
      onCancel={onClose}
    >
      <header className="changes-header">
        <div>
          <GitCompareArrows size={18} />
          <strong>Review changes</strong>
          <span>Read-only · your map stays intact</span>
        </div>
        <button
          autoFocus
          className="small-button"
          onClick={onClose}
          aria-label="Close change review"
        >
          <X size={15} /> Close
        </button>
      </header>
      <form
        className="changes-baseline"
        onSubmit={(e) => {
          e.preventDefault();
          void compare();
        }}
      >
        <label>
          Baseline revision
          <input
            aria-label="Baseline revision"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            required
            maxLength={200}
            placeholder="HEAD, main, or a commit"
          />
        </label>
        <span>→ working tree</span>
        <button className="small-button" disabled={busy}>
          {busy ? <LoaderCircle size={14} className="spinning" /> : <GitCompareArrows size={14} />}
          {busy ? 'Comparing…' : 'Compare changes'}
        </button>
        <small title={root}>
          {root}
          {focus ? ` · scan focus: ${focus}` : ''}
        </small>
      </form>
      {error && (
        <p role="alert" className="changes-error">
          {error}
        </p>
      )}
      {report ? (
        <>
          <div className="changes-summary" role="status">
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
              {report.baseline.revision.slice(0, 7)} → scanned{' '}
              {new Date(report.current.analyzedAt).toLocaleTimeString()}
            </small>
          </div>
          <div className="changes-content">
            <div className="changes-canvas">
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
                colorMode="dark"
              >
                <Background color="#383834" gap={24} />
                <Controls showInteractive={false} />
              </ReactFlow>
              <div className="changes-legend">
                <span>+ Added</span>
                <span>± Modified</span>
                <span>− Removed</span>
                <span>Unmarked: context</span>
              </div>
            </div>
            <aside className="changes-details" aria-label="Change evidence">
              <div className="changes-detail-scroll">
                {selected ? (
                  <>
                    <button className="changes-back" onClick={() => setSelectedFile(null)}>
                      <ArrowLeft size={13} /> All changes
                    </button>
                    <span className={`change-status status-${selected.status}`}>
                      {selected.status}
                    </span>
                    <h2>{selected.file}</h2>
                    <div className="changes-export-diff">
                      <span>Exports before: {selected.before?.exports.join(', ') || 'none'}</span>
                      <span>Exports after: {selected.after?.exports.join(', ') || 'none'}</span>
                    </div>
                    <p>
                      Source around the first changed line. Further changes may exist; these
                      excerpts are not a complete patch.
                    </p>
                    {(['before', 'after'] as const).map((side) => (
                      <section key={side} className="changes-source-side">
                        <h3>
                          {side === 'before'
                            ? `Before · ${report.baseline.revision.slice(0, 7)}`
                            : 'After · working tree'}
                        </h3>
                        {selected[side] ? (
                          <>
                            {(selected[side === 'before' ? 'beforeEvidence' : 'afterEvidence']
                              ? [selected[side === 'before' ? 'beforeEvidence' : 'afterEvidence']!]
                              : selected[side]!.evidence.slice(0, 2)
                            ).map((e) => (
                              <EvidenceCard key={e.id} evidence={e} />
                            ))}
                            {!selected[side]!.evidence.length &&
                              !selected[side === 'before' ? 'beforeEvidence' : 'afterEvidence'] && (
                                <p>No statement excerpts in this file.</p>
                              )}
                          </>
                        ) : (
                          <p>File absent on this side.</p>
                        )}
                      </section>
                    ))}
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
                      <button className="changes-back" onClick={() => setSelectedArea(null)}>
                        Clear area filter
                      </button>
                    )}
                    <label className="changes-filter">
                      Focus this review
                      <input
                        aria-label="Filter changed files"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="What changed in authentication?"
                      />
                    </label>
                    <section className="changes-brief" aria-label="Source change brief">
                      <span className="change-status">LOCAL SOURCE SUMMARY</span>
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
                          <div key={item.file} className="brief-item">
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
                    <div className="changes-file-list">
                      {files.map((file) => (
                        <button key={file.file} onClick={() => setSelectedFile(file.file)}>
                          <span className={`change-status status-${file.status}`}>
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
                            : 'No source changes found in the inspected scope.'}
                      </p>
                    )}
                    {report.dependencies.length > 0 && (
                      <section className="changes-dependencies">
                        <h3>Static dependencies</h3>
                        {(focused?.dependencies ?? []).map((d, i) => (
                          <details key={i}>
                            <summary>
                              <span className={`change-status status-${d.status}`}>{d.status}</span>
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
                <details className="changes-coverage" open={report.partial}>
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
      ) : (
        <div className="changes-start">
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
    </dialog>
  );
}
