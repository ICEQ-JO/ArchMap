import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  ChevronRight,
  Copy,
  Database,
  FileCode2,
  FolderOpen,
  GitBranch,
  Menu,
  Network,
  Play,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { Brand, Github, Mark } from './Brand';
import './Landing.css';

const github = 'https://github.com/ICEQ-JO/ArchMap';
const install =
  'git clone https://github.com/ICEQ-JO/ArchMap.git\ncd ArchMap\nnpm install\nnpm run dev';
const areas = [
  {
    id: 'api',
    name: 'Generation API',
    type: 'ENTRY',
    file: 'src/api/generate.ts',
    line: 6,
    code: 'const user = authenticate(token);',
    x: 18,
    y: 42,
    icon: Braces,
    detail: 'Starts the request. Checks identity, reserves a credit, then queues the work.',
  },
  {
    id: 'auth',
    name: 'Identity',
    type: 'SERVICE',
    file: 'src/services/auth.ts',
    line: 1,
    code: 'export function authenticate(token: string) {',
    x: 50,
    y: 17,
    icon: ShieldCheck,
    detail: 'The authentication boundary, called by the generation API.',
  },
  {
    id: 'credits',
    name: 'Credits',
    type: 'SERVICE',
    file: 'src/api/generate.ts',
    line: 8,
    code: 'reserveCredits(user.id, 1);',
    x: 82,
    y: 17,
    icon: GitBranch,
    detail: 'The generation API reserves a credit before it submits a job.',
  },
  {
    id: 'queue',
    name: 'Job queue',
    type: 'SERVICE',
    file: 'src/api/generate.ts',
    line: 9,
    code: 'return enqueue({ userId: user.id, prompt });',
    x: 50,
    y: 42,
    icon: Network,
    detail: 'A shared queue connects the request handler and the background worker.',
  },
  {
    id: 'worker',
    name: 'Worker',
    type: 'SERVICE',
    file: 'src/services/worker.ts',
    line: 9,
    code: 'const image = await requestImage(job.prompt);',
    x: 82,
    y: 42,
    icon: Braces,
    detail: 'Picks up a queued job and calls the configured image provider.',
  },
  {
    id: 'storage',
    name: 'File storage',
    type: 'DATA',
    file: 'src/services/worker.ts',
    line: 10,
    code: 'const url = await saveImage(image);',
    x: 50,
    y: 68,
    icon: FolderOpen,
    detail: 'The worker saves the generated image and receives its URL.',
  },
  {
    id: 'database',
    name: 'Database',
    type: 'DATA',
    file: 'src/services/worker.ts',
    line: 11,
    code: "return saveGeneration({ userId: job.userId, url, status: 'complete' });",
    x: 82,
    y: 68,
    icon: Database,
    detail: 'The worker records the generation result for later retrieval.',
  },
];
const lines = [
  ['api', 'auth', 'M115 193 H210 V78 H320'],
  ['api', 'credits', 'M115 193 H190 V42 H525 V78'],
  ['api', 'queue', 'M115 193 H320'],
  ['worker', 'queue', 'M525 193 H320'],
  ['worker', 'storage', 'M525 193 H422 V313 H320'],
  ['worker', 'database', 'M525 193 V313'],
];

function Terrain({ muted = false }: { muted?: boolean }) {
  const blocks = Array.from({ length: 27 }, (_, row) =>
    Array.from({ length: 38 }, (_, col) => {
      const wave = Math.sin(col * 0.29 + row * 0.14) * 4 + Math.cos(row * 0.4 - col * 0.12) * 3;
      const band = Math.floor((row + wave) / 3);
      return (
        <rect
          key={`${row}-${col}`}
          x={col * 18}
          y={row * 18}
          width="18"
          height="18"
          fill={
            (muted
              ? ['#e2e2d9', '#d7d7cc', '#cacabc', '#b8b8a8', '#a7a795']
              : ['#f1be67', '#eab15b', '#dfa24f', '#d39343', '#c58438'])[((band % 5) + 5) % 5]
          }
        />
      );
    }),
  );
  return (
    <svg
      className="atlas-terrain"
      viewBox="0 0 684 486"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {blocks}
    </svg>
  );
}

