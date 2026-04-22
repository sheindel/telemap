import type { EntityId } from '../schema';
import type {
  AssetRepository,
  BuildingRepository,
  FloorRepository,
  LocalMetadataStore,
  Repository,
  RoomRepository,
  SiteRepository,
} from './types';
import type {
  Asset,
  Building,
  FloorDocument,
  Room,
  Site,
} from '../schema';

// ---------------------------------------------------------------------------
// Storage key constants
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  sites: 'telemap:v1:sites',
  buildings: 'telemap:v1:buildings',
  floors: 'telemap:v1:floors',
  rooms: 'telemap:v1:rooms',
  assets: 'telemap:v1:assets',
} as const;

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

type EntityMap<T> = Record<EntityId, T>;

function readMap<T>(storage: Storage, key: string): EntityMap<T> {
  const raw = storage.getItem(key);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as EntityMap<T>;
  } catch {
    return {};
  }
}

function writeMap<T>(storage: Storage, key: string, map: EntityMap<T>): void {
  storage.setItem(key, JSON.stringify(map));
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Generic base repository backed by a single localStorage key
// ---------------------------------------------------------------------------

class LocalStorageRepository<T extends { id: EntityId }>
  implements Repository<T>
{
  constructor(
    private readonly storage: Storage,
    private readonly key: string,
  ) {}

  private read(): EntityMap<T> {
    return readMap<T>(this.storage, this.key);
  }

  private write(map: EntityMap<T>): void {
    writeMap(this.storage, this.key, map);
  }

  async getAll(): Promise<T[]> {
    return Object.values(this.read());
  }

  async getById(id: EntityId): Promise<T | null> {
    return this.read()[id] ?? null;
  }

  async save(entity: T): Promise<T> {
    const map = this.read();
    const existing = map[entity.id];
    const saved: T = existing
      ? { ...entity, updatedAt: nowIso() }
      : { ...entity };
    map[entity.id] = saved;
    this.write(map);
    return saved;
  }

  async delete(id: EntityId): Promise<void> {
    const map = this.read();
    delete map[id];
    this.write(map);
  }
}

// ---------------------------------------------------------------------------
// Concrete repository implementations with domain-specific query methods
// ---------------------------------------------------------------------------

class LocalSiteRepository
  extends LocalStorageRepository<Site>
  implements SiteRepository {}

class LocalBuildingRepository
  extends LocalStorageRepository<Building>
  implements BuildingRepository
{
  async getBySiteId(siteId: EntityId): Promise<Building[]> {
    const all = await this.getAll();
    return all.filter((b) => b.siteId === siteId);
  }
}

class LocalFloorRepository
  extends LocalStorageRepository<FloorDocument>
  implements FloorRepository
{
  async getByBuildingId(buildingId: EntityId): Promise<FloorDocument[]> {
    const all = await this.getAll();
    return all.filter((f) => f.buildingId === buildingId);
  }
}

class LocalRoomRepository
  extends LocalStorageRepository<Room>
  implements RoomRepository
{
  async getByFloorId(floorId: EntityId): Promise<Room[]> {
    const all = await this.getAll();
    return all.filter((r) => r.floorId === floorId);
  }
}

class LocalAssetRepository
  extends LocalStorageRepository<Asset>
  implements AssetRepository
{
  async getByRoomId(roomId: EntityId): Promise<Asset[]> {
    const all = await this.getAll();
    return all.filter((a) => a.roomId === roomId);
  }

  async getByFloorId(floorId: EntityId): Promise<Asset[]> {
    const all = await this.getAll();
    return all.filter((a) => a.floorId === floorId);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a {@link LocalMetadataStore} backed by `localStorage`.
 *
 * Pass a custom `storage` instance in tests to use an in-memory substitute.
 */
export function createLocalMetadataStore(
  storage: Storage = globalThis.localStorage,
): LocalMetadataStore {
  return {
    sites: new LocalSiteRepository(storage, STORAGE_KEYS.sites),
    buildings: new LocalBuildingRepository(storage, STORAGE_KEYS.buildings),
    floors: new LocalFloorRepository(storage, STORAGE_KEYS.floors),
    rooms: new LocalRoomRepository(storage, STORAGE_KEYS.rooms),
    assets: new LocalAssetRepository(storage, STORAGE_KEYS.assets),
  };
}
