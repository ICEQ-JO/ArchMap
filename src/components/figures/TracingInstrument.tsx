import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, FileCode2 } from 'lucide-react';
import * as k from '../iso/iso-kit';
import '../iso/iso.css';

const P = k.fitProjection(
  k.boxCorners({ x: -140, y: -80, w: 280, d: 160, r: 8 }, -20, 68),
  640,
  390,
  { pad: 35, azimuth: 40, elevation: 32 },
);
type Part = {
  id: string;
  paths: k.SolidPaths;
  tone: k.Tone;
  depth: number;
  lit?: boolean;
  paper?: boolean;
};
const base: k.Plan = { x: -135, y: -76, w: 270, d: 152, r: 7 };
function part(
  id: string,
  plan: k.Plan,
  z: number,
  h: number,
  tone: k.Tone = 'mid',
  finish: 'plain' | 'lit' | 'paper' = 'plain',
): Part {
  return {
    id,
    paths: k.slabOf(plan, z, h, P, 6, 0.7),
    tone,
    depth: k.depthOf([plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], P),
    lit: finish === 'lit',
    paper: finish === 'paper',
  };
}
const fixed: Part[] = [];
const moving: Part[] = [];
for (const [i, [x, y]] of k.corners(base, 17).entries()) {
  fixed.push(part(`foot-${i}`, { x: x - 7, y: y - 7, w: 14, d: 14, r: 2 }, -19, 6, 'lo'));
  fixed.push(part(`spacer-${i}`, { x: x - 5, y: y - 5, w: 10, d: 10, r: 1 }, -13, 3, 'lo'));
}
fixed.push(part('base', base, -10, 10, 'lo'));
fixed.push(part('platen', { x: -115, y: -36, w: 230, d: 72, r: 3 }, 0, 6, 'mid'));
for (const y of [-53, 47]) {
  for (const x of [-120, 111])
    fixed.push(part(`rail-mount-${x}-${y}`, { x, y: y - 2, w: 9, d: 9, r: 1 }, 0, 8, 'mid'));
  fixed.push(part(`rail-${y}`, { x: -120, y, w: 240, d: 5, r: 1 }, 8, 5, 'hi'));
}
for (const x of [-126, 119])
  fixed.push(part(`stop-${x}`, { x, y: -58, w: 7, d: 116, r: 1 }, 0, 17, 'mid'));
for (const [index, x] of [-98, -29, 40].entries()) {
  fixed.push(part(`card-${index}`, { x, y: -28, w: 58, d: 56, r: 1 }, 6, 1, 'lo', 'paper'));
  for (const y of [-30, 25])
    fixed.push(
      part(`card-retainer-${index}-${y}`, { x: x + 4, y, w: 8, d: 4, r: 0.5 }, 7, 1.5, 'lo'),
    );
  // Lines of source, punched as varying runs so each card reads as a page of code.
  for (const [row, run] of [9, 7, 10, 6, 8].entries())
    for (let col = 0; col < run; col++)
      fixed.push(
        part(
          `mark-${index}-${row}-${col}`,
          { x: x + 6 + col * 6, y: -23 + row * 9, w: 4.4, d: 2.6, r: 0.2 },
          7,
          0.12,
          'lo',
        ),
      );
}
fixed.push(part('ruler', { x: -113, y: 63, w: 225, d: 5, r: 0.5 }, 0, 0.7, 'lo'));
fixed.push(part('label', { x: -120, y: -69, w: 48, d: 9, r: 0.5 }, 0, 0.7, 'lo'));
// The carriage is a bridge resting on four shoes on the two guide rails.
for (const y of [-54, 46])
  for (const x of [-14, 7]) {
    moving.push(part(`shoe-${x}-${y}`, { x, y, w: 8, d: 8, r: 1 }, 13, 8, 'mid'));
    moving.push(part(`leg-${x}-${y}`, { x: x + 1, y: y + 1, w: 6, d: 6, r: 0.5 }, 21, 17, 'mid'));
  }
