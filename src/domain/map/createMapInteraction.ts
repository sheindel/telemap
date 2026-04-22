import type {
  CreateMapInteractionOptions,
  MapEventListener,
  MapEventStream,
  MapInteractionController,
  MapInteractionModule,
  MapModifierKeys,
  MapPoint,
  MapRenderScene,
  MapRenderer,
  MapViewportState,
  MapViewportStore,
  ViewportListener
} from './contract';

const DEFAULT_VIEWPORT: MapViewportState = {
  x: 0,
  y: 0,
  zoom: 1,
  width: 0,
  height: 0
};

const DEFAULT_SCENE: Required<MapRenderScene> = {
  showCrosshair: true,
  gridSize: 32
};

const ZOOM_STEP = 0.12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getModifierKeys(event: MouseEvent | WheelEvent): MapModifierKeys {
  return {
    alt: event.altKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey
  };
}

function createViewportStore(
  initialViewport: Partial<MapViewportState>,
  minZoom: number,
  maxZoom: number
): MapViewportStore {
  let viewport: MapViewportState = {
    ...DEFAULT_VIEWPORT,
    ...initialViewport
  };
  const listeners = new Set<ViewportListener>();

  const notify = (): MapViewportState => {
    for (const listener of listeners) {
      listener(viewport);
    }
    return viewport;
  };

  return {
    get: () => viewport,
    set(next) {
      viewport = {
        ...viewport,
        ...next,
        zoom: clamp(next.zoom ?? viewport.zoom, minZoom, maxZoom)
      };
      return notify();
    },
    panBy(delta) {
      viewport = {
        ...viewport,
        x: viewport.x + delta.x,
        y: viewport.y + delta.y
      };
      return notify();
    },
    zoomBy(delta, anchor) {
      const nextZoom = clamp(viewport.zoom + delta, minZoom, maxZoom);
      if (anchor && nextZoom !== viewport.zoom) {
        // Keep the world point under the cursor stable while zooming.
        const before = {
          x: (anchor.x - viewport.width / 2) / viewport.zoom + viewport.x,
          y: (anchor.y - viewport.height / 2) / viewport.zoom + viewport.y
        };
        const next = {
          ...viewport,
          zoom: nextZoom
        };
        const after = {
          x: (anchor.x - next.width / 2) / next.zoom + next.x,
          y: (anchor.y - next.height / 2) / next.zoom + next.y
        };
        viewport = {
          ...next,
          x: next.x + (before.x - after.x),
          y: next.y + (before.y - after.y)
        };
      } else {
        viewport = {
          ...viewport,
          zoom: nextZoom
        };
      }
      return notify();
    },
    resize(width, height) {
      viewport = {
        ...viewport,
        width,
        height
      };
      return notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(viewport);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

function createEventStream(): MapEventStream {
  const listeners = new Set<MapEventListener>();
  return {
    emit(event) {
      for (const listener of listeners) {
        listener(event);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

function createDomRenderer(): MapRenderer {
  let target: HTMLElement | null = null;

  return {
    mount(nextTarget) {
      target = nextTarget;
      target.classList.add('map-surface');
    },
    render(frame) {
      if (!target) {
        return;
      }
      const { viewport, scene } = frame;
      const gridSize = Math.max(8, (scene.gridSize ?? DEFAULT_SCENE.gridSize) * viewport.zoom);
      target.style.setProperty('--map-grid-size', `${gridSize}px`);
      target.style.setProperty('--map-pan-x', `${-viewport.x * viewport.zoom}px`);
      target.style.setProperty('--map-pan-y', `${-viewport.y * viewport.zoom}px`);
      target.style.setProperty('--map-crosshair-opacity', scene.showCrosshair ? '0.75' : '0');
      target.dataset.viewport = `x:${viewport.x.toFixed(1)} y:${viewport.y.toFixed(1)} z:${viewport.zoom.toFixed(2)}`;
    },
    screenToWorld(point, viewport) {
      return {
        x: (point.x - viewport.width / 2) / viewport.zoom + viewport.x,
        y: (point.y - viewport.height / 2) / viewport.zoom + viewport.y
      };
    },
    destroy() {
      if (!target) {
        return;
      }
      target.classList.remove('map-surface');
      target.style.removeProperty('--map-grid-size');
      target.style.removeProperty('--map-pan-x');
      target.style.removeProperty('--map-pan-y');
      target.style.removeProperty('--map-crosshair-opacity');
      delete target.dataset.viewport;
      target = null;
    }
  };
}

function getPoint(event: PointerEvent | WheelEvent, target: HTMLElement): MapPoint {
  const rect = target.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

export function createMapInteraction(
  options: CreateMapInteractionOptions = {}
): MapInteractionModule {
  const minZoom = options.minZoom ?? 0.4;
  const maxZoom = options.maxZoom ?? 4;
  const viewport = createViewportStore(options.initialViewport ?? {}, minZoom, maxZoom);
  const events = createEventStream();
  const renderer = options.renderer ?? createDomRenderer();
  let scene: MapRenderScene = {
    ...DEFAULT_SCENE,
    ...options.scene
  };
  let target: HTMLElement | null = null;
  let dragging = false;

  const updateRender = (nextViewport: MapViewportState): void => {
    renderer.render({
      viewport: nextViewport,
      scene
    });
    events.emit({
      type: 'viewport-change',
      viewport: nextViewport
    });
  };

  const viewportUnsubscribe = viewport.subscribe(updateRender);

  const onPointerDown = (event: PointerEvent): void => {
    if (!target) {
      return;
    }
    dragging = true;
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(event.pointerId);
    }
    const screen = getPoint(event, target);
    const world = renderer.screenToWorld(screen, viewport.get());
    events.emit({
      type: 'pointer-down',
      pointerId: event.pointerId,
      buttons: event.buttons,
      screen,
      world,
      modifiers: getModifierKeys(event)
    });
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!target) {
      return;
    }
    if (dragging && (event.buttons & 1) === 1) {
      viewport.panBy({
        x: -event.movementX / viewport.get().zoom,
        y: -event.movementY / viewport.get().zoom
      });
    }
    const screen = getPoint(event, target);
    const world = renderer.screenToWorld(screen, viewport.get());
    events.emit({
      type: 'pointer-move',
      pointerId: event.pointerId,
      buttons: event.buttons,
      screen,
      world,
      modifiers: getModifierKeys(event)
    });
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!target) {
      return;
    }
    dragging = false;
    if (
      typeof target.hasPointerCapture === 'function' &&
      typeof target.releasePointerCapture === 'function' &&
      target.hasPointerCapture(event.pointerId)
    ) {
      target.releasePointerCapture(event.pointerId);
    }
    const screen = getPoint(event, target);
    const world = renderer.screenToWorld(screen, viewport.get());
    events.emit({
      type: 'pointer-up',
      pointerId: event.pointerId,
      buttons: event.buttons,
      screen,
      world,
      modifiers: getModifierKeys(event)
    });
  };

  const onWheel = (event: WheelEvent): void => {
    if (!target) {
      return;
    }
    event.preventDefault();
    const screen = getPoint(event, target);
    const world = renderer.screenToWorld(screen, viewport.get());
    const zoomDelta = -Math.sign(event.deltaY || 1) * ZOOM_STEP;
    viewport.zoomBy(zoomDelta, screen);
    events.emit({
      type: 'wheel',
      deltaY: event.deltaY,
      screen,
      world,
      modifiers: getModifierKeys(event)
    });
  };

  const controller: MapInteractionController = {
    bind(nextTarget) {
      target = nextTarget;
      renderer.mount(nextTarget);
      viewport.resize(nextTarget.clientWidth, nextTarget.clientHeight);
      nextTarget.addEventListener('pointerdown', onPointerDown);
      nextTarget.addEventListener('pointermove', onPointerMove);
      nextTarget.addEventListener('pointerup', onPointerUp);
      nextTarget.addEventListener('pointerleave', onPointerUp);
      nextTarget.addEventListener('wheel', onWheel, { passive: false });
    },
    unbind() {
      if (!target) {
        return;
      }
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointerleave', onPointerUp);
      target.removeEventListener('wheel', onWheel);
      renderer.destroy();
      target = null;
      dragging = false;
    },
    destroy() {
      this.unbind();
    }
  };

  return {
    viewport,
    events,
    renderer,
    controller,
    connect(nextTarget) {
      if (target === nextTarget) {
        return;
      }
      controller.unbind();
      controller.bind(nextTarget);
    },
    disconnect() {
      controller.unbind();
    },
    setScene(nextScene) {
      scene = {
        ...scene,
        ...nextScene
      };
      updateRender(viewport.get());
    },
    destroy() {
      viewportUnsubscribe();
      controller.destroy();
    }
  };
}