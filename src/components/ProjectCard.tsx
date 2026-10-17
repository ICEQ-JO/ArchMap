import { useState, type MouseEvent } from 'react';
import { FolderGit2, Trash2, Clock, Layers, FileCode2, GitBranch } from 'lucide-react';
import type { Project } from '../../shared/schema';

export interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
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

export default function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

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
          <FolderGit2 size={18} />
        </div>
        <div className="wm-proj-meta">
          <span
            className={`wm-proj-badge ${project.mode === 'example' ? 'is-example' : 'is-local'}`}
          >
            {project.mode === 'example' ? 'EXAMPLE' : 'LOCAL'}
          </span>
          {project.revision && (
            <span className="wm-proj-rev">
              <GitBranch size={11} /> {project.revision.slice(0, 7)}
            </span>
          )}
        </div>
        <div className="wm-proj-actions">
          {!confirmDelete ? (
            <button
              className="wm-bare-icon wm-proj-del-btn"
              onClick={handleDeleteClick}
              title="Delete from saved projects"
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

      <h3 className="wm-proj-name">{project.name || 'Untitled map'}</h3>
      <p className="wm-proj-summary">
        {project.summary || `${project.nodes.length} components mapped from source code.`}
      </p>

      <div className="wm-proj-stats">
        <span title="Source files scanned">
          <FileCode2 size={13} /> {project.filesScanned} files
        </span>
        <span title="Components / areas">
          <Layers size={13} /> {project.nodes.length} components
        </span>
        <span title="Last analyzed">
          <Clock size={13} /> {formatRelativeTime(project.analyzedAt)}
        </span>
      </div>
    </div>
  );
}
