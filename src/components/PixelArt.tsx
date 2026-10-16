import { useId } from 'react';

type Tone = 'ink' | 'wash' | 'mid' | 'paper' | 'accent' | 'dither';
type Rect = [x: number, y: number, w: number, h: number, tone: Tone];
export type Sprite = { w: number; h: number; rects: Rect[] };

/* Chunky pixel figures, drawn on an integer grid so every edge stays crisp. */
export function PixelArt({
  sprite,
  label,
  className,
}: {
  sprite: Sprite;
  label: string;
  className?: string;
}) {
  const pattern = useId();
  const decorative = !label;
  return (
    <svg
      className={className ? `pix ${className}` : 'pix'}
      viewBox={`0 0 ${sprite.w} ${sprite.h}`}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      shapeRendering="crispEdges"
    >
      <defs>
        <pattern id={pattern} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" className="pix-accent" />
          <rect x="2" y="2" width="1" height="1" className="pix-accent" />
        </pattern>
      </defs>
      {sprite.rects.map(([x, y, w, h, tone], index) => (
        <rect
          key={index}
          x={x}
          y={y}
          width={w}
          height={h}
          className={`pix-${tone}`}
          fill={tone === 'dither' ? `url(#${pattern})` : undefined}
        />
      ))}
    </svg>
  );
}

/* A city of module blocks with routed connections underneath. */
export const skyline: Sprite = {
  w: 96,
  h: 26,
  rects: [
    [3, 13, 9, 11, 'mid'],
    [14, 9, 7, 15, 'mid'],
    [23, 15, 12, 9, 'mid'],
    [37, 6, 8, 18, 'mid'],
    [47, 14, 10, 10, 'mid'],
    [59, 11, 7, 13, 'mid'],
    [68, 16, 13, 8, 'mid'],
    [83, 9, 9, 15, 'mid'],
    [3, 13, 9, 1, 'ink'],
    [14, 9, 7, 1, 'ink'],
    [23, 15, 12, 1, 'ink'],
    [37, 6, 8, 1, 'ink'],
    [47, 14, 10, 1, 'ink'],
    [59, 11, 7, 1, 'ink'],
    [68, 16, 13, 1, 'ink'],
    [83, 9, 9, 1, 'ink'],
    [5, 16, 2, 2, 'accent'],
    [8, 19, 2, 2, 'accent'],
    [16, 12, 2, 2, 'accent'],
    [18, 17, 2, 2, 'accent'],
    [25, 18, 2, 2, 'accent'],
    [30, 20, 2, 2, 'accent'],
    [39, 9, 2, 2, 'accent'],
    [40, 14, 2, 2, 'accent'],
    [50, 17, 2, 2, 'accent'],
    [53, 20, 2, 2, 'accent'],
    [61, 14, 2, 2, 'accent'],
    [63, 18, 2, 2, 'accent'],
    [70, 19, 2, 2, 'accent'],
    [74, 22, 2, 2, 'accent'],
    [85, 12, 2, 2, 'accent'],
    [88, 16, 2, 2, 'accent'],
    [0, 24, 96, 2, 'ink'],
    [10, 25, 20, 1, 'accent'],
    [40, 25, 25, 1, 'accent'],
    [62, 25, 14, 1, 'accent'],
    [9, 24, 2, 2, 'accent'],
    [29, 24, 2, 2, 'accent'],
    [39, 24, 2, 2, 'accent'],
    [64, 24, 2, 2, 'accent'],
    [75, 24, 2, 2, 'accent'],
  ],
};

/* One named flow: three responsibilities joined by a routed path. */
export const route: Sprite = {
  w: 32,
  h: 24,
  rects: [
    [2, 2, 7, 7, 'mid'],
    [2, 2, 7, 1, 'ink'],
    [13, 9, 7, 7, 'mid'],
    [13, 9, 7, 1, 'ink'],
    [22, 16, 7, 7, 'mid'],
    [22, 16, 7, 1, 'ink'],
    [4, 5, 3, 1, 'paper'],
    [15, 12, 4, 1, 'paper'],
    [24, 19, 3, 1, 'paper'],
    [9, 5, 7, 1, 'accent'],
    [16, 5, 1, 4, 'accent'],
    [20, 12, 5, 1, 'accent'],
    [25, 12, 1, 4, 'accent'],
  ],
};

/* Two revisions of the same area, one changed line highlighted. */
export const compare: Sprite = {
  w: 32,
  h: 24,
  rects: [
    [3, 1, 16, 20, 'wash'],
    [5, 4, 10, 1, 'ink'],
    [5, 7, 12, 1, 'ink'],
    [5, 10, 8, 1, 'ink'],
    [5, 13, 11, 1, 'ink'],
    [13, 5, 16, 17, 'mid'],
    [15, 8, 12, 1, 'ink'],
    [15, 11, 10, 1, 'ink'],
    [15, 14, 12, 2, 'accent'],
    [21, 5, 1, 17, 'ink'],
    [15, 18, 3, 1, 'paper'],
    [16, 17, 1, 3, 'paper'],
    [21, 18, 3, 1, 'paper'],
  ],
};

/* A source sheet with one inspected line under a magnifier. */
export const evidence: Sprite = {
  w: 32,
  h: 24,
  rects: [
    [7, 1, 18, 22, 'paper'],
    [9, 4, 14, 1, 'ink'],
    [9, 7, 11, 1, 'ink'],
    [9, 10, 13, 1, 'ink'],
    [9, 16, 9, 1, 'ink'],
    [9, 19, 12, 1, 'ink'],
    [9, 13, 13, 2, 'accent'],
    [20, 14, 4, 1, 'ink'],
    [20, 20, 4, 1, 'ink'],
    [19, 15, 1, 5, 'ink'],
    [23, 15, 1, 5, 'ink'],
    [24, 20, 3, 1, 'ink'],
    [26, 21, 1, 2, 'ink'],
    [21, 16, 1, 3, 'accent'],
  ],
};

