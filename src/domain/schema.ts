export type SchemaVersion = number;
export type EntityId = string;
export type IsoDateTimeString = string;

export interface BaseEntity {
  id: EntityId;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface Site extends BaseEntity {
  name: string;
  code?: string;
  description?: string;
  buildingIds: EntityId[];
}

export interface Building extends BaseEntity {
  siteId: EntityId;
  name: string;
  code?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  floorIds: EntityId[];
}

export interface FloorDocument extends BaseEntity {
  // Floor-level version enables partial migrations on floor-scoped data.
  schemaVersion: SchemaVersion;
  siteId: EntityId;
  buildingId: EntityId;
  level: number;
  name: string;
  roomIds: EntityId[];
  mapImageId?: EntityId;
  calibration?: FloorMeasurementCalibration;
}

export interface Point2D {
  x: number;
  y: number;
}

/** @deprecated Use Point2D */
export type CalibrationPoint = Point2D;

export interface RectangleGeometry {
  kind: 'rectangle';
  /** World-space x coordinate of the top-left corner. */
  x: number;
  /** World-space y coordinate of the top-left corner. */
  y: number;
  width: number;
  height: number;
}

export interface PolygonGeometry {
  kind: 'polygon';
  /** Ordered list of world-space vertices forming a closed polygon. */
  points: Point2D[];
}

export type RoomGeometry = RectangleGeometry | PolygonGeometry;

export type CalibrationUnit = 'm' | 'ft';

export interface FloorMeasurementCalibration {
  pointA: CalibrationPoint;
  pointB: CalibrationPoint;
  pixelDistance: number;
  realDistance: number;
  unit: CalibrationUnit;
  pixelsPerUnit: number;
  metersPerPixel: number;
  capturedAt: IsoDateTimeString;
}

export interface Room extends BaseEntity {
  siteId: EntityId;
  buildingId: EntityId;
  floorId: EntityId;
  name: string;
  code?: string;
  description?: string;
  /** World-space geometry of the room boundary on its floor plan. */
  geometry?: RoomGeometry;
  assetIds: EntityId[];
}

export interface AssetPoint {
  x: number;
  y: number;
}

export interface MediaImage {
  kind: 'image';
  mediaId: EntityId;
  mimeType: string;
  width: number;
  height: number;
  alt?: string;
}

export interface MediaVideo {
  kind: 'video';
  mediaId: EntityId;
  mimeType: string;
  durationSeconds?: number;
  posterImageId?: EntityId;
}

export interface MediaDocument {
  kind: 'document';
  mediaId: EntityId;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}

export interface MediaLink {
  kind: 'link';
  url: string;
  title?: string;
}

export type AssetMedia = MediaImage | MediaVideo | MediaDocument | MediaLink;

export interface AssetBase extends BaseEntity {
  siteId: EntityId;
  buildingId: EntityId;
  floorId: EntityId;
  roomId: EntityId;
  name: string;
  description?: string;
  position: AssetPoint;
  tags?: string[];
  media?: AssetMedia[];
}

export interface SensorAsset extends AssetBase {
  assetType: 'sensor';
  metric: string;
  unit?: string;
}

export interface CameraAsset extends AssetBase {
  assetType: 'camera';
  streamUrl?: string;
}

export interface EquipmentAsset extends AssetBase {
  assetType: 'equipment';
  model?: string;
  serialNumber?: string;
}

export interface SafetyAsset extends AssetBase {
  assetType: 'safety';
  inspectionIntervalDays?: number;
  lastInspectionAt?: IsoDateTimeString;
}

export interface GenericAsset extends AssetBase {
  assetType: 'generic';
  category?: string;
}

export type Asset =
  | SensorAsset
  | CameraAsset
  | EquipmentAsset
  | SafetyAsset
  | GenericAsset;

export interface SiteHierarchyDocument {
  schemaVersion: SchemaVersion;
  site: Site;
  buildings: Building[];
  floors: FloorDocument[];
  rooms: Room[];
  assets: Asset[];
}
