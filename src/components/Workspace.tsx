import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FileCode2,
  FolderOpen,
  GitBranch,
  LoaderCircle,
  Menu,
  MessageSquare,
  MousePointer2,
  Network,
  PanelRightClose,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { projectSchema, type Answer, type Module, type Project } from '../../shared/schema';
import { ask, getStatus, loadProject } from '../lib/api';
import { dependencyWalk, downloadProject, refreshProject, SAVE_KEY } from '../lib/graph';
import { Brand, Github, Mark } from './Brand';
import ArchitectureNode, { kindIcons, type ArchitectureFlowNode } from './ArchitectureNode';
import EvidenceCard from './EvidenceCard';

const nodeTypes = { architecture: ArchitectureNode };
function readSaved(): Project | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? projectSchema.parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export default function Workspace({ initialExample }: { initialExample: boolean }) {
  return (
    <ReactFlowProvider>
      <WorkspaceInner initialExample={initialExample} />
    </ReactFlowProvider>
  );
}
function WorkspaceInner({ initialExample }: { initialExample: boolean }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [path, setPath] = useState('.');
  const [showOpen, setShowOpen] = useState(!initialExample);
  const [status, setStatus] = useState<{ root: string; ai: boolean; model: string | null } | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'inspect' | 'ask'>('inspect');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [answerQuestion, setAnswerQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const [walkStart, setWalkStart] = useState<string | undefined>();
  const [walkStep, setWalkStep] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [history, setHistory] = useState<Project[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [serverSession, setServerSession] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureFlowNode>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const init = useRef(false);
  const { fitView, setCenter } = useReactFlow<ArchitectureFlowNode>();
  const selected = project?.nodes.find((n) => n.id === selectedId);
  const selectedEdge = project?.edges.find((e) => e.id === selectedEdgeId);
  const walk = useMemo(
    () => (project ? dependencyWalk(project, walkStart) : []),
    [project, walkStart],
  );
  const activeWalkEdge = walkStep === null ? undefined : walk[walkStep];
  const selectedEvidence = selectedEdge?.evidence
    ? [selectedEdge.evidence]
    : selected
      ? [
          ...new Map(
            [
              ...(project?.edges
                .filter((e) => e.source === selected.id || e.target === selected.id)
                .flatMap((e) => (e.evidence ? [e.evidence] : [])) ?? []),
              ...selected.evidence,
            ].map((e) => [e.id, e]),
          ).values(),
        ]
      : [];
  const filteredNodes = useMemo(
    () =>
      project?.nodes.filter((n) =>
        `${n.label} ${n.file} ${n.exports.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
      ) ?? [],
    [project, query],
  );

  useEffect(() => {
    getStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  const resetSelection = () => {
    setSelectedId(null);
    setSelectedEdgeId(null);
    setWalkStep(null);
    setWalkStart(undefined);
    setAnswer(null);
    setAskError('');
    setAnswerQuestion('');
    requestVersion.current++;
    setAsking(false);
  };
  async function openProject(example: boolean, refresh = false) {
    if (loading) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const fresh = await loadProject(example, refresh && project ? project.root : path);
      setProject(refresh && project ? refreshProject(fresh, project) : fresh);
      setHistory([]);
      setDirty(refresh);
      setSaved(false);
      setServerSession(true);
      setShowOpen(false);
      resetSelection();
      setTimeout(() => fitView({ padding: 0.25, duration: 350 }), 100);
      if (refresh)
        setNotice('Repository refreshed. Your positions and manual components were preserved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this repository.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    if (initialExample) void openProject(true);
    else {
      const saved = readSaved();
      if (saved) {
        setProject(saved);
        setShowOpen(false);
        setNotice(
          'Restored your saved map. Refresh the repository to start a new question session.',
        );
      }
    }
  }, []); // Initial route is intentionally consumed once.
  useEffect(() => {
    if (!project) return;
    const highlighted = activeWalkEdge
      ? new Set([activeWalkEdge.source, activeWalkEdge.target])
      : null;
    const matches = new Set(filteredNodes.map((n) => n.id));
    setNodes(
      project.nodes.map((module) => ({
        id: module.id,
        type: 'architecture',
        position: module.position,
        selected: selectedId === module.id,
        data: {
          module,
          focused: Boolean(highlighted?.has(module.id)),
          dimmed: Boolean(
            (highlighted && !highlighted.has(module.id)) || (query && !matches.has(module.id)),
          ),
        },
      })),
    );
  }, [project, selectedId, activeWalkEdge, query, filteredNodes, setNodes]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  useEffect(() => {
    if (!activeWalkEdge || !project) return;
    const from = project.nodes.find((n) => n.id === activeWalkEdge.source);
    const to = project.nodes.find((n) => n.id === activeWalkEdge.target);
    if (from && to)
      void fitView({
        nodes: [{ id: from.id }, { id: to.id }],
        padding: 0.8,
        duration: 300,
        maxZoom: 1,
      });
  }, [activeWalkEdge?.id]);
  function edit(next: Project) {
    if (project) setHistory((h) => [...h.slice(-19), project]);
    setProject(next);
    setDirty(true);
    setSaved(false);
  }
  function undo() {
    if (!history.length) return;
    setProject(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setDirty(true);
    setSaved(false);
    resetSelection();
  }
  function selectNode(id: string) {
    setSelectedId(id);
    setSelectedEdgeId(null);
    setTab('inspect');
    setInspectorOpen(true);
    setSidebarOpen(false);
    const node = project?.nodes.find((n) => n.id === id);
    if (node)
      void setCenter(node.position.x + 115, node.position.y + 53, { zoom: 0.95, duration: 250 });
  }
  function save() {
    if (!project) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(project));
      setDirty(false);
      setSaved(true);
      setNotice('Map saved in this browser. Export JSON to keep a portable copy.');
    } catch {
      setError('Browser storage is full or unavailable. Export your map as JSON to save it.');
    }
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024)
        throw new Error('Choose an ArchMap JSON file smaller than 8 MB.');
      const imported = projectSchema.parse(JSON.parse(await file.text()));
      setProject(imported);
      setHistory([]);
      setDirty(true);
      setServerSession(false);
      setShowOpen(false);
      resetSelection();
      setError('');
      setNotice('Map imported. Refresh its repository to start a question session.');
      setTimeout(() => fitView({ padding: 0.25 }), 100);
    } catch {
      setError('Could not import this map. Choose a valid .archmap.json file under 8 MB.');
    }
    event.target.value = '';
  }
  function connect(connection: Connection) {
    if (
      !project ||
      !connection.source ||
      !connection.target ||
      connection.source === connection.target
    )
      return;
    if (
      project.edges.some((e) => e.source === connection.source && e.target === connection.target)
    ) {
      setNotice('These components are already connected.');
      return;
    }
    edit({
      ...project,
      edges: [
        ...project.edges,
        {
          id: crypto.randomUUID(),
          source: connection.source,
          target: connection.target,
          label: 'relates to',
          origin: 'manual',
        },
      ],
    });
    setNotice('Manual connection added. It has no observed source evidence.');
  }
  function addComponent(event: FormEvent) {
    event.preventDefault();
    if (!project || !addName.trim()) return;
    const id = `manual-${crypto.randomUUID()}`;
    const module: Module = {
      id,
      label: addName.trim(),
      description: 'User-authored component.',
      kind: 'module',
      file: '',
      exports: [],
      lines: 0,
      position: { x: 100, y: -180 },
      evidence: [],
      origin: 'manual',
    };
    edit({ ...project, nodes: [...project.nodes, module] });
    setAddName('');
    setAdding(false);
    setSelectedId(id);
    setSelectedEdgeId(null);
    setInspectorOpen(true);
    setTab('inspect');
    setTimeout(() => setCenter(215, -120, { zoom: 1, duration: 250 }), 80);
  }
  function removeSelection() {
    if (!project) return;
    edit({
      ...project,
      nodes: selected ? project.nodes.filter((n) => n.id !== selected.id) : project.nodes,
      edges: project.edges.filter(
        (e) => e.id !== selectedEdgeId && e.source !== selectedId && e.target !== selectedId,
      ),
    });
    resetSelection();
  }
  async function submitQuestion(event: FormEvent) {
    event.preventDefault();
    if (!project || !question.trim() || asking) return;
    const version = ++requestVersion.current;
    setAsking(true);
    setAskError('');
    const q = question.trim();
    setAnswerQuestion(q);
    try {
      const result = await ask(project, q, selectedId ?? undefined);
      if (requestVersion.current === version) {
        setAnswer(result);
        setQuestion('');
      }
    } catch (e) {
      if (requestVersion.current === version)
        setAskError(e instanceof Error ? e.message : 'Could not answer. Try again.');
    } finally {
      if (requestVersion.current === version) setAsking(false);
    }
  }
  const edges = useMemo(
    () =>
      project?.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'smoothstep',
        selected: selectedEdgeId === edge.id,
        animated: edge.id === activeWalkEdge?.id,
        style: {
          stroke:
            edge.id === activeWalkEdge?.id || selectedEdgeId === edge.id
              ? '#baf18e'
              : edge.origin === 'manual'
                ? '#c4b4f1'
                : '#637554',
          strokeWidth: edge.id === activeWalkEdge?.id ? 2.5 : 1.4,
          strokeDasharray: edge.origin === 'manual' ? '5 5' : undefined,
          opacity: activeWalkEdge && activeWalkEdge.id !== edge.id ? 0.2 : 1,
        },
        labelStyle: { fill: '#b4bea9', fontSize: 9 },
        labelBgStyle: { fill: '#141910', fillOpacity: 0.95 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#7d916b', width: 15, height: 15 },
      })) ?? [],
    [project, selectedEdgeId, activeWalkEdge],
  );
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.matches('input, textarea, select') || target.isContentEditable;
      if (typing) return;
      if (event.key === '/') {
        event.preventDefault();
        setSidebarOpen(true);
        setTimeout(
          () =>
            document.querySelector<HTMLInputElement>('[aria-label="Search components"]')?.focus(),
          0,
        );
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      } else if (event.key === 'Escape') {
        setSidebarOpen(false);
        setAdding(false);
        setWalkStep(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [project, history]);
  const goBack = () => {
    location.hash = '';
  };
  return (
    <div className="workspace">
      <header className="workspace-header">
        <button
          className="bare-icon mobile-menu"
          aria-label="Toggle explorer"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={19} />
        </button>
        <Brand />
        <span className="header-divider" />
        <div className="project-breadcrumb">
          <span>Workspace</span>
          <ChevronRight size={12} />
          <strong>{project?.name || 'New map'}</strong>
          {project?.mode === 'example' && <span className="tag">EXAMPLE</span>}
        </div>
        <div className="workspace-header-actions">
          <span className="local-indicator">
            <span className="live-dot" /> Local session
          </span>
          <a
            className="bare-icon"
            href="https://github.com/ICEQ-JO/ArchMap"
            target="_blank"
            rel="noreferrer"
            aria-label="ArchMap on GitHub"
          >
            <Github size={17} />
          </a>
          <button className="small-button" onClick={goBack}>
            <ArrowLeft size={13} />
            <span>Back to site</span>
          </button>
        </div>
      </header>
      <div className="workspace-body">
        <aside
          className={`explorer ${sidebarOpen ? 'is-open' : ''}`}
          aria-label="Repository explorer"
        >
          <div className="explorer-heading">
            <span>EXPLORER</span>
            <button
              className="bare-icon"
              onClick={() => {
                setShowOpen(true);
                setSidebarOpen(false);
              }}
              aria-label="Open a repository"
            >
              <FolderOpen size={15} />
            </button>
          </div>
          <button
            className="project-switcher"
            onClick={() => {
              setShowOpen(!showOpen);
              setSidebarOpen(false);
            }}
          >
            <span className="project-avatar">
              <Mark size={17} />
            </span>
            <span>
              <strong>{project?.name || 'Open repository'}</strong>
              <small>
                {project ? `${project.filesScanned} source files` : 'Start a local analysis'}
              </small>
            </span>
            <ChevronDown size={13} />
          </button>
          <label className="component-search">
            <Search size={13} />
            <input
              aria-label="Search components"
              placeholder="Find a component…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>/</kbd>
          </label>
          <div className="explorer-section-title">
            <span>COMPONENTS</span>
            <span>{filteredNodes.length}</span>
          </div>
          <div className="component-list">
            {filteredNodes.map((node) => {
              const Icon = kindIcons[node.kind];
              return (
                <button
                  key={node.id}
                  className={selectedId === node.id ? 'active' : ''}
                  onClick={() => selectNode(node.id)}
                  title={node.file || node.label}
                >
                  <Icon size={14} />
                  <span>{node.label}</span>
                  {node.origin === 'manual' && <span className="manual-dot" />}
                </button>
              );
            })}
            {project && !filteredNodes.length && (
              <p className="list-empty">No components match “{query}”.</p>
            )}
            {!project && <p className="list-empty">Your source files will appear here.</p>}
          </div>
          <div className="explorer-bottom">
            <button onClick={() => fileInput.current?.click()}>
              <Upload size={14} /> Import map
            </button>
            <button onClick={() => setShowOpen(true)}>
              <FolderOpen size={14} /> Open repository
            </button>
            <a href="https://github.com/ICEQ-JO/ArchMap#readme" target="_blank" rel="noreferrer">
              <CircleHelp size={14} /> Documentation <ArrowRight size={12} />
            </a>
            <div>
              <ShieldCheck size={13} /> Repository access stays local
            </div>
          </div>
        </aside>
        <main className="map-main">
          <div className="map-toolbar">
            <div className="map-view-label">
              <Network size={15} />
              <span>Architecture</span>
              <span className="tag">STATIC IMPORTS</span>
            </div>
            <div className="toolbar-actions">
              <button
                title="Undo last edit"
                aria-label="Undo last edit"
                disabled={!history.length}
                onClick={undo}
              >
                <Undo2 size={15} />
              </button>
              <span className="toolbar-separator" />
              <button
                title="Add component"
                aria-label="Component"
                onClick={() => setAdding(!adding)}
                disabled={!project}
              >
                <Plus size={14} />
                <span>Component</span>
              </button>
              <button
                onClick={() => project && void openProject(project.mode === 'example', true)}
                disabled={!project || loading}
                aria-label="Refresh"
                title="Reanalyze source and preserve manual layout"
              >
                <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                <span>Refresh</span>
              </button>
              <button
                title="Save map in this browser"
                aria-label={saved ? 'Saved' : 'Save'}
                onClick={save}
                disabled={!project}
              >
                <Save size={14} />
                <span>
                  {saved ? 'Saved' : 'Save'}
                  {dirty ? ' *' : ''}
                </span>
              </button>
              <button
                aria-label="Export"
                title="Export map as JSON"
                onClick={() => project && downloadProject(project)}
                disabled={!project}
              >
                <Download size={14} />
                <span>Export</span>
              </button>
              <button
                title="Toggle inspector"
                aria-label="Toggle inspector"
                onClick={() => setInspectorOpen(!inspectorOpen)}
              >
                <PanelRightClose size={15} />
              </button>
            </div>
          </div>
          {adding && (
            <form className="add-component-form" onSubmit={addComponent}>
              <input
                autoFocus
                aria-label="New component name"
                placeholder="Name your component"
                maxLength={120}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
              <button className="small-button" disabled={!addName.trim()}>
                Add component
              </button>
              <button
                className="bare-icon"
                aria-label="Cancel adding component"
                type="button"
                onClick={() => setAdding(false)}
              >
                <X size={15} />
              </button>
            </form>
          )}
          {notice && (
            <div className="workspace-notice" role="status">
              <Check size={14} />
              {notice}
              <button
                className="bare-icon"
                aria-label="Dismiss notice"
                onClick={() => setNotice('')}
              >
                <X size={13} />
              </button>
            </div>
          )}
          {error && !showOpen && (
            <div className="workspace-error" role="alert">
              {error}
              <button className="bare-icon" aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={14} />
              </button>
            </div>
          )}
          <div className="canvas-area">
            {showOpen ? (
              <div className="open-screen">
                <div className="open-screen-heading">
                  <span className="open-screen-mark">
                    <Mark size={35} />
                  </span>
                  {project && (
                    <button
                      className="bare-icon"
                      onClick={() => setShowOpen(false)}
                      aria-label="Return to current map"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <h1>Find your way in.</h1>
                <p>Open a repository. Turn its source into a map you can follow.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void openProject(false);
                  }}
                >
                  <label htmlFor="repo-path">Repository folder</label>
                  <div className="path-input">
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
                  <p className="root-hint">
                    {status ? (
                      <>
                        Relative to <code>{status.root}</code>. Set <code>ARCHMAP_ROOT</code> to
                        open a different parent folder.
                      </>
                    ) : (
                      'Connecting to the local repository service…'
                    )}
                  </p>
                  <button className="button primary" disabled={loading}>
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
                  <p className="error-text" role="alert">
                    {error}
                  </p>
                )}
                <div className="open-or">
                  <span />
                  or start exploring
                  <span />
                </div>
                <button
                  className="example-choice"
                  disabled={loading}
                  onClick={() => void openProject(true)}
                >
                  <span className="project-avatar">
                    <Network size={18} />
                  </span>
                  <span>
                    <strong>Image Studio</strong>
                    <small>An illustrative image-generation project · 10 source files</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
                <button className="import-choice" onClick={() => fileInput.current?.click()}>
                  <Upload size={14} /> Import a saved .archmap.json
                </button>
                <p className="scan-disclosure">
                  <ShieldCheck size={14} /> Reads source files. Never executes repository code.
                  <br />
                  JavaScript & TypeScript · up to 400 files / 8 MB
                </p>
              </div>
            ) : loading && !project ? (
              <div className="map-loading">
                <LoaderCircle size={28} className="spinning" />
                <h2>Reading the connections.</h2>
                <p>Parsing imports and collecting source evidence…</p>
              </div>
            ) : project ? (
              <>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onNodeDragStop={(_, node) => {
                    const old = project.nodes.find((n) => n.id === node.id);
                    if (
                      old &&
                      (old.position.x !== node.position.x || old.position.y !== node.position.y)
                    )
                      edit({
                        ...project,
                        nodes: project.nodes.map((n) =>
                          n.id === node.id ? { ...n, position: node.position } : n,
                        ),
                      });
                  }}
                  onConnect={connect}
                  onNodeClick={(_, node) => {
                    setSelectedId(node.id);
                    setSelectedEdgeId(null);
                    setTab('inspect');
                    setInspectorOpen(true);
                  }}
                  onEdgeClick={(_, edge) => {
                    setSelectedEdgeId(edge.id);
                    setSelectedId(null);
                    setTab('inspect');
                    setInspectorOpen(true);
                  }}
                  onPaneClick={() => {
                    setSelectedId(null);
                    setSelectedEdgeId(null);
                  }}
                  fitView
                  fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
                  minZoom={0.1}
                  maxZoom={2}
                  deleteKeyCode={null}
                  colorMode="dark"
                  proOptions={{ hideAttribution: false }}
                >
                  <Background variant={BackgroundVariant.Dots} color="#38432d" gap={22} size={1} />
                  <Controls showInteractive={false} />
                  <MiniMap<ArchitectureFlowNode>
                    nodeColor={(n) => (n.data.module?.origin === 'manual' ? '#c4b4f1' : '#779c59')}
                    maskColor="#10130fc9"
                    pannable
                    zoomable
                  />
                </ReactFlow>
                <div className="canvas-title">
                  <span className="live-dot" />
                  <span>{project.name}</span>
                  <span>
                    {project.nodes.length} components · {project.edges.length} connections
                  </span>
                </div>
                <div className="canvas-legend">
                  <span>
                    <i /> Observed import
                  </span>
                  <span>
                    <i /> Manual connection
                  </span>
                </div>
                {walkStep === null ? (
                  <button
                    className="walk-launcher"
                    onClick={() => {
                      setWalkStart(selectedId ?? undefined);
                      setWalkStep(0);
                    }}
                    disabled={!walk.length}
                  >
                    <Play size={13} />
                    <span>Walk dependencies</span>
                    <span>{walk.length} steps</span>
                  </button>
                ) : activeWalkEdge ? (
                  <div className="walk-player">
                    <div className="walk-player-top">
                      <Play size={12} />
                      <strong>Dependency walk</strong>
                      <span>
                        {walkStep + 1} / {walk.length}
                      </span>
                      <button
                        className="bare-icon"
                        aria-label="Close dependency walk"
                        onClick={() => {
                          setWalkStep(null);
                          void fitView({ padding: 0.2, duration: 300 });
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="walk-player-main">
                      <button
                        className="icon-button"
                        aria-label="Previous walk step"
                        disabled={walkStep === 0}
                        onClick={() => setWalkStep(walkStep - 1)}
                      >
                        <ChevronLeft />
                      </button>
                      <div>
                        <strong>
                          {project.nodes.find((n) => n.id === activeWalkEdge.source)?.label}{' '}
                          <ArrowRight size={12} />{' '}
                          {project.nodes.find((n) => n.id === activeWalkEdge.target)?.label}
                        </strong>
                        <p>
                          {activeWalkEdge.label} ·{' '}
                          {activeWalkEdge.origin === 'manual'
                            ? 'User-authored relationship'
                            : `Source: ${activeWalkEdge.evidence?.file}:${activeWalkEdge.evidence?.line}`}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Next walk step"
                        disabled={walkStep === walk.length - 1}
                        onClick={() => setWalkStep(walkStep + 1)}
                      >
                        <ChevronRight />
                      </button>
                    </div>
                    <div className="walk-progress">
                      <span style={{ width: `${((walkStep + 1) / walk.length) * 100}%` }} />
                    </div>
                    <p className="walk-disclaimer">
                      Static dependency traversal. Does not establish runtime order.
                    </p>
                  </div>
                ) : (
                  <div className="walk-player">
                    <p>No outgoing dependencies from this component.</p>
                    <button className="text-button" onClick={() => setWalkStep(null)}>
                      Close walk
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="map-loading">
                <p>Open a repository to begin.</p>
                <button className="button primary" onClick={() => setShowOpen(true)}>
                  Open repository
                </button>
              </div>
            )}
          </div>
          <footer className="map-statusbar">
            <span>
              <GitBranch size={11} />
              {project?.revision ? project.revision.slice(0, 7) : 'Unversioned'}
              {project && (
                <span title={project.analyzedAt}>
                  Analyzed{' '}
                  {new Date(project.analyzedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </span>
            <span>
              <MousePointer2 size={11} /> Drag to pan · scroll to zoom
            </span>
            <span>
              {status?.ai ? 'Model available' : 'Local analysis'}
              <span className="live-dot" />
            </span>
          </footer>
        </main>
        {inspectorOpen && (
          <aside className="inspector" aria-label="Source inspector">
            <div className="inspector-tabs">
              <button
                className={tab === 'inspect' ? 'active' : ''}
                onClick={() => setTab('inspect')}
              >
                <ScanIcon /> Inspect
              </button>
              <button className={tab === 'ask' ? 'active' : ''} onClick={() => setTab('ask')}>
                <MessageSquare size={13} /> Ask the map
              </button>
            </div>
            {tab === 'inspect' ? (
              <div className="inspector-scroll">
                {selected || selectedEdge ? (
                  <>
                    <div className="inspector-detail-heading">
                      <span className="detail-kind">{selected?.kind || 'connection'}</span>
                      <span
                        className={`origin-tag ${selected?.origin === 'manual' || selectedEdge?.origin === 'manual' ? 'manual' : ''}`}
                      >
                        {(selected?.origin || selectedEdge?.origin) === 'manual'
                          ? 'MANUAL'
                          : 'OBSERVED'}
                      </span>
                    </div>
                    <h2>
                      {selected?.label ||
                        `${project?.nodes.find((n) => n.id === selectedEdge?.source)?.label} → ${project?.nodes.find((n) => n.id === selectedEdge?.target)?.label}`}
                    </h2>
                    {selected?.file && <p className="detail-path">{selected.file}</p>}
                    <p className="detail-description">
                      {selected?.description ||
                        (selectedEdge?.origin === 'manual'
                          ? 'A user-authored relationship. No source evidence is attached.'
                          : 'This dependency was found in an import or re-export statement. It does not prove runtime execution order.')}
                    </p>
                    {selected && (
                      <>
                        <div className="detail-stats">
                          <span>{selected.lines} lines</span>
                          <span>{selected.exports.length} exports</span>
                          <span>
                            {project?.edges.filter((e) => e.source === selected.id).length}{' '}
                            dependencies
                          </span>
                        </div>
                        <label className="edit-field">
                          Display name
                          <input
                            key={`${project?.id}-${selected.id}`}
                            defaultValue={selected.label}
                            maxLength={120}
                            onBlur={(e) => {
                              if (
                                project &&
                                e.target.value.trim() &&
                                e.target.value.trim() !== selected.label
                              )
                                edit({
                                  ...project,
                                  nodes: project.nodes.map((n) =>
                                    n.id === selected.id
                                      ? { ...n, label: e.target.value.trim() }
                                      : n,
                                  ),
                                });
                            }}
                          />
                        </label>
                        {selected.exports.length > 0 && (
                          <div className="export-symbols">
                            <h3>Exported symbols</h3>
                            {selected.exports.map((name) => (
                              <code key={name}>{name}</code>
                            ))}
                          </div>
                        )}
                        <button
                          className="inspect-walk text-button"
                          onClick={() => {
                            setWalkStart(selected.id);
                            setWalkStep(0);
                          }}
                        >
                          <Play size={12} /> Walk from this component <ArrowRight size={12} />
                        </button>
                      </>
                    )}
                    <div className="evidence-section-heading">
                      <h3>Source evidence</h3>
                      <span>{selectedEvidence.length}</span>
                    </div>
                    {selectedEvidence.length ? (
                      selectedEvidence.map((e) => <EvidenceCard key={e.id} evidence={e} />)
                    ) : (
                      <p className="inspector-help">
                        No source evidence is attached to this manual component or connection.
                      </p>
                    )}
                    <button className="delete-selection" onClick={removeSelection}>
                      <Trash2 size={13} /> Remove {selected ? 'component' : 'connection'}
                      <span>Undo available</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="inspector-empty">
                      <div className="inspector-empty-art">
                        <MousePointer2 size={27} />
                        <span />
                        <span />
                        <span />
                      </div>
                      <h2>Follow your curiosity.</h2>
                      <p>
                        Select a component or a connection to see what it does and where it comes
                        from.
                      </p>
                      <div>
                        <FileCode2 size={14} />
                        <span>File paths & exported symbols</span>
                      </div>
                      <div>
                        <GitBranch size={14} />
                        <span>Connections backed by source</span>
                      </div>
                      <div>
                        <Play size={14} />
                        <span>Step-by-step dependency walks</span>
                      </div>
                    </div>
                    {project && (
                      <div className="analysis-summary">
                        <h3>About this map</h3>
                        <p>
                          {project.mode === 'example'
                            ? 'Illustrative project, analyzed from the included source files.'
                            : 'Observed imports between source files in your local repository.'}
                        </p>
                        <p>
                          External packages and runtime calls are outside this scan. Component
                          categories are filename-based hints.
                        </p>
                        {project.warnings.map((w, i) => (
                          <p className="scan-warning" key={i}>
                            {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="ask-panel">
                <div className="ask-content">
                  {!answer && !asking ? (
                    <>
                      <div className="ask-heading">
                        <MessageSquare size={23} />
                        <h2>Go a little deeper.</h2>
                        <p>
                          {status?.ai
                            ? `Ask a question. ${status.model} will explain the relevant source evidence.`
                            : 'Find the evidence behind a file, symbol, or dependency. No model required.'}
                        </p>
                      </div>
                      <div className="question-suggestions">
                        {[
                          'Where is authentication handled?',
                          'How does the queue connect?',
                          'Find the image provider',
                        ].map((q) => (
                          <button key={q} onClick={() => setQuestion(q)}>
                            {q}
                            <ArrowRight size={13} />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="asked-question">{answerQuestion}</div>
                      {asking ? (
                        <div className="thinking" role="status">
                          <LoaderCircle size={15} className="spinning" />
                          {status?.ai ? 'Reading the evidence…' : 'Searching source evidence…'}
                        </div>
                      ) : (
                        answer && (
                          <>
                            <span className="answer-mode">
                              {answer.mode === 'ai'
                                ? 'MODEL EXPLANATION · VERIFY AGAINST SOURCE'
                                : 'LOCAL EVIDENCE SEARCH'}
                            </span>
                            <p className="answer-text">{answer.text}</p>
                            {answer.evidence.map((e, i) => (
                              <EvidenceCard key={e.id} evidence={e} index={i} />
                            ))}
                          </>
                        )
                      )}
                    </>
                  )}
                  {askError && (
                    <p className="error-text" role="alert">
                      {askError}
                    </p>
                  )}
                  {!serverSession && project && (
                    <p className="session-note">
                      This is a saved or imported map. Refresh the repository to enable questions.
                    </p>
                  )}
                </div>
                <form className="question-form" onSubmit={submitQuestion}>
                  {selected && (
                    <div className="question-context">
                      <FileCode2 size={11} />
                      {selected.label}
                      <button
                        className="bare-icon"
                        type="button"
                        aria-label="Clear question context"
                        onClick={() => setSelectedId(null)}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                  <div>
                    <textarea
                      aria-label="Question about your codebase"
                      value={question}
                      maxLength={2000}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask about your codebase…"
                      rows={3}
                      disabled={!project || !serverSession}
                    />
                    <button
                      aria-label="Ask question"
                      className="send-button"
                      disabled={!question.trim() || asking || !serverSession}
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  <p>
                    {status?.ai
                      ? 'Relevant snippets will be sent to your configured model.'
                      : 'Local evidence search. Add a model in .env for AI explanations.'}
                  </p>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>
      <input
        type="file"
        ref={fileInput}
        accept=".json,.archmap.json,application/json"
        onChange={(e) => void importFile(e)}
        className="sr-only"
        aria-label="Import map file"
      />
    </div>
  );
}
function ScanIcon() {
  return <Search size={13} />;
}
