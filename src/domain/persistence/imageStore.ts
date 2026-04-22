import type { EntityId } from '../schema';

const DB_NAME = 'telemap-images';
const DB_VERSION = 1;
const STORE_NAME = 'floor-images';

export interface ImageRecord {
  id: EntityId;
  blob: Blob;
  mimeType: string;
  /** Original filename supplied at upload time. */
  fileName: string;
  /** Byte size of the stored blob. */
  sizeBytes: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// IDB helpers
// ---------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ImageStore {
  /**
   * Persists an image blob and returns the assigned {@link ImageRecord}.
   * If an entry with the same `id` already exists it is overwritten.
   */
  put(id: EntityId, blob: Blob, fileName: string): Promise<ImageRecord>;
  /** Returns the stored {@link ImageRecord}, or `null` if not found. */
  get(id: EntityId): Promise<ImageRecord | null>;
  /** Removes the image entry for the given id. No-op if not found. */
  delete(id: EntityId): Promise<void>;
  /** Returns a temporary object URL for the stored blob. Caller must revoke it. */
  createObjectUrl(id: EntityId): Promise<string>;
}

class IdbImageStore implements ImageStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb();
    }
    return this.dbPromise;
  }

  async put(id: EntityId, blob: Blob, fileName: string): Promise<ImageRecord> {
    const record: ImageRecord = {
      id,
      blob,
      mimeType: blob.type,
      fileName,
      sizeBytes: blob.size,
      createdAt: new Date().toISOString(),
    };
    const db = await this.db();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await idbRequest(tx.objectStore(STORE_NAME).put(record));
    return record;
  }

  async get(id: EntityId): Promise<ImageRecord | null> {
    const db = await this.db();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const result = await idbRequest<ImageRecord | undefined>(
      tx.objectStore(STORE_NAME).get(id),
    );
    return result ?? null;
  }

  async delete(id: EntityId): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await idbRequest(tx.objectStore(STORE_NAME).delete(id));
  }

  async createObjectUrl(id: EntityId): Promise<string> {
    const record = await this.get(id);
    if (!record) {
      throw new Error(`Image not found: ${id}`);
    }
    return URL.createObjectURL(record.blob);
  }
}

/**
 * Returns a singleton {@link ImageStore} backed by IndexedDB.
 *
 * All floor plan PNG files should be persisted here; only the image id
 * (a plain string) is stored alongside floor metadata in localStorage.
 */
export function createImageStore(): ImageStore {
  return new IdbImageStore();
}
