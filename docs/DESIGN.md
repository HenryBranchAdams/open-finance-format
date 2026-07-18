# OFF reference design system

Status: planning draft
Product: Open Finance Format (OFF)
Reference theme: **Market Terminal**

## 1. Purpose and boundary

This document establishes the visual and interaction direction for OFF’s reference templates, web publisher, embedded viewers, spreadsheet outputs, documents, PDFs, and social previews.

Market Terminal is the chosen reference presentation system. It is **not** a semantic requirement of the open format. An OFF package may use another conforming presentation theme without losing structural validity.

The system should feel like a professional financial instrument: dense, exact, persistent, and operationally meaningful. It should not imitate Bloomberg superficially and should not turn public research into a trading interface. In OFF, “action” initially means inspecting, navigating, citing, comparing, downloading, and sharing. Trading and order execution are outside scope.

## 2. Design thesis

OFF should present a model as a live research workspace rather than a pile of cards or an inert file attachment.

Defining signals:

- edge-to-edge panes separated by thin rules;
- compact semantic tables with aligned financial values;
- near-black or charcoal screen surfaces;
- high-contrast warm-neutral or amber information text;
- semantic color used only for real state;
- persistent security, version, scenario, and freshness context;
- unmistakable keyboard focus and selected state;
- brief, local change indications;
- mobile layouts that preserve density by reordering information rather than shrinking it.

The apparent visual complexity must correspond to actual information architecture. Empty sparklines, fake tickers, decorative telemetry, random percentages, and microscopic labels are prohibited.

## 3. What Market Terminal means for OFF

### It is Market Terminal when

- numbers align for comparison;
- panes preserve context while the reader investigates;
- color, labels, symbols, and line styles encode real states;
- version, scenario, source status, and selected subject remain visible;
- keyboard, pointer, and touch interactions are deliberate;
- updates correspond to a source refresh, scenario change, or model release;
- density increases usable information rather than visual noise.

### It becomes a generic dashboard when

- the page is dominated by oversized KPI cards;
- charts are presentation ornaments rather than analytical tools;
- generous gutters and rounded containers consume the viewport;
- the layout offers one simple mouse-led path with little persistent context.

### It becomes cyberpunk when

- neon glow, scanlines, glitch effects, radar sweeps, or fictional system labels appear;
- motion creates atmosphere rather than communicating a real update;
- technical ornament overwhelms the information.

### It becomes web brutalism when

- browser-native roughness replaces consistent financial typography and interaction rules;
- deliberate incompleteness or visual abrasion becomes the main aesthetic device.

## 4. Information hierarchy

OFF uses five levels of visual hierarchy:

1. **Global context:** issuer, security, model version, as-of date, active scenario, and package freshness.
2. **Workspace navigation:** research summary, valuation, assumptions, sources, lineage, files, and disclosures.
3. **Pane identity:** short title, state, controls, and optional linked subject.
4. **Analytical content:** tables, charts, prose, outputs, and source records.
5. **Cell-level state:** selection, change, stale dependency, warning, validation error, or user override.

Hierarchy should be created with background steps, rules, typography, spacing, and position. Do not rely on floating cards or shadows.

## 5. Layout system

### Desktop and wide tablet

- Use a CSS Grid workspace with a 1px gap exposing the workspace background as pane rules.
- Panes tile the available viewport and may eventually be resized, tabbed, linked, or retargeted.
- Global context remains visible while the user changes research sections or artifacts.
- Dense tables and charts may share the screen when the relationship is analytically useful.
- Avoid a centered marketing-page canvas with large unused margins.

Reference wide layout:

```text
┌──────────────── global context / command bar ────────────────┐
├───────────────┬──────────────────────────┬────────────────────┤
│ Research nav  │ Valuation / primary view │ Sources / context  │
│ + model state │                          │                    │
├───────────────┴──────────────────────────┼────────────────────┤
│ Assumptions / scenario table             │ Native file viewer │
└──────────────────────────────────────────┴────────────────────┘
```

This is an illustrative workspace, not a fixed page requirement.

### Mobile

Do not compress the desktop pane grid into miniature columns. Recompose it.

- Use a single primary column.
- Preserve global context in a compact sticky bar.
- Convert workspace navigation into tabs, a command surface, or a section index.
- Order content by decision value: thesis, valuation, scenarios, key assumptions, freshness, supporting detail, native artifacts.
- Permit horizontal scrolling only inside genuinely tabular regions.
- Freeze row labels or the first semantic column where the viewer supports it.
- Offer density and text-size controls without breaking the layout.
- Keep touch targets at least 44px where controls require direct touch, even if table rows remain visually compact.
- Test at approximately 360px, 390px, and 430px viewport widths.