function SourceAtlas() {
  const [selected, setSelected] = useState('api');
  const area = areas.find((a) => a.id === selected)!;
  return (
    <div className="source-atlas" aria-label="Interactive Image Studio architecture example">
      <div className="atlas-heading">
        <span>
          <Mark size={14} />
          image-studio
        </span>
        <span>ILLUSTRATIVE SOURCE</span>
      </div>
      <div className="atlas-field">
        <Terrain />
        <svg
          className="atlas-wires"
          viewBox="0 0 640 460"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="atlas-arrow"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 0 9 5 0 10z" fill="currentColor" />
            </marker>
          </defs>
          {lines.map(([from, to, d]) => (
            <path
              key={`${from}-${to}`}
              d={d}
              className={selected === from || selected === to ? 'is-lit' : ''}
              markerEnd="url(#atlas-arrow)"
            />
          ))}
        </svg>
        {areas.map(({ id, name, type, x, y, icon: Icon }) => (
          <button
            key={id}
            className={`atlas-node ${selected === id ? 'is-active' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-pressed={selected === id}
            aria-label={`Inspect ${name}`}
            onClick={() => setSelected(id)}
          >
            <span>
              <Icon size={12} />
              {type}
              <i />
            </span>
            <strong>{name}</strong>
            <small>
              {id === 'api'
                ? 'generateImage()'
                : id === 'worker'
                  ? 'processNextJob()'
                  : 'source-backed'}
            </small>
          </button>
        ))}
        <div className="atlas-hint">
          <span className="atlas-cross">+</span> Pick a component. Follow the source.
        </div>
      </div>
      <div className="atlas-evidence" aria-live="polite">
        <div>
          <FileCode2 size={13} />
          <span>
            {area.file}:{area.line}
          </span>
          <span>SOURCE</span>
        </div>
        <code>{area.code}</code>
        <p>{area.detail}</p>
      </div>
      <p className="atlas-footnote">
        Inferred areas · static source relationships, not a runtime trace.
      </p>
    </div>
  );
}

const views = [
  {
    label: 'Understand a system',
    title: 'Find your way into a codebase.',
    body: 'Start with a responsibility overview. Switch to source files, inspect a connection, and see the code that put it on the map.',
    action: 'Explore the example',
    kind: 'map',
  },
  {
    label: 'Follow a feature',
    title: 'Follow the feature. Keep the source.',
    body: 'Step through a named source flow with the relevant snippet beside you. Every observed connection has a file, line range, and content hash.',
    action: 'Explore the example',
    kind: 'flow',
  },
  {
    label: 'Review a change',
    title: 'See what changed around the code.',
    body: 'Compare a Git revision with your working tree. Inspect affected responsibilities, dependency changes, and before-and-after source.',
    action: 'Explore the example',
    kind: 'changes',
  },
];

function ProductPreview({ view }: { view: number }) {
  return (
    <div className="landing-preview">
      <div className="preview-top">
        <span>
          <Mark size={15} />
          archmap.
        </span>
        <span>
          image-studio <ChevronRight size={12} />
          {view === 2 ? 'Changes' : view === 1 ? 'Flows' : 'Architecture'}
        </span>
        <span className="preview-local">Local workspace</span>
      </div>
      <div className="preview-body">
        <aside>
          <span>WORKSPACE</span>
          {['Architecture', 'Flows', 'Changes', 'Sessions', 'Ask'].map((name, i) => (
            <div
              key={name}
              className={i === (view === 2 ? 2 : view === 1 ? 1 : 0) ? 'is-active' : ''}
            >
              {i === 0 ? (
                <Network size={14} />
              ) : i === 1 ? (
                <Play size={14} />
              ) : i === 2 ? (
                <GitBranch size={14} />
              ) : i === 3 ? (
                <Terminal size={14} />
              ) : (
                <Braces size={14} />
              )}
              <span>{name}</span>
            </div>
          ))}
        </aside>
        {view === 0 ? (
          <div className="preview-map">
            <svg viewBox="0 0 650 360" aria-hidden="true">
              <path
                d="M130 180 H255 V85 H415 M255 180 H415 M480 205 V285 H255"
                fill="none"
                stroke="#a7a79d"
              />
              {[
                [45, 150, 'Generation API', 'generateImage()'],
                [325, 55, 'Identity & access', 'authenticate()'],
                [325, 150, 'Job queue', 'enqueue()'],
                [165, 255, 'File storage', 'saveImage()'],
              ].map(([x, y, title, code]) => (
                <g key={title} transform={`translate(${x} ${y})`}>
                  <rect width="180" height="72" rx="5" fill="#fff" stroke="#c7c7ba" />
                  <text x="15" y="21" fontSize="8" fill="#78786c">
                    INFERRED RESPONSIBILITY
                  </text>
                  <text x="15" y="41" fontSize="13" fill="#25251f">
                    {title}
                  </text>
                  <text x="15" y="59" fontSize="9" fill="#78786c">
                    {code}
                  </text>
                </g>
              ))}
            </svg>
            <div className="preview-mobile-map">
              <div className="mobile-map-entry">
                <strong>Generation API</strong>
                <code>generateImage()</code>
              </div>
              <svg viewBox="0 0 280 44" aria-hidden="true">
                <path d="M140 0 V20 H65 V44 M140 20 H215 V44" fill="none" stroke="#9b9b8e" />
              </svg>
              <div className="mobile-map-targets">
                <div>
                  <strong>Identity</strong>
                  <code>authenticate()</code>
                </div>
                <div>
                  <strong>Job queue</strong>
                  <code>enqueue()</code>
                </div>
              </div>
              <p>
                Two imports from the generation API.
                <br />
                Select a connection in the workspace to inspect its source.
              </p>
            </div>
            <span className="preview-caption">
              Source-backed connections. A map you can inspect.
            </span>
          </div>
        ) : view === 1 ? (
          <div className="preview-flow">
            <div>
              <span className="preview-label">Generate Image</span>
              <h4>Authenticate</h4>
              <p>generateImage calls authenticate.</p>
              <div className="preview-steps">
                <b>1</b>
                <span>2</span>
                <span>3</span>
              </div>
            </div>
            <div className="preview-source">
              <span>src/api/generate.ts:6</span>
              <code>
                <i>6</i> const user = <em>authenticate</em>(token);
              </code>
              <small>Source evidence · SHA-256 snapshot</small>
            </div>
          </div>
        ) : (
          <div className="preview-change">
            <div className="preview-change-heading">
              <span>Illustrative review</span>
              <strong>Authentication dependency replaced</strong>
            </div>
            <div>
              <span>Before</span>
              <code className="diff-old">− authenticate(token)</code>
            </div>
            <div>
              <span>After</span>
              <code className="diff-new">+ validateSession(token)</code>
            </div>
            <p>Review the source and surrounding dependencies before accepting a change.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Landing({
  open,
  onDashboard,
}: {
  open: (example: boolean) => void;
  onDashboard?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [view, setView] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [step, setStep] = useState(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menu]);
  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(install);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className="atlas-landing">
      <a className="atlas-skip" href="#main">
        Skip to content
      </a>
      <header className="atlas-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#inside">The product</a>
          <a href="#workflow">How it works</a>
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              if (onDashboard) onDashboard();
              else location.hash = 'dashboard';
            }}
          >
            Dashboard
          </a>
          <a href={`${github}#readme`} target="_blank" rel="noreferrer">
            Documentation <ArrowUpRight size={12} />
          </a>
        </nav>
        <div>
          <a
            className="atlas-github"
            href={github}
            target="_blank"
            rel="noreferrer"
            aria-label="ArchMap on GitHub"
          >
            <Github size={18} />
            <span>Star on GitHub</span>
          </a>
          <button className="atlas-button ink" onClick={() => open(false)}>
            Open workspace <ArrowUpRight size={15} />
          </button>
          <button
            ref={menuButton}
            className="atlas-menu-button"
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menu}
            aria-controls="atlas-mobile-nav"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      {menu && (
        <nav id="atlas-mobile-nav" className="atlas-mobile-nav" aria-label="Mobile navigation">
          <a href="#inside" onClick={() => setMenu(false)}>
            The product
          </a>
          <a href="#workflow" onClick={() => setMenu(false)}>
            How it works
          </a>
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setMenu(false);
              if (onDashboard) onDashboard();
              else location.hash = 'dashboard';
            }}
          >
            Dashboard
          </a>
          <a href={`${github}#readme`}>
            Documentation <ArrowUpRight size={15} />
          </a>
          <button onClick={() => open(false)}>
            Open workspace <ArrowUpRight size={15} />
          </button>
        </nav>
      )}
      <main id="main">
        <section className="atlas-hero" aria-labelledby="atlas-title">
          <div className="atlas-hero-copy">
            <h1 id="atlas-title">
              Build with AI.
              <br />
              Keep the
              <br />
              <span>big picture.</span>
            </h1>
            <p>
              Turn your codebase into a map you can follow. Understand the system, trace a feature,
              and see what your coding agent changed.
            </p>
            <div className="atlas-hero-actions">
              <button
                className="atlas-button ink"
                onClick={() => open(true)}
                aria-label="Explore a live example"
              >
                Explore a live example <ArrowRight size={17} />
              </button>
              <button className="atlas-text-link" onClick={() => open(false)}>
                Open your repository <ArrowUpRight size={15} />
              </button>
            </div>
            <p className="atlas-hero-note">
              <span />
              Open source. On your machine. In your hands.
            </p>
          </div>
          <SourceAtlas />
          <div className="atlas-hero-bottom">
            <span>SOFTWARE MAKES MORE SENSE WHEN YOU CAN SEE IT.</span>
            <a href="#inside">
              Take a closer look <ArrowDown size={15} />
            </a>
          </div>
        </section>
        <div className="atlas-capabilities">
          <span>JavaScript & TypeScript</span>
          <i />
          <span>Local source analysis</span>
          <i />
          <span>Bring your own model</span>
          <i />
          <a href={`${github}/blob/main/LICENSE`}>
            MIT licensed <ArrowUpRight size={12} />
          </a>
        </div>
        <section className="atlas-product atlas-section" id="inside">
          <div className="atlas-section-heading">
            <h2>
              A map for the part
              <br />
              you’re trying to understand.
            </h2>
            <p>
              Opening files is easy. Seeing how they fit together takes context. Keep that context
              next to the code.
            </p>
          </div>
          <div className="atlas-product-layout">
            <div className="atlas-product-copy">
              <div className="atlas-view-tabs" role="tablist" aria-label="Explore ArchMap features">
                {views.map((item, i) => (
                  <button
                    key={item.kind}
                    id={`feature-tab-${i}`}
                    role="tab"
                    aria-selected={view === i}
                    aria-controls="feature-panel"
                    tabIndex={view === i ? 0 : -1}
                    onClick={() => setView(i)}
                    onKeyDown={(event) => {
                      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                        event.preventDefault();
                        const next =
                          event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? 2
                              : (i + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                        setView(next);
                        document.getElementById(`feature-tab-${next}`)?.focus();
                      }
                    }}
                  >
                    {item.label}
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
              <div id="feature-panel" role="tabpanel" aria-labelledby={`feature-tab-${view}`}>
                <h3>{views[view].title}</h3>
                <p>{views[view].body}</p>
                <button className="atlas-text-link" onClick={() => open(true)}>
                  {views[view].action} <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
            <ProductPreview view={view} />
          </div>
          <p className="atlas-preview-note">
            Illustrative Image Studio project. Static source relationships are not runtime traces.{' '}
            <button onClick={() => open(true)}>
              Try it in the real workspace <ArrowRight size={13} />
            </button>
          </p>
        </section>
        <section className="atlas-workflow" id="workflow">
          <div className="atlas-workflow-heading">
            <h2>
              The agent writes code.
              <br />
              <span>You keep the context.</span>
            </h2>
            <p>Give fast-moving development a place to slow down and understand.</p>
          </div>
          <div className="atlas-workflow-layout">
            <div className="atlas-workflow-steps">
              {[
                [
                  'Start with your source.',
                  'Open a local repository. ArchMap reads your JavaScript and TypeScript without running the project.',
                ],
                [
                  'Follow the connections.',
                  'Explore inferred responsibilities and named flows. Ask a question locally, or connect your own model for deeper explanations.',
                ],
                [
                  'Review what actually changed.',
                  'Compare your Git working tree, or track a local OpenCode task from a captured source baseline.',
                ],
              ].map(([title, body], i) => (
                <button key={title} aria-pressed={step === i} onClick={() => setStep(i)}>
                  <span className="workflow-step-number">{i + 1}</span>
                  <span>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
            <div className="atlas-source-window">
              <div className="source-window-top">
                <span>
                  <FileCode2 size={14} />
                  {step === 2
                    ? 'Working-tree review'
                    : step === 1
                      ? 'src/api/generate.ts'
                      : 'Local repository'}
                </span>
                <span>
                  {step === 2 ? 'READ-ONLY' : step === 1 ? 'SOURCE EVIDENCE' : 'STATIC ANALYSIS'}
                </span>
              </div>
              {step === 0 ? (
                <div className="atlas-file-tree">
                  <p>
                    <FolderOpen size={16} /> image-studio/
                  </p>
                  <p>
                    ├─ src/api/<span>generate.ts</span>
                  </p>
                  <p>└─ src/services/</p>
                  <p>
                    　├─ <span>auth.ts</span>
                  </p>
                  <p>
                    　├─ <span>queue.ts</span>
                  </p>
                  <p>
                    　├─ <span>worker.ts</span>
                  </p>
                  <p>
                    　└─ <span>storage.ts</span>
                  </p>
                  <small className="file-tree-note">
                    Selected files from the included example.
                  </small>
                  <div>
                    <Network size={17} />
                    <span>
                      Source files become components.
                      <br />
                      Observed imports become connections.
                    </span>
                  </div>
                </div>
              ) : step === 1 ? (
                <div className="atlas-source-code">
                  <p>
                    <span>5</span>
                    <b>export async function</b> generateImage(token, prompt) {'{'}
                  </p>
                  <p className="source-line-active">
                    <span>6</span> const user = <em>authenticate</em>(token);
                  </p>
                  <p>
                    <span>7</span> <b>if</b> (!prompt.trim()) <b>throw new</b> Error(…);
                  </p>
                  <p>
                    <span>8</span> <em>reserveCredits</em>(user.id, 1);
                  </p>
                  <p>
                    <span>9</span> <b>return</b> <em>enqueue</em>({'{'} userId: user.id, prompt{' '}
                    {'}'});
                  </p>
                  <p>
                    <span>10</span>
                    {'}'}
                  </p>
                  <div>
                    <ShieldCheck size={16} />
                    <span>
                      File, line range, snippet, content hash.
                      <br />
                      Evidence you can check yourself.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="atlas-review-demo">
                  <p>
                    OpenCode task <span>Illustrative workflow</span>
                  </p>
                  <h3>Update authentication</h3>
                  <div>
                    <span>Capture source</span>
                    <ArrowRight size={16} />
                    <span>Work in OpenCode</span>
                    <ArrowRight size={16} />
                    <span>Review changes</span>
                  </div>
                  <p>
                    ArchMap compares source on disk against your captured baseline, including edits
                    made outside the agent.
                  </p>
                  <small>Read-only adapter. No prompts or tools sent to OpenCode.</small>
                </div>
              )}
            </div>
          </div>
          <div className="atlas-boundary">
            <ShieldCheck size={18} />
            <p>
              <strong>Your source stays local during analysis.</strong> A model receives relevant
              snippets only when you explicitly ask a question.
            </p>
            <a href={`${github}#how-it-works`}>
              Read the boundaries <ArrowUpRight size={14} />
            </a>
          </div>
        </section>
        <section className="atlas-open-source atlas-section" id="start">
          <div>
            <Mark size={36} />
            <h2>
              Your codebase.
              <br />
              Your map.
              <br />
              <span>Your rules.</span>
            </h2>
            <p>
              Open source, MIT licensed, and useful without a model key. Edit the map, keep a
              portable JSON copy, and make ArchMap your own.
            </p>
            <a href={github} className="atlas-text-link" target="_blank" rel="noreferrer">
              Build it with us <Github size={16} />
              <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="atlas-start">
            <h3>Take the first step.</h3>
            <p>Node.js 22.12+ and Git. That’s your starting point.</p>
            <div className="atlas-install">
              <div>
                <span>
                  <Terminal size={15} />
                  Terminal
                </span>
                <button onClick={() => void copyInstall()} aria-label="Copy installation commands">
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre>
                <code>{install}</code>
              </pre>
            </div>
            {copyError && (
              <p role="status" className="atlas-copy-error">
                Copy unavailable. Select the commands above.
              </p>
            )}
            <p className="atlas-start-note">
              Then open <code>localhost:4310</code> in your browser.
            </p>
            <button className="atlas-button ink" onClick={() => open(true)}>
              Try the example first <ArrowRight size={16} />
            </button>
            <div className="atlas-questions">
              <details>
                <summary>Does it work with my project?</summary>
                <p>
                  ArchMap reads local JavaScript and TypeScript repositories, with TypeScript path
                  aliases. Scans are bounded to 400 source files and 8 MB. Framework-aware runtime
                  behavior and other languages are on the roadmap.
                </p>
              </details>
              <details>
                <summary>Do I need an AI model?</summary>
                <p>
                  No. Source mapping, guided flows, Git reviews, and local evidence search work
                  without a model. Connect an OpenAI-compatible endpoint for AI explanations and
                  model-generated proposals.
                </p>
              </details>
              <details>
                <summary>Can I use my coding agent?</summary>
                <p>
                  The current integration connects read-only to a local OpenCode server. Capture a
                  baseline before a task, keep Sessions open, and review the actual source changes
                  after it finishes.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <footer className="atlas-footer">
        <div>
          <a href="/" aria-label="ArchMap home">
            <Mark size={25} />
            archmap.
          </a>
          <p>Find your way through what you’re building.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href={github}>
            GitHub <ArrowUpRight size={13} />
          </a>
          <a href={`${github}#readme`}>
            Documentation <ArrowUpRight size={13} />
          </a>
          <a href="/product-map.html">
            Roadmap <ArrowUpRight size={13} />
          </a>
          <a href={`${github}/blob/main/LICENSE`}>
            MIT license <ArrowUpRight size={13} />
          </a>
        </nav>
        <span>Made for people who build.</span>
      </footer>
    </div>
  );
}
