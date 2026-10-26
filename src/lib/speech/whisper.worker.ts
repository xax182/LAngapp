// Whisper w osobnym wątku (Web Worker), żeby strona się nie zacinała.
// Model pobiera się z Hugging Face przy pierwszym użyciu i zostaje w pamięci podręcznej przeglądarki.

import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

type In =
  | { type: 'load'; size: 'tiny' | 'base' | 'small' }
  | { type: 'transcribe'; id: number; audio: Float32Array; language: string };

const MODELS: Record<string, string[]> = {
  tiny: ['onnx-community/whisper-tiny', 'Xenova/whisper-tiny'],
  base: ['onnx-community/whisper-base', 'Xenova/whisper-base'],
  small: ['onnx-community/whisper-small', 'Xenova/whisper-small'],
};

let asr: AutomaticSpeechRecognitionPipeline | null = null;
let loading: Promise<void> | null = null;

const post = (msg: unknown) => (self as unknown as Worker).postMessage(msg);

async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

async function load(size: string) {
  const gpu = await hasWebGpu();
  const attempts: { device: 'webgpu' | 'wasm'; dtype: unknown }[] = [
    ...(gpu ? [{ device: 'webgpu' as const, dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } }] : []),
    { device: 'wasm', dtype: 'q8' },
  ];
  let lastErr: unknown;
  for (const model of MODELS[size] ?? MODELS.base) {
    for (const a of attempts) {
      try {
        asr = (await pipeline('automatic-speech-recognition', model, {
          device: a.device,
          dtype: a.dtype as never,
          progress_callback: (p: { status: string; file?: string; progress?: number }) => {
            if (p.status === 'progress') post({ type: 'progress', file: p.file, progress: p.progress });
          },
        })) as AutomaticSpeechRecognitionPipeline;
        post({ type: 'ready', device: a.device, model });
        return;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr;
}

self.onmessage = async (ev: MessageEvent<In>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'load') {
      loading ??= load(msg.size);
      await loading;
    } else if (msg.type === 'transcribe') {
      if (!asr) throw new Error('Model nie jest załadowany.');
      const out = (await asr(msg.audio, { language: msg.language, task: 'transcribe' })) as { text: string };
      post({ type: 'result', id: msg.id, text: out.text.trim() });
    }
  } catch (e) {
    loading = null;
    post({ type: 'error', id: 'id' in msg ? msg.id : undefined, message: e instanceof Error ? e.message : String(e) });
  }
};