moving.push(part('bridge', { x: -16, y: -54, w: 33, d: 108, r: 2 }, 38, 6, 'hi'));
moving.push(part('reader', { x: -11, y: -24, w: 23, d: 48, r: 2 }, 44, 12, 'hi'));
moving.push(part('reader-recess', { x: -8, y: -17, w: 17, d: 34, r: 1 }, 56, 0.7, 'lo'));
moving.push(part('reader-window', { x: -5, y: -12, w: 11, d: 24, r: 0.5 }, 56.7, 0.3, 'hi', 'lit'));
for (const x of [-14, 11])
  for (const y of [-45, 40])
    moving.push(part(`bridge-bolt-${x}-${y}`, { x, y, w: 3, d: 3, r: 0.4 }, 44, 0.6, 'lo'));
function Solid({ part: p }: { part: Part }) {
  return (
    <g
      className="iso-solid"
      data-lit={p.lit ? '' : undefined}
      data-paper={p.paper ? '' : undefined}
    >
      <path className="iso-fill" d={p.paths.fill} />
      {p.paths.shades.map((d, i) =>
        d ? <path key={i} className="iso-shade" data-shade={i} d={d} /> : null,
      )}
      <path className="iso-top" d={p.paths.top} />
      <path className="iso-line iso-crease" data-tone="faint" d={p.paths.crease} />
      <path className="iso-line iso-bevel" data-tone="faint" d={p.paths.bevel} />
      <path className="iso-line iso-edge" data-tone={p.tone} d={p.paths.outline} />
    </g>
  );
}
const source = [
  {
    fn: 'authenticate()',
    file: 'src/api/generate.ts',
    line: 6,
    title: 'Identity & access',
    code: 'const user = authenticate(token);',
    explanation: 'The generation handler calls authenticate before reserving credits.',
    hash: '8a4e016e98',
  },
  {
    fn: 'reserveCredits()',
    file: 'src/api/generate.ts',
    line: 8,
    title: 'Billing & credits',
    code: 'reserveCredits(user.id, 1);',
    explanation: 'The next source call reserves one credit for the authenticated user.',
    hash: '8a4e016e98',
  },
  {
    fn: 'enqueue()',
    file: 'src/api/generate.ts',
    line: 9,
    title: 'Job queue',
    code: 'return enqueue({ userId: user.id, prompt });',
    explanation: 'The handler passes the user and prompt to the queue.',
    hash: '8a4e016e98',
  },
];
const ticks = k.topTicks(-108, 108, 4, 5, 63, 0.7, [1.8, 3.2], P);
export default function TracingInstrument() {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const anchor = useRef<HTMLElement>(null);
  const holdUntil = useRef(0);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
    });
    if (anchor.current) observer.observe(anchor.current);
    const timer = setInterval(() => {
      if (visible && !media.matches && Date.now() > holdUntil.current)
        setStep((value) => (value + 1) % 3);
    }, 6500);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, []);
  function choose(next: number) {
    holdUntil.current = Date.now() + 20000;
    setStep(next);
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(
        `${source[step].file}:${source[step].line}\n${source[step].code}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard write failure
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft' && step > 0) {
      choose(step - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && step < source.length - 1) {
      choose(step + 1);
      e.preventDefault();
    }
  }

  const [dx, dy] = k.axisVector(P, [-69 + step * 69, 0, 0]);
  return (
    <figure
      ref={anchor}
      className="trace-instrument iso iso-plate"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Mechanical source-card reader. Use left and right arrow keys to step through source call sites."
      onPointerEnter={() => {
        holdUntil.current = Date.now() + 20000;
      }}
    >
      <div className="instrument-header">
        <span>FIG. 01 · CALL-SITE READER</span>
        <span className="instrument-hint">PRESS [←] [→] KEYS TO STEP</span>
      </div>
      <svg
        className="iso-svg"
        viewBox="118 95 404 267"
        role="img"
        aria-label="Mechanical source-card reader. The scanning carriage moves between three source call sites as you step through the example."
      >
        <path className="iso-halo" d={k.haloOf(base, -19, 0, P)} />
        {/* Structure first, then the pages dropped on it, then their punched marks:
            sorting one flat list by centre depth lets the wide platen bury a card. */}
        {fixed
          .filter((p) => !p.paper && !p.id.startsWith('mark'))
          .sort((a, b) => a.depth - b.depth)
          .map((p) => (
            <Solid key={p.id} part={p} />
          ))}
        {fixed
          .filter((p) => p.paper)
          .sort((a, b) => a.depth - b.depth)
          .map((p) => (
            <Solid key={p.id} part={p} />
          ))}
        {fixed
          .filter((p) => p.id.startsWith('mark'))
          .map((p) => (
            <Solid key={p.id} part={p} />
          ))}
        <path className="iso-line" data-tone="lo" d={k.planOutline(k.insetPlan(base, 5), 0, P)} />
        <path className="iso-line" data-tone="lo" d={ticks.minor} />
        <path className="iso-line" data-tone="mid" d={ticks.major} />
        {k.corners(base, 10).map(([x, y], i) => {
          const [cx, cy] = k.iso([x, y, 0.1], P);
          return (
            <g key={i}>
              <circle className="instrument-screw" cx={cx} cy={cy} r="2.3" />
              <circle className="instrument-screw-core" cx={cx} cy={cy} r=".7" />
            </g>
          );
        })}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            className="iso-line"
            data-tone="mid"
            data-free=""
            d={k.lineOnTop([-115, -66 + i * 2], [-78 - i * 5, -66 + i * 2], 0.8, P)}
          />
        ))}
        <g className="reader-carriage" style={{ transform: `translate(${dx}px,${dy}px)` }}>
          {moving
            .sort((a, b) => a.depth - b.depth)
            .map((p) => (
              <Solid key={p.id} part={p} />
            ))}
        </g>
      </svg>
      <div className="instrument-controls">
        <div className="instrument-steps" role="tablist" aria-label="Traced call sites">
          {source.map((item, idx) => (
            <button
              key={item.title}
              role="tab"
              aria-selected={step === idx}
              className={`instrument-step-tab ${step === idx ? 'active' : ''}`}
              onClick={() => choose(idx)}
            >
              <span className="step-tab-num">0{idx + 1}</span>
              <span className="step-tab-fn">{item.fn}</span>
            </button>
          ))}
        </div>
        <div className="instrument-nav">
          <button
            aria-label="Previous source call"
            disabled={step === 0}
            onClick={() => choose(step - 1)}
            title="Previous source call"
          >
            <ArrowLeft size={14} />
          </button>
          <span className="instrument-pager">
            {step + 1} / {source.length}
          </span>
          <button
            aria-label="Next source call"
            disabled={step === 2}
            onClick={() => choose(step + 1)}
            title="Next source call"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <figcaption aria-live="polite">
        <div className="trace-caption-head">
          <FileCode2 size={13} className="trace-caption-icon" />
          <span className="trace-caption-file">
            {source[step].file}:{source[step].line}
          </span>
          <strong className="trace-caption-title">{source[step].title}</strong>
          <button
            className="trace-caption-copy"
            onClick={copySnippet}
            aria-label="Copy call site code"
            title="Copy call site code"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="trace-code-block">
          <span className="trace-line-num">{source[step].line}</span>
          <code>{source[step].code}</code>
        </div>
        <div className="trace-caption-foot">
          <p>{source[step].explanation}</p>
          <div className="trace-caption-badges">
            <span className="trace-badge">sha256:{source[step].hash}</span>
            <span className="trace-badge-tag">LEXICAL CALL SITE</span>
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
