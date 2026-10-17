import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  FolderOpen,
  LoaderCircle,
  Network,
  Plus,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { Mark } from './Brand';
import type { ServerStatus } from './ModelSettings';

export interface ProjectSetupProps {
  status: ServerStatus | null;
  loading: boolean;
  error: string;
  hasProject: boolean;
  onOpen: (path: string, focus: string) => void;
  onExample: () => void;
  onImport: () => void;
  onSketch: () => void;
  onClose: () => void;
}

export default function ProjectSetup({
  status,
  loading,
  error,
  hasProject,
  onOpen,
  onExample,
  onImport,
  onSketch,
  onClose,
}: ProjectSetupProps) {
  const [path, setPath] = useState('.');
  const [focus, setFocus] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onOpen(path, focus);
  };

  return (
    <main className="wm-open-page">
      <div className="wm-open-screen">
        <div className="wm-open-screen-heading">
          <span className="open-screen-mark">
            <Mark size={35} />
          </span>
          {hasProject && (
            <button
              className="wm-bare-icon"
              onClick={onClose}
              aria-label="Return to current map"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <h1>Find your way in.</h1>
        <p>Open a repository. Turn its source into a map you can follow.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="repo-path">Repository folder</label>
          <div className="wm-path-input">
            <FolderOpen size={17} />
            <input
              id="repo-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="./my-project"
              required
              maxLength={2000}
            />
          </div>
          <p className="wm-root-hint">
            {status ? (
              <>
                Relative to <code>{status.root}</code>. Set <code>ARCHMAP_ROOT</code> to open a
                different parent folder.
              </>
            ) : (
              'Connecting to the local repository service…'
            )}
          </p>
          <label className="wm-source-focus-label" htmlFor="source-focus">
            Feature focus <span>(optional)</span>
          </label>
          <input
            className="wm-source-focus-input"
            id="source-focus"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            maxLength={500}
            placeholder="e.g. auth, checkout, image generation"
          />
          <button className="wm-button wm-primary" disabled={loading} type="submit">
            {loading ? (
              <>
                <LoaderCircle className="spinning" size={16} /> Analyzing source…
              </>
            ) : (
              <>
                Map repository <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
        {error && (
          <p className="wm-error-text" role="alert">
            {error}
          </p>
        )}
        <div className="wm-open-or">
          <span />
          or start exploring
          <span />
        </div>
        <button className="wm-example-choice" disabled={loading} onClick={onExample} type="button">
          <span className="wm-project-avatar">
            <Network size={18} />
          </span>
          <span>
            <strong>Image Studio</strong>
            <small>An illustrative image-generation project · 10 source files</small>
          </span>
          <ArrowRight size={17} />
        </button>
        <button className="wm-import-choice" onClick={onImport} type="button">
          <Upload size={14} /> Import a saved .archmap.json
        </button>
        <button className="wm-blank-choice" onClick={onSketch} type="button">
          <Plus size={14} /> Start a blank architecture map
        </button>
        <p className="wm-scan-disclosure">
          <ShieldCheck size={14} /> Reads source files. Never executes repository code.
          <br />
          JavaScript & TypeScript · up to 400 files / 8 MB
        </p>
      </div>
    </main>
  );
}
