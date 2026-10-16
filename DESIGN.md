---
name: ArchMap
description: A local-first workbench for source-backed architecture maps.
colors:
  bg: '#17181b'
  surface: '#1e2025'
  surface-raised: '#282b32'
  line: '#363a43'
  text: '#edeef1'
  muted: '#a7aab3'
  accent: '#b4c4ed'
  accent-ink: '#182134'
  accent-hover: '#cbd7f5'
  manual: '#c4b4f1'
  error: '#f8b7a8'
  workspace-bg: '#181818'
  workspace-surface: '#202020'
  workspace-line: '#3a3a3a'
  workspace-focus: '#e5c796'
typography:
  display:
    fontFamily: 'Jersey 10, sans-serif'
    fontSize: 'clamp(40px, 4.5vw, 68px)'
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: '-1px'
  headline:
    fontFamily: 'Jersey 10, sans-serif'
    fontSize: 'clamp(44px, 4.8vw, 66px)'
    fontWeight: 400
    lineHeight: 0.99
    letterSpacing: '-0.7px'
  body:
    fontFamily: 'Geist, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.72
  title:
    fontFamily: 'Geist, sans-serif'
    fontSize: '18px'
    fontWeight: 500
    letterSpacing: '-0.6px'
  evidence:
    fontFamily: 'Geist Mono, monospace'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: 2
  label:
    fontFamily: 'Geist Mono, monospace'
    fontSize: '9px'
    letterSpacing: '1.1px'
rounded:
  card: '12px'
  list-row: '3px'
  control: '4px'
  node: '5px'
  walk-player: '6px'
spacing:
  compact-gap: '8px'
  control-gap: '10px'
  panel-gap: '12px'
  action-gap: '22px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.control}'
    padding: '15px 19px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.control}'
    padding: '11px 15px'
  button-secondary-hover:
    backgroundColor: '{colors.surface-raised}'
  button-text:
    padding: '10px 0'
  architecture-node:
    backgroundColor: '#232323'
    rounded: '{rounded.node}'
    padding: '13px 15px'
    width: '226px'
  evidence-card:
    backgroundColor: '#161616'
    rounded: '{rounded.control}'
  tag:
    backgroundColor: '#2e2e2e'
    textColor: '#c5c5c5'
    padding: '4px 6px'
---

# Design System: ArchMap

## Overview

**Creative North Star: "The Tracing Bench"**

ArchMap pairs graphite instrument surfaces with a restrained blue and large pixel lettering. The pixel direction is user-pinned; the original isometric source-tracing instrument and the in-repo pixel figures make that direction specific to architecture exploration.

The working interface is denser than the landing page. Geist carries functional controls and explanations; Geist Mono carries actual source, paths, and technical readouts. The identity stays visible without compromising source evidence.

**Key Characteristics:**

- Pixel display lettering with readable functional typography.
- Graphite tonal surfaces, fine borders, and restrained depth.
- An isometric source-tracing instrument and in-repo pixel figures.
- Responsive panels that preserve access to the map and evidence.

## Colors

### Primary

Restrained blue (`accent`) marks primary actions, focus, traced dependencies, run states, and the pixel figures' highlights. Its lighter hover counterpart (`accent-hover`) brightens primary buttons, and dark blue (`accent-ink`) is the text on them. Blue never fills a source surface or a prose block.

### Secondary

Muted violet (`manual`) distinguishes user-authored graph details and dashed manual connections. It is a provenance cue, not a competing action color. Warm error text (`error`) carries failures; warning copy also uses a muted amber in the implementation.

### Neutral

Graphite (`bg`), surface (`surface`), and raised surface (`surface-raised`) organize the interface. Gray-blue (`line`) divides regions. Near-white (`text`) is the main reading color; gray (`muted`) supports secondary information. The workspace overrides these with its own neutral set (`workspace-bg`); landing and workspace palettes are deliberately separate.

**The Evidence Color Rule.** Preserve distinct source, manual, selected, and error states; color supplements their text labels and line styles.

## Typography

**Display Font:** Jersey 10, sans-serif. **Body Font:** Geist, sans-serif. **Source/Readout Font:** Geist Mono, monospace. All three are served locally from `/fonts/`.

Display and section headlines use the frontmatter roles. The hero headline keeps one line per sentence at desktop widths and steps to `clamp(44px, 10vw, 62px)` below 820px, then 44px below 520px. Section-specific headline sizes remain intentionally varied.

Functional headings use Geist at medium weight. Landing introduction copy uses the body role; workspace explanations use (12px), falling to (11px) on mobile. Evidence uses the evidence role at all widths, with (10px) filenames, footers, and line numbers. Compact metadata uses smaller mono labels; do not apply those sizes to source content.

**The Reading Surface Rule.** Use pixel lettering for display emphasis, Geist for interaction and prose, and Geist Mono for source and technical identifiers. Keep evidence at (12px).

## Layout

The landing container is capped at (1280px), initially with (56px) side gutters. Gutters become (32px) below (1100px) and (20px) below (520px). The desktop hero is a two-card band: headline and module skyline left, introduction and actions right; it stacks below (900px). Feature rows alternate their art side and stack below (900px); the capability grid ends at one column below (520px). Sections use generous vertical intervals while technical readouts stay compact.

