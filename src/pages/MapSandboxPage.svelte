<script>
  import { onMount } from 'svelte';
  import {
    createScaleCalibration,
    distanceBetweenPoints,
    pixelsToRealDistance,
    SUPPORTED_UNITS
  } from '../domain/calibration';
  import { createMapInteraction } from '../domain/map';
  import { createKonvaDrawingLayer } from '../domain/drawing';

  /** @typedef {'rack' | 'wall-drop' | 'splice-enclosure' | 'fiber-panel'} InfrastructureType */

  /** @type {Record<InfrastructureType, { label: string; totalPorts: number }>} */
  const COMPONENT_LIBRARY = {
    rack: { label: 'Rack', totalPorts: 48 },
    'wall-drop': { label: 'Wall Drop', totalPorts: 2 },
    'splice-enclosure': { label: 'Splice Enclosure', totalPorts: 24 },
    'fiber-panel': { label: 'Fiber Patch Panel', totalPorts: 96 }
  };

  /** @type {Record<InfrastructureType, string>} */
  const COMPONENT_COLORS = {
    rack: '#ee9b00',
    'wall-drop': '#0a9396',
    'splice-enclosure': '#005f73',
    'fiber-panel': '#d62828'
  };

  /** @type {HTMLDivElement | undefined} */
  let mapElement;
  /** @type {import('../domain/map').MapInteractionModule | null} */
  let map = null;
  /** @type {import('../domain/drawing').KonvaLayer | null} */
  let drawingLayer = null;

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

  /** @type {string | null} */
  let floorPlanUrl = null;
  let floorPlanFileName = 'No floor plan uploaded';
  let activeRoom = 'MDF';
  /** @type {InfrastructureType} */
  let activeComponentType = 'rack';
  let placementMode = false;

  /** @type {{ id: string; type: InfrastructureType; room: string; point: import('../domain/map').MapPoint; usedPorts: number; totalPorts: number }[]} */
  let placedComponents = [];

  let roomOptions = ['MDF', 'IDF-1', 'IDF-2', 'Lobby', 'Conference A'];

  $: pointCountLabel = `${calibrationPoints.length}/2 points selected`;
  $: unitLabel = calibrationUnit === 'ft' ? 'foot' : 'meter';
  $: calibrationSummary = calibration
    ? `1 ${unitLabel} = ${calibration.pixelsPerUnit.toFixed(2)} px`
    : 'No scale calibration applied';

  $: totalPorts = placedComponents.reduce((sum, component) => sum + component.totalPorts, 0);
  $: usedPorts = placedComponents.reduce((sum, component) => sum + component.usedPorts, 0);
  $: utilization = totalPorts > 0 ? (usedPorts / totalPorts) * 100 : 0;

  $: racks = placedComponents.filter((component) => component.type === 'rack');
  $: wallDrops = placedComponents.filter((component) => component.type === 'wall-drop');
  $: avgEstimatedRun = estimateRuns('avg');
  $: longestEstimatedRun = estimateRuns('max');

  /** @param {'avg' | 'max'} mode */
  function estimateRuns(mode) {
    if (!calibration || racks.length === 0 || wallDrops.length === 0) {
      return null;
    }

    const activeCalibration = calibration;

    const runs = wallDrops.map((drop) => {
      const nearestRackPixels = Math.min(
        ...racks.map((rack) => distanceBetweenPoints(drop.point, rack.point))
      );
      return pixelsToRealDistance(nearestRackPixels, activeCalibration);
    });

    if (mode === 'max') {
      return Math.max(...runs);
    }

    const total = runs.reduce((sum, value) => sum + value, 0);
    return total / runs.length;
  }

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
    
    // Clear calibration points from drawing layer
    if (drawingLayer) {
      drawingLayer.removePoint('calib-0');
      drawingLayer.removePoint('calib-1');
    }
    
    if (calibrationMode) {
      placementMode = false;
    }
  }

  function togglePlacementMode() {
    placementMode = !placementMode;
    if (placementMode) {
      calibrationMode = false;
      calibrationPoints = [];
      calibrationError = '';
    }
  }

  /** @param {Event & { currentTarget: EventTarget & HTMLInputElement }} event */
  function handleFloorPlanUpload(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    if (floorPlanUrl) {
      URL.revokeObjectURL(floorPlanUrl);
    }

    floorPlanUrl = URL.createObjectURL(file);
    floorPlanFileName = file.name;
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
    
    // Clear calibration points from drawing layer
    if (drawingLayer) {
      drawingLayer.removePoint('calib-0');
      drawingLayer.removePoint('calib-1');
    }
  }

  /** @param {import('../domain/map').MapPoint} point */
  function placeComponent(point) {
    const profile = COMPONENT_LIBRARY[activeComponentType];
    const id = `${activeComponentType}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

    placedComponents = [
      ...placedComponents,
      {
        id,
        type: activeComponentType,
        room: activeRoom,
        point,
        usedPorts: 0,
        totalPorts: profile.totalPorts
      }
    ];

    // Add component to drawing layer
    if (drawingLayer) {
      drawingLayer.addPoint({
        id,
        point,
        type: 'component',
        label: profile.label.split(' ')[0],
        color: COMPONENT_COLORS[activeComponentType],
        radius: 8
      });
    }

    if (!roomOptions.includes(activeRoom)) {
      roomOptions = [...roomOptions, activeRoom];
    }
  }

  /** @param {string} componentId */
  function removeComponent(componentId) {
    placedComponents = placedComponents.filter((component) => component.id !== componentId);
    
    // Remove component from drawing layer
    if (drawingLayer) {
      drawingLayer.removePoint(componentId);
    }
  }

  /** @param {string} componentId */
  function incrementPorts(componentId) {
    placedComponents = placedComponents.map((component) => {
      if (component.id !== componentId) {
        return component;
      }
      return {
        ...component,
        usedPorts: Math.min(component.totalPorts, component.usedPorts + 1)
      };
    });
  }

  /** @param {string} componentId */
  function decrementPorts(componentId) {
    placedComponents = placedComponents.map((component) => {
      if (component.id !== componentId) {
        return component;
      }
      return {
        ...component,
        usedPorts: Math.max(0, component.usedPorts - 1)
      };
    });
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

    // Initialize drawing layer
    drawingLayer = createKonvaDrawingLayer();

    const unsubscribeViewport = map.viewport.subscribe((viewport) => {
      viewportLabel = `x:${viewport.x.toFixed(1)} y:${viewport.y.toFixed(1)} z:${viewport.zoom.toFixed(2)}`;
      
      // Update drawing layer viewport
      if (drawingLayer) {
        drawingLayer.updateViewport(viewport);
      }
    });

    const unsubscribeEvents = map.events.subscribe((event) => {
      lastEvent = event.type;

      if (event.type !== 'pointer-down') {
        return;
      }

      if (calibrationMode && calibrationPoints.length < 2) {
        calibrationPoints = [...calibrationPoints, event.world];
        
        // Add calibration point to drawing layer
        if (drawingLayer) {
          const pointIndex = calibrationPoints.length - 1;
          drawingLayer.addPoint({
            id: `calib-${pointIndex}`,
            point: event.world,
            type: 'calibration',
            label: `P${pointIndex + 1}`,
            color: '#0a9396',
            radius: 6
          });
        }
        
        return;
      }

      if (placementMode) {
        placeComponent(event.world);
      }
    });

    if (mapElement) {
      map.connect(mapElement);
      
      // Mount drawing layer to the same element
      if (drawingLayer) {
        drawingLayer.mount(mapElement);
      }
    }

    return () => {
      unsubscribeViewport();
      unsubscribeEvents();
      map?.destroy();
      drawingLayer?.destroy();
      if (floorPlanUrl) {
        URL.revokeObjectURL(floorPlanUrl);
      }
    };
  });
</script>

<section class="map-panel" aria-label="Telecommunications infrastructure planner">
  <header class="panel-header">
    <h2>Infrastructure Mapping Workspace</h2>
    <p>
      Upload a floor plan, calibrate scale, and drop telecom assets on the drawing to estimate
      pathway distances and track port utilization.
    </p>
  </header>

  <section class="workflow-grid" aria-label="Planning workflow controls">
    <article class="workflow-card">
      <h3>1. Floor Plan</h3>
      <p>Load an image export from construction drawings, then pan and zoom to align your placement.</p>
      <label class="field">
        Upload drawing
        <input type="file" accept="image/*" on:change={handleFloorPlanUpload} />
      </label>
      <p class="muted">Current file: <strong>{floorPlanFileName}</strong></p>
    </article>

    <article class="workflow-card">
      <h3>2. Scale Calibration</h3>
      <p>
        Use a known distance in the drawing. Click <strong>Start Calibration</strong> and pick two map points.
      </p>
      <div class="calibration-panel" aria-live="polite">
        <p><strong>Scale:</strong> {calibrationSummary}</p>
        <p>
          <strong>Calibration:</strong>
          {calibrationMode ? 'Click two points on the map.' : 'Calibration mode is idle.'}
          <span>{pointCountLabel}</span>
        </p>
        <label class="field">
          Real distance
          <input
            type="number"
            min="0.01"
            step="0.01"
            bind:value={calibrationDistance}
            aria-label="Calibration distance"
          />
        </label>
        <label class="field">
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
    </article>

    <article class="workflow-card">
      <h3>3. Asset Placement</h3>
      <p>Choose an asset class and room, then click the map while placement mode is active.</p>
      <label class="field">
        Component
        <select bind:value={activeComponentType}>
          {#each Object.entries(COMPONENT_LIBRARY) as [value, profile]}
            <option value={value}>{profile.label} ({profile.totalPorts} ports)</option>
          {/each}
        </select>
      </label>
      <label class="field">
        Room tag
        <input list="room-list" bind:value={activeRoom} />
      </label>
      <datalist id="room-list">
        {#each roomOptions as room}
          <option value={room}></option>
        {/each}
      </datalist>
      <button type="button" class="place-toggle" on:click={togglePlacementMode}>
        {placementMode ? 'Stop Placement Mode' : 'Enable Placement Mode'}
      </button>
    </article>
  </section>

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

  <div class="map-stage-wrap">
    <div bind:this={mapElement} class="map-stage" aria-label="Interactive map stage"></div>
    {#if floorPlanUrl}
      <img class="floor-plan-overlay" src={floorPlanUrl} alt="Uploaded floor plan overlay" />
    {/if}
  </div>

  <section class="insight-grid" aria-label="Infrastructure insights">
    <article class="insight-card">
      <h3>Port Utilization</h3>
      <p class="metric">{usedPorts} / {totalPorts} ports used</p>
      <p>{utilization.toFixed(1)}% capacity in active map area</p>
    </article>

    <article class="insight-card">
      <h3>Routing Estimates</h3>
      {#if avgEstimatedRun !== null && longestEstimatedRun !== null}
        <p class="metric">Avg run {avgEstimatedRun.toFixed(1)} {calibration?.unit}</p>
        <p>Longest drop path {longestEstimatedRun.toFixed(1)} {calibration?.unit}</p>
      {:else}
        <p>Place at least one rack and one wall drop after applying scale to estimate routes.</p>
      {/if}
    </article>

    <article class="insight-card">
      <h3>Asset Count</h3>
      <p class="metric">{placedComponents.length} mapped assets</p>
      <p>{roomOptions.length} known room tags</p>
    </article>
  </section>

  <section class="asset-table" aria-label="Placed components">
    <h3>Placed Infrastructure</h3>
    {#if placedComponents.length === 0}
      <p>No assets placed yet. Enable placement mode and click on the map.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Room</th>
            <th>Coordinates</th>
            <th>Ports</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each placedComponents as component}
            <tr>
              <td>{COMPONENT_LIBRARY[component.type].label}</td>
              <td>{component.room}</td>
              <td>{component.point.x.toFixed(1)}, {component.point.y.toFixed(1)}</td>
              <td>{component.usedPorts}/{component.totalPorts}</td>
              <td class="actions">
                <button type="button" on:click={() => decrementPorts(component.id)}>- Port</button>
                <button type="button" on:click={() => incrementPorts(component.id)}>+ Port</button>
                <button type="button" on:click={() => removeComponent(component.id)}>Remove</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
</section>
