---
name: ArchMap
description: A pixel source atlas and a neutral workbench for source-backed architecture.
colors:
  paper: '#fafaf7'
  ink: '#24241f'
  quiet: '#626257'
  rule: '#dcdcd1'
  amber: '#efb965'
  amber-emphasis: '#70451e'
  chalk: '#fffdf4'
  workflow-bg: '#272821'
  source-window: '#1c1e19'
  workflow-accent: '#eabc76'
  workspace-bg: '#f7f7f5'
  workspace-surface: '#ffffff'
  workspace-text: '#292927'
  workspace-muted: '#676761'
  workspace-line: '#deded8'
  workspace-action: '#30302e'
  workspace-focus: '#5e5e55'
typography:
  display:
    fontFamily: 'Jersey 10, sans-serif'
    fontSize: 'clamp(65px, 7.5vw, 108px)'
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Jersey 10, sans-serif'
    fontSize: 'clamp(40px, 4.4vw, 64px)'
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'Geist, sans-serif'
    fontSize: '15px'
    lineHeight: 1.6
  evidence:
    fontFamily: 'Geist Mono, monospace'
    fontSize: '12px'
    lineHeight: 1.8
rounded:
  atlas-node: '3px'
  evidence: '4px'
  landing-control: '5px'
  terminal: '6px'
  workspace-control: '7px'
  hero: '8px'
  workspace-card: '10px'
spacing:
  compact: '8px'
  control: '12px'
  section-gap: '60px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '#fffef8'
    rounded: '{rounded.landing-control}'
    padding: '13px 19px'
  button-primary-hover:
    backgroundColor: '#414136'
  button-text:
    textColor: '{colors.ink}'
  atlas-node:
    backgroundColor: '#fafaf3'
    rounded: '{rounded.atlas-node}'
    padding: '12px 11px'
  atlas-node-selected:
    backgroundColor: '#2c2b23'
    textColor: '#fefcf1'
  evidence-card:
    backgroundColor: '{colors.chalk}'
    rounded: '{rounded.evidence}'
    padding: '14px 16px'
  workspace-input:
    backgroundColor: '{colors.workspace-surface}'
    textColor: '{colors.workspace-text}'
    rounded: '{rounded.workspace-control}'
    padding: '11px 12px'
---

# Design System: ArchMap

## Overview

**Creative North Star: "The Pixel Source Atlas"**

ArchMap turns a codebase into a navigable atlas of source-backed connections. Its landing uses a broad amber field, oversized pixel lettering, countable SVG terrain and chalk source panels. The user-pinned hacker/pixel identity and cortad.com inspiration guide the graphic language; the source atlas is original to this product. Green and blue theme directions were rejected.

The workspace remains a quiet, neutral paper workbench. Geist carries functional controls and explanations; Geist Mono carries source, paths and technical readouts. Illustrative landing examples lead into real inspection without implying runtime tracing.

**Key Characteristics:**

- Pixel display lettering with readable functional typography.
- Amber terrain, ink actions and chalk evidence on the landing.
- Neutral paper workspace with explicit task destinations.
- Inspectable source, honest provenance and responsive reading surfaces.

## Colors

### Primary

Amber (`amber`) creates the hero's graphic field, with brown (`amber-emphasis`) emphasizing the last headline line. Warm amber (`workflow-accent`) marks selected workflow numbers and headline emphasis on the dark block. Ink (`ink`) carries primary actions and selected atlas nodes; action buttons are ink rather than amber-filled.

### Neutral

Paper (`paper`), quiet text (`quiet`) and fine rules (`rule`) support the editorial landing. Chalk (`chalk`) holds source evidence. The workflow uses dark neutral panels (`workflow-bg`, `source-window`), not a site-wide dark theme. Terrain tones are flat amber steps, with an 18px square grid.

The workspace has its own paper, white, charcoal and neutral border/focus tokens. Small red/olive change-preview diff cues express before/after semantics; they do not establish a green theme. Preserve source/manual provenance labels and line styles in the actual graph.

**The Evidence Color Rule.** Preserve distinct source, manual, selected, and error states; color supplements their text labels and line styles.

## Typography

