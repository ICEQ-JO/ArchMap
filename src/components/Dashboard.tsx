import { useEffect, useState, useMemo, useRef, type ChangeEvent } from 'react';
import {
  FolderOpen,
  Plus,
  Upload,
  Network,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { Brand, Github } from './Brand';
import ProjectCard from './ProjectCard';
import EmptyState from './EmptyState';
import { SAVE_KEY } from '../lib/graph';
import { projectSchema, type Project } from '../../shared/schema';
import './Dashboard.css';

export interface DashboardProps {
  onOpen: (project: Project) => void;
  onNewProject: () => void;
  onExample: () => void;
  onImport: () => void;
  onSketch: () => void;
}

export default function Dashboard({ onOpen, onNewProject, onExample, onSketch }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // If primary saved project has this ID, remove it
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
      // Save to localStorage under specific key
      localStorage.setItem(`archmap.project.${parsed.id}`, JSON.stringify(parsed));
      setProjects((prev) => [parsed, ...prev.filter((p) => p.id !== parsed.id)]);
      onOpen(parsed);
    } catch {
      setNotice('Could not import map file. Make sure it is valid ArchMap JSON.');
      setTimeout(() => setNotice(''), 4000);
    }
    e.target.value = '';
  };

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.summary && p.summary.toLowerCase().includes(q)) ||
        p.nodes.some((n) => n.label.toLowerCase().includes(q)),
    );
  }, [projects, search]);

  return (
    <div className="wm-dashboard">
      <header className="wm-dashboard-header">
        <div className="wm-dash-header-left">
          <Brand />
          <span className="wm-dash-badge">SaaS &amp; OSS Workbench</span>
        </div>
        <div className="wm-dash-header-right">
          <a
            href="https://github.com/ICEQ-JO/ArchMap"
            target="_blank"
            rel="noreferrer"
            className="wm-small-button"
            title="GitHub repository"
          >
            <Github size={15} /> <span>Star on GitHub</span>
          </a>
          <button className="wm-small-button wm-primary" onClick={onNewProject} type="button">
            <Plus size={15} /> <span>New repository map</span>
          </button>
        </div>
      </header>

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

      <main className="wm-dashboard-main">
        <section className="wm-dash-hero">
          <div className="wm-dash-hero-text">
            <h1>Architecture Atlas</h1>
            <p>
              Inspect evidence, navigate execution flows, and track code changes without executing
              foreign code.
            </p>
          </div>

          <div className="wm-dash-quick-actions">
            <button className="wm-dash-action-card" onClick={onNewProject} type="button">
              <div className="wm-dash-action-icon">
                <FolderOpen size={20} />
              </div>
              <div>
                <strong>Map local repository</strong>
                <p>Analyze source code in your local folder</p>
              </div>
            </button>

            <button className="wm-dash-action-card" onClick={onExample} type="button">
              <div className="wm-dash-action-icon is-example">
                <Network size={20} />
              </div>
              <div>
                <strong>Explore Image Studio</strong>
                <p>Tour a ready-made illustrative architecture</p>
              </div>
            </button>

            <button
              className="wm-dash-action-card"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <div className="wm-dash-action-icon">
                <Upload size={20} />
              </div>
              <div>
                <strong>Import .archmap.json</strong>
                <p>Load a portable architecture map file</p>
              </div>
            </button>

            <button className="wm-dash-action-card" onClick={onSketch} type="button">
              <div className="wm-dash-action-icon">
                <Plus size={20} />
              </div>
              <div>
                <strong>Blank system sketch</strong>
                <p>Draw architecture from scratch with zero setup</p>
              </div>
            </button>
          </div>
        </section>

        <section className="wm-dash-projects-section">
          <div className="wm-dash-projects-header">
            <div className="wm-dash-projects-title">
              <h2>Your Architecture Maps</h2>
              <span className="wm-dash-count">{filteredProjects.length}</span>
            </div>

            <div className="wm-dash-search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search projects or components..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          </div>

          {filteredProjects.length === 0 ? (
            projects.length === 0 ? (
              <EmptyState
                icon={Network}
                title="No saved maps yet"
                description="Open a local JavaScript or TypeScript project, or explore the example to generate your first architecture map."
              >
                <button className="wm-button wm-primary" onClick={onNewProject} type="button">
                  <Plus size={15} /> Map a repository
                </button>
                <button className="wm-button" onClick={onExample} type="button">
                  Explore example <ArrowRight size={15} />
                </button>
              </EmptyState>
            ) : (
              <div className="wm-dash-no-search">
                <p>No projects match &ldquo;{search}&rdquo;.</p>
                <button className="wm-text-button" onClick={() => setSearch('')} type="button">
                  Clear search query
                </button>
              </div>
            )
          ) : (
            <div className="wm-dash-grid">
              {filteredProjects.map((p) => (
                <ProjectCard key={p.id} project={p} onOpen={onOpen} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>

        {/* SaaS / Open Source Banner */}
        <section className="wm-dash-tier-banner">
          <div className="wm-dash-tier-left">
            <div className="wm-dash-tier-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <strong>Open Source &amp; Cloud Ready</strong>
              <p>
                Run standalone with <code>npx archmap</code> or connect your GitHub repositories for
                cloud team collaboration.
              </p>
            </div>
          </div>
          <div className="wm-dash-tier-right">
            <a
              href="https://github.com/ICEQ-JO/ArchMap#readme"
              target="_blank"
              rel="noreferrer"
              className="wm-small-button"
            >
              <ShieldCheck size={14} /> Self-hosting guide <ExternalLink size={12} />
            </a>
          </div>
        </section>
      </main>

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
