import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileCode2,
  FolderOpen,
  GitBranch,
  Layers,
  Menu,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Brand, Github } from './Brand';
import { PixelArt, compare, evidence, glyphs, model, route, shield, skyline } from './PixelArt';
import type { GlyphName } from './PixelArt';
import TracingInstrument from './figures/TracingInstrument';

const github = 'https://github.com/ICEQ-JO/ArchMap';

type ShippedItem = {
  glyph: GlyphName;
  tag: string;
  title: string;
  body: string;
};

const shipped: ShippedItem[] = [
  {
    glyph: 'overview',
    tag: 'ORGANIZATION',
    title: 'Responsibility overview',
    body: 'API, identity, workers, messaging, storage and UI areas, grouped from source and labelled inferred.',
  },
  {
    glyph: 'flows',
    tag: 'LEXICAL AST',
    title: 'Named guided flows',
    body: 'Step through a feature flow call site by call site, in lexical source order.',
  },
  {
    glyph: 'diff',
    tag: 'GIT REVIEW',
    title: 'Architecture change review',
    body: 'Compare a Git revision with your working tree and inspect before/after source.',
  },
  {
    glyph: 'source',
    tag: 'PROVENANCE',
    title: 'Source detail and evidence',
    body: 'Every observed connection carries its file, line range, snippet and content hash.',
  },
  {
    glyph: 'proposal',
    tag: 'MODEL VERIFICATION',
    title: 'Reviewable proposals',
    body: 'Ask for a proposed map, validate its references, then apply or discard with full undo.',
  },
  {
    glyph: 'save',
    tag: 'PORTABLE',
    title: 'Sketches, save and export',
    body: 'Start blank, edit freely, and keep a readable JSON file with your code.',
  },
];

type RoadmapItem = {
  glyph: GlyphName;
  tag: string;
  title: string;
  body: string;
};

const roadmap: RoadmapItem[] = [
  {
    glyph: 'plug',
    tag: 'AGENT INTEGRATION',
    title: 'Coding-agent session integration',
    body: 'Open the review of an AI coding session’s change without managing a baseline by hand.',
  },
  {
    glyph: 'globe',
    tag: 'POLYGLOT',
    title: 'More languages and frameworks',
    body: 'Analyzers beyond JavaScript and TypeScript, with framework-aware routing and behavior.',
  },
  {
    glyph: 'layers',
    tag: 'C4 ARCHITECTURE',
    title: 'Custom boundaries and C4 levels',
    body: 'Collapse, rename and nest architecture boundaries as you learn the system.',
  },
  {
    glyph: 'cloud',
    tag: 'COLLABORATION',
    title: 'Authenticated self-hosting',
    body: 'Shared workspaces, PR reports and continuous analysis, with genuine workspace isolation.',
  },
];

type FaqItem = {
  category: 'security' | 'models' | 'analysis' | 'general';
  question: string;
  answer: string;
};

const faq: FaqItem[] = [
  {
    category: 'security',
    question: 'Does ArchMap run my code?',
    answer:
      'No. The reader parses source using the TypeScript compiler API. It never executes your code, installs dependencies, or runs build scripts — not even inside a Git comparison.',
  },
  {
    category: 'security',
    question: 'Where does my source go?',
    answer:
      'Nowhere by default. Analysis runs in a local service bound strictly to loopback (127.0.0.1), and static analysis needs no network at all. Source leaves your machine only if you configure an optional model endpoint and ask an explicit question, and the server holds that key, never the browser.',
  },
  {
    category: 'models',
    question: 'Do I need a model or an API key?',
    answer:
      'No. Maps, flows, change reviews and exports work 100% offline without one. A model adds written explanations and proposed responsibilities; you can point it at any OpenAI-compatible local server such as Ollama or vLLM.',
  },
  {
    category: 'analysis',
    question: 'Is this a runtime trace?',
    answer:
      'No, and it will not pretend to be. Structural boundaries are inferred from source organization, call-site walkthroughs follow lexical source order, and model output stays an interpretation even when its references check out.',
  },
  {
    category: 'analysis',
    question: 'Which projects work today?',
    answer:
      'JavaScript and TypeScript: .ts, .tsx, .js, .jsx and their .mjs and .cjs equivalents, with root tsconfig paths and aliases. Dynamic dispatch, framework routes and unresolved workspace packages can leave gaps, and other languages are on the roadmap.',
  },
  {
    category: 'general',
    question: 'How much does it cost?',
    answer:
      'Nothing. ArchMap is MIT licensed and runs on your machine. Hosting, team workspaces and provider integrations are later roadmap milestones, not a paywall waiting at the door.',
  },
];

