# Źródła i licencje

Projekt do prywatnego użytku. Kod: MIT. Dane mają licencje swoich źródeł (poniżej).

## Treść

| Źródło | Co bierzemy | Licencja | Atrybucja |
|---|---|---|---|
| [Tatoeba](https://tatoeba.org) | zdania i ich tłumaczenia | CC BY 2.0 FR (tekst) | numer zdania i autor przy każdej frazie (`source`, `source_url`) |
| Tatoeba – nagrania | link do nagrania (nie kopiujemy plików) | licencja wybrana przez nagrywającego, zapisana w `audio.license` | autor w `audio.author` |
| [tatoeba-sentence-pairs-in-mandarin-chinese-english](https://www.npmjs.com/package/tatoeba-sentence-pairs-in-mandarin-chinese-english) | eksport par zdań zh–en z Tatoeba (paczka MIT, dane CC BY 2.0 FR) | jw. | jw. |
| [CC-CEDICT](https://cc-cedict.org) przez [cedict-json](https://www.npmjs.com/package/cedict-json) | pinyin do zdań, mapa znak→pinyin, sylaby do gry w tony | CC BY-SA 4.0 (MDBG) | dane pochodne (pinyin oznaczony „generowane”, `public/content/zh-pinyin.json`, `content/zh/tone-drills.yaml`) też są CC BY-SA 4.0 |
| [Wiktionary](https://en.wiktionary.org) przez [kaikki.org](https://kaikki.org) | rozmówki Suret i lewantyńskie: pismo, romanizacja, IPA, znaczenie | CC BY-SA 3.0 + GFDL | hasło i link w `source` / `source_url` |
| Wikimedia Commons – nagrania z Wiktionary | link do nagrania | licencja pliku na jego stronie (`audio.source_url`) | autor na stronie pliku |
| [eSpeak NG](https://github.com/espeak-ng/espeak-ng) (narzędzie przy imporcie) | zapis IPA (przybliżenie) | program GPL-3.0; wynik nie jest objęty licencją programu | IPA oznaczone „generowane” |

## Oprogramowanie

| Biblioteka | Licencja |
|---|---|
| [Svelte](https://svelte.dev), [Vite](https://vite.dev) | MIT |
| [Transformers.js](https://github.com/huggingface/transformers.js) | Apache-2.0 |
| Modele Whisper ([OpenAI](https://github.com/openai/whisper), wersje ONNX z Hugging Face) | MIT (model OpenAI) |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | MIT |
| [pitchy](https://github.com/ianprime0509/pitchy) | 0BSD |
| [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) | MIT |

## Twoje nagrania

Wzory nagrane w aplikacji (np. od native speakera) zostają tylko w Twojej przeglądarce.
