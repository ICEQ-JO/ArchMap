import { useEffect } from 'react';
import {
  X,
  Settings2,
  Cable,
  ShieldCheck,
  GitBranch,
  BookOpen,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import ModelSettings, { type ServerStatus } from './ModelSettings';
import './SettingsPanel.css';

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  status: ServerStatus | null;
  onStatusChange: (status: ServerStatus) => void;
  onOpenAgent: () => void;
}

export default function SettingsPanel({
  open,
  onClose,
  status,
  onStatusChange,
  onOpenAgent,
}: SettingsPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="wm-settings-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <aside
        className="wm-settings-panel"
        role="dialog"
        aria-label="Settings and connections"
        aria-modal="true"
      >
        <header className="wm-settings-header">
          <div className="wm-settings-header-title">
            <Settings2 size={18} />
            <h2>Settings &amp; Connections</h2>
          </div>
          <button
            className="wm-bare-icon"
            onClick={onClose}
            aria-label="Close settings"
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <div className="wm-settings-content">
          {/* Section 1: AI Model Configuration */}
          <section className="wm-settings-section">
            <div className="wm-settings-section-header">
              <span className={`wm-status-dot ${status?.ai ? 'is-connected' : ''}`} />
              <h3>Understanding model</h3>
              <span className="wm-settings-badge">
                {status?.ai ? 'Connected' : 'Optional (BYOM)'}
              </span>
            </div>
            <p className="wm-settings-section-desc">
              Connect an OpenAI-compatible endpoint for feature proposals and grounded code
              explanations.
            </p>
            <ModelSettings status={status} onChange={onStatusChange} />
          </section>

          {/* Section 2: Coding Agent (OpenCode) */}
          <section className="wm-settings-section">
            <div className="wm-settings-section-header">
              <Cable size={16} />
              <h3>Coding agent tracking</h3>
            </div>
            <p className="wm-settings-section-desc">
              Track tasks in a local OpenCode server and review the source changes before
              committing.
            </p>
            <button
              className="wm-button wm-primary wm-agent-launch-btn"
              onClick={() => {
                onClose();
                onOpenAgent();
              }}
              type="button"
            >
              Open agent tracker <ArrowRight size={15} />
            </button>
          </section>

          {/* Section 3: Architecture & Security */}
          <section className="wm-settings-section wm-settings-about">
            <div className="wm-settings-section-header">
              <ShieldCheck size={16} />
              <h3>Local security &amp; privacy</h3>
            </div>
            <ul className="wm-settings-facts">
              <li>
                Analyzed repository code is <strong>never executed</strong>.
              </li>
              <li>Scans are strictly bounded within the allowed directory.</li>
              <li>API keys are stored in server memory only, never on disk or in export files.</li>
              <li>Inference happens only after an explicit question.</li>
            </ul>

            <div className="wm-settings-links">
              <a
                href="/product-map.html"
                target="_blank"
                rel="noreferrer"
                className="wm-settings-link"
              >
                <GitBranch size={14} /> Product capability map <ExternalLink size={12} />
              </a>
              <a
                href="https://github.com/ICEQ-JO/ArchMap"
                target="_blank"
                rel="noreferrer"
                className="wm-settings-link"
              >
                <BookOpen size={14} /> GitHub &amp; Documentation <ExternalLink size={12} />
              </a>
            </div>
            <div className="wm-settings-footer-copy">ArchMap v0.1.0 · Open source (MIT)</div>
          </section>
        </div>
      </aside>
    </div>
  );
}
