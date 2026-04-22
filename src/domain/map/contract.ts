export interface MapPoint {
  x: number;
  y: number;
}

export interface MapViewportState {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export type ViewportListener = (viewport: MapViewportState) => void;

export interface MapViewportStore {
  get(): MapViewportState;
  set(next: Partial<MapViewportState>): MapViewportState;
  panBy(delta: MapPoint): MapViewportState;
  zoomBy(delta: number, anchor?: MapPoint): MapViewportState;
  resize(width: number, height: number): MapViewportState;
  subscribe(listener: ViewportListener): () => void;
}

export interface MapModifierKeys {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

export interface MapPointerPayload {
  type: 'pointer-down' | 'pointer-move' | 'pointer-up';
  pointerId: number;
  buttons: number;
  screen: MapPoint;
  world: MapPoint;
  modifiers: MapModifierKeys;
}

export interface MapWheelPayload {
  type: 'wheel';
  deltaY: number;
  screen: MapPoint;
  world: MapPoint;
  modifiers: MapModifierKeys;
}

export interface MapViewportPayload {
  type: 'viewport-change';
  viewport: MapViewportState;
}

export type MapInteractionEvent =
  | MapPointerPayload
  | MapWheelPayload
  | MapViewportPayload;

export type MapEventListener = (event: MapInteractionEvent) => void;

export interface MapEventStream {
  emit(event: MapInteractionEvent): void;
  subscribe(listener: MapEventListener): () => void;
}

export interface MapRenderScene {
  showCrosshair?: boolean;
  gridSize?: number;
}

export interface RenderFrame {
  viewport: MapViewportState;
  scene: MapRenderScene;
}

export interface MapRenderer {
  mount(target: HTMLElement): void;
  render(frame: RenderFrame): void;
  screenToWorld(point: MapPoint, viewport: MapViewportState): MapPoint;
  destroy(): void;
}

export interface MapInteractionController {
  bind(target: HTMLElement): void;
  unbind(): void;
  destroy(): void;
}

export interface MapInteractionModule {
  viewport: MapViewportStore;
  events: MapEventStream;
  renderer: MapRenderer;
  controller: MapInteractionController;
  connect(target: HTMLElement): void;
  disconnect(): void;
  setScene(scene: Partial<MapRenderScene>): void;
  destroy(): void;
}

export interface CreateMapInteractionOptions {
  initialViewport?: Partial<MapViewportState>;
  minZoom?: number;
  maxZoom?: number;
  scene?: MapRenderScene;
  renderer?: MapRenderer;
}