The workspace occupies (100svh), with a fixed header, explorer, flexible map, and inspector. At the base desktop size, explorer and inspector widths are (224px) and (310px). They expand to (250px)/(350px) above (1500px), contract at (1200px), and contract again at (900px). Independent panel scrolling keeps controls in place.

Below (760px), the explorer becomes a (245px) overlay opened by the menu control. The map and inspector stack vertically; the map has a (230px) minimum height and the inspector a (190px) minimum. Toolbar text yields to icons and the minimap is removed at narrower desktop widths. The mobile question panel places its composer alongside its content. These are actual responsive behaviors, not a universal spacing scale.

## Elevation & Depth

Most depth comes from tonal surfaces and one-pixel borders. Architecture nodes use a small structural shadow (`0 5px 16px #0002`); selected nodes add an accent outline shadow (`0 0 0 1px #c4c4c433`). The floating walk launcher and player have darker shadows. The mobile explorer casts a lateral shadow. Avoid applying these floating treatments to ordinary content sections.

The tracing instrument steps its carriage between call sites and its readout follows; the readout controls work by keyboard. Node border transitions take (0.15s), opacity (0.2s). Reduced-motion preference disables animations, transitions, and smooth scrolling.

## Shapes

Pixel figures use stepped rectangles on an integer grid at whole-pixel scale; the tracing instrument uses isometric plates, rails and routed lines. Ordinary controls use small corners from the frontmatter; tabs and structural panels remain square. One-pixel borders define panels and fields. Tiny circular status indicators are the exception to the predominantly rectilinear language.

## Components

### Buttons

Primary buttons use the accent colour with dark ink, semibold (13px) Geist, and a (46px) minimum height. Secondary buttons use a dark surface and visible border. Text buttons have no filled container and turn accent on hover. Disabled buttons use (0.45) opacity and a not-allowed cursor. Focus-visible controls receive a (2px) accent outline offset by (4px).

### Inputs / Fields

Fields use dark inset surfaces and fine borders. Search, repository-path, and question containers change their border to the accent on focus-within. Repository paths use mono type; the composer uses readable Geist. Label-edit fields use the shared focus outline. Preserve descriptive labels alongside placeholders.

### Navigation

Header links start muted and turn accent on hover. Inspector tabs use an accent underline and text for the active section. Explorer rows use a subtle tinted fill and accent text when selected, and a darker hover fill. Compact breakpoints hide supplementary labels while retaining interactive icons and accessible names.

### Chips

Small rectilinear tags use mono labels, a neutral fill, and a fine border. Provenance tags distinguish source and manual content. Export-symbol chips wrap long identifiers instead of stretching the panel.

### Cards / Containers

Architecture nodes have a fine border, compact padding, small corners, and semantic tonal variations for entry, data, and UI kinds. Hover brightens the border; selection adds an accent border and outline; traced nodes gain a raised surface; unrelated nodes dim to (0.25) opacity.

Evidence cards group a filename header, real selectable source with line numbers, and a range/hash footer. Their source area scrolls, with a (220px) maximum height. Keep source formatting intact. The copy control reports success or failure.

### Pixel Figures

`PixelArt.tsx` draws every figure as rectangles on an integer grid with `shapeRendering="crispEdges"` and four flat tones plus one dithered fill. Sprites cover the hero skyline, the feature rows and the safety marks; glyphs cover the capability cards. A figure with an empty `label` renders as `aria-hidden` decoration, so decorative repeats stay out of the accessibility tree.

### Source Tracing Instrument

`figures/TracingInstrument.tsx` builds an isometric instrument from the vendored MIT kit (`components/iso/`, licence kept alongside): a base plate, a platen carrying three source cards, and a carriage whose reader window lights the card it is over. Punched marks on a card are its source lines. Because a single flat depth sort lets the wide platen bury a card, structure, pages and marks are painted as three groups. The caption steps through three traced call sites and lists the file, line and snippet for each; keep the figure tied to that inspectable example rather than making it ambient decoration.

## Do's and Don'ts

### Do:

- **Do** preserve the pixel display, functional sans, and source mono roles.
- **Do** keep source evidence readable at (12px), selectable, and connected to its filename and range.
- **Do** use `accent` blue for action, focus, selection, and trace emphasis with clear state labels.
- **Do** retain the stacked mobile workspace and accessible explorer toggle.
- **Do** honor reduced motion across trace animation and interface transitions.

### Don't:

- **Don't** replace the in-repo pixel figures or the tracing instrument with borrowed imagery or a generic gradient hero.
- **Don't** use pixel lettering for long explanations or source code.
- **Don't** turn every surface into a floating card or enlarge the restrained corner vocabulary.
- **Don't** visually conflate static dependencies, model explanations, and manual edits.

## Workspace direction — October 2026

The workspace uses a reading-first charcoal palette independently of landing-page styling. `src/components/Workbench.css` owns this interface; keep landing work in its own files. Workspace surfaces are neutral (#181818, #202020), text is warm near-white (#f0efe9), secondary text is #b7b7ad, and restrained amber (#e5c796) marks focus, selection, and the change-review action. Avoid blue-tinted source surfaces or colored component fills. Source, inferred, and manual labels remain explicit; change status also uses words and line styles.

Use 12px source text with generous line height, readable functional labels, clearly bordered fields, and visible keyboard focus. Component kinds share neutral cards and retain their icons. Selected nodes use a warm border and subtle fill. On mobile, the question composer spans the inspector width beneath scrollable answers. Preserve the responsive explorer and separate read-only change-review dialog.
