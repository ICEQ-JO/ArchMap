import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
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
  Cable,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FolderOpen,
  GitBranch,
  GitCompareArrows,
  LayoutGrid,
  MessageSquare,
  Network,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import {
  projectSchema,
  type Module,
  type Project,
  type Proposal,
  type Comparison,
} from '../../shared/schema';
import { getStatus, loadProject } from '../lib/api';
import { dependencyWalk, downloadProject, refreshProject, SAVE_KEY } from '../lib/graph';
import { Brand } from './Brand';
import ArchitectureNode, { kindIcons, type ArchitectureFlowNode } from './ArchitectureNode';
import EvidenceCard from './EvidenceCard';
import MapAgent from './MapAgent';
import FlowInspector from './FlowInspector';
import ModelSettings, { type ServerStatus } from './ModelSettings';
import ChangesPanel from './ChangesPanel';
import OpenCodePanel from './OpenCodePanel';
import SettingsPanel from './SettingsPanel';
import CommandPalette, { type Command } from './CommandPalette';
import ProjectSetup from './ProjectSetup';
import EmptyState from './EmptyState';
import { request } from '../lib/api';
import './Workbench.css';
import { arrangeSparse } from '../lib/layout';

const nodeTypes = { architecture: ArchitectureNode };

function readSaved(): Project | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? projectSchema.parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export default function Workspace({
  initialExample,
  onDashboard,
}: {
  initialExample: boolean;
  onDashboard?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <WorkspaceInner initialExample={initialExample} onDashboard={onDashboard} />
    </ReactFlowProvider>
  );
}

