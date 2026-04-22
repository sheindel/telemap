<script>
  /** @typedef {{ id: string; label: string; description: string }} NavRoute */

  /** @type {NavRoute[]} */
  export let routes = [];
  /** @type {string} */
  export let currentRoute = '';
  /** @type {(routeId: string) => void} */
  export let onNavigate = () => {};
</script>

<div class="telemap-shell">
  <header class="shell-header">
    <div>
      <p class="brand-eyebrow">Telemap</p>
      <h1>Operations Console</h1>
    </div>
    <p class="shell-blurb">Unified navigation and workspace regions for map and data workflows.</p>
  </header>

  <div class="shell-body">
    <nav class="shell-nav" aria-label="Primary navigation">
      {#each routes as route}
        <button
          type="button"
          class:active={route.id === currentRoute}
          on:click={() => onNavigate(route.id)}
          aria-current={route.id === currentRoute ? 'page' : undefined}
        >
          <span>{route.label}</span>
          <small>{route.description}</small>
        </button>
      {/each}
    </nav>

    <section class="shell-content" aria-live="polite">
      <slot />
    </section>
  </div>
</div>