Mobile density comes from prioritization, abbreviation, disclosure, and progressive detail—not microscopic type.

### Reference breakpoints

- Compact: below 640px.
- Intermediate: 640–1023px.
- Workspace: 1024px and above.

Breakpoints are implementation guidance, not OFF package semantics.

## 6. Spacing, geometry, and density

- Base spacing unit: 4px.
- Pane padding: 8–12px compact, 12–16px standard.
- Desktop data-row target: 28–32px.
- Mobile data-row target: 36–44px, depending on interactivity.
- Dividers: 1px.
- Corners: square by default; 2–4px only where needed for focus, clipping, or platform consistency.
- Shadows: none for ordinary hierarchy.
- Pills: reserved for compact status labels, never as the default container shape.
- Modal overlays: use sparingly; prefer persistent panes, drawers, or inline expansion.

User-selectable density may expose `compact`, `standard`, and `comfortable` modes. Density changes spacing and row height, not information meaning.

## 7. Color system

### Canonical screen palette

These are initial reference tokens, not yet a final brand palette:

| Token | Reference | Role |
|---|---:|---|
| `surface.workspace` | `#080A0C` | 1px pane gaps and deepest ground |
| `surface.base` | `#0E1114` | primary screen ground |
| `surface.raised` | `#15191E` | pane headers and stepped regions |
| `surface.selected` | `#20303B` | selected rows or active context |
| `rule.default` | `#30363D` | pane and table divisions |
| `text.primary` | `#F2E8D5` | primary information |
| `text.secondary` | `#AEB5BC` | secondary labels and prose metadata |
| `text.quiet` | `#7F8993` | low-priority supporting text |
| `accent.brand` | `#F2B84B` | OFF/Market Terminal accent and active command |
| `state.positive` | `#55D69E` | positive movement or favorable delta |
| `state.negative` | `#FF7474` | negative movement or unfavorable delta |
| `state.info` | `#78BFFF` | linked context and informational state |
| `state.warning` | `#F3C969` | aging data and caution |
| `state.stale` | `#F09A4A` | stale source or dependent output |
| `state.unknown` | `#B7A1FF` | unresolved or unknown status |
| `focus.ring` | `#9BD2FF` | keyboard focus indicator |

All final combinations must be contrast-tested in their actual type size and stroke weight. The target is at least 4.5:1 for normal text and at least 3:1 for essential graphical objects and focus cues; exceed the minimum for thin chart strokes.

### Print and document companion

Consistency across media means shared grammar, typography, spacing, semantic roles, and chart language—not forcing black page backgrounds into every printed document.

The companion `terminal-print` palette should invert the surfaces:

- warm off-white paper;
- charcoal primary text;
- darkened amber brand accent;
- accessible green, red, blue, and orange semantic colors;
- the same 1px rule hierarchy and square geometry;
- identical labels, symbols, line styles, and data formats.

The web reader and embedded viewer default to `terminal-screen`. Print-oriented DOCX and PDF output may default to `terminal-print`. Screen PDFs may offer a dark rendition when useful.

### Semantic-color rules

- Never encode gain, loss, freshness, risk, or selection through hue alone.
- Pair color with `+`/`−`, arrows, labels, icons, patterns, line styles, or position.
- Do not use positive/negative colors decoratively.
- Scenario identity should remain stable across tables and charts.
- Reserve the strongest colors for state that deserves immediate attention.

## 8. Typography and number grammar

### Reference families

- UI and prose sans: **IBM Plex Sans** with system sans fallbacks.
- Dense data and commands: **IBM Plex Mono** with `ui-monospace` fallbacks.
- Long-form memo option: **IBM Plex Serif** or a compatible document-safe serif.

Open fonts may be embedded in web/PDF outputs where licensing permits. Office artifacts must define sensible installed-font fallbacks.

### Type behavior

- Use tabular lining numerals for all comparable values.
- Right-align numerical columns.
- Align decimal precision within a column.
- Preserve visible signs when direction matters.
- Use consistent formats for currency, percentages, basis points, multiples, quantities, dates, and times.
- Use abbreviations only where the intended audience is likely to understand them; expose full labels through headers, tooltips, or accessible descriptions.
- Prose remains proportional and comfortably readable even when nearby data is monospaced.
- Do not use all caps for long labels or paragraphs.

### Reference scale

- Data micro-label: 11–12px.
- Table/body text: 12–14px desktop, 14–16px mobile where possible.
- Pane title: 12–14px, semibold.
- Section title: 16–20px.
- Primary model title: 20–28px depending on viewport.

