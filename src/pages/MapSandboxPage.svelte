<script>
  import { onMount } from 'svelte';
  import { createScaleCalibration, SUPPORTED_UNITS } from '../domain/calibration';
  import { createMapInteraction } from '../domain/map';

  /** @type {HTMLDivElement | undefined} */
  let mapElement;
  /** @type {import('../domain/map').MapInteractionModule | null} */
  let map = null;
  let viewportLabel = 'x:0.0 y:0.0 z:1.00';
  let lastEvent = 'none';
  let crosshairEnabled = true;
  let calibrationMode = false;
  /** @type {import('../domain/map').MapPoint[]} */
  let calibrationPoints = [];
  let calibrationDistance = '10';
  /** @type {import('../domain/calibration').CalibrationUnit} */
  let calibrationUnit = 'm';
  /** @type {import('../domain/calibration').ScaleCalibration | null} */
  let calibration = null;
  let calibrationError = '';

  $: pointCountLabel = `${calibrationPoints.length}/2 points selected`;
  $: unitLabel = calibrationUnit === 'ft' ? 'foot' : 'meter';
  $: calibrationSummary = calibration
    ? `1 ${unitLabel} = ${calibration.pixelsPerUnit.toFixed(2)} px`
    : 'No scale calibration applied';

  function resetViewport() {
    if (!map) {
      return;
    }
    map.viewport.set({
      x: 0,
      y: 0,
      zoom: 1
    });
  }

  function toggleCrosshair() {
    crosshairEnabled = !crosshairEnabled;
    map?.setScene({ showCrosshair: crosshairEnabled });
  }

  function toggleCalibrationMode() {
    calibrationMode = !calibrationMode;
    calibrationError = '';
    calibrationPoints = [];
  }

  function applyCalibration() {
    calibrationError = '';
    if (calibrationPoints.length < 2) {
      calibrationError = 'Pick two map points before applying scale.';
      return;
    }

    const parsedDistance = Number.parseFloat(calibrationDistance);
    if (!Number.isFinite(parsedDistance) || parsedDistance <= 0) {
      calibrationError = 'Distance must be a positive number.';
      return;
    }

    try {
      calibration = createScaleCalibration(
        calibrationPoints[0],
        calibrationPoints[1],
        parsedDistance,
        calibrationUnit
      );
      calibrationMode = false;
      calibrationPoints = [];
    } catch (error) {
      calibrationError = error instanceof Error ? error.message : 'Unable to apply calibration.';
    }
  }

  function clearCalibration() {
    calibration = null;
    calibrationError = '';
  }

  onMount(() => {
    map = createMapInteraction({
      initialViewport: {
        zoom: 1,
        width: 600,
        height: 360
      },
      scene: {
        showCrosshair: crosshairEnabled,
        gridSize: 36
      }
    });

    const unsubscribeViewport = map.viewport.subscribe((viewport) => {
      viewportLabel = `x:${viewport.x.toFixed(1)} y:${viewport.y.toFixed(1)} z:${viewport.zoom.toFixed(2)}`;
    });

    const unsubscribeEvents = map.events.subscribe((event) => {
      lastEvent = event.type;
      if (calibrationMode && event.type === 'pointer-down' && calibrationPoints.length < 2) {
        calibrationPoints = [...calibrationPoints, event.world];
      }
    });

    if (mapElement) {
      map.connect(mapElement);
    }

    return () => {
      unsubscribeViewport();
      unsubscribeEvents();
      map?.destroy();
    };
  });
</script>

<section class="map-panel" aria-label="Map interaction module demo">
  <header class="panel-header">
    <h2>Map Sandbox</h2>
    <p>Current implementation of viewport state, pointer events, and renderer scene controls.</p>
  </header>

  <div class="map-toolbar">
    <button type="button" on:click={resetViewport}>Reset Viewport</button>
    <button type="button" on:click={toggleCrosshair}>
      {crosshairEnabled ? 'Hide Crosshair' : 'Show Crosshair'}
    </button>
    <button type="button" on:click={toggleCalibrationMode}>
      {calibrationMode ? 'Cancel Calibration' : 'Start Calibration'}
    </button>
    <button type="button" on:click={clearCalibration} disabled={!calibration}>Clear Scale</button>
    <p>Viewport <strong>{viewportLabel}</strong></p>
    <p>Last event <strong>{lastEvent}</strong></p>
  </div>

  <div class="calibration-panel" aria-live="polite">
    <p><strong>Scale:</strong> {calibrationSummary}</p>
    <p>
      <strong>Calibration:</strong>
      {calibrationMode ? 'Click two points on the map.' : 'Calibration mode is idle.'}
      <span>{pointCountLabel}</span>
    </p>
    <label>
      Real distance
      <input
        type="number"
        min="0.01"
        step="0.01"
        bind:value={calibrationDistance}
        aria-label="Calibration distance"
      />
    </label>
    <label>
      Unit
      <select bind:value={calibrationUnit} aria-label="Calibration unit">
        {#each SUPPORTED_UNITS as unit}
          <option value={unit}>{unit}</option>
        {/each}
      </select>
    </label>
    <button type="button" on:click={applyCalibration}>Apply Scale</button>
    {#if calibrationError}
      <p class="calibration-error">{calibrationError}</p>
    {/if}
  </div>

  <div bind:this={mapElement} class="map-stage" aria-label="Interactive map stage"></div>
</section>
