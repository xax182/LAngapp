// Mały zapis w IndexedDB (lokalnie w przeglądarce, bez konta i serwera).

const DB_NAME = 'poliglota';
const VERSION = 1;
export const STORES = ['kv', 'cards', 'recordings', 'minutes'] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).get(key));
}

export async function put<T>(store: StoreName, key: string, value: T): Promise<void> {
  const db = await open();
  await wrap(db.transaction(store, 'readwrite').objectStore(store).put(value, key));
}

export async function del(store: StoreName, key: string): Promise<void> {
  const db = await open();
  await wrap(db.transaction(store, 'readwrite').objectStore(store).delete(key));
}

export async function entries<T>(store: StoreName): Promise<[string, T][]> {
  const db = await open();
  const os = db.transaction(store).objectStore(store);
  const [keys, values] = await Promise.all([wrap(os.getAllKeys()), wrap(os.getAll())]);
  return keys.map((k, i) => [String(k), values[i] as T]);
}

export async function clear(store: StoreName): Promise<void> {
  const db = await open();
  await wrap(db.transaction(store, 'readwrite').objectStore(store).clear());
}

/** Kopia zapasowa postępów (bez nagrań) do pliku JSON. */
export async function exportProgress(): Promise<string> {
  const out: Record<string, unknown> = { app: 'poliglota', version: 1, exportedAt: new Date().toISOString() };
  for (const s of ['kv', 'cards', 'minutes'] as const) out[s] = Object.fromEntries(await entries(s));
  return JSON.stringify(out, null, 2);
}

export async function importProgress(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data?.app !== 'poliglota') throw new Error('To nie jest plik kopii z tej aplikacji.');
  for (const s of ['kv', 'cards', 'minutes'] as const) {
    await clear(s);
    for (const [k, v] of Object.entries(data[s] ?? {})) await put(s, k, v);
  }
}
