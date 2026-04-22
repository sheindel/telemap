import { describe, expect, it, vi } from 'vitest';
import { createMapInteraction } from './createMapInteraction';
import type { MapPoint, MapRenderer, MapViewportState } from './contract';

function worldAt(point: MapPoint, viewport: MapViewportState): MapPoint {
  return {
    x: (point.x - viewport.width / 2) / viewport.zoom + viewport.x,
    y: (point.y - viewport.height / 2) / viewport.zoom + viewport.y
  };
}

function createRendererStub() {
  const renderer: MapRenderer = {
    mount: vi.fn(),
    render: vi.fn(),
    screenToWorld: vi.fn((point, viewport) => worldAt(point, viewport)),
    destroy: vi.fn()
  };

  return renderer;
}

describe('createMapInteraction', () => {
  it('clamps zoom updates to configured min/max bounds', () => {
    const map = createMapInteraction({
      minZoom: 0.5,
      maxZoom: 2,
      renderer: createRendererStub()
    });

    map.viewport.set({ zoom: 50 });
    expect(map.viewport.get().zoom).toBe(2);

    map.viewport.zoomBy(-99);
    expect(map.viewport.get().zoom).toBe(0.5);

    map.destroy();
  });

  it('keeps anchored world point stable during zoom', () => {
    const map = createMapInteraction({
      minZoom: 0.2,
      maxZoom: 4,
      renderer: createRendererStub(),
      initialViewport: {
        x: 12,
        y: -8,
        zoom: 1,
        width: 200,
        height: 120
      }
    });

    const anchor = { x: 80, y: 40 };
    const before = worldAt(anchor, map.viewport.get());

    map.viewport.zoomBy(0.8, anchor);

    const after = worldAt(anchor, map.viewport.get());
    expect(after.x).toBeCloseTo(before.x, 8);
    expect(after.y).toBeCloseTo(before.y, 8);

    map.destroy();
  });

  it('binds to DOM target and emits wheel events while updating viewport', () => {
    const renderer = createRendererStub();
    const map = createMapInteraction({ renderer });
    const target = document.createElement('div');

    Object.defineProperty(target, 'clientWidth', { value: 600 });
    Object.defineProperty(target, 'clientHeight', { value: 360 });
    target.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      width: 600,
      height: 360,
      top: 10,
      right: 600,
      bottom: 360,
      left: 10,
      toJSON: () => ({})
    } as DOMRect);

    const events: string[] = [];
    const off = map.events.subscribe((event) => events.push(event.type));

    const beforeZoom = map.viewport.get().zoom;
    map.connect(target);

    const wheel = new WheelEvent('wheel', {
      deltaY: -120,
      clientX: 110,
      clientY: 80,
      cancelable: true
    });
    target.dispatchEvent(wheel);

    expect(wheel.defaultPrevented).toBe(true);
    expect(map.viewport.get().zoom).toBeGreaterThan(beforeZoom);
    expect(events).toContain('wheel');
    expect(events).toContain('viewport-change');

    off();
    map.destroy();
    expect(renderer.mount).toHaveBeenCalledTimes(1);
    expect(renderer.destroy).toHaveBeenCalledTimes(1);
  });
});
