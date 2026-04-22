import type {
  Asset,
  Building,
  EntityId,
  FloorDocument,
  Room,
  Site,
} from '../schema';

export interface Repository<T extends { id: EntityId }> {
  getAll(): Promise<T[]>;
  getById(id: EntityId): Promise<T | null>;
  /**
   * Upserts the entity. On insert `createdAt` is preserved; on update
   * `updatedAt` is stamped to the current time.
   */
  save(entity: T): Promise<T>;
  delete(id: EntityId): Promise<void>;
}

export interface SiteRepository extends Repository<Site> {}

export interface BuildingRepository extends Repository<Building> {
  getBySiteId(siteId: EntityId): Promise<Building[]>;
}

export interface FloorRepository extends Repository<FloorDocument> {
  getByBuildingId(buildingId: EntityId): Promise<FloorDocument[]>;
}

export interface RoomRepository extends Repository<Room> {
  getByFloorId(floorId: EntityId): Promise<Room[]>;
}

export interface AssetRepository extends Repository<Asset> {
  getByRoomId(roomId: EntityId): Promise<Asset[]>;
  getByFloorId(floorId: EntityId): Promise<Asset[]>;
}

/** Aggregate access point for all metadata repositories. */
export interface LocalMetadataStore {
  sites: SiteRepository;
  buildings: BuildingRepository;
  floors: FloorRepository;
  rooms: RoomRepository;
  assets: AssetRepository;
}