function WorkspaceInner({
  initialExample,
  onDashboard,
}: {
  initialExample: boolean;
  onDashboard?: () => void;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [path, setPath] = useState('.');
  const [focus, setFocus] = useState('');
  const [showOpen, setShowOpen] = useState(!initialExample);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [flowId, setFlowId] = useState<string | null>(null);
  const [flowIndex, setFlowIndex] = useState(0);
  const [walkStart, setWalkStart] = useState<string | undefined>();
  const [walkStep, setWalkStep] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [history, setHistory] = useState<Project[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState('Architecture');
  const reviewing = view === 'Changes' && !showOpen;
  const [sessionReview, setSessionReview] = useState<{
    report: Comparison;
    title: string;
    request: string;
  } | null>(null);
  const [serverSession, setServerSession] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureFlowNode>([]);
  const reviewedTurns = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const init = useRef(false);
  const { fitView, setCenter, getViewport } = useReactFlow<ArchitectureFlowNode>();

  const selected = project?.nodes.find((n) => n.id === selectedId);
  const selectedEdge = project?.edges.find((e) => e.id === selectedEdgeId);

  const walk = useMemo(
    () => (project ? dependencyWalk(project, walkStart) : []),
    [project, walkStart],
  );

  const activeFlow = project?.flows?.find((f) => f.id === flowId);
  const activeFlowStep = activeFlow?.steps[flowIndex];
  const flowEdge = project?.edges.find((e) => e.id === activeFlowStep?.edgeId);

  const activeWalkEdge = useMemo(
    () =>
      flowEdge && activeFlowStep
        ? { ...flowEdge, evidence: activeFlowStep.evidence }
        : walkStep === null
          ? undefined
          : walk[walkStep],
    [flowEdge, activeFlowStep, walkStep, walk],
  );

  const selectedEvidence = activeFlowStep
    ? [activeFlowStep.evidence]
    : selectedEdge?.evidence
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
        `${n.label} ${n.file} ${n.members?.join(' ') ?? ''} ${n.exports.join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase()),
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
    setFlowId(null);
    setFlowIndex(0);
  };

  function focusLegible(target: Project, duration = 350) {
    const hub = [...target.nodes].sort(
      (a, b) =>
        target.edges.filter((e) => e.source === b.id || e.target === b.id).length -
        target.edges.filter((e) => e.source === a.id || e.target === a.id).length,
    )[0];
    setTimeout(async () => {
      await fitView({ padding: 0.22, maxZoom: 1, duration });
      if (getViewport().zoom < 0.75 && hub) {
        void setCenter(hub.position.x + 122, hub.position.y + 65, { zoom: 0.85, duration });
        setNotice('Showing a readable area. Fit map shows the whole graph.');
      }
    }, 120);
  }

  async function openProject(
    example: boolean,
    refresh = false,
    customPath?: string,
    customFocus?: string,
  ) {
    if (loading) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const targetPath = customPath ?? (refresh && project ? project.root : path);
      const targetFocus = customFocus ?? (refresh ? (project?.focus ?? focus) : focus);
      const fresh = await loadProject(example, targetPath, targetFocus);
      const next = refresh && project ? refreshProject(fresh, project) : arrangeSparse(fresh);
      setProject(next);
      setView('Architecture');
      setHistory([]);
      setDirty(refresh);
      setSaved(false);
      setServerSession(true);
      setShowOpen(false);
      resetSelection();
      focusLegible(next);
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
  }, []);

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
    setFlowId(null);
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
      localStorage.setItem(`archmap.project.${project.id}`, JSON.stringify(project));
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
      setView('Architecture');
      setHistory([]);
      setDirty(true);
      setServerSession(false);
      setShowOpen(false);
      resetSelection();
      setError('');
      setNotice('Map imported. Refresh its repository to start a question session.');
      focusLegible(imported);
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
    setFlowId(null);
    setInspectorOpen(true);
    setTimeout(() => setCenter(215, -120, { zoom: 1, duration: 250 }), 80);
  }

  function removeSelection() {
    if (!project) return;
    edit({
      ...project,
      flows: (project.flows ?? [])
        .map((f) => ({
          ...f,
          steps: f.steps.filter((step) => {
            const edge = project.edges.find((e) => e.id === step.edgeId);
            return (
              edge &&
              edge.id !== selectedEdgeId &&
              edge.source !== selectedId &&
              edge.target !== selectedId
            );
          }),
        }))
        .filter((f) => f.steps.length),
      nodes: selected ? project.nodes.filter((n) => n.id !== selected.id) : project.nodes,
      edges: project.edges.filter(
        (e) => e.id !== selectedEdgeId && e.source !== selectedId && e.target !== selectedId,
      ),
    });
    resetSelection();
  }

  const edges = useMemo(
    () =>
      project?.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label:
          selectedEdgeId === edge.id || edge.id === activeWalkEdge?.id ? edge.label : undefined,
        type: 'smoothstep',
        selected: selectedEdgeId === edge.id,
        animated: edge.id === activeWalkEdge?.id,
        style: {
          stroke:
            edge.id === activeWalkEdge?.id || selectedEdgeId === edge.id
              ? '#282824'
              : edge.origin === 'manual'
                ? '#937b55'
                : '#8e928d',
          strokeWidth: edge.id === activeWalkEdge?.id ? 2.5 : 1.4,
          strokeDasharray: edge.origin === 'manual' ? '5 5' : undefined,
          opacity: activeWalkEdge && activeWalkEdge.id !== edge.id ? 0.2 : 1,
        },
        labelStyle: { fill: '#42463f', fontSize: 11 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#777d72', width: 15, height: 15 },
      })) ?? [],
    [project, selectedEdgeId, activeWalkEdge],
  );

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        setAdding(false);
        setInspectorOpen(false);
        setSettingsOpen(false);
        setPaletteOpen(false);
        resetSelection();
        if (reviewing) {
          setView('Architecture');
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }
      if (reviewing || paletteOpen || settingsOpen) return;
      const target = event.target as HTMLElement;
      const typing = target.matches('input, textarea, select') || target.isContentEditable;
      if (typing) return;
      if (event.key === '/') {
        event.preventDefault();
        setView('Architecture');
        setShowOpen(false);
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
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [project, history, reviewing, paletteOpen, settingsOpen]);

  function startSketch() {
    setProject({
      version: 1,
      id: crypto.randomUUID(),
      name: 'System sketch',
      root: '',
      revision: null,
      analyzedAt: new Date().toISOString(),
      mode: 'local',
      nodes: [],
      edges: [],
      flows: [],
      warnings: [],
      filesScanned: 0,
      level: 'architecture',
      summary: 'A user-authored architecture sketch.',
    });
    setShowOpen(false);
    setServerSession(false);
    setDirty(true);
    setHistory([]);
    resetSelection();
    setAdding(true);
  }

  function pickFlow(id: string, index: number) {
    const step = project?.flows?.find((f) => f.id === id)?.steps[index];
    if (!step) return;
    setFlowId(id);
    setFlowIndex(index);
    setWalkStep(null);
    setSelectedId(null);
    setSelectedEdgeId(step.edgeId);
    setInspectorOpen(true);
  }

  function switchView() {
    if (!project?.alternate) return;
    const { nodes, edges, flows } = project;
    const next = {
      ...project,
      ...project.alternate,
      alternate: { nodes, edges, flows },
      level: project.level === 'architecture' ? 'modules' : 'architecture',
    } as Project;
    edit(next);
    resetSelection();
    setQuery('');
    focusLegible(next, 300);
  }

  function applyProposal(proposal: Proposal) {
    if (!project || proposal.projectId !== project.id) return;
    const original =
      project.level === 'modules'
        ? { nodes: project.nodes, edges: project.edges, flows: project.flows }
        : project.alternate;
    const next = {
      ...project,
      ...proposal.graph,
      alternate: original,
      level: 'architecture',
      summary: proposal.summary,
    } as Project;
    edit(next);
    resetSelection();
    setQuery('');
    setView('Architecture');
    setNotice('Proposed map applied. Undo restores your previous view.');
    focusLegible(next, 300);
  }

  function navigate(next: string) {
    setView(next);
    setShowOpen(false);
    setSidebarOpen(false);
    if (next === 'Changes') setSessionReview(null);
    if (next === 'Flows' && project?.level === 'modules' && project.alternate) switchView();
  }

  const destinations = [
    { name: 'Architecture', icon: Network, hint: 'The big picture' },
    { name: 'Flows', icon: Play, hint: 'Follow source connections' },
    { name: 'Changes', icon: GitCompareArrows, hint: 'Review the working tree' },
    { name: 'Ask', icon: MessageSquare, hint: 'Understand a feature' },
  ];

  const descriptions: Record<string, string> = {
    Architecture: 'Understand the parts. Follow the evidence.',
    Flows: 'Explore source-supported journeys, one connection at a time.',
    Changes: 'See what changed and the surrounding source context.',
    Sessions: 'Track a local OpenCode task and review its actual changes.',
    Ask: 'Ask a question. Get an explanation grounded in your source.',
    Connections: 'Connect a model for understanding, or an agent for change review.',
  };

  const paletteCommands: Command[] = useMemo(
    () => [
      {
        id: 'view-arch',
        label: 'Go to Architecture overview',
        section: 'NAVIGATION',
        icon: Network,
        shortcut: '1',
        action: () => navigate('Architecture'),
      },
      {
        id: 'view-flows',
        label: 'Go to Feature flows',
        section: 'NAVIGATION',
        icon: Play,
        shortcut: '2',
        action: () => navigate('Flows'),
      },
      {
        id: 'view-changes',
        label: 'Go to Working-tree change review',
        section: 'NAVIGATION',
        icon: GitCompareArrows,
        shortcut: '3',
        action: () => navigate('Changes'),
      },
      {
        id: 'view-ask',
        label: 'Ask a feature question',
        section: 'NAVIGATION',
        icon: MessageSquare,
        shortcut: '4',
        action: () => navigate('Ask'),
      },
      {
        id: 'fit-map',
        label: 'Fit architecture map to viewport',
        section: 'ACTIONS',
        icon: Network,
        action: () => void fitView({ padding: 0.22, maxZoom: 1, duration: 250 }),
      },
      {
        id: 'switch-view',
        label:
          project?.level === 'architecture'
            ? 'Switch to source files view'
            : 'Switch to responsibilities view',
        section: 'ACTIONS',
        icon: Network,
        disabled: !project?.alternate,
        action: switchView,
      },
      {
        id: 'add-comp',
        label: 'Add custom architecture component',
        section: 'ACTIONS',
        icon: Plus,
        action: () => {
          setView('Architecture');
          setAdding(true);
        },
      },
      {
        id: 'undo',
        label: 'Undo last edit',
        section: 'ACTIONS',
        icon: Undo2,
        shortcut: '⌘Z',
        disabled: !history.length,
        action: undo,
      },
      {
        id: 'save',
        label: 'Save map to browser storage',
        section: 'ACTIONS',
        icon: Save,
        shortcut: '⌘S',
        action: save,
      },
      {
        id: 'export',
        label: 'Export portable .archmap.json',
        section: 'ACTIONS',
        icon: Download,
        action: () => project && downloadProject(project),
      },
      {
        id: 'open-repo',
        label: 'Open a local repository',
        section: 'PROJECT',
        icon: FolderOpen,
        action: () => {
          setView('Architecture');
          setShowOpen(true);
        },
      },
      {
        id: 'open-settings',
        label: 'Open Model & Agent Settings',
        section: 'PROJECT',
        icon: Settings2,
        action: () => setSettingsOpen(true),
      },
    ],
    [project, history.length],
  );

  const paletteComponents = useMemo(
    () =>
      project?.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        file: n.file,
        kind: n.kind,
      })) ?? [],
    [project],
  );

  return (
    <div className="wm-workspace">
      <aside className="wm-workspace-nav" aria-label="Workspace navigation">
        <Brand />
        <button
          className="wm-project-switcher"
          onClick={() => {
            setShowOpen(true);
            setView('Architecture');
          }}
        >
          <span className="wm-project-avatar">
            <FolderOpen size={18} />
          </span>
          <span>
            <strong>{project?.name || 'Your workspace'}</strong>
            <small>
              {project ? `${project.filesScanned} source files` : 'Open your first project'}
            </small>
          </span>
          <ChevronDown size={14} />
        </button>
        <span className="wm-nav-caption">WORKSPACE</span>
        <nav>
          {destinations.map(({ name, icon: Icon, hint }) => (
            <button
              key={name}
              aria-current={view === name && !showOpen ? 'page' : undefined}
              onClick={() => navigate(name)}
              title={hint}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === 'Flows' && project && <small>{project.flows?.length || 0}</small>}
            </button>
          ))}
        </nav>
        <div className="wm-nav-bottom">
          {onDashboard && (
            <button onClick={() => onDashboard()} type="button" title="Return to project dashboard">
              <LayoutGrid size={16} />
              All projects
            </button>
          )}
          <button onClick={() => fileInput.current?.click()} type="button">
            <Upload size={16} />
            Import map
          </button>
          <a href="/product-map.html" target="_blank" rel="noreferrer">
            <GitBranch size={16} />
            Capability map
          </a>
          <a href="https://github.com/ICEQ-JO/ArchMap#readme" target="_blank" rel="noreferrer">
            <CircleHelp size={16} />
            Documentation
          </a>
          <a href="#">
            <ArrowLeft size={16} />
            Back to site
          </a>
          <p>
            <ShieldCheck size={14} />
            Local repository access
          </p>
        </div>
      </aside>

      <div className="wm-workspace-content">
        <header className="wm-workspace-header">
          <div>
            <span className="wm-header-eyebrow">
              {project?.name || 'ARCHMAP'}
              {project?.mode === 'example' ? ' / EXAMPLE PROJECT' : ' / LOCAL WORKSPACE'}
            </span>
            <h1>{showOpen ? 'Open a project' : view}</h1>
          </div>
          <div className="wm-workspace-header-actions">
            <button
              className="wm-small-button"
              onClick={() => setPaletteOpen(true)}
              title="Command palette (⌘K)"
              type="button"
            >
              <Search size={15} />
              <span>⌘K</span>
            </button>
            <button
              className="wm-small-button"
              aria-label="Model and agent settings"
              onClick={() => navigate('Connections')}
              type="button"
            >
              <Settings2 size={15} />
              <span>Settings</span>
            </button>
            <button
              className="wm-small-button"
              aria-label="Open repository"
              onClick={() => {
                setView('Architecture');
                setShowOpen(true);
              }}
              type="button"
            >
              <FolderOpen size={15} />
              <span>Open repository</span>
            </button>
            <button
              className="wm-small-button"
              aria-label={saved ? 'Saved' : 'Save'}
              disabled={!project}
              onClick={save}
              type="button"
            >
              <Save size={15} />
              <span>{saved ? 'Saved' : dirty ? 'Save changes' : 'Save'}</span>
            </button>
            <button
              className="wm-small-button"
              aria-label="Export"
              disabled={!project}
              onClick={() => project && downloadProject(project)}
              type="button"
            >
              <Download size={15} />
              <span>Export</span>
            </button>
          </div>
        </header>

        {notice && (
          <div className="wm-workspace-notice" role="status">
            <Check size={16} />
            <span>{notice}</span>
            <button aria-label="Dismiss notice" onClick={() => setNotice('')} type="button">
              <X size={16} />
            </button>
          </div>
        )}
        {error && !showOpen && (
          <div className="wm-workspace-error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError('')} type="button">
              <X size={16} />
            </button>
          </div>
        )}

        {showOpen ? (
          <ProjectSetup
            status={status}
            loading={loading}
            error={error}
            hasProject={Boolean(project)}
            onOpen={(p, f) => {
              setPath(p);
              setFocus(f);
              void openProject(false, false, p, f);
            }}
            onExample={() => void openProject(true)}
            onImport={() => fileInput.current?.click()}
            onSketch={startSketch}
            onClose={() => setShowOpen(false)}
          />
        ) : (
          <>
            {view !== 'Changes' && view !== 'Connections' && (
              <div className="wm-page-intro">
                <p>{descriptions[view]}</p>
              </div>
            )}
            {view === 'Architecture' && (
              <main className="wm-architecture-page">
                {project ? (
                  <>
                    <div className="wm-project-facts">
                      <span>
                        <strong>{project.filesScanned}</strong> source files
                      </span>
                      <span>
                        <strong>{project.nodes.length}</strong>{' '}
                        {project.level === 'modules' ? 'files on map' : 'components'}
                      </span>
                      <span>
                        <strong>
                          {project.edges.filter((e) => e.origin === 'observed').length}
                        </strong>{' '}
                        observed connections
                      </span>
                      <span className="wm-map-origin">
                        {project.level === 'architecture'
                          ? 'Inferred boundaries · observed connections'
                          : 'Static imports · not runtime order'}
                      </span>
                    </div>
                    {project.edges.length < project.nodes.length / 2 &&
                      project.nodes.length > 2 && (
                        <div className="wm-coverage-notice">
                          <CircleHelp size={16} />
                          <span>
                            <strong>Sparse connections.</strong> Unconnected cards are not proof of
                            isolation. Try Source files, or ask about a feature.
                          </span>
                        </div>
                      )}
                    {project.warnings.some((w) => w.includes('Analysis limit')) && (
                      <div className="wm-coverage-notice">
                        Partial analysis. {project.filesScanned} files scanned. Open a smaller
                        folder or add a feature focus.
                      </div>
                    )}
                    <div className="wm-map-toolbar">
                      <div className="wm-toolbar-actions">
                        <button
                          aria-expanded={sidebarOpen}
                          onClick={() => setSidebarOpen(!sidebarOpen)}
                          type="button"
                        >
                          <Search size={15} />
                          Browse components
                        </button>
                        {project.alternate && (
                          <button aria-label="Switch map view" onClick={switchView} type="button">
                            <Network size={15} />
                            {project.level === 'architecture' ? 'Source files' : 'Responsibilities'}
                          </button>
                        )}
                        <button
                          onClick={() => void fitView({ padding: 0.22, maxZoom: 1, duration: 250 })}
                          type="button"
                        >
                          Fit map
                        </button>
                        {project.nodes.length > 2 &&
                          project.edges.length < project.nodes.length / 2 && (
                            <button
                              aria-label="Arrange map"
                              title="Arrange sparse components in a grid. Undo restores your layout."
                              onClick={() => {
                                edit(arrangeSparse(project));
                                setTimeout(
                                  () => void fitView({ padding: 0.22, maxZoom: 1, duration: 250 }),
                                  100,
                                );
                              }}
                              type="button"
                            >
                              <LayoutGrid size={15} />
                              <span>Arrange</span>
                            </button>
                          )}
                      </div>
                      <div className="wm-toolbar-actions">
                        <button
                          aria-label="Undo last edit"
                          disabled={!history.length}
                          onClick={undo}
                          type="button"
                        >
                          <Undo2 size={15} />
                          <span>Undo</span>
                        </button>
                        <button
                          aria-label="Component"
                          onClick={() => setAdding(!adding)}
                          type="button"
                        >
                          <Plus size={15} />
                          <span>Component</span>
                        </button>
                        <button
                          aria-label="Refresh"
                          disabled={loading || !project.root}
                          onClick={() => void openProject(project.mode === 'example', true)}
                          type="button"
                        >
                          <RefreshCw size={15} />
                          <span>Refresh</span>
                        </button>
                      </div>
                    </div>
                    {adding && (
                      <form className="wm-add-component-form" onSubmit={addComponent}>
                        <input
                          autoFocus
                          aria-label="New component name"
                          placeholder="Name your component"
                          maxLength={120}
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                        />
                        <button
                          className="wm-small-button"
                          disabled={!addName.trim()}
                          type="submit"
                        >
                          Add component
                        </button>
                        <button
                          className="wm-bare-icon"
                          aria-label="Cancel adding component"
                          type="button"
                          onClick={() => setAdding(false)}
                        >
                          <X size={15} />
                        </button>
                      </form>
                    )}

                    <div className="wm-map-stage">
                      {sidebarOpen && (
                        <aside className="wm-explorer" aria-label="Repository explorer">
                          <div className="wm-drawer-heading">
                            <strong>Components</strong>
                            <button
                              aria-label="Close component browser"
                              onClick={() => setSidebarOpen(false)}
                              type="button"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <label className="wm-component-search">
                            <Search size={16} />
                            <input
                              aria-label="Search components"
                              placeholder="Search name, file or symbol"
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                            />
                            {query && (
                              <button
                                aria-label="Clear component search"
                                onClick={() => setQuery('')}
                                type="button"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </label>
                          <div className="wm-component-list">
                            {filteredNodes.map((node) => {
                              const Icon = kindIcons[node.kind];
                              return (
                                <button
                                  key={node.id}
                                  className={selectedId === node.id ? 'wm-active' : ''}
                                  onClick={() => selectNode(node.id)}
                                  type="button"
                                >
                                  <Icon size={16} />
                                  <span>{node.label}</span>
                                </button>
                              );
                            })}
                            {!filteredNodes.length && <p>No components match “{query}”.</p>}
                          </div>
                        </aside>
                      )}
                      <div className="wm-canvas-area">
                        <ReactFlow
                          nodes={nodes}
                          edges={edges}
                          nodeTypes={nodeTypes}
                          onNodesChange={onNodesChange}
                          onNodeDragStop={(_, node) => {
                            const old = project.nodes.find((n) => n.id === node.id);
                            if (
                              old &&
                              (old.position.x !== node.position.x ||
                                old.position.y !== node.position.y)
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
                            setFlowId(null);
                            setSelectedId(node.id);
                            setSelectedEdgeId(null);
                            setInspectorOpen(true);
                          }}
                          onEdgeClick={(_, edge) => {
                            setFlowId(null);
                            setSelectedEdgeId(edge.id);
                            setSelectedId(null);
                            setInspectorOpen(true);
                          }}
                          onPaneClick={() => {
                            setSelectedId(null);
                            setSelectedEdgeId(null);
                          }}
                          onInit={(instance) => {
                            if (window.innerWidth < 640 && project.nodes[0]) {
                              const first = project.nodes[0].position;
                              setTimeout(
                                () =>
                                  void instance.setCenter(first.x + 122, first.y + 65, {
                                    zoom: 0.85,
                                  }),
                                180,
                              );
                            }
                          }}
                          fitView
                          fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
                          minZoom={0.1}
                          maxZoom={2}
                          deleteKeyCode={null}
                          colorMode="light"
                          proOptions={{ hideAttribution: false }}
                        >
                          <Background
                            variant={BackgroundVariant.Dots}
                            color="#d9ddd4"
                            gap={22}
                            size={1}
                          />
                          <Controls showInteractive={false} />
                          <MiniMap<ArchitectureFlowNode>
                            nodeColor={(n) =>
                              n.data.module?.origin === 'manual' ? '#c9bba3' : '#a6a69e'
                            }
                            maskColor="#f7f8f2bb"
                            pannable
                            zoomable
                          />
                        </ReactFlow>
                        {flowId ||
                        (walkStep === null &&
                          project.level === 'architecture' &&
                          !project.flows?.length) ? null : walkStep === null ? (
                          <button
                            className="wm-walk-launcher"
                            onClick={() => {
                              if (project.level === 'architecture' && project.flows?.length) {
                                pickFlow(project.flows[0].id, 0);
                                setView('Flows');
                              } else {
                                setWalkStart(selectedId ?? undefined);
                                setWalkStep(0);
                              }
                            }}
                            disabled={
                              project.level === 'architecture'
                                ? !project.flows?.length
                                : !walk.length
                            }
                            type="button"
                          >
                            <Play size={13} />
                            <span>
                              {project.level === 'architecture'
                                ? 'Explore guided flows'
                                : 'Walk dependencies'}
                            </span>
                            <span>
                              {project.level === 'architecture'
                                ? project.flows?.length
                                : walk.length}{' '}
                              {project.level === 'architecture' ? 'flows' : 'steps'}
                            </span>
                          </button>
                        ) : activeWalkEdge ? (
                          <div className="wm-walk-player">
                            <div className="wm-walk-player-top">
                              <Play size={12} />
                              <strong>Dependency walk</strong>
                              <span>
                                {walkStep + 1} / {walk.length}
                              </span>
                              <button
                                className="wm-bare-icon"
                                aria-label="Close dependency walk"
                                onClick={() => {
                                  setWalkStep(null);
                                  void fitView({ padding: 0.2, duration: 300 });
                                }}
                                type="button"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="wm-walk-player-main">
                              <button
                                className="wm-icon-button"
                                aria-label="Previous walk step"
                                disabled={walkStep === 0}
                                onClick={() => setWalkStep(walkStep - 1)}
                                type="button"
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
                                className="wm-icon-button"
                                aria-label="Next walk step"
                                disabled={walkStep === walk.length - 1}
                                onClick={() => setWalkStep(walkStep + 1)}
                                type="button"
                              >
                                <ChevronRight />
                              </button>
                            </div>
                            <div className="wm-walk-progress">
                              <span style={{ width: `${((walkStep + 1) / walk.length) * 100}%` }} />
                            </div>
                            <p className="wm-walk-disclaimer">Static dependency traversal.</p>
                          </div>
                        ) : (
                          <div className="wm-walk-player">
                            <p>No outgoing dependencies from this component.</p>
                            <button
                              className="wm-text-button"
                              onClick={() => setWalkStep(null)}
                              type="button"
                            >
                              Close walk
                            </button>
                          </div>
                        )}
                        <div className="wm-canvas-legend">
                          <span>
                            <i />
                            Source-supported
                          </span>
                          <span>
                            <i />
                            Manual
                          </span>
                        </div>
                      </div>
                      {inspectorOpen && (selected || selectedEdge) && (
                        <aside className="wm-inspector" aria-label="Source inspector">
                          <div className="wm-drawer-heading">
                            <strong>Source inspector</strong>
                            <button
                              aria-label="Close source inspector"
                              onClick={() => {
                                resetSelection();
                                setInspectorOpen(false);
                              }}
                              type="button"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="wm-inspector-scroll">
                            <div className="wm-inspector-detail-heading">
                              <span className="wm-detail-kind">
                                {selected?.kind || 'connection'}
                              </span>
                              <span
                                className={`wm-origin-tag ${selected?.origin === 'manual' || selectedEdge?.origin === 'manual' ? 'manual' : ''}`}
                              >
                                {(selected?.origin || selectedEdge?.origin) === 'manual'
                                  ? 'MANUAL'
                                  : (selected?.origin || selectedEdge?.origin) === 'inferred'
                                    ? 'INFERRED'
                                    : 'OBSERVED'}
                              </span>
                            </div>
                            <h2>
                              {selected?.label ||
                                `${project?.nodes.find((n) => n.id === selectedEdge?.source)?.label} → ${project?.nodes.find((n) => n.id === selectedEdge?.target)?.label}`}
                            </h2>
                            {selected?.file && <p className="wm-detail-path">{selected.file}</p>}
                            <p className="wm-detail-description">
                              {selected?.description ||
                                (selectedEdge?.origin === 'manual'
                                  ? 'User-authored relationship. No source evidence.'
                                  : selectedEdge?.origin === 'inferred'
                                    ? 'Proposed relationship. Check the source below.'
                                    : 'Supporting source below.')}
                            </p>
                            {selected && (
                              <>
                                <div className="wm-detail-stats">
                                  <span>{selected.lines} lines</span>
                                  <span>
                                    {selected.members?.length ?? 1}{' '}
                                    {(selected.members?.length ?? 1) === 1 ? 'file' : 'files'}
                                  </span>
                                  <span>
                                    {project?.edges.filter((e) => e.source === selected.id).length}{' '}
                                    dependencies
                                  </span>
                                </div>
                                {project &&
                                  (
                                    [
                                      ['Depends on', 'target'],
                                      ['Used by', 'source'],
                                    ] as const
                                  ).map(([title, end]) => {
                                    const ids = [
                                      ...new Set(
                                        project.edges
                                          .filter(
                                            (e) =>
                                              e[end === 'target' ? 'source' : 'target'] ===
                                              selected.id,
                                          )
                                          .map((e) => e[end]),
                                      ),
                                    ].filter((id) => id !== selected.id);
                                    if (!ids.length) return null;
                                    return (
                                      <div className="wm-detail-links" key={title}>
                                        <h3>
                                          {title} <span>{ids.length}</span>
                                        </h3>
                                        <ul>
                                          {ids.map((id) => {
                                            const target = project.nodes.find((n) => n.id === id);
                                            return (
                                              <li key={id}>
                                                <button
                                                  onClick={() => selectNode(id)}
                                                  type="button"
                                                >
                                                  {target?.label ?? id}
                                                </button>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    );
                                  })}
                                {selected.members && (
                                  <details className="wm-member-files">
                                    <summary>Source files ({selected.members.length})</summary>
                                    {selected.members.map((file) => (
                                      <code key={file}>{file}</code>
                                    ))}
                                  </details>
                                )}
                                <label className="wm-edit-field">
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
                                <label className="wm-edit-field">
                                  Responsibility
                                  <textarea
                                    key={`description-${selected.id}`}
                                    defaultValue={selected.description}
                                    rows={3}
                                    maxLength={2000}
                                    onBlur={(event) => {
                                      if (project && event.target.value !== selected.description)
                                        edit({
                                          ...project,
                                          nodes: project.nodes.map((n) =>
                                            n.id === selected.id
                                              ? { ...n, description: event.target.value }
                                              : n,
                                          ),
                                        });
                                    }}
                                  />
                                </label>
                                {selected.exports.length > 0 && (
                                  <div className="wm-export-symbols">
                                    <h3>Exported symbols</h3>
                                    {selected.exports.map((name) => (
                                      <code key={name}>{name}</code>
                                    ))}
                                  </div>
                                )}
                                <button
                                  className="inspect-walk wm-text-button"
                                  onClick={() => {
                                    setWalkStart(selected.id);
                                    setWalkStep(0);
                                  }}
                                  type="button"
                                >
                                  <Play size={12} /> Walk from this component{' '}
                                  <ArrowRight size={12} />
                                </button>
                              </>
                            )}
                            <div className="wm-evidence-section-heading">
                              <h3>Source evidence</h3>
                              <span>{selectedEvidence.length}</span>
                            </div>
                            {selectedEvidence.length ? (
                              selectedEvidence.map((e) => <EvidenceCard key={e.id} evidence={e} />)
                            ) : (
                              <p className="wm-inspector-help">
                                No source evidence is attached to this manual component or
                                connection.
                              </p>
                            )}
                            <button
                              className="wm-delete-selection"
                              onClick={removeSelection}
                              type="button"
                            >
                              <Trash2 size={13} /> Remove {selected ? 'component' : 'connection'}
                              <span>Undo available</span>
                            </button>
                          </div>
                        </aside>
                      )}
                    </div>
                    <footer className="wm-map-statusbar">
                      <span>
                        {project.revision?.slice(0, 7) || 'Unversioned'} ·{' '}
                        {dirty ? 'Unsaved edits' : 'Source snapshot'}
                      </span>
                      <span>Read-only · repository code is never executed</span>
                    </footer>
                  </>
                ) : (
                  <EmptyState
                    icon={Network}
                    title="Your system, in context."
                    description="Open a local JavaScript or TypeScript repository to begin, or explore a working example."
                  >
                    <button
                      className="wm-button wm-primary"
                      onClick={() => setShowOpen(true)}
                      type="button"
                    >
                      Open repository
                    </button>
                    <button
                      className="wm-button"
                      onClick={() => void openProject(true)}
                      type="button"
                    >
                      Explore Image Studio <ArrowRight size={16} />
                    </button>
                  </EmptyState>
                )}
              </main>
            )}
            {view === 'Flows' && (
              <main className="wm-flows-page">
                <aside className="wm-flow-library">
                  <span className="wm-nav-caption">SOURCE-SUPPORTED FLOWS</span>
                  {project?.flows?.length ? (
                    project.flows.map((f) => (
                      <button
                        key={f.id}
                        aria-current={flowId === f.id ? 'step' : undefined}
                        onClick={() => pickFlow(f.id, 0)}
                        type="button"
                      >
                        <Play size={16} />
                        <span>
                          <strong>{f.title}</strong>
                          <small>{f.steps.length} source connections</small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))
                  ) : (
                    <div className="wm-empty-copy">
                      <h2>No supported flows resolved.</h2>
                      <p>
                        This scan found no named source-call journeys. Framework routing and runtime
                        behavior may be missing from static analysis.
                      </p>
                      <button onClick={() => navigate('Architecture')} type="button">
                        Explore the source map
                      </button>
                      <button onClick={() => navigate('Ask')} type="button">
                        Ask about a feature
                      </button>
                    </div>
                  )}
                </aside>
                <section className="wm-flow-detail">
                  {activeFlow ? (
                    <>
                      <FlowInspector
                        flows={project?.flows ?? []}
                        activeId={flowId}
                        index={flowIndex}
                        onSelect={pickFlow}
                        onClose={() => {
                          setFlowId(null);
                          setSelectedEdgeId(null);
                        }}
                      />
                      <div className="wm-flow-source">
                        <h3>Source evidence</h3>
                        {selectedEvidence.map((e) => (
                          <EvidenceCard key={e.id} evidence={e} />
                        ))}
                        <button
                          className="wm-small-button"
                          onClick={() => {
                            setView('Architecture');
                            setInspectorOpen(true);
                          }}
                          type="button"
                        >
                          Show this connection on the map <ArrowRight size={15} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      icon={Play}
                      title="Follow the connections."
                      description="Choose a flow from the library to read its steps alongside supporting source evidence."
                    />
                  )}
                </section>
              </main>
            )}
            {view === 'Changes' && (
              <main className="wm-review-page">
                {project?.root ? (
                  <>
                    <div className="wm-changes-agent-entry">
                      <span>
                        <Cable size={15} /> Following a coding agent?
                      </span>
                      <button
                        className="wm-small-button"
                        onClick={() => navigate('Sessions')}
                        type="button"
                      >
                        Track an agent task <ArrowRight size={14} />
                      </button>
                    </div>
                    <ChangesPanel
                      embedded
                      key={sessionReview?.report.current.analyzedAt ?? 'git-review'}
                      initialReport={sessionReview?.report}
                      sessionTitle={sessionReview?.title}
                      sessionRequest={sessionReview?.request}
                      onRefresh={
                        sessionReview
                          ? () => request<Comparison>('/api/opencode/review', {})
                          : undefined
                      }
                      root={project.root}
                      focus={project.focus ?? ''}
                      onClose={() => {
                        setView('Architecture');
                      }}
                    />
                  </>
                ) : (
                  <EmptyState
                    icon={GitCompareArrows}
                    title="Review a real repository."
                    description="Open a local Git repository to compare any commit, tag, or branch with your active working tree."
                  >
                    <button
                      className="wm-button wm-primary"
                      onClick={() => setShowOpen(true)}
                      type="button"
                    >
                      Open repository
                    </button>
                  </EmptyState>
                )}
              </main>
            )}
            {view === 'Sessions' && (
              <main className="wm-task-page">
                <div className="wm-task-context">
                  <button
                    className="wm-text-button"
                    onClick={() => navigate('Changes')}
                    type="button"
                  >
                    <ArrowLeft size={14} /> Back to changes
                  </button>
                  <span className="wm-nav-caption">CODING AGENT</span>
                  <h2>Keep up with your agent.</h2>
                  <p>
                    Connect your local OpenCode server, capture a baseline, then work in OpenCode.
                    ArchMap reviews the source changes when the task finishes.
                  </p>
                  <div className="wm-process-strip">
                    <span>01 Connect</span>
                    <ArrowRight size={14} />
                    <span>02 Track a task</span>
                    <ArrowRight size={14} />
                    <span>03 Review changes</span>
                  </div>
                  <p className="wm-subtle">
                    Read-only session access. This connection does not send prompts to your agent.
                  </p>
                </div>
                <OpenCodePanel
                  reviewedTurns={reviewedTurns.current}
                  key={project?.root ?? ''}
                  root={project?.root ?? ''}
                  focus={project?.focus ?? ''}
                  onReview={(report, title, request) => {
                    setSessionReview({ report, title, request });
                    setView('Changes');
                  }}
                />
              </main>
            )}
            {
              <main className="wm-ask-page" hidden={view !== 'Ask'}>
                <div className="wm-ask-context">
                  <span className="wm-nav-caption">
                    {status?.ai ? 'MODEL CONNECTED' : 'LOCAL SOURCE SEARCH'}
                  </span>
                  <span>
                    {status?.ai
                      ? status.model
                      : 'Connect a model for AI explanations and feature proposals.'}
                  </span>
                  <button
                    onClick={() => {
                      setSettingsOpen(true);
                      navigate('Connections');
                    }}
                    type="button"
                  >
                    Connections <ArrowRight size={14} />
                  </button>
                </div>
                <MapAgent
                  key={project?.id ?? 'empty'}
                  project={project}
                  available={Boolean(status?.ai)}
                  model={status?.model ?? null}
                  live={serverSession}
                  selectedId={selectedId ?? undefined}
                  onApply={applyProposal}
                />
              </main>
            }
            {view === 'Connections' && (
              <main className="wm-connections-page">
                <button
                  className="wm-text-button"
                  onClick={() => navigate('Architecture')}
                  type="button"
                >
                  <ArrowLeft size={14} /> Back to architecture
                </button>
                <section className="wm-connection-card">
                  <div className="wm-connection-label">
                    <Settings2 size={22} />
                    <span>
                      <strong>Understanding model</strong>
                      <small>Explain source and propose feature maps</small>
                    </span>
                    <span className="wm-connection-state">
                      {status?.ai ? 'Connected' : 'Optional'}
                    </span>
                  </div>
                  <ModelSettings status={status} onChange={setStatus} />
                </section>
                <div className="wm-connection-secondary">
                  <section className="wm-connection-card">
                    <Cable size={24} />
                    <h2>Coding agent</h2>
                    <p>
                      OpenCode has its own connection. Use Sessions to track a task and review the
                      resulting source changes.
                    </p>
                    <button
                      className="wm-small-button"
                      onClick={() => navigate('Sessions')}
                      type="button"
                    >
                      Open sessions <ArrowRight size={15} />
                    </button>
                  </section>
                  <section className="wm-connection-card">
                    <Network size={24} />
                    <span className="wm-planned-label">PLANNED</span>
                    <h2>Live services</h2>
                    <p>
                      Runtime service connections and traces are on the roadmap. Current maps
                      describe static source relationships.
                    </p>
                    <a
                      className="wm-small-button"
                      href="/product-map.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View capability map <ArrowRight size={15} />
                    </a>
                  </section>
                </div>
              </main>
            )}
          </>
        )}
      </div>

      {/* Slide-over Settings panel */}
      <SettingsPanel
        open={settingsOpen && view !== 'Connections'}
        onClose={() => setSettingsOpen(false)}
        status={status}
        onStatusChange={setStatus}
        onOpenAgent={() => navigate('Sessions')}
      />

      {/* Command Palette (⌘K) */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands}
        components={paletteComponents}
        onSelectComponent={(id) => {
          setView('Architecture');
          selectNode(id);
        }}
      />

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