// Interactive Demo Data for Feature 01 (Guided Flows)
const demoFlows = [
  {
    id: 'generate',
    name: 'Generate Image',
    entry: 'src/api/generate.ts:handleGenerate()',
    steps: [
      {
        fn: 'authenticate(token)',
        module: 'src/services/auth.ts',
        callFile: 'src/api/generate.ts',
        line: 6,
        code: 'const user = authenticate(token);',
        tag: 'Identity & Access',
        flag: 'Parameter shadowing excluded',
      },
      {
        fn: 'reserveCredits(user.id, 1)',
        module: 'src/services/credits.ts',
        callFile: 'src/api/generate.ts',
        line: 8,
        code: 'reserveCredits(user.id, 1);',
        tag: 'Billing & Credits',
        flag: 'Conservative syntax check',
      },
      {
        fn: 'enqueue({ userId, prompt })',
        module: 'src/services/queue.ts',
        callFile: 'src/api/generate.ts',
        line: 9,
        code: 'return enqueue({ userId: user.id, prompt });',
        tag: 'Job Queue',
        flag: 'Lexical call-site order',
      },
    ],
  },
  {
    id: 'worker',
    name: 'Process Next Job',
    entry: 'src/services/worker.ts:processNextJob()',
    steps: [
      {
        fn: 'dequeue()',
        module: 'src/services/queue.ts',
        callFile: 'src/services/worker.ts',
        line: 12,
        code: 'const job = await dequeue();',
        tag: 'Job Queue',
        flag: 'Direct named import',
      },
      {
        fn: 'provider.generate(job.prompt)',
        module: 'src/services/provider.ts',
        callFile: 'src/services/worker.ts',
        line: 15,
        code: 'const image = await provider.generate(job.prompt);',
        tag: 'Image Provider',
        flag: 'Top-level named call',
      },
      {
        fn: 'storage.saveImage(job.id, image)',
        module: 'src/services/storage.ts',
        callFile: 'src/services/worker.ts',
        line: 18,
        code: 'await storage.saveImage(job.id, image);',
        tag: 'Storage',
        flag: 'Grounded in file hash',
      },
    ],
  },
  {
    id: 'status',
    name: 'Get Generation Status',
    entry: 'src/api/status.ts:handleStatus()',
    steps: [
      {
        fn: 'authenticate(token)',
        module: 'src/services/auth.ts',
        callFile: 'src/api/status.ts',
        line: 7,
        code: 'const user = authenticate(token);',
        tag: 'Identity & Access',
        flag: 'Shared auth boundary',
      },
      {
        fn: 'db.jobs.findById(jobId)',
        module: 'src/services/database.ts',
        callFile: 'src/api/status.ts',
        line: 11,
        code: 'const job = await db.jobs.findById(jobId);',
        tag: 'Database',
        flag: 'Targeted lexical scan',
      },
    ],
  },
];

