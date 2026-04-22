<script>
  import AppShell from './components/layout/AppShell.svelte';
  import RoutePlaceholder from './components/routes/RoutePlaceholder.svelte';
  import MapSandboxPage from './pages/MapSandboxPage.svelte';

  const routes = [
    { id: 'overview', label: 'Overview', description: 'Status and quick actions' },
    { id: 'map', label: 'Map', description: 'Interactive canvas and controls' },
    { id: 'locations', label: 'Locations', description: 'Catalog and search views' },
    { id: 'settings', label: 'Settings', description: 'Workspace preferences' }
  ];

  let currentRoute = 'map';

  /** @param {string} routeId */
  function handleNavigate(routeId) {
    currentRoute = routeId;
  }
</script>

<AppShell {routes} {currentRoute} onNavigate={handleNavigate}>
  {#if currentRoute === 'map'}
    <MapSandboxPage />
  {:else if currentRoute === 'overview'}
    <RoutePlaceholder
      title="Overview"
      description="Telemetry summary panels and workflow shortcuts will be added in a follow-up issue."
    />
  {:else if currentRoute === 'locations'}
    <RoutePlaceholder
      title="Locations"
      description="Location indexing and filtering will live in this section once domain APIs are connected."
    />
  {:else}
    <RoutePlaceholder
      title="Settings"
      description="Project-level map preferences and keyboard settings will be configurable from this page."
    />
  {/if}
</AppShell>
