import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalMetadataStore } from './localRepository';
import type { LocalMetadataStore } from './types';
import type { Site, Building, FloorDocument, Room } from '../schema';

// ---------------------------------------------------------------------------
// In-memory localStorage stub
// ---------------------------------------------------------------------------

function makeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSite(overrides: Partial<Site> = {}): Site {
  return {
    id: 'site-1',
    name: 'HQ',
    buildingIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeBuilding(overrides: Partial<Building> = {}): Building {
  return {
    id: 'bldg-1',
    siteId: 'site-1',
    name: 'Main Building',
    floorIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeFloor(overrides: Partial<FloorDocument> = {}): FloorDocument {
  return {
    id: 'floor-1',
    schemaVersion: 1,
    siteId: 'site-1',
    buildingId: 'bldg-1',
    level: 1,
    name: 'Ground Floor',
    roomIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    siteId: 'site-1',
    buildingId: 'bldg-1',
    floorId: 'floor-1',
    name: 'Server Room',
    assetIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocalMetadataStore', () => {
  let db: LocalMetadataStore;

  beforeEach(() => {
    db = createLocalMetadataStore(makeStorage());
  });

  // -- Site repo ---

  describe('sites', () => {
    it('returns empty array when no sites saved', async () => {
      expect(await db.sites.getAll()).toEqual([]);
    });

    it('saves and retrieves a site', async () => {
      const site = makeSite();
      await db.sites.save(site);
      expect(await db.sites.getById('site-1')).toMatchObject({ name: 'HQ' });
    });

    it('returns null for unknown id', async () => {
      expect(await db.sites.getById('missing')).toBeNull();
    });

    it('updates updatedAt on second save', async () => {
      const site = makeSite();
      await db.sites.save(site);
      const updated = await db.sites.save({ ...site, name: 'HQ Updated' });
      expect(updated.name).toBe('HQ Updated');
      expect(updated.updatedAt).not.toBe(site.updatedAt);
    });

    it('deletes a site', async () => {
      await db.sites.save(makeSite());
      await db.sites.delete('site-1');
      expect(await db.sites.getById('site-1')).toBeNull();
    });
  });

  // -- Building repo ---

  describe('buildings', () => {
    it('filters buildings by siteId', async () => {
      await db.buildings.save(makeBuilding({ id: 'b1', siteId: 'site-1' }));
      await db.buildings.save(makeBuilding({ id: 'b2', siteId: 'site-2' }));
      const result = await db.buildings.getBySiteId('site-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('b1');
    });
  });

  // -- Floor repo ---

  describe('floors', () => {
    it('filters floors by buildingId', async () => {
      await db.floors.save(makeFloor({ id: 'f1', buildingId: 'bldg-1' }));
      await db.floors.save(makeFloor({ id: 'f2', buildingId: 'bldg-2' }));
      const result = await db.floors.getByBuildingId('bldg-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('f1');
    });
  });

  // -- Room repo ---

  describe('rooms', () => {
    it('filters rooms by floorId', async () => {
      await db.rooms.save(makeRoom({ id: 'r1', floorId: 'floor-1' }));
      await db.rooms.save(makeRoom({ id: 'r2', floorId: 'floor-2' }));
      const result = await db.rooms.getByFloorId('floor-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r1');
    });

    it('stores and returns room geometry', async () => {
      const room = makeRoom({
        geometry: {
          kind: 'rectangle',
          x: 10,
          y: 20,
          width: 100,
          height: 80,
        },
      });
      await db.rooms.save(room);
      const retrieved = await db.rooms.getById('room-1');
      expect(retrieved?.geometry).toEqual({
        kind: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
      });
    });

    it('stores room with polygon geometry', async () => {
      const room = makeRoom({
        geometry: {
          kind: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
            { x: 0, y: 50 },
          ],
        },
      });
      await db.rooms.save(room);
      const retrieved = await db.rooms.getById('room-1');
      expect(retrieved?.geometry?.kind).toBe('polygon');
    });
  });

  // -- Cross-repo isolation ---

  describe('storage isolation', () => {
    it('sites and buildings are stored independently', async () => {
      await db.sites.save(makeSite());
      expect(await db.buildings.getAll()).toHaveLength(0);
    });
  });
});
