// Synteza mowy z systemu (głosy zainstalowane w telefonie/komputerze). Służy jako wzór,
// gdy fraza nie ma nagrania człowieka. Jakość i dostępność zależą od urządzenia.

let voices: SpeechSynthesisVoice[] = [];

function refresh() {
  voices = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : [];
}
if (typeof speechSynthesis !== 'undefined') {
  refresh();
  speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

export function voiceFor(bcp47: string): SpeechSynthesisVoice | undefined {
  refresh();
  const lang = bcp47.toLowerCase();
  const prefix = lang.split('-')[0];
  const exact = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang);
  const same = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  const pool = exact.length ? exact : same;
  return pool.find((v) => v.localService) ?? pool[0];
}

export function ttsAvailable(bcp47: string): boolean {
  return typeof speechSynthesis !== 'undefined' && !!voiceFor(bcp47);
}

export function speak(text: string, bcp47: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    const v = voiceFor(bcp47);
    if (!v || !text) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v;
    u.lang = v.lang;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}
