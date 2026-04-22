# Telemap Frontend

High-performance frontend scaffold using Vite + Svelte, designed for rapid UI work with straightforward HTML/CSS/JS ergonomics.

## Quickstart

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite.

## Scripts

- `pnpm dev` - start local dev server
- `pnpm build` - production build
- `pnpm preview` - preview production build locally
- `pnpm check` - Svelte static checks

## Map Interaction Contract

The map interaction behavior is split into explicit module boundaries under
`src/domain/map/`:

- `contract.ts` defines the API surface:
	- `MapRenderer` for render + coordinate projection
	- `MapViewportStore` for viewport state and subscriptions
	- `MapEventStream` for normalized interaction events
	- `MapInteractionController` for DOM event wiring
	- `MapInteractionModule` as the assembled public module
- `createMapInteraction.ts` provides a practical default adapter that:
	- renders a lightweight grid surface
	- supports pan (pointer drag) and wheel zoom
	- emits typed interaction and viewport-change events
- `index.ts` is the import entrypoint for app-facing usage.

Current scaffold usage is shown in `src/App.svelte`, where the app consumes the
exported module rather than reaching into renderer or event internals.

## Notes

- Package manager: use `pnpm` for all dependency and script commands.
- If dependencies change, run `pnpm install` to refresh `pnpm-lock.yaml`.
- Build output is written to `dist/`.
- If `pnpm install` warns about blocked build scripts, run `pnpm approve-builds` and allow trusted packages.

## Beads

Beads has been initialized in this workspace.

Task tracking policy:
- Use Beads for planning and execution tracking in this repo.
- Prefer Beads issues/dependencies over markdown TODO plans.

Common commands:

```bash
bd --no-db ready
bd --no-db create "Build map canvas shell" -t task -p 1
bd --no-db show <issue-id>
bd --no-db blocked
```