The system should support browser zoom, document scaling, and user-selected text sizing without truncating critical meaning.

## 9. Core component grammar

### Global context bar

Always communicates:

- issuer/ticker;
- model version;
- as-of date;
- active scenario;
- overall freshness;
- canonical release status.

On mobile it becomes a compact sticky context bar. It must not consume a marketing-style hero region.

### Pane

A pane has:

- compact header;
- explicit title;
- optional state or linked subject;
- controls aligned consistently;
- hard boundary created by rules/background steps;
- no floating-card shadow.

### Data table

- Use semantic HTML tables for genuinely tabular content.
- Provide real column and row headers.
- Right-align figures and prevent accidental value wrapping.
- Use sticky headers where useful.
- Keep sort, filter, selection, and stale-state indicators programmatically available.
- Preserve the table’s meaning when columns are hidden on compact screens.

### Metric strip

Headline metrics form a compact ledger or strip, not oversized KPI cards. Each item includes label, value, unit, scenario, and relevant status.

### Assumption row

An assumption row can expose:

- label and stable ID affordance;
- value and unit;
- source or analyst-judgment marker;
- freshness/review status;
- scenario override;
- validation state;
- future edit control.

Read-only presentation must not look deceptively editable.

### Source and freshness state

Reference treatments:

- `CURRENT ✓`
- `AGING ◷`
- `STALE !`
- `UNKNOWN ?`

The indicator links to an explanation showing the source, effective date, retrieval time, expected cadence, and affected outputs.

### Scenario selector

Base, bull, bear, and custom cases use stable labels plus color/shape. A selected scenario must be apparent without relying on color. Future user overrides must be visually distinct from an author’s immutable published scenario.

### Native artifact viewer shell

The viewer shell includes:

- artifact title and type;
- version/hash status;
- compact toolbar;
- open/download actions;
- viewer loading/error state;
- accessible boundary between OFF chrome and rendered file content.

Do not recolor an uploaded document destructively merely to match the shell.

## 10. Extend UI adaptation

Extend UI is a candidate reference viewer for XLSX, DOCX, PDF, and CSV. Its components should sit inside OFF’s pane and context system.

Guidelines:

- Apply OFF tokens through the copied component source or wrapper styles.
- Preserve viewer semantics, keyboard behavior, zoom, selection, workbook tabs, frozen panes, and document fidelity.
- Keep toolbar density consistent with the rest of the workspace.
- Use OFF focus and state treatments without obscuring selected spreadsheet cells or PDF text selection.
- Avoid heavy chrome around chrome; the viewer pane already supplies containment.
- Treat the viewer as secondary on small screens and allow a dedicated full-screen artifact route.
- Do not assume that the XLSX viewer reflows wide workbooks. The OFF mobile reader provides the responsive summary.
- Keep the architecture replaceable: OFF manifests describe artifacts and roles, not a mandatory viewer vendor.

## 11. Charts and analytical graphics

- Use market-native charts only when they support a real analytical question.
- Prefer direct labels to distant legends.
- Show units, time basis, scenario, and as-of context.
- Preserve a visible zero or reference line when it changes interpretation.
- Use no more simultaneous series than the reader can distinguish reliably.
- Combine color with dash patterns, marker shapes, and labels.
- Avoid 3D charts, gradients used as decoration, glowing strokes, and meaningless sparklines.
- Sensitivity tables should expose axes, units, base-case cell, and direction of improvement.
- Waterfalls should distinguish operating drivers, financing effects, and per-share reconciliation.
- Charts in XLSX, DOCX, PDF, and web should use the same semantic series mapping even when rendering differs.

## 12. Motion and live updates

Motion communicates a discrete event:

- source refresh;
- changed value;
- scenario switch;
- new model version;
- validation result;
- selection retargeting linked panes.

Allowed treatments include one brief flash, inversion, directional mark, or localized transition. Avoid ambient animation, sweeping highlights, moving grids, looping glows, and decorative chart motion.

- Respect `prefers-reduced-motion`.
- Never require animation to understand the change.
- Avoid more than three flashes per second.
- Preserve the prior value or change direction long enough for review when the update matters.

## 13. Accessibility and input methods

- Meet WCAG contrast requirements and exceed them for thin graphical strokes.
- Provide visible keyboard focus for every pane and control.
- Follow a logical focus order matching the visual and analytical hierarchy.
- Support skip links or pane navigation in multi-pane web layouts.
- Provide semantic table relationships.
- Expose chart summaries and underlying data where practical.
- Do not rely on hover for essential information.
- Make touch controls large enough without inflating passive data rows.
- Support reduced motion, browser zoom, high-contrast preferences, and text scaling.
- Announce meaningful data refreshes without creating an unusable stream of live-region notifications.

