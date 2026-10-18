import { useState, type MouseEvent } from 'react';
import {
  FolderGit2,
  Trash2,
  Clock,
  Layers,
  FileCode2,
  GitBranch,
  Network,
  Play,
  GitCompareArrows,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Project } from '../../shared/schema';
import { downloadProject } from '../lib/graph';

export interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onOpenFlows?: (project: Project) => void;
  onOpenChanges?: (project: Project) => void;
  onDelete: (id: string) => void;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'recently';
  try {
    const ms = Date.now() - new Date(dateString).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'recently';
  }
}

export default function ProjectCard({
  project,
  onOpen,
  onOpenFlows,
  onOpenChanges,
  onDelete,
}: ProjectCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleConfirm = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(project.id);
  };

  const handleCancel = (e: MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  const handleCopyPath = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!project.root) return;
    try {
      await navigator.clipboard.writeText(project.root);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleExport = (e: MouseEvent) => {
    e.stopPropagation();
    downloadProject(project);
  };

  // Calculate composition breakdown
  const kindCounts = project.nodes.reduce(
    (acc, node) => {
      acc[node.kind] = (acc[node.kind] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const observedEdges = project.edges.filter((e) => e.origin === 'observed').length;
  const isSparse = project.edges.length < project.nodes.length / 2 && project.nodes.length > 2;
  const isPartial = project.warnings.some((w) => w.toLowerCase().includes('limit'));
  const hasFlows = Boolean(project.flows && project.flows.length > 0);
  const isLocalRepo = project.mode === 'local' && Boolean(project.root);

  return (
    <div
      className="wm-proj-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(project);
        }
      }}
      aria-label={`Open project ${project.name}`}
    >
      <div className="wm-proj-card-top">
        <div className="wm-proj-avatar">
          {project.mode === 'example' ? (
            <Sparkles size={18} />
          ) : project.root ? (
            <FolderGit2 size={18} />
          ) : (
            <Layers size={18} />
          )}
        </div>
        <div className="wm-proj-meta">
          <span
            className={`wm-proj-badge ${project.mode === 'example' ? 'is-example' : project.root ? 'is-local' : 'is-sketch'}`}
          >
            {project.mode === 'example' ? 'EXAMPLE STUDIO' : project.root ? 'LOCAL REPO' : 'SKETCH'}
          </span>
          {project.revision && (
            <span className="wm-proj-rev" title={`Git revision ${project.revision}`}>
              <GitBranch size={11} /> {project.revision.slice(0, 7)}
            </span>
          )}
          {isPartial && <span className="wm-proj-tag is-warning">BOUNDED SCAN</span>}
          {isSparse && !isPartial && <span className="wm-proj-tag is-sparse">SPARSE</span>}
        </div>
        <div className="wm-proj-actions">
          {!confirmDelete ? (
            <button
              className="wm-bare-icon wm-proj-del-btn"
              onClick={handleDeleteClick}
              title="Delete from saved maps"
              aria-label="Delete project"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <div className="wm-proj-confirm-box" onClick={(e) => e.stopPropagation()}>
              <span>Delete?</span>
              <button
                className="wm-proj-confirm-yes"
                onClick={handleConfirm}
                type="button"
                aria-label="Confirm delete"
              >
                Yes
              </button>
              <button
                className="wm-proj-confirm-no"
                onClick={handleCancel}
                type="button"
                aria-label="Cancel delete"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="wm-proj-main-info">
        <h3 className="wm-proj-name">{project.name || 'Untitled architecture map'}</h3>
        {project.root && (
          <div className="wm-proj-path-row">
            <code className="wm-proj-root-path" title={project.root}>
              {project.root}
            </code>
            <button
              className="wm-proj-copy-btn"
              onClick={handleCopyPath}
              title={copied ? 'Copied path!' : 'Copy repository path'}
              type="button"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
        )}
      </div>

      <p className="wm-proj-summary">
        {project.summary ||
          (project.level === 'modules'
            ? `Source-file graph covering ${project.nodes.length} files.`
            : `${project.nodes.length} inferred responsibility areas across ${project.filesScanned} source files.`)}
      </p>

      {/* Composition Bar */}
      {project.nodes.length > 0 && (
        <div className="wm-proj-composition-bar" title="Architecture composition breakdown">
          {kindCounts['entry'] ? (
            <span
              className="wm-comp-segment is-entry"
              style={{ flex: kindCounts['entry'] }}
              title={`Entrypoints: ${kindCounts['entry']}`}
            />
          ) : null}
          {kindCounts['service'] ? (
            <span
              className="wm-comp-segment is-service"
              style={{ flex: kindCounts['service'] }}
              title={`Services: ${kindCounts['service']}`}
            />
          ) : null}
          {kindCounts['data'] ? (
            <span
              className="wm-comp-segment is-data"
              style={{ flex: kindCounts['data'] }}
              title={`Data & Storage: ${kindCounts['data']}`}
            />
          ) : null}
          {kindCounts['ui'] ? (
            <span
              className="wm-comp-segment is-ui"
              style={{ flex: kindCounts['ui'] }}
              title={`UI Components: ${kindCounts['ui']}`}
            />
          ) : null}
          {kindCounts['module'] ? (
            <span
              className="wm-comp-segment is-module"
              style={{ flex: kindCounts['module'] }}
              title={`Modules: ${kindCounts['module']}`}
            />
          ) : null}
        </div>
      )}

      {/* Numerical Metrics */}
      <div className="wm-proj-stats">
        <span title="Source files inspected">
          <FileCode2 size={13} /> {project.filesScanned} files
        </span>
        <span title="Architecture responsibility areas">
          <Layers size={13} /> {project.nodes.length} components
        </span>
        <span title="Observed static import connections">
          <Network size={13} /> {observedEdges} connections
        </span>
        {hasFlows && (
          <span title="Guided feature execution flows" className="wm-proj-flow-badge">
            <Play size={11} /> {project.flows?.length} flows
          </span>
        )}
        <span title="Analyzed timestamp" className="wm-proj-time">
          <Clock size={13} /> {formatRelativeTime(project.analyzedAt)}
        </span>
      </div>

      {/* Card Action Strip */}
      <div className="wm-proj-footer-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="wm-card-action-btn is-primary"
          onClick={() => onOpen(project)}
          type="button"
          title="Open architecture workbench"
        >
          <Network size={13} />
          <span>Open map</span>
        </button>

        {hasFlows && onOpenFlows && (
          <button
            className="wm-card-action-btn"
            onClick={() => onOpenFlows(project)}
            type="button"
            title="Inspect guided call-site flows"
          >
            <Play size={12} />
            <span>Flows</span>
          </button>
        )}

        {isLocalRepo && onOpenChanges && (
          <button
            className="wm-card-action-btn"
            onClick={() => onOpenChanges(project)}
            type="button"
            title="Review Git architecture diffs"
          >
            <GitCompareArrows size={13} />
            <span>Changes</span>
          </button>
        )}

        <button
          className="wm-card-action-btn"
          onClick={handleExport}
          type="button"
          title="Download portable .archmap.json"
        >
          <Download size={13} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}
