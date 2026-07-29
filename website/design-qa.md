# OFF marketing site design QA

- Source visual truth: `../docs/marketing-site-reference-v1.png`
- Capability-strip ImageGen reference: `references/capability-strip-imagegen-v1.png`
- Implementation screenshot: `implementation-desktop-final.png`
- Refactored capability desktop screenshot: `implementation-capability-desktop.jpg`
- Refactored capability mobile screenshot: `implementation-capability-mobile.jpg`
- Capability comparison: `capability-strip-comparison.png` (ImageGen reference left, implementation right)
- Theme/overflow before-and-after comparison: `audit/theme-contrast-refactor/theme-before-after-1280.png`
- Theme mobile screenshot: `audit/theme-contrast-refactor/03-mobile-390.png`
- Mobile screenshot: `implementation-mobile-v2.png`
- Full-view comparison: `design-comparison-final.png` (source left, implementation right)
- Focused workspace comparison: `design-comparison-workspace.png` (source left, implementation right)
- Desktop viewport: 1536 × 1024 CSS px
- Source pixels: 1536 × 1024 at 1×
- Implementation pixels: 1536 × 1024 at 1×; no density normalization required for the final comparison
- Mobile viewport and pixels: 390 × 844 at 1×
- State: dark Market Terminal theme, Summary tab selected

## Findings

No actionable P0, P1, or P2 visual differences remain.

- Capability-strip refactor: the implementation preserves the regenerated reference's heading, four equal content units, amber outline icon family, restrained body copy, vertical rules, square geometry, and near-black surface. The production section is intentionally denser than the isolated ImageGen canvas so it remains proportional to the surrounding landing page.
- Component anatomy: NameThatUI identified `Card` as the nearest canonical unit and supplied header/body semantics. OFF renders the units as one non-interactive semantic list instead of floating card containers, consistent with the Market Terminal design system.
- Theme layering: opaque blue-charcoal surface steps now distinguish the page ground, hero, workspace, nested analytical panes, and raised pane headers. This follows Carbon's dark-theme model, where nested layers become progressively lighter instead of sinking into a uniform black field.
- Contrast: calculated text contrast across the brightest nested surface is 10.70:1 for primary text, 7.15:1 for secondary text, 4.56:1 for quiet text, and 7.13:1 for brand amber. These meet WCAG 2.2's 4.5:1 normal-text target.
- Graph containment: the workspace now defines a shrinkable grid column, constrains direct children with `min-width: 0`, and collapses secondary workspace metadata before the previously failing desktop interval. The chart's right margin also preserves the full `Terminal` label.
- Fonts and typography: IBM Plex Sans and IBM Plex Mono match the repository design system and preserve the reference hierarchy. The generated reference's display face is slightly wider; retaining the canonical IBM Plex stack is an accepted P3 difference.
- Spacing and layout rhythm: header, hero, workspace, capability row, and manifest panel preserve the reference grid, thin rules, square geometry, and vertical section order. The implementation workspace starts 9px farther right and the manifest begins 9px lower; both are acceptable P3 differences at this viewport.
- Colors and visual tokens: the implementation uses the canonical screen palette from `docs/DESIGN.md`, with restrained amber and semantic green, red, blue, orange, and yellow. Contrast and focus treatment remain visible.
- Image and icon fidelity: the reference contains no raster content assets. Capability icons use Phosphor's matching light-outline icon set; the analytical chart uses Recharts rather than handcrafted SVG or CSS art.
- Copy and content: headline, subhead, navigation, CTAs, feature labels, status, release, package version, and scenario values match the approved reference. Source rows, freshness labels, WACC, terminal growth, and chart data intentionally use the canonical Apple DCF package instead of generated placeholder values.
- Responsive behavior: the 390px layout has no page-level horizontal overflow. Tabs scroll within their own tab list, the research workspace becomes a single column, and touch controls retain at least 44px interaction height.

## Interaction and browser evidence

- Production build and Sites packaging completed successfully.
- Refactored capability strip was visually inspected at 1536 × 1024 and 390 × 844.
- At 390px, the feature units recompose to one column and the document width equals the viewport width (390px), with no page-level horizontal overflow.
- Refactor comparison reviewed the ImageGen reference and implementation together; no actionable spacing, typography, border, icon, or copy mismatch remains.
- Theme and graph containment were checked at 1536, 1430, 1366, 1280, 1261, 1260, 1024, and 390px. At every width, document width equals viewport width and the chart remains inside the workspace.
- The 1280px before-and-after comparison confirms that section and pane boundaries are now visible without shadows, gradients, rounded containers, or decorative color.
- Valuation tab click selected the linked tab panel and exposed the scenario table.
- Right-arrow keyboard navigation moved selection from Valuation to Assumptions.
- Summary selection restored the default research workspace.
- Navigation and CTA destinations were verified from rendered link targets.
- Browser console errors and warnings: none.

## Comparison history

1. Desktop pass 1 found a P1 hero-wrap mismatch: the headline rendered on three lines instead of the approved two. Fixed by preserving the deliberate line break and desktop no-wrap behavior.
2. Mobile pass 1 found a P2 page-level overflow at 390px caused by the visually hidden chart data table. Replaced it with an accessible chart summary; post-fix document width equals the 390px viewport.
3. Desktop pass 2 and focused workspace comparison found no remaining P0/P1/P2 differences.

## Follow-up polish

- P3: The source image uses slightly wider display lettering than canonical IBM Plex Sans.
- P3: The implementation keeps live package facts and source states, so some dense workspace labels differ from the generated reference.
- P3: The stronger website surface palette is an intentional evolution of the initial planning-draft values in `docs/DESIGN.md`; the semantic roles and Market Terminal constraints remain unchanged.

## Final result

final result: passed
