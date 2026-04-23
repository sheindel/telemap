import Konva from 'konva';
import type { MapViewportState } from '../map/contract';
import type { MapPoint } from '../map/contract';

export interface DrawPoint {
  id: string;
  point: MapPoint;
  type: 'calibration' | 'component';
  label?: string;
  color?: string;
  radius?: number;
}

export interface KonvaLayer {
  mount(container: HTMLElement): void;
  updateViewport(viewport: MapViewportState): void;
  addPoint(point: DrawPoint): void;
  removePoint(id: string): void;
  updatePoint(id: string, updates: Partial<DrawPoint>): void;
  clear(): void;
  destroy(): void;
}

function createKonvaLayer(): KonvaLayer {
  let stage: Konva.Stage | null = null;
  let layer: Konva.Layer | null = null;
  const points = new Map<string, DrawPoint>();
  const circles = new Map<string, Konva.Circle>();
  const labels = new Map<string, Konva.Text>();

  const defaultColors = {
    calibration: '#0a9396',
    component: '#ee9b00'
  };

  const defaultRadius = 6;

  return {
    mount(container: HTMLElement) {
      const rect = container.getBoundingClientRect();
      stage = new Konva.Stage({
        container: container as HTMLDivElement,
        width: rect.width,
        height: rect.height,
        draggable: false
      });

      layer = new Konva.Layer();
      stage.add(layer);

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        const newRect = container.getBoundingClientRect();
        stage?.setSize({ width: newRect.width, height: newRect.height });
        layer?.batchDraw();
      });
      resizeObserver.observe(container);
    },

    updateViewport(viewport: MapViewportState) {
      if (!layer) return;

      // Transform world coordinates to screen coordinates
      const scaleX = viewport.zoom;
      const scaleY = viewport.zoom;
      const offsetX = -viewport.x * viewport.zoom + viewport.width / 2;
      const offsetY = -viewport.y * viewport.zoom + viewport.height / 2;

      layer.setAttrs({
        scaleX,
        scaleY,
        offsetX,
        offsetY
      });

      layer.batchDraw();
    },

    addPoint(point: DrawPoint) {
      if (!layer) return;

      points.set(point.id, point);

      const color = point.color ?? defaultColors[point.type];
      const radius = point.radius ?? defaultRadius;

      // Create circle
      const circle = new Konva.Circle({
        x: point.point.x,
        y: point.point.y,
        radius,
        fill: color,
        opacity: 0.7,
        stroke: color,
        strokeWidth: 1,
        draggable: false
      });

      circles.set(point.id, circle);
      layer.add(circle);

      // Create label if provided
      if (point.label) {
        const text = new Konva.Text({
          x: point.point.x + radius + 4,
          y: point.point.y - 6,
          text: point.label,
          fontSize: 12,
          fontFamily: 'Manrope, sans-serif',
          fill: color,
          pointerEvents: 'none'
        });

        labels.set(point.id, text);
        layer.add(text);
      }

      layer.batchDraw();
    },

    removePoint(id: string) {
      if (!layer) return;

      const circle = circles.get(id);
      if (circle) {
        circle.destroy();
        circles.delete(id);
      }

      const label = labels.get(id);
      if (label) {
        label.destroy();
        labels.delete(id);
      }

      points.delete(id);
      layer.batchDraw();
    },

    updatePoint(id: string, updates: Partial<DrawPoint>) {
      if (!layer) return;

      const point = points.get(id);
      if (!point) return;

      const updated = { ...point, ...updates };
      points.set(id, updated);

      // Update circle position if point changed
      if (updates.point) {
        const circle = circles.get(id);
        if (circle) {
          circle.setAttrs({
            x: updates.point.x,
            y: updates.point.y
          });
        }

        const label = labels.get(id);
        if (label && updates.point) {
          const radius = point.radius ?? defaultRadius;
          label.setAttrs({
            x: updates.point.x + radius + 4,
            y: updates.point.y - 6
          });
        }
      }

      // Update color if changed
      if (updates.color) {
        const circle = circles.get(id);
        if (circle) {
          circle.setAttrs({
            fill: updates.color,
            stroke: updates.color
          });
        }

        const label = labels.get(id);
        if (label) {
          label.setAttrs({ fill: updates.color });
        }
      }

      layer.batchDraw();
    },

    clear() {
      if (!layer) return;

      circles.forEach((circle) => circle.destroy());
      labels.forEach((label) => label.destroy());
      circles.clear();
      labels.clear();
      points.clear();

      layer.batchDraw();
    },

    destroy() {
      circles.forEach((circle) => circle.destroy());
      labels.forEach((label) => label.destroy());
      circles.clear();
      labels.clear();
      points.clear();

      layer?.destroy();
      stage?.destroy();

      stage = null;
      layer = null;
    }
  };
}

export function createKonvaDrawingLayer(): KonvaLayer {
  return createKonvaLayer();
}