**Display Font:** Jersey 10, sans-serif. **Body Font:** Geist, sans-serif. **Source/Readout Font:** Geist Mono, monospace. All three are served locally from `/fonts/`.

The desktop hero uses the display token with three deliberate lines. At 1200px it becomes `clamp(70px, 8.1vw, 96px)`; at 900px it is 75px; below 640px it becomes `clamp(66px, 16vw, 90px)` with 0.9 line height. Section headlines use the headline role, with larger open-source and workflow variants. Brand lettering stays Geist.

Landing prose is generally 14–17px with 1.8–1.9 line height and short measures. Functional headings use medium-weight Geist. Workspace interactions and explanations remain 13–14px. Actual workspace evidence remains 12px Geist Mono; landing atlas snippets are 12px desktop and 11px phone, with horizontally scrolling code. Compact preview and terminal samples use smaller mono text; do not export those demo sizes to the working source reader.

**The Reading Surface Rule.** Use pixel lettering for display emphasis, Geist for interaction and prose, and Geist Mono for source and technical identifiers.

## Layout

Landing navigation caps at 1480px with 38px side padding. The amber hero caps at 1456px, with 58px horizontal padding and a two-column 0.95fr/1.05fr text/atlas composition. Editorial sections cap at 1280px with 108px vertical and 40px horizontal padding. The product chapter pairs three task selectors and short copy with a large illustrative workspace. The dark workflow pairs numbered steps with a changing source window; the closing section pairs ownership copy with a terminal and FAQ.

At 1200px the hero gains 14px external margins and tighter gaps. At 900px navigation becomes an expandable menu, preview navigation is removed, and gutters become 30px. At 640px the hero, product, workflow and close stack; the hero uses 9px outer margins and 23px inner gutters, editorial content uses 24px gutters. Mobile product proof has its own readable three-node map instead of shrinking the desktop SVG. Atlas labels retain 12px names while small metadata is hidden; evidence stays below the map. The footer wraps vertically.

### Workspace layout and task continuity

The workspace uses a neutral paper palette independent of the landing: `#f7f7f5` canvas, white panels, `#292927` text, `#676761` secondary text, `#deded8` borders, and charcoal primary actions. Geist carries 13–14px interactions and prose; source remains 12px Geist Mono. No blue or green surface tint.

A 216px left navigation exposes the four code-facing destinations — Architecture, Flows, Changes, and Ask. The project header preserves Open, Save, Export, and Settings across destinations. Architecture gives the graph the full remaining area. Browse components opens a drawer; selecting a node or edge opens a dismissible source inspector. Sparse fresh scans use a grid and a coverage notice, without fabricating edges. Saved and manually positioned maps keep their layout.

Flows is a dedicated step reader with source evidence and a link back to the highlighted connection. Changes embeds the existing read-only review beneath the shared navigation, and links to the coding-agent tracker it feeds. Ask gives proposals and explanations a full reading surface. Model and agent settings open from the header; the checked standalone product map opens from the sidebar. Configurations and results that are not about the reader's code stay out of the primary navigation.

Below 640px the navigation becomes a four-destination bottom bar. Source inspection overlays the canvas. The graph focuses a readable cluster on open rather than shrinking the whole map to illegible cards; Fit map still shows the whole graph. Flow lists stack above the source reader; settings and the agent tracker use one column. Each task scrolls independently. The composer remains available below its scrollable answer region. New component styles are prefixed `wm-` to isolate them from legacy landing styles.

`src/components/Workbench.css` owns the neutral paper workspace. Landing styles and figures remain in their own files. Use the named task navigation and contextual inspector described above; avoid a permanent empty panel or icon-only settings destinations. Static connections, model interpretations, and manual edits must remain distinguishable. Source and snapshot hashes stay inspectable.

Change review is embedded in the shared workspace, with its own source/evidence scrolling. The agent tracker pauses observation when left; returning resumes the read-only polling lifecycle. Keep question drafts when moving between task pages, and reset them when a different project is opened. The capability map and interface must label unimplemented features as planned.

## Elevation & Depth

