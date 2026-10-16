import { useState } from 'react';
const stops = [
  { title: 'Entry point', file: 'src/app.ts', text: 'The application imports the generation endpoint.', code: "import { generateImage } from './api/generate.js';", x: 110, y: 130 },
  { title: 'API layer', file: 'src/api/generate.ts', text: 'The generation endpoint imports the job queue.', code: "import { enqueue } from '../services/queue.js';", x: 278, y: 240 },
  { title: 'Worker', file: 'src/services/worker.ts', text: 'The worker imports the image provider.', code: "import { requestImage } from './provider.js';", x: 445, y: 135 },
];
function Cluster({ x, y, tall = false }: { x: number; y: number; tall?: boolean }) {
  const pixels = Array.from({ length: 36 }, (_, i) => ({ x: i % 6, y: Math.floor(i / 6) })).filter(p => (p.x * 7 + p.y * 3) % 5 !== 0);
  return <g transform={`translate(${x} ${y})`}>
    <path d="M-52 24 -4-4 52 24 0 54z" fill="#1d3017" stroke="#456e30" />
    <path d="M-52 24v12L0 66V54z" fill="#172112" /><path d="M0 54v12l52-30V24z" fill="#263e1b" />
    {pixels.map((p, i) => <rect key={i} x={p.x * 10 - 28} y={p.y * 6 - (tall ? 60 : 32)} width="8" height={tall ? 18 : 9} fill={['#bbf67b', '#76ab45', '#385c29', '#a1d866'][i % 4]} opacity={0.4 + p.y * .1} />)}
    <path d="M-24 12 0-2 24 12 0 26z" fill="#c8ff90" /><path d="M-24 12v12L0 38V26z" fill="#6c9b40" /><path d="M0 26v12l24-14V12z" fill="#91c95b" />
  </g>;
}
export default function PixelTerrain() {
  const [active, setActive] = useState(0);
  return <div className="terrain">
    <div className="terrain-top"><span className="live-dot" /> image-studio <span>EXAMPLE REPOSITORY</span></div>
    <svg viewBox="0 0 600 380" className="terrain-map" role="img" aria-label="Illustrated source map with entry point, API, and worker. Use the buttons below to inspect example imports.">
      <defs><pattern id="terrain-grid" width="32" height="18" patternUnits="userSpaceOnUse" patternTransform="skewY(-28)"><path d="M32 0H0v18" fill="none" stroke="#557840" strokeWidth=".5" opacity=".25" /></pattern></defs>
      <path d="M20 130 300 8 585 144 585 255 300 380 20 247z" fill="url(#terrain-grid)" />
      <g fill="none" stroke="#456631" strokeWidth="2"><path d="M110 150v48l168 85v-30" /><path d="M278 260v36l167-84v-52" /><path d="M278 275 145 337 76 299" /><path d="M445 150v67l94 48" /><path d="M110 150 250 80 445 150" strokeDasharray="4 6" /></g>
      <path d={active === 0 ? 'M110 150v48l168 85v-30' : active === 1 ? 'M278 260v36l167-84v-52' : 'M445 150v67l94 48'} className="terrain-active-path" fill="none" stroke="#c1f88a" strokeWidth="2" />
      <Cluster x={110} y={130} /><Cluster x={278} y={240} tall /><Cluster x={445} y={135} />
      <g fontFamily="Geist Mono, monospace" fontSize="10" fill="#98ac8c"><text x="50" y="214">app.ts</text><text x="230" y="333">generate.ts</text><text x="411" y="220">worker.ts</text><text x="53" y="328">DATABASE</text><text x="489" y="300">PROVIDER</text></g>
      <g fill="#baf085"><rect x="71" y="288" width="10" height="10" /><rect x="534" y="260" width="10" height="10" /></g>
      {[28, 96, 170, 330, 506, 566].map((x, i) => <path key={x} d={`M${x} ${70 + i * 36}h5v5h-5z`} fill="#78a852" opacity=".5" />)}
    </svg>
    <div className="terrain-tabs" role="tablist" aria-label="Example source locations">{stops.map((s, i) => <button key={s.file} role="tab" aria-selected={active === i} onClick={() => setActive(i)}>{String(i + 1).padStart(2, '0')}<span>{s.title}</span></button>)}</div>
    <div className="terrain-evidence" role="tabpanel"><div><span className="code-file">{stops[active].file}</span><span className="evidence-label">SOURCE EVIDENCE</span></div><code>{stops[active].code}</code><p>{stops[active].text}</p></div>
  </div>;
}