export default function Landing({ open }: { open: (example: boolean) => void }) {
  // Navigation / Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Quick Start tab state in Hero
  const [quickTab, setQuickTab] = useState<'clone' | 'root' | 'npx'>('clone');
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Interactive Flow Preview state (Feature 01)
  const [selectedFlowIdx, setSelectedFlowIdx] = useState(0);
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);

  // Interactive Change Review state (Feature 02)
  const [diffView, setDiffView] = useState<'diff' | 'impact'>('diff');

  // Interactive Model Proposal state (Feature 04)
  const [modelMode, setModelMode] = useState<'offline' | 'proposal'>('offline');
  const [proposalApplied, setProposalApplied] = useState(false);

  // Capabilities tab filter
  const [capFilter, setCapFilter] = useState<'all' | 'shipped' | 'roadmap'>('all');

  // FAQ filter
  const [faqCategory, setFaqCategory] = useState<'all' | 'security' | 'models' | 'analysis'>('all');

  // Evidence copy state (Feature 03)
  const [evidenceCopied, setEvidenceCopied] = useState(false);

  const activeFlow = demoFlows[selectedFlowIdx];
  const activeStep = activeFlow.steps[selectedStepIdx] || activeFlow.steps[0];

  const quickCommands: Record<string, string> = {
    clone:
      'git clone https://github.com/ICEQ-JO/ArchMap.git\ncd ArchMap && npm install && npm run dev',
    root: 'ARCHMAP_ROOT=/absolute/path/to/projects npm run dev',
    npx: 'npm run build && npm start',
  };

  async function copyCommand(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // Fallback
    }
  }

  async function copyEvidenceSnippet() {
    try {
      await navigator.clipboard.writeText(
        `examples/image-studio/src/services/queue.ts:14-22\nexport async function enqueue(job: JobRequest): Promise<JobReceipt> {\n  const id = crypto.randomUUID();\n  const record: JobRecord = { id, ...job, status: 'queued', createdAt: Date.now() };\n  await db.jobs.insert(record);\n  return { id, status: 'queued' };\n}`,
      );
      setEvidenceCopied(true);
      setTimeout(() => setEvidenceCopied(false), 1800);
    } catch {
      // Ignore
    }
  }

  const filteredFaq =
    faqCategory === 'all' ? faq : faq.filter((item) => item.category === faqCategory);

  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Sticky, blur-enhanced top navigation */}
      <div className="site-header-outer">
        <header className="site-header wrap">
          <Brand />

          <nav aria-label="Main navigation" className="desktop-nav">
            <a href="#how-it-works">How it works</a>
            <a href="#what-it-does">What it does</a>
            <a href="#safety">Safety & limits</a>
            <a href="#faq">FAQ</a>
            <a href={github} target="_blank" rel="noreferrer" className="nav-github-link">
              <Github size={15} /> GitHub <ExternalLink size={12} />
            </a>
          </nav>

          <div className="site-header-actions">
            <button
              className="small-button secondary-action"
              onClick={() => open(true)}
              title="Open the Image Studio example"
            >
              <Play size={13} className="text-accent" /> Live Example
            </button>
            <button className="small-button primary-action" onClick={() => open(false)}>
              Open workspace <ArrowRight size={14} />
            </button>
            <button
              className="icon-button mobile-menu-toggle"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer wrap">
            <nav aria-label="Mobile navigation">
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
                How it works
              </a>
              <a href="#what-it-does" onClick={() => setMobileMenuOpen(false)}>
                What it does
              </a>
              <a href="#safety" onClick={() => setMobileMenuOpen(false)}>
                Safety & limits
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </a>
              <a href={github} target="_blank" rel="noreferrer">
                <Github size={15} /> GitHub repository
              </a>
            </nav>
            <div className="mobile-drawer-actions">
              <button
                className="button primary full-width"
                onClick={() => {
                  setMobileMenuOpen(false);
                  open(true);
                }}
              >
                <Play size={15} /> Explore live example
              </button>
              <button
                className="button secondary full-width"
                onClick={() => {
                  setMobileMenuOpen(false);
                  open(false);
                }}
              >
                <FolderOpen size={15} /> Open local repository
              </button>
            </div>
          </div>
        )}
      </div>

      <main id="main">
        {/* HERO SECTION */}
        <section className="hero wrap">
          <div className="hero-lead">
            <div className="hero-badge">
              <span className="live-dot" />
              <span>STATIC ANALYSIS · SOURCE EVIDENCE · LOCAL ONLY</span>
            </div>
            <h1>
              Understand the feature.
              <br />
              <span>Inspect the evidence.</span>
            </h1>
            <p className="hero-lead-sub">
              Deterministic AST architecture workbench for JavaScript and TypeScript. Zero runtime
              execution, loopback isolation, and verified call-site walkthroughs backed by content
              hashes.
            </p>

            <div className="hero-metrics">
              <div className="hero-metric">
                <strong>0</strong>
                <span>Code Execution</span>
              </div>
              <div className="hero-metric-sep" />
              <div className="hero-metric">
                <strong>100%</strong>
                <span>Loopback Only</span>
              </div>
              <div className="hero-metric-sep" />
              <div className="hero-metric">
                <strong>AST</strong>
                <span>Lexical Call Sites</span>
              </div>
              <div className="hero-metric-sep" />
              <div className="hero-metric">
                <strong>Git</strong>
                <span>Working Tree Diffs</span>
              </div>
            </div>

            <div className="hero-art-container">
              <PixelArt
                sprite={skyline}
                label="Module blocks joined by routed connections"
                className="hero-art"
              />
              <span className="hero-art-caption">FIG. 00 · LEXICAL MODULE HORIZON</span>
            </div>
          </div>

          <div className="hero-brief">
            <p className="hero-brief-intro">
              ArchMap reads a local JavaScript or TypeScript project and turns it into a map you can
              question: responsibility areas, named feature flows, and the exact source behind every
              connection. Ask a model for a proposal when you want one. Review it before anything
              changes.
            </p>

            <div className="hero-actions">
              <button className="button primary cta-glow" onClick={() => open(true)}>
                <Play size={16} /> Explore a live example <ArrowRight size={17} />
              </button>
              <button className="button secondary" onClick={() => open(false)}>
                <FolderOpen size={16} /> Open your repository
              </button>
            </div>

            {/* Interactive Quickstart Terminal box */}
            <div className="hero-terminal">
              <div className="hero-terminal-header">
                <div className="terminal-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="terminal-tabs">
                  <button
                    className={`terminal-tab ${quickTab === 'clone' ? 'active' : ''}`}
                    onClick={() => setQuickTab('clone')}
                  >
                    Quick clone
                  </button>
                  <button
                    className={`terminal-tab ${quickTab === 'root' ? 'active' : ''}`}
                    onClick={() => setQuickTab('root')}
                  >
                    Sibling root
                  </button>
                  <button
                    className={`terminal-tab ${quickTab === 'npx' ? 'active' : ''}`}
                    onClick={() => setQuickTab('npx')}
                  >
                    Production
                  </button>
                </div>
                <button
                  className="terminal-copy-btn"
                  onClick={() => copyCommand(quickCommands[quickTab])}
                  aria-label="Copy terminal command"
                  title="Copy command"
                >
                  {copiedCmd ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="hero-terminal-body">
                <code>{quickCommands[quickTab]}</code>
              </pre>
              {copiedCmd && <span className="terminal-feedback">Copied to clipboard!</span>}
            </div>

            <div className="hero-notes">
              <span>
                <Check size={13} className="text-accent" /> Open source (MIT)
              </span>
              <span>
                <Check size={13} className="text-accent" /> Runs locally (127.0.0.1)
              </span>
              <span>
                <Check size={13} className="text-accent" /> No API key required
              </span>
            </div>

            <p className="hero-requirement">
              Requires <strong>Node.js 22.12+</strong> and Git. No accounts or sign-ups.
            </p>
          </div>
        </section>

        {/* FIGURE 01: THE SOURCE TRACING INSTRUMENT */}
        <section className="figure-band wrap">
          <TracingInstrument />
          <div className="figure-note">
            <span>
              <span className="live-dot" /> FIG. 01 · THE SOURCE TRACING INSTRUMENT
            </span>
            <span>
              Carriage and readout share one example. Click step pills, arrow buttons or use
              keyboard [←] [→].
            </span>
          </div>
        </section>

        {/* STACK COMPATIBILITY BAR */}
        <section className="stack-row wrap" aria-label="Source types read today">
          <div className="stack-heading">
            <span className="stack-label">Analyzed today</span>
            <span className="stack-status-badge">AST COMPILER READY</span>
          </div>
          <ul className="stack-chips">
            <li>JavaScript</li>
            <li>TypeScript</li>
            <li>.tsx / .jsx</li>
            <li>ES modules</li>
            <li>CommonJS</li>
            <li>React</li>
            <li>Vue</li>
            <li>Local Git repos</li>
          </ul>
          <span className="stack-note">
            Roadmap analyzers: Python, Go, Rust with framework routing.
          </span>
        </section>

        {/* FEATURE 01: NAMED GUIDED FLOWS */}
        <section id="how-it-works" className="feature-section wrap">
          <article className="feature" data-art="start">
            <div className="feature-showcase">
              <div className="feature-art-box">
                <span className="feature-index">01</span>
                <PixelArt sprite={route} label="Three responsibilities joined by one routed path" />
              </div>

              {/* Interactive Flow Inspector Widget */}
              <div className="interactive-widget flow-widget">
                <div className="widget-header">
                  <span className="widget-title">FLOW WALKTHROUGH SIMULATOR</span>
                  <div className="widget-tabs">
                    {demoFlows.map((f, idx) => (
                      <button
                        key={f.id}
                        className={`widget-tab ${selectedFlowIdx === idx ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFlowIdx(idx);
                          setSelectedStepIdx(0);
                        }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flow-step-pipeline">
                  {activeFlow.steps.map((st, idx) => (
                    <button
                      key={st.fn}
                      className={`pipeline-step ${selectedStepIdx === idx ? 'active' : ''}`}
                      onClick={() => setSelectedStepIdx(idx)}
                    >
                      <span className="pipeline-num">0{idx + 1}</span>
                      <span className="pipeline-fn">{st.fn}</span>
                    </button>
                  ))}
                </div>

                <div className="flow-step-details">
                  <div className="step-meta-row">
                    <span className="step-file-badge">
                      <FileCode2 size={12} /> {activeStep.callFile}:{activeStep.line}
                    </span>
                    <span className="step-target-badge">{activeStep.tag}</span>
                    <span className="step-flag-chip">{activeStep.flag}</span>
                  </div>
                  <pre className="step-code-preview">
                    <code>{activeStep.code}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="feature-copy">
              <span className="eyebrow">Named guided flows</span>
              <h2>
                Follow a feature,
                <br />
                not a file tree.
              </h2>
              <p>
                Pick a named flow and step through its call sites in lexical source order. Each step
                resolves to an exact file, a line range and a snippet, so the walkthrough stays
                fully checkable. Parameter shadowing, nested callbacks, branches and loops are
                excluded or flagged: this is conservative syntax analysis, not a runtime trace.
              </p>
              <ul className="feature-chips">
                <li>
                  <Check size={12} /> Exact file + line range
                </li>
                <li>
                  <Check size={12} /> Call-site snippet inspectable
                </li>
                <li>
                  <Check size={12} /> Excluded shadow cases flagged
                </li>
              </ul>
            </div>
          </article>

          {/* FEATURE 02: ARCHITECTURE CHANGE REVIEW */}
          <article className="feature" data-art="end">
            <div className="feature-showcase">
              <div className="feature-art-box">
                <span className="feature-index">02</span>
                <PixelArt
                  sprite={compare}
                  label="Two revisions of one area with the changed line highlighted"
                />
              </div>

              {/* Interactive Git Change Review Widget */}
              <div className="interactive-widget diff-widget">
                <div className="widget-header">
                  <div className="diff-baseline-badge">
                    <GitBranch size={13} />
                    <span>HEAD (Working tree) vs origin/main</span>
                  </div>
                  <div className="widget-tabs">
                    <button
                      className={`widget-tab ${diffView === 'diff' ? 'active' : ''}`}
                      onClick={() => setDiffView('diff')}
                    >
                      Source diff
                    </button>
                    <button
                      className={`widget-tab ${diffView === 'impact' ? 'active' : ''}`}
                      onClick={() => setDiffView('impact')}
                    >
                      Topology impact
                    </button>
                  </div>
                </div>

                {diffView === 'diff' ? (
                  <div className="diff-body">
                    <div className="diff-header-row">
                      <span className="diff-filename">src/services/credits.ts</span>
                      <span className="diff-area-tag">Billing & Credits</span>
                    </div>
                    <pre className="diff-code">
                      <span className="diff-line ctx">
                        <span>L6</span> export function reserveCredits(userId: string, count:
                        number) &#123;
                      </span>
                      <span className="diff-line del">
                        <span>L7</span> - return db.credits.decrement(userId, count);
                      </span>
                      <span className="diff-line add">
                        <span>L7</span> + const cost = calculateCost(count);
                      </span>
                      <span className="diff-line add">
                        <span>L8</span> + return db.credits.decrement(userId, cost);
                      </span>
                      <span className="diff-line ctx">
                        <span>L9</span> &#125;
                      </span>
                    </pre>
                  </div>
                ) : (
                  <div className="impact-body">
                    <div className="impact-row">
                      <span className="impact-label">Changed responsibilities:</span>
                      <span className="impact-value">1 (Billing & Credits)</span>
                    </div>
                    <div className="impact-row">
                      <span className="impact-label">Static dependency delta:</span>
                      <span className="impact-value">+1 import (services/pricing.ts)</span>
                    </div>
                    <div className="impact-row">
                      <span className="impact-label">Unchanged core graph:</span>
                      <span className="impact-value">Preserved</span>
                    </div>
                    <div className="impact-security-notice">
                      <Shield size={13} /> Read-only Git object inspect. No checkout or hooks run.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="feature-copy">
              <span className="eyebrow">Architecture change review</span>
              <h2>
                Compare a change
                <br />
                before you trust it.
              </h2>
              <p>
                Choose a baseline — HEAD, a branch, a tag or a commit — and compare it with your
                working tree. You get changed responsibility areas, changed files, added and removed
                static dependencies, and before/after source. No checkout, no hooks, no filters, and
                no analyzed code is executed.
              </p>
              <ul className="feature-chips">
                <li>
                  <Check size={12} /> HEAD vs branch or commit
                </li>
                <li>
                  <Check size={12} /> Zero checkout or file edits
                </li>
                <li>
                  <Check size={12} /> Coverage limits explicitly stated
                </li>
              </ul>
            </div>
          </article>

          {/* FEATURE 03: EVIDENCE ATTACHED */}
          <article className="feature" data-art="start">
            <div className="feature-showcase">
              <div className="feature-art-box">
                <span className="feature-index">03</span>
                <PixelArt
                  sprite={evidence}
                  label="A source sheet with one inspected line under a magnifier"
                />
              </div>

              {/* Interactive Genuine EvidenceCard */}
              <div className="interactive-widget evidence-widget">
                <div className="evidence-card-landing">
                  <div className="evidence-landing-header">
                    <FileCode2 size={13} className="text-accent" />
                    <span className="evidence-landing-file">
                      examples/image-studio/src/services/queue.ts:14-20
                    </span>
                    <button
                      className="evidence-copy-action"
                      onClick={copyEvidenceSnippet}
                      aria-label="Copy snippet"
                    >
                      {evidenceCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{evidenceCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="evidence-landing-code">
                    <code>
                      <span className="code-line">
                        <span>14</span>
                        <strong>export async function</strong> enqueue(job: JobRequest) &#123;
                      </span>
                      <span className="code-line">
                        <span>15</span> const id = crypto.randomUUID();
                      </span>
                      <span className="code-line highlight">
                        <span>16</span> await db.jobs.insert(&#123; id, ...job, status:
                        &apos;queued&apos; &#125;);
                      </span>
                      <span className="code-line">
                        <span>17</span> return &#123; id, status: &apos;queued&apos; &#125;;
                      </span>
                      <span className="code-line">
                        <span>18</span> &#125;
                      </span>
                    </code>
                  </pre>
                  <div className="evidence-landing-footer">
                    <span className="evidence-range">Lines 14–18</span>
                    <span className="evidence-hash">sha256:e8b10f24a6</span>
                    <span className="evidence-provenance">OBSERVED CONNECTION</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="feature-copy">
              <span className="eyebrow">Evidence, attached</span>
              <h2>
                Every connection
                <br />
                points at source.
              </h2>
              <p>
                An observed connection carries the file path, line range, snippet and a SHA-256 hash
                of the file content. Grouped responsibilities and model proposals are labelled
                inferred; connections you draw yourself stay manual. Static dependencies are never
                dressed up as runtime order.
              </p>
              <ul className="feature-chips">
                <li>
                  <Check size={12} /> Observed / Inferred / Manual tags
                </li>
                <li>
                  <Check size={12} /> Cryptographic content hash
                </li>
                <li>
                  <Check size={12} /> Standalone readable JSON export
                </li>
              </ul>
            </div>
          </article>

          {/* FEATURE 04: MODELS ARE OPTIONAL */}
          <article className="feature" data-art="end">
            <div className="feature-showcase">
              <div className="feature-art-box">
                <span className="feature-index">04</span>
                <PixelArt sprite={model} label="A model chip answering only when asked" />
              </div>

              {/* Interactive Model Proposal Simulation */}
              <div className="interactive-widget model-widget">
                <div className="widget-header">
                  <span className="widget-title">ANALYSIS MODE</span>
                  <div className="widget-tabs">
                    <button
                      className={`widget-tab ${modelMode === 'offline' ? 'active' : ''}`}
                      onClick={() => setModelMode('offline')}
                    >
                      Offline AST
                    </button>
                    <button
                      className={`widget-tab ${modelMode === 'proposal' ? 'active' : ''}`}
                      onClick={() => setModelMode('proposal')}
                    >
                      <Sparkles size={11} /> Model Proposal
                    </button>
                  </div>
                </div>

                {modelMode === 'offline' ? (
                  <div className="model-offline-body">
                    <div className="offline-stat-row">
                      <span className="stat-pill">0 API TOKENS</span>
                      <span className="stat-pill">DETERMINISTIC AST</span>
                      <span className="stat-pill">AIR-GAPPED</span>
                    </div>
                    <p className="offline-note">
                      Grouped by directory topology and static imports into API, Identity, Storage,
                      and UI. Reliable, instant, zero latency.
                    </p>
                  </div>
                ) : (
                  <div className="model-proposal-body">
                    <div className="proposal-card">
                      <div className="proposal-badge-row">
                        <span className="proposal-title">Proposal: Billing Orchestration</span>
                        <span className="proposal-status">3 / 3 verified</span>
                      </div>
                      <p className="proposal-desc">
                        Suggests grouping services/credits.ts and api/generate.ts into a shared
                        billing responsibility area based on call evidence.
                      </p>
                      <div className="proposal-actions">
                        <button
                          className={`btn-proposal-apply ${proposalApplied ? 'applied' : ''}`}
                          onClick={() => setProposalApplied(true)}
                        >
                          {proposalApplied ? <Check size={12} /> : null}
                          {proposalApplied ? 'Applied to preview' : 'Apply proposal'}
                        </button>
                        <button
                          className="btn-proposal-discard"
                          onClick={() => setProposalApplied(false)}
                        >
                          <RotateCcw size={12} /> Discard
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="feature-copy">
              <span className="eyebrow">Models are optional</span>
              <h2>
                Ask a model, or
                <br />
                don’t. Both work.
              </h2>
              <p>
                Static analysis runs offline with no key, and without one the app still proposes
                responsibilities from source. When you configure a chat-completions endpoint, the
                server validates every referenced file and evidence ID before you see a proposal —
                and you apply or discard it. Undo restores the view you had.
              </p>
              <ul className="feature-chips">
                <li>
                  <Check size={12} /> Keys stay server-side in memory
                </li>
                <li>
                  <Check size={12} /> Every reference strictly validated
                </li>
                <li>
                  <Check size={12} /> Full Apply / Discard / Undo cycle
                </li>
              </ul>
            </div>
          </article>
        </section>

        {/* CAPABILITIES SECTION */}
        <section id="what-it-does" className="capability-section">
          <div className="wrap">
            <div className="capability-heading">
              <div>
                <span className="eyebrow">Detailed capabilities</span>
                <h2>
                  Know what your change
                  <br />
                  <span>actually touched.</span>
                </h2>
              </div>
              <p>
                Everything below is either running in the repository today or written down as the
                next milestone. No universal coverage claims: the map says what it read and what it
                could not.
              </p>
            </div>

            <div className="capability-filters">
              <button
                className={`cap-filter-btn ${capFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCapFilter('all')}
              >
                All capabilities ({shipped.length + roadmap.length})
              </button>
              <button
                className={`cap-filter-btn ${capFilter === 'shipped' ? 'active' : ''}`}
                onClick={() => setCapFilter('shipped')}
              >
                Shipped today ({shipped.length})
              </button>
              <button
                className={`cap-filter-btn ${capFilter === 'roadmap' ? 'active' : ''}`}
                onClick={() => setCapFilter('roadmap')}
              >
                On roadmap ({roadmap.length})
              </button>
            </div>

            {(capFilter === 'all' || capFilter === 'shipped') && (
              <div className="capability-group">
                <span className="group-label">Shipped today</span>
                <div className="capability-grid">
                  {shipped.map(({ glyph, tag, title, body }) => (
                    <Capability
                      key={title}
                      glyph={glyph}
                      tag={tag}
                      title={title}
                      body={body}
                      status="shipped"
                    />
                  ))}
                </div>
              </div>
            )}

            {(capFilter === 'all' || capFilter === 'roadmap') && (
              <div className="capability-group">
                <span className="group-label">On the roadmap</span>
                <div className="capability-grid pair">
                  {roadmap.map(({ glyph, tag, title, body }) => (
                    <Capability
                      key={title}
                      tag={tag}
                      glyph={glyph}
                      title={title}
                      body={body}
                      status="planned"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SAFETY & LIMITS SECTION */}
        <section id="safety" className="safety-section wrap">
          <div className="safety-copy">
            <span className="eyebrow">Read-only by construction</span>
            <h2>
              Your code stays
              <br />
              <span>your code.</span>
            </h2>
            <div className="safety-points">
              <article>
                <div className="safety-mark-wrapper">
                  <PixelArt sprite={shield} label="" className="safety-mark" />
                </div>
                <div>
                  <div className="safety-title-row">
                    <h3>Nothing is executed</h3>
                    <span className="safety-pill">NO RUNTIME EVAL</span>
                  </div>
                  <p>
                    The reader parses source using the TypeScript compiler AST and reads raw Git
                    objects. Dependency installation, build scripts, hooks and filters never run.
                  </p>
                </div>
              </article>

              <article>
                <div className="safety-mark-wrapper">
                  <PixelArt sprite={glyphs.layers} label="" className="safety-mark" />
                </div>
                <div>
                  <div className="safety-title-row">
                    <h3>Bounded on purpose</h3>
                    <span className="safety-pill">400 FILES · 8 MB LIMIT</span>
                  </div>
                  <p>
                    Strict scan bounds prevent resource starvation. Credential paths, dependencies,
                    build outputs, binary files and out-of-root symlinks are excluded by default.
                  </p>
                </div>
              </article>

              <article>
                <div className="safety-mark-wrapper">
                  <PixelArt sprite={glyphs.plug} label="" className="safety-mark" />
                </div>
                <div>
                  <div className="safety-title-row">
                    <h3>Loopback only</h3>
                    <span className="safety-pill">127.0.0.1 BOUNDARY</span>
                  </div>
                  <p>
                    The service binds strictly to loopback and rejects foreign Host and Origin
                    headers. It is built for a single trusted local user; never expose it through a
                    public proxy.
                  </p>
                </div>
              </article>
            </div>
          </div>

          {/* Diagnostic telemetry gaps panel */}
          <aside className="limits-panel">
            <div className="limits-head">
              <span>What the map cannot see</span>
              <span className="limits-head-tag">RADICAL TRANSPARENCY</span>
            </div>
            <ul>
              <li>
                <span>Dynamic dispatch and methods</span> <em className="tag-gap">AST GAP</em>
              </li>
              <li>
                <span>Framework routes, deferred callbacks</span>{' '}
                <em className="tag-gap">AST GAP</em>
              </li>
              <li>
                <span>Bundler aliases, unresolved workspaces</span>{' '}
                <em className="tag-gap">AST GAP</em>
              </li>
              <li>
                <span>Languages other than JavaScript and TypeScript</span>{' '}
                <em className="tag-planned">ROADMAP</em>
              </li>
              <li>
                <span>Runtime order and real execution paths</span>{' '}
                <em className="tag-warn">NOT A TRACE</em>
              </li>
              <li>
                <span>Secrets hardcoded in ordinary source</span>{' '}
                <em className="tag-warn">NOT REDACTED</em>
              </li>
            </ul>
            <div className="limits-foot">
              <p>
                Absence in a bounded scan is not proof of absence. Partial analyses are explicitly
                labeled wherever coverage is incomplete.
              </p>
            </div>
          </aside>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="faq-section wrap">
          <div className="faq-copy">
            <span className="eyebrow">Straight answers</span>
            <h2>
              Questions people
              <br />
              actually ask.
            </h2>
            <div className="faq-filter-chips">
              <button
                className={`faq-chip ${faqCategory === 'all' ? 'active' : ''}`}
                onClick={() => setFaqCategory('all')}
              >
                All
              </button>
              <button
                className={`faq-chip ${faqCategory === 'security' ? 'active' : ''}`}
                onClick={() => setFaqCategory('security')}
              >
                Security & Isolation
              </button>
              <button
                className={`faq-chip ${faqCategory === 'models' ? 'active' : ''}`}
                onClick={() => setFaqCategory('models')}
              >
                AI & Models
              </button>
              <button
                className={`faq-chip ${faqCategory === 'analysis' ? 'active' : ''}`}
                onClick={() => setFaqCategory('analysis')}
              >
                AST & Tracing
              </button>
            </div>
          </div>

          <div className="faq-list">
            {filteredFaq.map(({ question, answer }) => (
              <details key={question} className="faq-item">
                <summary>
                  <span>{question}</span>
                  <span className="faq-toggle-icon" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* BOTTOM CTA / QUICK WORKSTATION */}
        <section className="start-section wrap">
          <div className="start-box">
            <span className="eyebrow">Ready for exploration</span>
            <h2>
              Meet your codebase.
              <br />
              Again, properly.
            </h2>
            <p>
              Start in seconds with the included Image Studio example, or point ArchMap at your own
              repository.
            </p>

            <div className="start-actions">
              <button className="button primary cta-glow" onClick={() => open(true)}>
                <Play size={16} /> Take the example for a spin <ArrowRight size={18} />
              </button>
              <button className="button secondary" onClick={() => open(false)}>
                <FolderOpen size={16} /> Open your repository
              </button>
            </div>

            <div className="install-workstation">
              <div className="workstation-head">
                <Terminal size={14} className="text-accent" />
                <span>terminal — bash</span>
                <span className="workstation-cwd">~/projects/ArchMap</span>
              </div>
              <div className="install-command">
                <code>
                  git clone https://github.com/ICEQ-JO/ArchMap.git &amp;&amp; cd ArchMap &amp;&amp;
                  npm i &amp;&amp; npm run dev
                </code>
                <button
                  aria-label="Copy installation command"
                  onClick={() =>
                    copyCommand(
                      'git clone https://github.com/ICEQ-JO/ArchMap.git\ncd ArchMap && npm install && npm run dev',
                    )
                  }
                  title="Copy command"
                >
                  {copiedCmd ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <span className="copy-status" role="status">
              {copiedCmd
                ? 'Copied commands to clipboard.'
                : 'Next steps: cd ArchMap · npm install · npm run dev · open http://localhost:4310'}
            </span>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="wrap footer-content">
          <div className="footer-brand">
            <Brand />
            <p>
              A local-first architecture workbench for JavaScript and TypeScript. It shows the
              source behind every connection, and honestly states what it could not read.
            </p>
            <span className="status-pill">
              <span className="live-dot" /> Loopback only · No telemetry · MIT
            </span>
          </div>

          <nav className="footer-columns" aria-label="Footer">
            <div>
              <span>Product</span>
              <a href="#how-it-works">How it works</a>
              <a href="#what-it-does">What it does</a>
              <a href="#safety">Safety and limits</a>
              <a href="#faq">FAQ</a>
              <button onClick={() => open(true)}>Explore live example</button>
            </div>
            <div>
              <span>Project</span>
              <a href={github} target="_blank" rel="noreferrer">
                Source code <ExternalLink size={11} />
              </a>
              <a href={`${github}/blob/main/README.md`} target="_blank" rel="noreferrer">
                README
              </a>
              <a href={`${github}/blob/main/DESIGN.md`} target="_blank" rel="noreferrer">
                Design system
              </a>
              <a href={`${github}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">
                Contributing
              </a>
              <a href={`${github}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
                MIT License
              </a>
            </div>
            <div>
              <span>Guides</span>
              <a href={`${github}#getting-started`} target="_blank" rel="noreferrer">
                Getting started
              </a>
              <a href={`${github}#review-a-coding-change`} target="_blank" rel="noreferrer">
                Review a change
              </a>
              <a
                href={`${github}#connect-a-model-in-the-web-interface`}
                target="_blank"
                rel="noreferrer"
              >
                Connect a model
              </a>
              <a
                href={`${github}/blob/main/THIRD_PARTY_NOTICES.md`}
                target="_blank"
                rel="noreferrer"
              >
                Third-party notices
              </a>
            </div>
          </nav>
        </div>

        <div className="wrap footer-base">
          <span>© 2026 ArchMap · MIT License</span>
          <a href="#main">
            Back to top <ArrowDown size={13} />
          </a>
        </div>
      </footer>
    </div>
  );
}

function Capability({
  glyph,
  tag,
  title,
  body,
  status,
}: {
  glyph: GlyphName;
  tag: string;
  title: string;
  body: string;
  status: 'shipped' | 'planned';
}) {
  return (
    <article className="capability" data-status={status}>
      <div className="capability-top">
        <div className="capability-art">
          <PixelArt sprite={glyphs[glyph]} label="" />
        </div>
        <span className="capability-tag">{tag}</span>
      </div>
      <div className="capability-body">
        <h3>
          {title}
          <em>{status === 'shipped' ? 'shipped' : 'planned'}</em>
        </h3>
        <p>{body}</p>
      </div>
    </article>
  );
}
