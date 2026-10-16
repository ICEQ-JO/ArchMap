---
name: ArchMap
description: A pixel circuit workbench for source-backed architecture maps.
colors:
  bg: '#10130f'
  surface: '#171b15'
  surface-raised: '#20251d'
  line: '#30382a'
  text: '#eeeee7'
  muted: '#a6af9e'
  green: '#bbf58b'
  green-ink: '#18250e'
  green-hover: '#d0ffa8'
  process-field: '#baf18e'
  process-ink: '#1d2b13'
  manual: '#c4b4f1'
  error: '#f8b7a8'
typography:
  display:
    fontFamily: 'Jersey 10, sans-serif'
    fontSize: 'clamp(64px, 6.8vw, 96px)'
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: '-1px'
  headline:
    fontFamily: 'Jersey 10, sans-serif'
    fontSize: 'clamp(48px, 5.2vw, 72px)'
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: '-0.7px'
  body:
    fontFamily: 'Geist, sans-serif'
    fontSize: '17px'
    fontWeight: 400
    lineHeight: 1.65
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
    backgroundColor: '{colors.green}'
    textColor: '{colors.green-ink}'
    rounded: '{rounded.control}'
    padding: '15px 19px'
  button-primary-hover:
    backgroundColor: '{colors.green-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.control}'
    padding: '11px 15px'
  button-secondary-hover:
    backgroundColor: '{colors.surface-raised}'
  button-text:
    padding: '10px 0'
  architecture-node:
    backgroundColor: '#1c2516'
    rounded: '{rounded.node}'
    padding: '13px 15px'
    width: '226px'
  evidence-card:
    backgroundColor: '#11170d'
    rounded: '{rounded.control}'
  tag:
    backgroundColor: '#26311e'
    textColor: '#c0d3ac'
    padding: '4px 6px'
---

# Design System: ArchMap

## Overview

**Creative North Star: "The Pixel Circuit Workbench"**

ArchMap pairs charcoal instrument surfaces with phosphor green and large pixel lettering. The user-pinned hacker/pixel direction informs the identity; the original SVG circuit terrain makes that direction specific to architecture exploration.

The working interface is denser than the landing page. Geist carries functional controls and explanations; Geist Mono carries actual source, paths, and technical readouts. The identity stays visible without compromising source evidence.

**Key Characteristics:**

- Pixel display lettering with readable functional typography.
- Green-black tonal surfaces, fine borders, and restrained depth.
- Original circuit terrain and inspectable source-backed connections.
- Responsive panels that preserve access to the map and evidence.

## Colors

### Primary

Phosphor green (`green`) marks primary actions, selection, focus, traced dependencies, and source accents. Its light hover counterpart brightens primary buttons. The process field uses a neighboring green with dark process ink for the landing-page workflow section.

### Secondary

Muted violet (`manual`) distinguishes user-authored graph details and dashed manual connections. It is a provenance cue, not a competing action color. Warm error text (`error`) carries failures; warning copy also uses a muted amber in the implementation.

### Neutral

Charcoal (`bg`), workbench surface (`surface`), and raised surface (`surface-raised`) organize the interface. Olive-gray (`line`) divides regions. Warm near-white (`text`) is the main reading color; sage-gray (`muted`) supports secondary information.

**The Evidence Color Rule.** Preserve distinct source, manual, selected, and error states; color supplements their text labels and line styles.

## Typography

**Display Font:** Jersey 10, sans-serif. **Body Font:** Geist, sans-serif. **Source/Readout Font:** Geist Mono, monospace. All three are served locally from `/fonts/`.

Display and section headlines use the frontmatter roles. Hero type changes at responsive breakpoints; on narrow phones its final size is `clamp(40px, 12.3vw, 62px)`. Section-specific headline sizes remain intentionally varied.

Functional headings use Geist at medium weight. Landing introduction copy uses the body role; workspace explanations use (12px), falling to (11px) on mobile. Evidence uses the evidence role at all widths, with (10px) filenames, footers, and line numbers. Compact metadata uses smaller mono labels; do not apply those sizes to source content.

**The Reading Surface Rule.** Use pixel lettering for display emphasis, Geist for interaction and prose, and Geist Mono for source and technical identifiers. Keep evidence at (12px).

## Layout

The landing container is capped at (1280px), initially with (56px) side gutters. Gutters become (32px) below (1100px) and (20px) below (520px). The desktop hero pairs copy with circuit terrain; it stacks below (820px). Workflow columns stack below (520px). Sections use generous vertical intervals while technical readouts stay compact.

