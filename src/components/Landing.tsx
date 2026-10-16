import { ArrowDown, ArrowRight, Check, Copy, FolderOpen, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Brand, Github } from './Brand';
import { PixelArt, compare, evidence, glyphs, model, route, shield, skyline } from './PixelArt';
import type { GlyphName } from './PixelArt';
import TracingInstrument from './figures/TracingInstrument';

const github = 'https://github.com/ICEQ-JO/ArchMap';
const shipped: [GlyphName, string, string][] = [
  [
    'overview',
    'Responsibility overview',
    'API, identity, workers, messaging, storage and UI areas, grouped from source and labelled inferred.',
  ],
  [
    'flows',
    'Named guided flows',
    'Step through a feature flow call site by call site, in lexical source order.',
  ],
  [
    'diff',
    'Architecture change review',
    'Compare a Git revision with your working tree and read before/after source.',
  ],
  [
    'source',
    'Source detail and evidence',
    'Every observed connection carries its file, line range, snippet and content hash.',
  ],
  [
    'proposal',
    'Reviewable proposals',
    'Ask for a proposed map, validate its references, then apply or discard.',
  ],
  [
    'save',
    'Sketches, save and export',
    'Start blank, edit freely, and keep a readable JSON file with your code.',
  ],
];
const roadmap: [GlyphName, string, string][] = [
  [
    'plug',
    'Coding-agent session integration',
    'Open the review of a session’s change without managing a baseline by hand.',
  ],
  [
    'globe',
    'More languages and frameworks',
    'Analyzers beyond JavaScript and TypeScript, with framework-aware behaviour.',
  ],
  [
    'layers',
    'Custom boundaries and C4 levels',
    'Collapse, rename and nest architecture boundaries as you learn the system.',
  ],
  [
    'cloud',
    'Authenticated self-hosting',
    'Shared workspaces, PR reports and continuous analysis, with real isolation.',
  ],
];
const faq: [string, string][] = [
  [
    'Does ArchMap run my code?',
    'No. The reader parses source with the TypeScript compiler API. It never executes your code, installs dependencies, or runs build scripts — not even inside a Git comparison.',
  ],
  [
    'Where does my source go?',
    'Nowhere by default. Analysis runs in a local service bound to loopback, and static analysis needs no network at all. Source leaves your machine only if you configure a model endpoint and ask a question, and the server holds that key, never the browser.',
  ],
  [
    'Do I need a model or an API key?',
    'No. Maps, flows, change reviews and exports work without one. A model adds written explanations and proposed responsibilities; you can point it at a local server such as Ollama.',
  ],
  [
    'Is this a runtime trace?',
    'No, and it will not pretend to be. Structural boundaries are inferred from source organisation, call-site walkthroughs follow lexical source order, and model output stays an interpretation even when its references check out.',
  ],
  [
    'Which projects work today?',
    'JavaScript and TypeScript: .ts, .tsx, .js, .jsx and their .mjs and .cjs equivalents, with root tsconfig paths and aliases. Dynamic dispatch, framework routes and unresolved workspace packages can leave gaps, and other languages are not analysed yet.',
  ],
  [
    'How much does it cost?',
    'Nothing. ArchMap is MIT licensed and runs on your machine. Hosting, team workspaces and provider integrations are later milestones, not a paywall waiting at the door.',
  ],
];
export default function Landing({ open }: { open: (example: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        'git clone https://github.com/ICEQ-JO/ArchMap.git\ncd ArchMap && npm install && npm run dev',
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header wrap">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#what-it-does">What it does</a>
          <a href="#safety">Safety</a>
          <a href={github} target="_blank" rel="noreferrer">
            <Github size={15} /> GitHub <ArrowRight size={13} />
          </a>
        </nav>
        <button className="small-button" onClick={() => open(false)}>
          Open workspace <ArrowRight size={14} />
        </button>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="hero-lead">
            <span className="eyebrow">Static analysis · source evidence</span>
            <h1>
              Understand the feature.
              <br />
              <span>Inspect the evidence.</span>
            </h1>
            <PixelArt
              sprite={skyline}
              label="Module blocks joined by routed connections"
              className="hero-art"
            />
          </div>
          <div className="hero-brief">
            <p>
              ArchMap reads a local JavaScript or TypeScript project and turns it into a map you can
              question: responsibility areas, named feature flows, and the exact source behind every
              connection. Ask a model for a proposal when you want one. Review it before anything
              changes.
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => open(true)}>
                Explore a live example <ArrowRight size={18} />
              </button>
              <button className="text-button" onClick={() => open(false)}>
                <FolderOpen size={17} /> Open your repository
              </button>
            </div>
            <div className="hero-notes">
              <span>
                <Check size={13} /> Open source
              </span>
              <span>
                <Check size={13} /> Runs locally
              </span>
              <span>
                <Check size={13} /> No API key needed
              </span>
            </div>
            <p className="hero-requirement">
              Requires Node.js 22.12+ and Git. Nothing else to sign up for.
            </p>
          </div>
        </section>
        <section className="figure-band wrap">
          <TracingInstrument />
          <div className="figure-note">
            <span>
              <span className="live-dot" /> FIG. 01 · THE SOURCE TRACING INSTRUMENT
            </span>
            <span>
              Carriage and readout share one example. Arrow keys and buttons both drive it.
            </span>
          </div>
        </section>
        <section className="stack-row wrap" aria-label="Source types read today">
          <span className="stack-label">Reads today</span>
          <ul>
            <li>JavaScript</li>
            <li>TypeScript</li>
            <li>.tsx / .jsx</li>
            <li>ES modules</li>
            <li>CommonJS</li>
            <li>React</li>
            <li>Vue</li>
            <li>any local Git repo</li>
          </ul>
          <span className="stack-note">Other languages are on the roadmap.</span>
        </section>
        <section id="how-it-works" className="feature-section wrap">
          <Feature
            index="01"
            eyebrow="Named guided flows"
            title={
              <>
                Follow a feature,
                <br />
                not a file tree.
              </>
            }
            body="Pick a named flow and step through its call sites in source order. Each step resolves to a file, a line range and a snippet, so the walkthrough stays checkable. Parameter shadowing, nested callbacks, branches and loops are excluded or flagged: this is conservative syntax analysis, not a runtime trace."
            chips={['file + line range', 'call-site snippet', 'excluded cases flagged']}
            sprite={route}
            spriteLabel="Three responsibilities joined by one routed path"
            art="start"
          />
          <Feature
            index="02"
            eyebrow="Architecture change review"
            title={
              <>
                Compare a change
                <br />
                before you trust it.
              </>
            }
            body="Choose a baseline — HEAD, a branch, a tag or a commit — and compare it with your working tree. You get changed responsibility areas, changed files, added and removed static dependencies, and before/after source. No checkout, no hooks, no filters, and no analysed code is executed."
            chips={['HEAD by default', 'no checkout or edits', 'coverage limits stated']}
            sprite={compare}
            spriteLabel="Two revisions of one area with the changed line highlighted"
            art="end"
          />
          <Feature
            index="03"
            eyebrow="Evidence, attached"
            title={
              <>
                Every connection
                <br />
                points at source.
              </>
            }
            body="An observed connection carries the file path, line range, snippet and a SHA-256 hash of the file content. Grouped responsibilities and model proposals are labelled inferred; connections you draw yourself stay manual. Static dependencies are never dressed up as runtime order."
            chips={['observed / inferred / manual', 'SHA-256 content hash', 'exportable JSON']}
            sprite={evidence}
            spriteLabel="A source sheet with one inspected line under a magnifier"
            art="start"
          />
          <Feature
            index="04"
            eyebrow="Models are optional"
            title={
              <>
                Ask a model, or
                <br />
                don’t. Both work.
              </>
            }
            body="Static analysis runs offline with no key, and without one the app still proposes responsibilities from source. When you configure a chat-completions endpoint, the server validates every referenced file and evidence ID before you see a proposal — and you apply or discard it. Undo restores the view you had."
            chips={['keys stay server-side', 'references validated', 'apply / discard / undo']}
            sprite={model}
            spriteLabel="A model chip answering only when asked"
            art="end"
          />
        </section>
        <section id="what-it-does" className="capability-section">
          <div className="wrap">
            <div className="capability-heading">
              <h2>
                Know what your change
                <br />
                <span>actually touched.</span>
              </h2>
              <p>
                Everything below is either in the repository today or written down as the next step.
                No universal coverage claims: the map says what it read and what it could not.
              </p>
            </div>
            <div className="capability-group">
              <span className="group-label">Shipped today</span>
              <div className="capability-grid">
                {shipped.map(([glyph, title, body]) => (
                  <Capability
                    key={title}
                    glyph={glyph}
                    title={title}
                    body={body}
                    status="shipped"
                  />
                ))}
              </div>
            </div>
            <div className="capability-group">
              <span className="group-label">On the roadmap</span>
              <div className="capability-grid pair">
                {roadmap.map(([glyph, title, body]) => (
                  <Capability
                    key={title}
                    glyph={glyph}
                    title={title}
                    body={body}
                    status="planned"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
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
                <PixelArt sprite={shield} label="" className="safety-mark" />
                <div>
                  <h3>Nothing is executed</h3>
                  <p>
                    The reader parses source and reads Git objects. Dependency installation, build
                    scripts, hooks and filters never run.
                  </p>
                </div>
              </article>
              <article>
                <PixelArt sprite={glyphs.layers} label="" className="safety-mark" />
                <div>
                  <h3>Bounded on purpose</h3>
                  <p>
                    400 files, 256 KB per file, 8 MB per scan. Credential paths, dependencies, build
                    output, binaries and out-of-root symlinks are excluded.
                  </p>
                </div>
              </article>
              <article>
                <PixelArt sprite={glyphs.plug} label="" className="safety-mark" />
                <div>
                  <h3>Loopback only</h3>
                  <p>
                    The service binds to loopback and rejects foreign Host and Origin headers. It is
                    built for one trusted local user; never expose it through a public proxy.
                  </p>
                </div>
              </article>
            </div>
          </div>
          <aside className="limits-panel">
            <div className="limits-head">
              <span>What the map cannot see</span>
              <span>Known gaps</span>
            </div>
            <ul>
              <li>
                <span>Dynamic dispatch and methods</span> <em>gap</em>
              </li>
              <li>
                <span>Framework routes, deferred callbacks</span> <em>gap</em>
              </li>
              <li>
                <span>Bundler aliases, unresolved workspaces</span> <em>gap</em>
              </li>
              <li>
                <span>Languages other than JavaScript and TypeScript</span> <em>not analysed</em>
              </li>
              <li>
                <span>Runtime order and real execution paths</span> <em>not a trace</em>
              </li>
              <li>
                <span>Secrets hardcoded in ordinary source</span> <em>not redacted</em>
              </li>
            </ul>
            <p>
              Absence in a bounded scan is not proof of absence. Partial analyses are labelled
              wherever coverage is incomplete.
            </p>
          </aside>
        </section>
        <section className="faq-section wrap">
          <div className="faq-copy">
            <span className="eyebrow">Straight answers</span>
            <h2>
              Questions people
              <br />
              actually ask.
            </h2>
          </div>
          <div className="faq-list">
            {faq.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="start-section wrap">
          <h2>
            Meet your codebase.
            <br />
            Again, properly.
          </h2>
          <p>Start with the example, or run ArchMap against your own repository.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => open(true)}>
              Take the example for a spin <ArrowRight size={18} />
            </button>
          </div>
          <div className="install-command">
            <Terminal size={16} />
            <code>git clone https://github.com/ICEQ-JO/ArchMap.git</code>
            <button aria-label="Copy installation commands" onClick={copy}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
          <span className="copy-status" role="status">
            {copied
              ? 'Copied installation commands.'
              : copyError
                ? 'Copy unavailable. Select the command above.'
                : 'Then: cd ArchMap · npm install · npm run dev · open localhost:4310'}
          </span>
        </section>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-brand">
            <Brand />
            <p>
              An early, local-first architecture workbench for JavaScript and TypeScript. It shows
              the source behind every connection, and says what it could not read.
            </p>
            <span className="status-pill">
              <span className="live-dot" /> Loopback only · no telemetry
            </span>
          </div>
          <nav className="footer-columns" aria-label="Footer">
            <div>
              <span>Product</span>
              <a href="#how-it-works">How it works</a>
              <a href="#what-it-does">What it does</a>
              <a href="#safety">Safety and limits</a>
              <button onClick={() => open(true)}>Explore the example</button>
            </div>
            <div>
              <span>Project</span>
              <a href={github}>Source code</a>
              <a href={`${github}/blob/main/README.md`}>README</a>
              <a href={`${github}/blob/main/CONTRIBUTING.md`}>Contributing</a>
              <a href={`${github}/blob/main/LICENSE`}>MIT License</a>
            </div>
            <div>
              <span>Guides</span>
              <a href={`${github}#getting-started`}>Getting started</a>
              <a href={`${github}#review-a-coding-change`}>Review a change</a>
              <a href={`${github}#connect-a-model-in-the-web-interface`}>Connect a model</a>
              <a href={`${github}/blob/main/THIRD_PARTY_NOTICES.md`}>Third-party notices</a>
            </div>
          </nav>
        </div>
        <div className="wrap footer-base">
          <span>© 2026 ArchMap · MIT</span>
          <a href="#main">
            Back to top <ArrowDown size={13} />
          </a>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  index,
  eyebrow,
  title,
  body,
  chips,
  sprite,
  spriteLabel,
  art,
}: {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  chips: string[];
  sprite: Parameters<typeof PixelArt>[0]['sprite'];
  spriteLabel: string;
  art: 'start' | 'end';
}) {
  return (
    <article className="feature" data-art={art}>
      <div className="feature-art">
        <span className="feature-index">{index}</span>
        <PixelArt sprite={sprite} label={spriteLabel} />
      </div>
      <div className="feature-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        <ul className="feature-chips">
          {chips.map((chip) => (
            <li key={chip}>
              <Check size={12} /> {chip}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Capability({
  glyph,
  title,
  body,
  status,
}: {
  glyph: GlyphName;
  title: string;
  body: string;
  status: 'shipped' | 'planned';
}) {
  return (
    <article className="capability" data-status={status}>
      <div className="capability-art">
        <PixelArt sprite={glyphs[glyph]} label="" />
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