Depth comes chiefly from flat tonal regions and fine borders. The landing atlas nodes use `0 6px 12px #64421514`; selection uses `0 8px 18px #67401330`. The evidence panel uses the faint `0 8px 22px #6c461d0c`. Other editorial sections remain flat. Workspace overlays use restrained structural shadows; avoid applying floating-panel treatments to normal prose.

Landing buttons transition background, color and transform over 0.2s ease and lift 2px on hover. Atlas nodes lift 4px; lit connection dashes travel over 18s linear, with 0.3s stroke transitions. Task selection updates the demonstration immediately; it does not auto-advance. Reduced-motion disables animations, transitions and smooth scrolling throughout both surfaces.

## Shapes

The original terrain uses countable 18px SVG rectangles with five flat amber tones, beneath orthogonal connection paths. Atlas nodes use 3px corners, evidence 4px, primary buttons 5px, terminal 6px and hero 8px (5px on phones). Workspace controls use 7px corners and reading cards generally 9–10px. Small circles and square status marks are functional exceptions. Do not round the pixel terrain or replace its stepped structure with smooth organic artwork.

## Components

### Actions and navigation

Ink primary actions use 13px medium Geist, a 1px ink border and 13px by 19px padding. Text actions pair a concise verb with a directional arrow and underline on hover. Example actions call `open(true)`; repository/workspace actions call `open(false)`. Links point to actual repository, documentation and license destinations. The mobile menu exposes `aria-expanded`, closes on Escape and returns focus to its trigger. A skip link precedes navigation. Landing focus outlines are 2px currentColor with 5px offset; workspace focus uses neutral 2px outlines with 3px offset.

### Interactive source atlas

Seven real buttons select an illustrative responsibility, update `aria-pressed`, highlight adjacent paths and replace the filename/line, source snippet and explanation in a polite live region. Selected nodes reverse to ink with light text. Terrain is decorative and hidden from assistive technology. The heading labels illustrative source and the footnote labels inferred areas and static relationships. These are source-reading interactions, not evidence of execution order.

### Product and workflow demonstrations

The three product tasks are an accessible tablist with ArrowLeft/ArrowRight/Home/End navigation and a labeled tabpanel. Architecture, Flows and Changes previews are illustrative, with one real example action outside the static preview controls. Workflow step buttons expose `aria-pressed` and select a local tree, source snippet or OpenCode baseline-review explanation. Read-only boundaries and explicit-question model disclosure remain visible.

### Installation and FAQ

Terminal commands are selectable text. Copy reports success for two seconds and reports clipboard failure with a visible status message and manual-selection fallback. It never runs the displayed commands. Native `details`/`summary` FAQ rows use plus/minus state marks and keyboard-visible focus.

### Workspace primitives and evidence

Inputs use white surfaces, 1px neutral borders, 7px corners and 11px by 12px padding; paths use mono and questions use readable Geist. Workspace navigation uses a filled neutral active state. Tags remain compact provenance labels; long identifiers wrap. Architecture nodes use white reading surfaces, fine borders, 18px padding and 10px corners. Evidence cards keep filename headers, selectable source with line numbers, line ranges and content hashes together. Preserve horizontal source scrolling and copy feedback. Manual connections and inferred responsibilities remain distinguishable from observed imports.

The older pixel figures and vendored isometric tracing instrument remain repository assets, not the current landing's defining graphic. `Landing.tsx` and `Landing.css` own the source atlas; `Workbench.css` owns the paper workspace.

## Do's and Don'ts

### Do:

- **Do** preserve the pixel display, functional sans, and source mono roles.
- **Do** keep actual workspace evidence readable at 12px, selectable, and connected to its filename and range.
- **Do** reserve the amber field for landing identity; use charcoal controls and neutral focus in the workspace.
- **Do** retain named mobile destinations, readable source inspection, and a persistent question composer.
- **Do** honor reduced motion across trace animation and interface transitions.

### Don't:

- **Don't** reintroduce green or blue as a landing theme.
- **Don't** replace the original source atlas with borrowed imagery or a generic gradient hero.
- **Don't** use pixel lettering for long explanations or source code.
- **Don't** turn every section into a floating card or enlarge the restrained corner vocabulary.
- **Don't** visually conflate static dependencies, model explanations, and manual edits.
