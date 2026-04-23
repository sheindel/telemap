# Telemap

Telemap is a telecommunications infrastructure planning tool for mapping copper and fiber assets onto building floor plans.

The core product goal is to help teams plan, estimate, and track telecom infrastructure using a visual map plus structured asset metadata.

## Who It Is For

- Telecom installers and electricians who need to plan placements and pathways before physical work starts.
- Building maintenance teams who need a reliable inventory of racks, drops, and capacity by room.
- IT teams who need visibility into available ports and potential routing or patching options.

## Current Frontend Workflow

The current planner UI supports a practical three-step workflow:

1. Upload a floor plan image.
2. Calibrate map scale by selecting two points and entering known real-world distance.
3. Place telecom components (rack, wall drop, splice enclosure, fiber panel) on the map with room tags.

Once assets are placed, the app computes live planning metrics such as:

- Port usage and utilization.
- Estimated drop-to-rack run distances (average and longest) after scale is set.
- Asset and room counts for planning coverage.

## Product Direction

Planned capabilities include:

- Room association assisted by image recognition and/or LLM-backed extraction.
- Better routing intelligence for copper/fiber path scenarios.
- Patching recommendations based on nearest feasible telecom distribution points.
- Persistent project data for multi-session operational tracking.

## Screenshots And Demo Media

Use this section to keep visual documentation current as the planner evolves.

- Main planner overview screenshot: capture the full page with workflow cards, map, and insight panels.
- Scale calibration screenshot: capture calibration mode with two selected points and applied scale summary.
- Asset placement screenshot: capture multiple component types placed across at least two room tags.
- Port utilization screenshot: capture non-zero used/total ports and the placed infrastructure table.
- Short workflow GIF (20-40 seconds): upload floor plan -> calibrate -> place components -> review insights.

Recommended naming convention for media files:

- `telemap-planner-overview.png`
- `telemap-scale-calibration.png`
- `telemap-asset-placement.png`
- `telemap-port-utilization.png`
- `telemap-workflow-demo.gif`

Suggested location: keep all media under `docs/media/` so README references remain stable.

## Example Planning Session

This is a realistic first-pass workflow for planning telecom infrastructure in one floor:

1. Start the app and upload a floor plan export (PNG/JPG).
2. Enter calibration mode and click two points with known real-world distance (for example a hallway segment).
3. Enter the measured value and unit, then apply scale.
4. Enable placement mode and place racks in MDF/IDF rooms.
5. Switch component type to wall drops and place endpoints in target rooms.
6. Add splice enclosures or fiber panels where distribution transitions are expected.
7. Update used ports per component to reflect expected service demand.
8. Review utilization and routing estimates to identify capacity pressure and long runs.
9. Iterate on placements until routing and capacity look acceptable for install planning.
10. Capture screenshots/GIF for project review and handoff.

## Local Development

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite.

## Scripts

- `pnpm dev` - start local dev server
- `pnpm build` - production build
- `pnpm preview` - preview production build locally
- `pnpm check` - run Svelte diagnostics
- `pnpm test` - run unit tests

## Technical Notes

- Frontend stack: Svelte + Vite.
- Package manager: pnpm.
- Build output directory: `dist/`.
- Core interaction/calibration domain code lives under `src/domain/`.

## Map Interaction Architecture

Map interaction behavior is organized under `src/domain/map/`:

- `contract.ts` defines the map module interfaces (`MapRenderer`, `MapViewportStore`, `MapEventStream`, `MapInteractionController`, `MapInteractionModule`).
- `createMapInteraction.ts` provides the default implementation for pan/zoom and event emission.
- `index.ts` is the app-facing map interaction entrypoint.

Scale calibration utilities live in `src/domain/calibration/` and provide pixel-to-real-world distance conversion used by planner estimates.

## Beads Workflow

Use Beads for issue tracking in this repository.

Common commands:

```bash
bd --no-db ready
bd --no-db show <issue-id>
bd --no-db blocked
```
