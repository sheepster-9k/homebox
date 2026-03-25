/**
 * IndexedDB-backed session storage for the AI Studio.
 * Handles multi-MB image data that exceeds localStorage limits.
 */

const DB_NAME = "homebox-studio";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

interface StoredSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  thumbnailData: string;
  data: string; // JSON-serialized full session state
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

/** Save a session to IndexedDB. */
export async function saveSession(
  id: string,
  name: string,
  data: unknown,
  itemCount: number,
  thumbnailData: string,
): Promise<void> {
  const db = await openDB();
  const entry: StoredSession = {
    id,
    name: name || `Session ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemCount,
    thumbnailData,
    data: JSON.stringify(data),
  };
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite").put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Load a session from IndexedDB. */
export async function loadSession(id: string): Promise<unknown | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readonly").get(id);
    req.onsuccess = () => {
      const entry = req.result as StoredSession | undefined;
      if (entry) {
        resolve(JSON.parse(entry.data));
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** List all saved sessions (metadata only, not full data). */
export async function listSessions(): Promise<
  { id: string; name: string; updatedAt: string; itemCount: number; thumbnailData: string }[]
> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readonly").index("updatedAt").openCursor(null, "prev");
    const results: { id: string; name: string; updatedAt: string; itemCount: number; thumbnailData: string }[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const val = cursor.value as StoredSession;
        results.push({
          id: val.id,
          name: val.name,
          updatedAt: val.updatedAt,
          itemCount: val.itemCount,
          thumbnailData: val.thumbnailData,
        });
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Delete a session. */
export async function deleteSession(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
