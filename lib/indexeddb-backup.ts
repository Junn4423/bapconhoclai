import { validateProgress, type ProgressData } from "@/lib/progress";

export const BACKUP_DB_NAME = "bap_con_local_backup";
export const BACKUP_STORE_NAME = "snapshots";
export const BACKUP_META_KEY = "bap_con_backup_meta_v1";
export const MAX_LOCAL_SNAPSHOTS = 15;

export type SnapshotReason = "auto" | "before_import" | "before_reset" | "manual";

export type ProgressSnapshot = {
  id: string;
  createdAt: string;
  reason: SnapshotReason;
  progressVersion: number;
  data: ProgressData;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function makeSnapshotId() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${Date.now()}-${random}`;
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase() {
  if (!canUseIndexedDb()) return Promise.reject(new Error("IndexedDB unavailable"));
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(BACKUP_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        const store = database.createObjectStore(BACKUP_STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
    request.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
}

async function readAllSnapshots() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(BACKUP_STORE_NAME, "readonly");
    const result = await requestResult(transaction.objectStore(BACKUP_STORE_NAME).getAll()) as ProgressSnapshot[];
    await transactionDone(transaction);
    return result.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } finally {
    database.close();
  }
}

export async function createProgressSnapshot(
  data: ProgressData,
  reason: SnapshotReason,
  createdAt = new Date().toISOString(),
): Promise<boolean> {
  if (!canUseIndexedDb()) return false;
  try {
    validateProgress(data);
    const snapshot: ProgressSnapshot = {
      id: makeSnapshotId(),
      createdAt,
      reason,
      progressVersion: data.version,
      data,
    };
    const database = await openDatabase();
    try {
      const transaction = database.transaction(BACKUP_STORE_NAME, "readwrite");
      transaction.objectStore(BACKUP_STORE_NAME).put(snapshot);
      await transactionDone(transaction);
    } finally {
      database.close();
    }

    const snapshots = await readAllSnapshots();
    const stale = snapshots.slice(MAX_LOCAL_SNAPSHOTS);
    if (stale.length) {
      const cleanupDatabase = await openDatabase();
      try {
        const cleanupTransaction = cleanupDatabase.transaction(BACKUP_STORE_NAME, "readwrite");
        stale.forEach((item) => cleanupTransaction.objectStore(BACKUP_STORE_NAME).delete(item.id));
        await transactionDone(cleanupTransaction);
      } finally {
        cleanupDatabase.close();
      }
    }
    try {
      window.localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ lastSnapshotAt: createdAt, count: Math.min(snapshots.length, MAX_LOCAL_SNAPSHOTS) }));
    } catch {
      // IndexedDB remains the source of truth for snapshots.
    }
    return true;
  } catch {
    return false;
  }
}

export async function listProgressSnapshots(): Promise<ProgressSnapshot[]> {
  if (!canUseIndexedDb()) return [];
  try {
    return (await readAllSnapshots()).filter(validSnapshot);
  } catch {
    return [];
  }
}

function validSnapshot(snapshot: ProgressSnapshot) {
  try {
    if (!snapshot || snapshot.progressVersion !== 3 || !isTimestamp(snapshot.createdAt) || !snapshot.data) return false;
    validateProgress(snapshot.data);
    return true;
  } catch {
    return false;
  }
}

export async function getLatestValidSnapshot(): Promise<ProgressSnapshot | null> {
  const snapshots = await listProgressSnapshots();
  return snapshots.find(validSnapshot) ?? null;
}

export async function restoreProgressSnapshot(id: string): Promise<ProgressData | null> {
  const snapshots = await listProgressSnapshots();
  const snapshot = snapshots.find((item) => item.id === id);
  return snapshot && validSnapshot(snapshot) ? snapshot.data : null;
}

export async function restoreLatestSnapshot(): Promise<ProgressData | null> {
  const snapshot = await getLatestValidSnapshot();
  return snapshot?.data ?? null;
}

export async function clearProgressSnapshots(): Promise<boolean> {
  if (!canUseIndexedDb()) return false;
  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(BACKUP_STORE_NAME, "readwrite");
      transaction.objectStore(BACKUP_STORE_NAME).clear();
      await transactionDone(transaction);
    } finally {
      database.close();
    }
    try { window.localStorage.removeItem(BACKUP_META_KEY); } catch { /* storage may be unavailable */ }
    return true;
  } catch {
    return false;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
