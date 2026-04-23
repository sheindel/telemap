<script>
  import AppShell from './components/layout/AppShell.svelte';
  import MapSandboxPage from './pages/MapSandboxPage.svelte';

  const routes = [
    { id: 'overview', label: 'Mission', description: 'Business goals and deployment fit' },
    { id: 'map', label: 'Planner', description: 'Floor plan mapping and asset placement' },
    { id: 'inventory', label: 'Inventory', description: 'Ports, rooms, and capacity model' },
    { id: 'routing', label: 'Routing', description: 'Run estimates and patch strategies' }
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
    <section class="placeholder-panel" aria-label="Mission alignment">
      <h2>Who This Tool Serves</h2>
      <p>
        Telemap is designed to turn building drawings into deployable telecom plans for field teams,
        operations teams, and IT architects.
      </p>
      <ul class="business-list">
        <li>Telecom installers and electricians can pre-plan rack and wall-drop placements.</li>
        <li>Building maintenance can track current infrastructure and available capacity by room.</li>
        <li>IT teams can model routing options before extending fiber or copper services.</li>
      </ul>
    </section>
  {:else if currentRoute === 'inventory'}
    <section class="placeholder-panel" aria-label="Inventory strategy">
      <h2>Inventory Backbone</h2>
      <p>
        The map planner seeds an asset register where each rack, wall drop, and fiber panel carries
        structured metadata.
      </p>
      <ul class="business-list">
        <li>Port allocation status and spare capacity at each endpoint.</li>
        <li>Room-level indexing to support maintenance dispatch and audit trails.</li>
        <li>Lifecycle notes for installs, moves, and decommissioned runs.</li>
      </ul>
    </section>
  {:else}
    <section class="placeholder-panel" aria-label="Routing strategy">
      <h2>Routing And Patching</h2>
      <p>
        As scale and placements become reliable, routing intelligence can prioritize shortest paths,
        available strands, and panel utilization.
      </p>
      <ul class="business-list">
        <li>Estimate cable lengths for procurement and labor planning.</li>
        <li>Suggest rack-to-drop paths based on nearest feasible telecom rooms.</li>
        <li>Evaluate patching scenarios before making physical changes onsite.</li>
      </ul>
    </section>
  {/if}
</AppShell>