/* A model reads the map only when asked. */
export const model: Sprite = {
  w: 32,
  h: 24,
  rects: [
    [9, 7, 14, 10, 'mid'],
    [13, 10, 6, 4, 'accent'],
    [11, 6, 1, 1, 'ink'],
    [14, 6, 1, 1, 'ink'],
    [17, 6, 1, 1, 'ink'],
    [20, 6, 1, 1, 'ink'],
    [11, 17, 1, 1, 'ink'],
    [14, 17, 1, 1, 'ink'],
    [17, 17, 1, 1, 'ink'],
    [20, 17, 1, 1, 'ink'],
    [8, 10, 1, 1, 'ink'],
    [8, 13, 1, 1, 'ink'],
    [23, 10, 1, 1, 'ink'],
    [23, 13, 1, 1, 'ink'],
    [24, 4, 2, 1, 'accent'],
    [27, 1, 2, 1, 'accent'],
    [0, 22, 32, 1, 'wash'],
  ],
};

export const shield: Sprite = {
  w: 24,
  h: 24,
  rects: [
    [7, 2, 10, 1, 'mid'],
    [5, 3, 14, 3, 'mid'],
    [5, 6, 14, 4, 'mid'],
    [6, 10, 12, 4, 'mid'],
    [8, 14, 8, 4, 'mid'],
    [10, 18, 4, 3, 'mid'],
    [11, 21, 2, 2, 'mid'],
    [9, 8, 2, 2, 'accent'],
    [11, 10, 2, 2, 'accent'],
    [13, 8, 2, 2, 'accent'],
    [15, 6, 2, 2, 'accent'],
  ],
};

const glyph = (rects: Rect[]): Sprite => ({ w: 16, h: 16, rects });

export const glyphs = {
  overview: glyph([
    [1, 1, 6, 6, 'accent'],
    [9, 1, 6, 6, 'mid'],
    [1, 9, 6, 6, 'mid'],
    [9, 9, 6, 6, 'wash'],
  ]),
  flows: glyph([
    [1, 2, 4, 4, 'accent'],
    [6, 10, 4, 4, 'mid'],
    [11, 4, 4, 4, 'mid'],
    [4, 4, 3, 1, 'ink'],
    [5, 5, 1, 5, 'ink'],
    [6, 10, 3, 1, 'ink'],
    [10, 8, 2, 2, 'wash'],
  ]),
  diff: glyph([
    [2, 2, 5, 12, 'wash'],
    [9, 2, 5, 12, 'mid'],
    [2, 5, 5, 1, 'ink'],
    [2, 9, 5, 1, 'ink'],
    [9, 4, 5, 1, 'ink'],
    [9, 7, 5, 2, 'accent'],
  ]),
  source: glyph([
    [3, 1, 10, 14, 'paper'],
    [5, 3, 6, 1, 'ink'],
    [5, 6, 6, 1, 'ink'],
    [5, 9, 6, 2, 'accent'],
    [5, 12, 4, 1, 'ink'],
  ]),
  proposal: glyph([
    [7, 1, 2, 14, 'mid'],
    [1, 7, 14, 2, 'mid'],
    [7, 7, 2, 2, 'accent'],
    [4, 4, 2, 2, 'accent'],
    [10, 4, 2, 2, 'accent'],
    [4, 10, 2, 2, 'accent'],
    [10, 10, 2, 2, 'accent'],
  ]),
  save: glyph([
    [2, 1, 12, 14, 'mid'],
    [5, 1, 6, 5, 'wash'],
    [4, 9, 8, 6, 'paper'],
    [6, 11, 4, 1, 'ink'],
  ]),
  plug: glyph([
    [2, 6, 7, 6, 'mid'],
    [1, 8, 1, 2, 'ink'],
    [9, 4, 5, 1, 'ink'],
    [9, 11, 5, 1, 'ink'],
    [13, 3, 1, 2, 'accent'],
    [13, 11, 1, 2, 'accent'],
    [9, 7, 1, 2, 'wash'],
  ]),
  globe: glyph([
    [2, 2, 12, 12, 'wash'],
    [5, 1, 6, 1, 'mid'],
    [5, 14, 6, 1, 'mid'],
    [1, 5, 1, 6, 'mid'],
    [14, 5, 1, 6, 'mid'],
    [7, 2, 2, 12, 'mid'],
    [3, 5, 10, 1, 'accent'],
    [3, 9, 10, 1, 'accent'],
  ]),
  layers: glyph([
    [4, 2, 8, 2, 'accent'],
    [2, 5, 12, 2, 'mid'],
    [1, 8, 14, 2, 'mid'],
    [1, 11, 14, 2, 'wash'],
    [3, 13, 10, 1, 'wash'],
  ]),
  cloud: glyph([
    [5, 4, 6, 6, 'mid'],
    [2, 6, 4, 4, 'mid'],
    [10, 6, 4, 4, 'mid'],
    [4, 10, 8, 3, 'wash'],
    [6, 12, 2, 3, 'accent'],
    [9, 12, 2, 3, 'accent'],
  ]),
} satisfies Record<string, Sprite>;

export type GlyphName = keyof typeof glyphs;
