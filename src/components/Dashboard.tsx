import { useEffect, useState, useMemo, useRef, type ChangeEvent } from 'react';
import {
  FolderOpen,
  Plus,
  Upload,
  Network,
  Search,
  Sparkles,
  X,
  Cable,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { Brand, Github } from './Brand';
import { Button } from './ui/Button';
import ProjectCard from './ProjectCard';
import EmptyState from './EmptyState';
import ProjectSetup from './ProjectSetup';
import { SAVE_KEY } from '../lib/graph';
import { getStatus, request } from '../lib/api';
import {
  projectSchema,
  agentConnectionSchema,
  type Project,
  type AgentConnection,
} from '../../shared/schema';
import type { ServerStatus } from './ModelSettings';
import './Dashboard.css';

export interface DashboardProps {
  onOpen: (project: Project) => void;
  onOpenFlows?: (project: Project) => void;
  onOpenChanges?: (project: Project) => void;
  onNewProject: () => void;
  onExample: () => void;
  onImport: (project: Project) => void;
  onSketch: () => void;
}

export default function Dashboard({
  onOpen,
  onOpenFlows,
  onOpenChanges,
  onNewProject,
  onExample,
  onImport,
  onSketch,
}: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'local' | 'sketch' | 'example'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'components' | 'name'>('recent');
  const [notice, setNotice] = useState('');
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentConnection | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load status from backend
  useEffect(() => {
    getStatus()
      .then(setServerStatus)
      .catch(() => setServerStatus(null));

    request<unknown>('/api/opencode/status')
      .then((res) => setAgentStatus(agentConnectionSchema.parse(res)))
      .catch(() => setAgentStatus(null));
  }, []);

  // Load all projects from localStorage
  const loadStoredProjects = () => {
    const list: Project[] = [];
    try {
      // Primary default save key
      const main = localStorage.getItem(SAVE_KEY);
      if (main) {
        try {
          list.push(projectSchema.parse(JSON.parse(main)));
        } catch {
          // ignore invalid
        }
      }

      // Check for multi-project keys "archmap.project.*"
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('archmap.project.') && key !== SAVE_KEY) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const p = projectSchema.parse(JSON.parse(raw));
              if (!list.some((existing) => existing.id === p.id)) {
                list.push(p);
              }
            }
          } catch {
            // ignore invalid
          }
        }
      }
    } catch {
      // localStorage may fail
    }
    setProjects(list);
  };

  useEffect(() => {
    loadStoredProjects();
  }, []);

  const handleDelete = (id: string) => {
    try {
      const main = localStorage.getItem(SAVE_KEY);
      if (main) {
        try {
          const parsed = JSON.parse(main);
          if (parsed.id === id) {
            localStorage.removeItem(SAVE_KEY);
          }
        } catch {
          // ignore
        }
      }
      localStorage.removeItem(`archmap.project.${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setNotice('Project removed from saved maps.');
      setTimeout(() => setNotice(''), 3000);
    } catch {
      // ignore
    }
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = projectSchema.parse(JSON.parse(text));
      localStorage.setItem(`archmap.project.${parsed.id}`, JSON.stringify(parsed));
      setProjects((prev) => [parsed, ...prev.filter((p) => p.id !== parsed.id)]);
      setNotice(`Imported "${parsed.name}" successfully.`);
      setTimeout(() => setNotice(''), 3000);
      onImport(parsed);
    } catch {
      setNotice('Could not import map file. Make sure it is valid ArchMap JSON under 8 MB.');
      setTimeout(() => setNotice(''), 4000);
    }
    e.target.value = '';
  };

  const handleScanRepository = async (path: string, focus: string) => {
    setScanLoading(true);
    setScanError('');
    try {
      const result = projectSchema.parse(
        await request('/api/analyze', { path, view: 'architecture', focus }),
      );
      localStorage.setItem(SAVE_KEY, JSON.stringify(result));
      localStorage.setItem(`archmap.project.${result.id}`, JSON.stringify(result));
      setProjects((prev) => [result, ...prev.filter((p) => p.id !== result.id)]);
      setSetupModalOpen(false);
      onOpen(result);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Could not analyze repository.');
    } finally {
      setScanLoading(false);
    }
  };

  // Compute telemetry stats from projects
  const telemetry = useMemo(() => {
    return {
      mapsCount: projects.length,
      totalFiles: projects.reduce((sum, p) => sum + p.filesScanned, 0),
      totalComponents: projects.reduce((sum, p) => sum + p.nodes.length, 0),
      totalConnections: projects.reduce((sum, p) => sum + p.edges.length, 0),
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (categoryFilter === 'local') {
      result = result.filter((p) => p.mode === 'local' && p.root);
    } else if (categoryFilter === 'sketch') {
      result = result.filter((p) => !p.root && p.mode !== 'example');
    } else if (categoryFilter === 'example') {
      result = result.filter((p) => p.mode === 'example');
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.summary?.toLowerCase().includes(q) ||
          p.root?.toLowerCase().includes(q),
      );
    }

    if (sortBy === 'components') {
      result.sort((a, b) => b.nodes.length - a.nodes.length);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
    }

    return result;
  }, [projects, categoryFilter, search, sortBy]);

  return (
    <div className="wm-dashboard">
      {/* Top Header */}
      <header className="wm-dashboard-header">
        <div className="wm-dash-header-left">
          <Brand />
          <div
            className="wm-dash-server-pill"
            title={`Local API bound to loopback. Root: ${serverStatus?.root || 'unbound'}`}
          >
            <span className={`wm-dash-status-dot ${serverStatus ? 'is-live' : 'is-offline'}`} />
            <span>{serverStatus ? `Local Engine :4310` : 'Local Engine Connecting…'}</span>
            {serverStatus?.root && <code className="wm-dash-root-code">{serverStatus.root}</code>}
          </div>
        </div>

        <div className="wm-dash-header-right">
          {agentStatus?.connected && (
            <div
              className="wm-dash-agent-pill"
              title="Local OpenCode coding agent daemon connected"
            >
              <Cable size={13} />
              <span>Agent Ready</span>
            </div>
          )}

          <a
            href="https://github.com/ICEQ-JO/ArchMap"
            target="_blank"
            rel="noreferrer"
            className="wm-small-button"
            title="Star ArchMap on GitHub"
          >
            <Github size={14} /> <span>GitHub</span>
          </a>

          <button
            className="wm-small-button wm-primary"
            onClick={() => setSetupModalOpen(true)}
            type="button"
          >
            <Plus size={15} /> <span>Scan repository</span>
          </button>
        </div>
      </header>

      {/* Global Notifications */}
      {notice && (
        <div className="wm-dashboard-notice" role="status">
          <span>{notice}</span>
          <button
            className="wm-bare-icon"
            onClick={() => setNotice('')}
            aria-label="Dismiss notice"
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="wm-dashboard-main">
        {/* Telemetry Status Strip */}
        <section className="wm-dash-telemetry-strip" aria-label="Architecture Workbench Telemetry">
          <div className="wm-telemetry-item">
            <span className="wm-telemetry-num">{telemetry.mapsCount}</span>
            <span className="wm-telemetry-label">Systems Mapped</span>
          </div>
          <div className="wm-telemetry-sep" />
          <div className="wm-telemetry-item">
            <span className="wm-telemetry-num">{telemetry.totalFiles}</span>
            <span className="wm-telemetry-label">Source Files Analyzed</span>
          </div>
          <div className="wm-telemetry-sep" />
          <div className="wm-telemetry-item">
            <span className="wm-telemetry-num">{telemetry.totalComponents}</span>
            <span className="wm-telemetry-label">Responsibility Areas</span>
          </div>
          <div className="wm-telemetry-sep" />
          <div className="wm-telemetry-item">
            <span className="wm-telemetry-num">{telemetry.totalConnections}</span>
            <span className="wm-telemetry-label">Observed Dependencies</span>
          </div>
          <div className="wm-telemetry-sep" />
          <div
            className="wm-telemetry-guarantee"
            title="AST parser only. Analyzed code is never executed."
          >
            <ShieldCheck size={16} />
            <span>Read-Only AST · Zero Code Execution</span>
          </div>
        </section>

        {/* Hero & Quick Action Launchpad */}
        <section className="wm-dash-hero">
          <div className="wm-dash-hero-text">
            <span className="wm-dash-eyebrow">SOURCE ATLAS &amp; ARCHITECTURE CONSOLE</span>
            <h1>Architecture Atlas</h1>
            <p>
              Inspect structural boundaries, verify source-backed dependencies, and trace execution
              flows across your codebases with zero execution risk.
            </p>
          </div>

          <div className="wm-dash-quick-actions">
            <button
              className="wm-dash-action-card is-primary-action"
              onClick={() => setSetupModalOpen(true)}
              type="button"
            >
              <div className="wm-dash-action-icon is-repo">
                <FolderOpen size={20} />
              </div>
              <div className="wm-dash-action-text">
                <strong>Map local repository</strong>
                <p>Analyze imports and AST structure in your project folder</p>
              </div>
              <ArrowRight size={16} className="wm-dash-action-arrow" />
            </button>

            <button className="wm-dash-action-card" onClick={onExample} type="button">
              <div className="wm-dash-action-icon is-example">
                <Sparkles size={20} />
              </div>
              <div className="wm-dash-action-text">
                <strong>Explore Image Studio</strong>
                <p>Tour an illustrative 3-tier system with guided feature flows</p>
              </div>
              <ArrowRight size={16} className="wm-dash-action-arrow" />
            </button>

            <button
              className="wm-dash-action-card"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <div className="wm-dash-action-icon is-import">
                <Upload size={20} />
              </div>
              <div className="wm-dash-action-text">
                <strong>Import .archmap.json</strong>
                <p>Resume any exported portable architecture map file</p>
              </div>
              <ArrowRight size={16} className="wm-dash-action-arrow" />
            </button>

            <button className="wm-dash-action-card" onClick={onSketch} type="button">
              <div className="wm-dash-action-icon is-sketch">
                <Plus size={20} />
              </div>
              <div className="wm-dash-action-text">
                <strong>Blank system sketch</strong>
                <p>Author responsibilities and connections from scratch</p>
              </div>
              <ArrowRight size={16} className="wm-dash-action-arrow" />
            </button>
          </div>
        </section>

        {/* Project Catalog Section */}
        <section className="wm-dash-projects-section">
          <div className="wm-dash-projects-header">
            <div className="wm-dash-projects-tabs">
              <button
                className={`wm-dash-tab ${categoryFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('all')}
                type="button"
              >
                All Systems <span className="wm-dash-tab-count">{projects.length}</span>
              </button>
              <button
                className={`wm-dash-tab ${categoryFilter === 'local' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('local')}
                type="button"
              >
                Local Repositories{' '}
                <span className="wm-dash-tab-count">
                  {projects.filter((p) => p.mode === 'local' && Boolean(p.root)).length}
                </span>
              </button>
              <button
                className={`wm-dash-tab ${categoryFilter === 'sketch' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('sketch')}
                type="button"
              >
                System Sketches{' '}
                <span className="wm-dash-tab-count">
                  {projects.filter((p) => !p.root && p.mode !== 'example').length}
                </span>
              </button>
              <button
                className={`wm-dash-tab ${categoryFilter === 'example' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('example')}
                type="button"
              >
                Samples{' '}
                <span className="wm-dash-tab-count">
                  {projects.filter((p) => p.mode === 'example').length}
                </span>
              </button>
            </div>

            <div className="wm-dash-controls">
              <div className="wm-dash-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search projects, files or components..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Filter architecture maps"
                />
                {search && (
                  <button
                    className="wm-bare-icon"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    type="button"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                className="wm-dash-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'components' | 'name')}
                aria-label="Sort projects"
              >
                <option value="recent">Recently Analyzed</option>
                <option value="components">Most Components</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            projects.length === 0 ? (
              <EmptyState
                icon={Network}
                title="No architecture maps yet"
                description="Map a local JavaScript or TypeScript codebase, explore the ready-made Image Studio system, or create a blank system sketch."
              >
                <button
                  className="wm-button wm-primary"
                  onClick={() => setSetupModalOpen(true)}
                  type="button"
                >
                  <Plus size={15} /> Map a repository
                </button>
                <button className="wm-button" onClick={onExample} type="button">
                  Explore Image Studio <ArrowRight size={15} />
                </button>
              </EmptyState>
            ) : (
              <div className="wm-dash-no-search">
                <p>No architecture maps match &ldquo;{search}&rdquo; in this filter.</p>
                <button
                  className="wm-text-button"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('all');
                  }}
                  type="button"
                >
                  Clear search and filters
                </button>
              </div>
            )
          ) : (
            <div className="wm-dash-grid">
              {filteredProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={onOpen}
                  onOpenFlows={onOpenFlows}
                  onOpenChanges={onOpenChanges}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {/* Cloud Ready / Local First Banner */}
        <section className="wm-dash-tier-banner">
          <div className="wm-dash-tier-left">
            <div className="wm-dash-tier-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <strong>100% Local-First Architecture Exploration</strong>
              <p>
                No third-party telemetry, cloud storage, or external dependencies required. All
                static graph queries and call-site extractions run strictly inside your local
                environment.
              </p>
            </div>
          </div>
          <div className="wm-dash-tier-right">
            <a
              href="/product-map.html"
              target="_blank"
              rel="noreferrer"
              className="wm-small-button"
            >
              <Network size={14} /> Product capability map <ExternalLink size={12} />
            </a>
            <a
              href="https://github.com/ICEQ-JO/ArchMap#readme"
              target="_blank"
              rel="noreferrer"
              className="wm-small-button"
            >
              <HelpCircle size={14} /> Documentation
            </a>
          </div>
        </section>
      </main>

      {/* Repository Setup Modal Overlay */}
      {setupModalOpen && (
        <div
          className="wm-dash-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSetupModalOpen(false);
          }}
          role="presentation"
        >
          <div className="wm-dash-modal-dialog">
            <ProjectSetup
              status={serverStatus}
              loading={scanLoading}
              error={scanError}
              hasProject={projects.length > 0}
              onOpen={handleScanRepository}
              onExample={() => {
                setSetupModalOpen(false);
                onExample();
              }}
              onImport={() => {
                setSetupModalOpen(false);
                fileInputRef.current?.click();
              }}
              onSketch={() => {
                setSetupModalOpen(false);
                onSketch();
              }}
              onClose={() => setSetupModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,.archmap.json,application/json"
        onChange={handleImportFile}
        className="sr-only"
        aria-label="Import map file"
      />
    </div>
  );
}
