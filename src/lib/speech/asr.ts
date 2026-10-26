// Rozpoznawanie mowy: Whisper lokalnie w przeglądarce (działa też w Brave, gdzie wbudowane
// rozpoznawanie mowy Google jest wyłączone).

export type ModelSize = 'tiny' | 'base' | 'small';

export interface AsrStatus {
  state: 'idle' | 'loading' | 'ready' | 'error';
  progress: number; // 0..100
  device?: string;
  message?: string;
}

type Listener = (s: AsrStatus) => void;

let worker: Worker | null = null;
let status: AsrStatus = { state: 'idle', progress: 0 };
const listeners = new Set<Listener>();
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
const fileProgress = new Map<string, number>();
let nextId = 1;
let readyPromise: Promise<void> | null = null;

function set(s: Partial<AsrStatus>) {
  status = { ...status, ...s };
  for (const l of listeners) l(status);
}

export function onAsrStatus(l: Listener): () => void {
  listeners.add(l);
  l(status);
  return () => listeners.delete(l);
}

export function loadAsr(size: ModelSize): Promise<void> {
  if (readyPromise) return readyPromise;
  worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
  set({ state: 'loading', progress: 0, message: undefined });
  readyPromise = new Promise((resolve, reject) => {
    worker!.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === 'progress') {
        fileProgress.set(m.file, m.progress ?? 0);
        const vals = [...fileProgress.values()];
        set({ progress: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) });
      } else if (m.type === 'ready') {
        set({ state: 'ready', progress: 100, device: m.device });
        resolve();
      } else if (m.type === 'result') {
        pending.get(m.id)?.resolve(m.text);
        pending.delete(m.id);
      } else if (m.type === 'error') {
        if (m.id !== undefined && pending.has(m.id)) {
          pending.get(m.id)!.reject(new Error(m.message));
          pending.delete(m.id);
        } else {
          const msg = /fetch|network|load/i.test(m.message)
            ? `Nie udało się pobrać modelu (brak internetu albo blokada strony huggingface.co). Szczegóły: ${m.message}`
            : m.message;
          set({ state: 'error', message: msg });
          readyPromise = null;
          worker?.terminate();
          worker = null;
          reject(new Error(msg));
        }
      }
    };
    worker!.postMessage({ type: 'load', size });
  });
  return readyPromise;
}

export async function transcribe(samples16k: Float32Array, whisperLanguage: string, size: ModelSize): Promise<string> {
  await loadAsr(size);
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ type: 'transcribe', id, audio: samples16k, language: whisperLanguage });
  });
}
