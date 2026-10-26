// Nagrywanie z mikrofonu: plik do odsłuchu + surowe próbki do analizy (wysokość głosu, rozpoznawanie).

export interface Recording {
  blob: Blob;
  url: string;
  /** Mono, 16 kHz (format, którego chce Whisper). */
  samples16k: Float32Array;
  /** Mono w oryginalnej częstotliwości (dokładniejsza wysokość głosu). */
  samples: Float32Array;
  sampleRate: number;
  durationSec: number;
}

let sharedStream: MediaStream | null = null;

export async function getMic(): Promise<MediaStream> {
  if (sharedStream && sharedStream.getAudioTracks().some((t) => t.readyState === 'live')) return sharedStream;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Ta przeglądarka nie daje dostępu do mikrofonu (wymagane HTTPS).');
  }
  sharedStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  return sharedStream;
}

function pickMime(): string | undefined {
  const options = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
  return options.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
}

let ctx: AudioContext | null = null;
export function audioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export async function decodeToMono(blob: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const buf = await audioContext().decodeAudioData(await blob.arrayBuffer());
  const out = new Float32Array(buf.length);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels;
  }
  return { samples: out, sampleRate: buf.sampleRate };
}

export async function resample(samples: Float32Array, from: number, to = 16000): Promise<Float32Array> {
  if (from === to) return samples;
  const length = Math.max(1, Math.round((samples.length * to) / from));
  const off = new OfflineAudioContext(1, length, to);
  const src = off.createBuffer(1, samples.length, from);
  src.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
  const node = off.createBufferSource();
  node.buffer = src;
  node.connect(off.destination);
  node.start();
  const rendered = await off.startRendering();
  return rendered.getChannelData(0).slice();
}

export interface ActiveRecording {
  stop(): Promise<Recording>;
  /** Bieżący poziom głośności 0..1 (do paska poziomu). */
  level(): number;
  /** Bieżące próbki (do wykresu wysokości na żywo). */
  analyser: AnalyserNode;
}

export async function startRecording(maxSec = 15): Promise<ActiveRecording> {
  const stream = await getMic();
  const ac = audioContext();
  const source = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start();
  const timer = setTimeout(() => rec.state === 'recording' && rec.stop(), maxSec * 1000);
  const buf = new Float32Array(analyser.fftSize);

  return {
    analyser,
    level() {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      return Math.min(1, Math.sqrt(sum / buf.length) * 4);
    },
    async stop() {
      clearTimeout(timer);
      if (rec.state === 'recording') rec.stop();
      await stopped;
      source.disconnect();
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      const { samples, sampleRate } = await decodeToMono(blob);
      return {
        blob,
        url: URL.createObjectURL(blob),
        samples,
        sampleRate,
        samples16k: await resample(samples, sampleRate),
        durationSec: samples.length / sampleRate,
      };
    },
  };
}

/** Pobranie i zdekodowanie pliku wzorcowego (np. nagrania z Tatoeba). Null, gdy serwer nie pozwala. */
export async function loadReference(url: string): Promise<{ samples: Float32Array; sampleRate: number } | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    return await decodeToMono(await res.blob());
  } catch {
    return null;
  }
}