The workspace occupies (100svh), with a fixed header, explorer, flexible map, and inspector. At the base desktop size, explorer and inspector widths are (224px) and (310px). They expand to (250px)/(350px) above (1500px), contract at (1200px), and contract again at (900px). Independent panel scrolling keeps controls in place.

Below (760px), the explorer becomes a (245px) overlay opened by the menu control. The map and inspector stack vertically; the map has a (230px) minimum height and the inspector a (190px) minimum. Toolbar text yields to icons and the minimap is removed at narrower desktop widths. The mobile question panel places its composer alongside its content. These are actual responsive behaviors, not a universal spacing scale.

## Elevation & Depth

Most depth comes from tonal surfaces and one-pixel borders. Architecture nodes use a small structural shadow (`0 5px 16px #0002`); selected nodes add a green outline shadow (`0 0 0 1px #bbf58b33`). The floating walk launcher and player have darker shadows. The mobile explorer casts a lateral shadow. Avoid applying these floating treatments to ordinary content sections.

Terrain motion is a linear dashed trace over (5s). Node border transitions take (0.15s), opacity (0.2s). Reduced-motion preference disables animations, transitions, and smooth scrolling.

## Shapes

The circuit illustration uses precise stepped pixels, isometric plates, and routed lines. Ordinary controls use small corners from the frontmatter; tabs and structural panels remain square. One-pixel borders define panels and fields. Tiny circular status indicators are the exception to the predominantly rectilinear language.

## Components

### Buttons

Primary buttons use green with dark ink, semibold (13px) Geist, and a (46px) minimum height. Secondary buttons use a dark surface and visible border. Text buttons have no filled container and turn green on hover. Disabled buttons use (0.45) opacity and a not-allowed cursor. Focus-visible controls receive a green (2px) outline offset by (4px).

### Inputs / Fields

Fields use dark inset surfaces and fine olive borders. Search, repository-path, and question containers change their border to green on focus-within. Repository paths use mono type; the composer uses readable Geist. Label-edit fields use the shared focus outline. Preserve descriptive labels alongside placeholders.

### Navigation

Header links start muted and turn green on hover. Inspector tabs use a green underline and text for the active section. Explorer rows use a subtle tinted fill and green text when selected, and a darker hover fill. Compact breakpoints hide supplementary labels while retaining interactive icons and accessible names.

### Chips

Small rectilinear tags use mono labels, olive fill, and a fine border. Provenance tags distinguish source and manual content. Export-symbol chips wrap long identifiers instead of stretching the panel.

### Cards / Containers

Architecture nodes have a fine olive border, compact padding, small corners, and semantic tonal variations for entry, data, and UI kinds. Hover brightens the border; selection adds green border and outline; traced nodes gain a brighter olive surface; unrelated nodes dim to (0.25) opacity.

Evidence cards group a filename header, real selectable source with line numbers, and a range/hash footer. Their source area scrolls, with a (220px) maximum height. Keep source formatting intact. The copy control reports success or failure.

### Circuit Terrain

The original inline SVG combines skewed grid lines, pixel clusters, isometric plates, and routed dependencies. Three adjacent tabs switch the highlighted path and matching example import evidence. Keep the illustration tied to that inspectable example rather than making it ambient decoration.

## Do's and Don'ts

### Do:

- **Do** preserve the pixel display, functional sans, and source mono roles.
- **Do** keep source evidence readable at (12px), selectable, and connected to its filename and range.
- **Do** use green for action, focus, selection, and trace emphasis with clear state labels.
- **Do** retain the stacked mobile workspace and accessible explorer toggle.
- **Do** honor reduced motion across trace animation and interface transitions.

### Don't:

- **Don't** replace the original circuit terrain with borrowed imagery or a generic gradient hero.
- **Don't** use pixel lettering for long explanations or source code.
- **Don't** turn every surface into a floating card or enlarge the restrained corner vocabulary.
- **Don't** visually conflate static dependencies, model explanations, and manual edits.

## Workspace direction — October 2026

The workspace uses a reading-first charcoal palette independently of landing-page styling. `src/components/Workbench.css` owns this interface; keep landing work in its own files. Workspace surfaces are neutral (#181818, #202020), text is warm near-white (#f0efe9), secondary text is #b7b7ad, and restrained amber (#e5c796) marks focus, selection, and the change-review action. Avoid blue-tinted source surfaces or colored component fills. Source, inferred, and manual labels remain explicit; change status also uses words and line styles.

Use 12px source text with generous line height, readable functional labels, clearly bordered fields, and visible keyboard focus. Component kinds share neutral cards and retain their icons. Selected nodes use a warm border and subtle fill. On mobile, the question composer spans the inspector width beneath scrollable answers. Preserve the responsive explorer and separate read-only change-review dialog.