## 14. Cross-format application

### Web/Sites

- Highest-fidelity implementation of the responsive pane system.
- `terminal-screen` default with optional user-selected print/light mode.
- Persistent context, semantic tables, keyboard navigation, and source drill-down.
- Social and embed routes use a deliberately reduced information set.

### XLSX

- Provide a purpose-built `Publish` or `Reader` sheet optimized for viewing rather than exposing a raw calculation grid first.
- Use named styles, named ranges, frozen panes, semantic number formats, and conditional formatting.
- Preserve stable semantic IDs independently of cell position.
- Use color plus labels/symbols for freshness and validation.
- Avoid macros and unsafe external connections in trusted hosted artifacts.
- Define print areas and a light-print rendition where practical.

### DOCX

- Use `terminal-print` by default for long-form readability and printing.
- Preserve thin rules, compact metadata tables, semantic accents, typography, and model context.
- Avoid simulating the full pane workspace on a paginated sheet.
- Use running headers or footers for ticker, version, as-of date, and page number.

### PDF

- Offer a mobile-readable screen PDF or a paginated print PDF according to the declared role.
- Preserve text as text where possible.
- Include bookmarks, links, source references, version identity, and publication date.
- Do not rasterize dense tables unless unavoidable.

### Social preview and external embed

- Use a compact thesis line, ticker/company, valuation range, as-of date, author, version, and freshness state.
- Do not reproduce a miniature terminal screenshot that becomes unreadable in a feed.
- Preview images should remain understandable without color.
- The external card links to the immutable release by default.

## 15. Theme architecture

When implementation begins, keep four layers separate:

1. **Semantic tokens:** surfaces, text, rules, status, scenario, focus, and chart roles.
2. **Theme values:** Market Terminal screen and print values.
3. **Component contracts:** pane, table, context bar, source state, chart, viewer shell.
4. **Renderer adapters:** web CSS, Extend UI, XLSX styles, DOCX styles, PDF styles, and preview generation.

This separation prevents the OFF semantic specification from depending on CSS or a specific component library and permits future community themes.

## 16. Recipes and anti-slop checks

Recipes may prescribe layouts for DCF, SOTP, earnings update, long thesis, short thesis, comps, or scenario analysis. They consume the design system but do not redefine it.

Reference lint checks should flag:

- unreadable phone layouts;
- unnecessary horizontal page scrolling;
- low contrast or color-only meaning;
- inconsistent decimals, units, signs, or currencies;
- oversized KPI cards and excessive empty space;
- excessive rounding, pills, shadows, or gradients;
- empty charts and decorative market data;
- missing as-of dates, versions, source status, or disclosures;
- hidden assumptions and unexplained manual plugs;
- stale outputs without a visible explanation;
- broken focus order or inaccessible tables;
- inconsistent semantic colors across file formats.

These checks should distinguish objective failures from subjective design guidance.

## 17. Brand notes

- Write the full name as **Open Finance Format (OFF)** on first reference.
- `OFF` is the compact mark in context.
- Avoid power-button jokes, “system offline” motifs, or branding that makes “off” sound unavailable or inactive.
- The identity should feel open, inspectable, and exact rather than institutional or exclusionary.
- A text-first wordmark is preferable until the standard and platform relationship is clearer.

## 18. Acceptance criteria for the reference design

A reference implementation is successful when:

- a reader can understand the thesis and valuation on a 390px-wide phone without opening Excel;
- a specialist can inspect the native workbook or memo without losing version/source context;
- dense numerical tables remain scannable and semantically accessible;
- stale dependencies are obvious and explainable;
- screen, spreadsheet, document, PDF, and preview outputs unmistakably belong to the same system;
- the design works with keyboard, pointer, and touch;
- reducing motion or removing color does not remove essential meaning;
- the interface feels like a real research instrument, not a generic dashboard or themed mock terminal.

## 19. Design references

- Bloomberg customer-centric design ethos: https://www.bloomberg.com/company/stories/bloombergs-customer-centric-design-ethos/
- Bloomberg Terminal complexity and UX: https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/
- Bloomberg color accessibility: https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/
- LSEG Workspace data and content: https://www.lseg.com/en/data-analytics/products/workspace/data-and-content
- Extend UI: https://www.extend.ai/ui
- Extend XLSX viewer: https://www.extend.ai/ui/docs/components/xlsx-viewer
