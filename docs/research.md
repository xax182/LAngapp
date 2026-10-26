# Research: aplikacja do nauki mówienia w 7 językach

Data: 2026-10-26. Status: zaakceptowane, wersja 1 zbudowana.

## 0. Decyzje po rozmowie z Marcinem

- Przeglądarka: **Brave** na komputerze, telefonie i iPadzie. Brave wyłącza wbudowane rozpoznawanie
  mowy Google (Web Speech API), a na iPhonie/iPadzie każda przeglądarka to silnik Safari.
  Dlatego głównym rozpoznawaniem jest **Whisper lokalnie w przeglądarce**; Web Speech API nie jest używane.
- Arabski: dialekt **palestyński**. Suret: **asyryjski**.
- Użytek prywatny (nagrania Tatoeba z licencją NC są OK).
- Zapis fonetyczny: IPA (generowane) + znaczenie po angielsku/polsku.
- Tatoeba, Wiktionary i Hugging Face są zablokowane w środowisku, w którym powstaje kod. Dlatego:
  mandaryński z eksportu Tatoeba w paczce npm, reszta przez import uruchamiany na GitHub Actions.

Uwaga o metodzie: w tym środowisku wyszukiwarka GitHuba (`gh search`) była niedostępna, a część stron
(kaikki.org, tatoeba.org, mdbg.net, huggingface.co, MDN) blokuje sieć. Licencje sprawdziłem tam, gdzie się dało,
bezpośrednio w plikach LICENSE (raw.githubusercontent.com) i w rejestrze npm. Wszystko, czego nie
potwierdziłem u źródła, jest oznaczone **[do sprawdzenia]**.

---

## 1. Rotacja (sprawdzona)

Kolejność: FR, ZH, ES, DE, AR, RU, SYR. Powtórka = język sprzed 3 dni.

| Dzień | Nowy (20 min) | Powtórka (5 min) |
|---|---|---|
| 1 | francuski | arabski |
| 2 | mandaryński | rosyjski |
| 3 | hiszpański | aramejski (Suret) |
| 4 | niemiecki | francuski |
| 5 | arabski | mandaryński |
| 6 | rosyjski | hiszpański |
| 7 | aramejski (Suret) | niemiecki |

Nigdy FR+ES ani AR+SYR w jednym dniu. Reguła działa automatycznie, bez wyjątków.

---

## 2. Istniejące otwarte aplikacje

| Projekt | Co robi | Licencja (sprawdzona) | Wniosek |
|---|---|---|---|
| [Anki](https://github.com/ankitects/anki) | fiszki, SRS | AGPL-3.0 | wzór SRS, ale nie do mówienia; kodu nie bierzemy |
| [LibreLingo](https://github.com/LibreLingo/LibreLingo) | kursy w stylu Duolingo, kursy w YAML | AGPL-3.0 | dobry pomysł: treść w plikach YAML; mało mówienia |
| [LinguaCafe](https://github.com/simjanos-dev/LinguaCafe) | czytanie tekstów, słownictwo | GPL-3.0 | czytanie, nie mówienie |
| [Lute v3](https://github.com/LuteOrg/lute-v3) | czytanie (jak LingQ) | MIT | czytanie, nie mówienie |
| [Enjoy / everyone-can-use-english](https://github.com/ZuodaoTech/everyone-can-use-english) | shadowing, nagrywanie, ocena | GPL-3.0 | najbliżej idei, ale tylko angielski i potrzebuje AI w chmurze |
| [whisper-web](https://github.com/xenova/whisper-web) | Whisper w przeglądarce | MIT | **można wykorzystać** jako wzór integracji |

Wniosek: nie ma otwartej aplikacji, która łączy mówienie, shadowing, wiele języków i rotację.
Bierzemy pomysły (treść w YAML, A/B porównanie nagrań), a kod piszemy sami na bibliotekach MIT/Apache.
Kodu z projektów GPL/AGPL nie kopiujemy, żeby nie wiązać licencji.

---

## 3. Powtórki rozłożone w czasie

- **[ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)**: MIT, wersja 5.4.2 (npm), domyślnie algorytm FSRS-7,
  ok. 835 gwiazdek, aktywnie rozwijany przez społeczność, której algorytm używa Anki. Działa w przeglądarce.
- **SM-2**: prosty, stary, łatwo napisać samemu w ~30 linijkach. Gorzej dopasowuje odstępy.

**Rekomendacja:** ts-fsrs. Ocena po ćwiczeniu mówienia (np. „nie umiem / trudno / dobrze / łatwo”) idzie prosto do FSRS.
Przy 5 min powtórki co 7 dni na język FSRS i tak ułoży kolejkę; ograniczeniem jest rzadkość kontaktu (raz na tydzień + powtórka), nie algorytm.

---

## 4. Rozpoznawanie mowy i ocena wymowy

### 4.1 Narzędzia

**Web Speech API** (wbudowane w przeglądarkę), dane z [MDN browser-compat-data](https://github.com/mdn/browser-compat-data):
- Chrome 139+: działa bez prefiksu; od 139 opcja `processLocally` (rozpoznawanie na urządzeniu) i `available()/install()`
  (pobieranie modelu języka); od 142 `phrases` (podpowiadanie oczekiwanych fraz, bardzo przydatne do ćwiczeń).
- Safari 14.1+: z prefiksem, bez trybu lokalnego.
- Firefox: tylko wersja testowa. **Na Firefoksie nie zadziała.**
- Bez trybu lokalnego Chrome wysyła nagranie do serwerów Google.
- Które języki są dostępne lokalnie, przeglądarka mówi sama (`available()`); listy nie da się ustalić z góry **[sprawdzimy w teście na Twoim komputerze]**.

**Whisper w przeglądarce** ([Transformers.js](https://github.com/huggingface/transformers.js) 4.3.1, Apache-2.0; WebGPU, awaryjnie WASM):
- W pełni lokalnie, działa offline po pobraniu modelu (whisper-base ok. 200 MB, jednorazowo).
- Języki sprawdzone w kodzie Whispera ([tokenizer.py](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py)):
  fr, zh, es, de, ru, ar, pl są. **Aramejskiego/syryjskiego nie ma wcale.**
- Arabski w Whisperze to „arabski ogólny”: przy lewantyńskim często zapisze formę standardową. Istnieje model
  [whisperLevantine](https://huggingface.co/HebArabNlpProject/whisperLevantine) (Apache-2.0, WER ok. 14%), ale to wersja „medium”,
  za ciężka na wygodną pracę w przeglądarce **[do sprawdzenia, czy jest mniejsza wersja]**.

**Wysokość głosu (tony, intonacja)**: [pitchy](https://github.com/ianprime0509/pitchy) (licencja typu 0BSD/ISC, bardzo liberalna).
Liczy krzywą wysokości głosu z mikrofonu na żywo. Żadne rozpoznawanie mowy nie ocenia tonów osobno, więc tony robimy tym.

**Ocena głosek (na później, wersja 2)**: modele wav2vec2 „espeak” (np. `facebook/wav2vec2-xlsr-53-espeak-cv-ft`) rozpoznają
głoski w zapisie IPA w wielu językach. Gotowej przeglądarkowej implementacji nie ma; to osobny, większy projekt.

**Płatna chmura** (Azure Pronunciation Assessment): ocenia wymowę na poziomie głosek dla kilkunastu języków, ale
wymaga konta, klucza i serwera. Sprzeczne z założeniem „bez konta i serwera”. Pomijam w v1.

### 4.2 Co realnie działa dla każdego języka

Trzy poziomy oceny:
- **A. Rozpoznanie tekstu**: aplikacja sprawdza, czy z Twojej wymowy wyszło właściwe zdanie. To miara „zrozumiałości”, nie akcentu.
- **B. Krzywa głosu**: porównanie Twojej wysokości głosu i rytmu ze wzorem (wykres).
- **C. Samoocena**: odsłuch wzór / ty / wzór (A/B), Ty oceniasz.

| Język | A. Rozpoznanie | B. Krzywa głosu | C. A/B | Uwagi |
|---|---|---|---|---|
| francuski | dobre (Chrome, Whisper) | tak | tak | |
| hiszpański | dobre | tak | tak | |
| niemiecki | dobre | tak | tak | |
| rosyjski | dobre | tak | tak | akcent wyrazowy widać na krzywej tylko orientacyjnie |
| mandaryński | dobre dla zdań | **tak, kluczowe dla tonów** | tak | patrz niżej |
| arabski lewantyński | **słabe / niepewne** | tak | tak | rozpoznawanie ciągnie do arabskiego standardowego; wynik tylko pomocniczy |
| aramejski Suret | **brak** | tak | tak | żadna dostępna technologia nie rozpoznaje Suret; tylko porównanie ze wzorem |

**Tony mandaryńskie, uczciwie:**
- Pojedyncze sylaby i krótkie słowa: krzywa głosu pozwala dość pewnie odróżnić 4 tony (wznoszący, opadający itd.). To wiarygodne.
- Całe zdania: tony się zmieniają w mowie ciągłej (np. dwa trzecie tony obok siebie), więc automatyczna ocena jest mniej pewna.
  Pokazujemy wykres obok wzoru, ale nie wystawiamy „oceny tonu” dla zdań.
- Rozpoznanie zdania w Chrome/Whisper pośrednio sprawdza tony (zły ton = inne słowo), ale model często „zgaduje” poprawnie mimo błędu.

**Wniosek:** dla Suret i częściowo lewantyńskiego aplikacja **nie ocenia** wymowy, tylko pomaga porównać nagranie ze wzorem.
Będzie to napisane w UI przy każdym ćwiczeniu.

---

## 5. Treści i licencje

| Źródło | Co daje | Licencja | Uwagi |
|---|---|---|---|
| [Tatoeba](https://tatoeba.org/downloads) | zdania z tłumaczeniami | tekst: CC BY 2.0 FR (część CC0) | **audio ma osobną licencję każdego nagrywającego**, czasem NC (niekomercyjna). Wymaga atrybucji autora zdania. Czy są zdania lewantyńskie (kody apc/ajp) **[do sprawdzenia]** |
| [Mozilla Common Voice](https://datacollective.mozillafoundation.org) | nagrania głosu | CC0 | od X 2025 tylko przez Mozilla Data Collective, z regulaminem **zakazującym ponownego udostępniania**. Nie wolno nam wrzucić nagrań do repozytorium. Do aplikacji odpada |
| Wiktionary przez [kaikki.org](https://kaikki.org) / [wiktextract](https://github.com/tatuylonen/wiktextract) | wymowa IPA, znaczenia | CC BY-SA 3.0 + GFDL (jak Wiktionary) **[do sprawdzenia u źródła]** | ShareAlike: dane z tego źródła muszą zostać na tej samej licencji. Nagrania z Wikimedia Commons mają licencje osobno |
| [CC-CEDICT](https://cc-cedict.org) | słownik chiński z pinyinem i tonami | CC BY-SA 4.0 | ShareAlike; atrybucja MDBG |
| [Piper TTS](https://github.com/rhasspy/piper) | syntezator mowy (wzór do słuchania) | silnik MIT (stare repo, archiwalne); następca [piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) to GPL-3.0 | głosy: fr, es, de, ru, zh_CN, ar_JO. **Każdy głos ma własną licencję w MODEL_CARD [do sprawdzenia per głos]**. Głos ar_JO prawdopodobnie czyta po standardowemu **[do sprawdzenia]**. Brak głosu Suret. W przeglądarce: [vits-web](https://github.com/diffusionstudio/vits-web) lub [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) (Apache-2.0) |
| [Tone Perfect (MSU)](https://tone.lib.msu.edu) | ~9 900 nagrań sylab mandaryńskich, 6 lektorów | **[do sprawdzenia]** | idealne do treningu tonów, jeśli licencja pozwoli |
| [NENA Database (Cambridge)](https://nena.ames.cam.ac.uk) | nagrania i transkrypcje dialektów Suret (m.in. Urmi) | **[do sprawdzenia]** | najlepsze naukowe źródło Suret, ale to opowieści, nie gotowe frazy |
| [AssyrianVoices / NoLoR](https://arxiv.org/abs/2412.04717) | nagrania Suret, model ASR | **[do sprawdzenia]** | projekt badawczy |

**Wnioski o treści:**
1. Dla FR/ES/DE/RU/ZH frazy bierzemy z Tatoeba (z atrybucją), pinyin z CC-CEDICT, wymowę IPA z Wiktionary.
   Zdania wybrane z Tatoeba mają status `niezweryfikowane`, dopóki ich nie sprawdzi człowiek.
2. Dźwięk wzorcowy: Piper w przeglądarce (lokalnie) albo nagrania z Tatoeba o otwartej licencji.
3. **Lewantyński i Suret: nie mamy pewnego, otwartego źródła fraz.** Zostawiam puste szablony z oznaczeniem luki.
   Tu potrzebuję Twojego źródła (podręcznik, native speaker, nagrania).
4. **„Transkrypcja polska”** (np. *bążur*) nie istnieje w żadnym źródle. Musiałbym ją tworzyć z IPA według reguł.
   To przybliżenie, nie dane ze źródła: oznaczę ją jako `generowane` i pokażę obok IPA. Patrz pytanie 6.
5. Licencje ShareAlike (CC-CEDICT, Wiktionary): pliki danych w repo dostaną CC BY-SA 4.0, kod MIT. To normalne i bezpieczne.

---

## 6. Pakowanie

- **PWA na GitHub Pages**: HTTPS jest, więc mikrofon działa. Działa offline (service worker), instaluje się jak aplikacja
  na komputerze i telefonie. **Wystarczy na start.**
- **Tauri 2** (CLI 2.12.4, MIT/Apache): małe instalatory. Ale korzysta z systemowej przeglądarki: na Linuksie (WebKitGTK)
  mikrofon jest domyślnie blokowany i trzeba to obsłużyć w kodzie; **Web Speech API tam nie działa**, zostaje Whisper.
- **Electron** 45 (MIT): pełny Chromium, ale rozpoznawanie mowy Google też w nim nie działa (brak klucza Google). Zostaje Whisper. Duże instalatory (~100 MB).

**Rekomendacja:** PWA. Desktop dopiero, gdy będzie potrzebny; wtedy Tauri + Whisper.

---

## 7. Rekomendowany stack

- **Vite + TypeScript + Svelte**: prosty, szybki, mało kodu.
- **Treść:** pliki YAML w `content/<język>/...`, sprawdzane schematem (każda fraza musi mieć `source` i `status`); błąd w pliku = czerwony test, a nie zepsuta aplikacja.
- **Zapis postępów i nagrań:** IndexedDB w przeglądarce (lokalnie, bez konta), z eksportem/importem do pliku jako kopia zapasowa.
- **Mowa:** Web Speech API (Chrome) jako szybka opcja; Whisper (Transformers.js) jako opcja lokalna/offline; pitchy dla krzywej głosu.
- **Wzór dźwiękowy:** nagrania z licencją albo Piper w przeglądarce.
- **SRS:** ts-fsrs.
- **Testy:** Vitest (rotacja, plan dnia, walidacja treści), Playwright (czy strona się ładuje, czy ćwiczenie przechodzi).
- **Gry v1 (propozycja):** „Powtórz za mną” (shadowing z A/B), „Trafiony ton” (wybierz/wypowiedz ton, wykres na żywo), „Szybka odpowiedź” (słyszysz pytanie, odpowiadasz na głos w limicie czasu), „Łańcuch” (budowanie zdania kawałkami).

Przykład frazy w pliku danych:

```yaml
- id: fr-0001
  pl: Dzień dobry
  original: Bonjour
  ipa: /bɔ̃.ʒuʁ/
  pl_transcription: bążur          # generowane z IPA
  pl_transcription_status: generowane
  audio: null                       # brak = luka
  source: "Tatoeba #12345 (autor: X), CC BY 2.0 FR"
  status: niezweryfikowane
```

---

## 8. Ryzyka

1. **Suret**: brak rozpoznawania mowy, brak syntezy, mało otwartych źródeł. Bez Twojego źródła nauka Suret w aplikacji będzie pusta.
2. **Lewantyński**: rozpoznawanie mowy słabe, odmiana (syryjska/libańska/palestyńska/jordańska) zmienia słownictwo i wymowę.
3. **Prywatność**: Web Speech w Chrome bez trybu lokalnego wysyła głos do Google.
4. **Przeglądarka**: pełne funkcje tylko w Chrome/Edge. Firefox bez rozpoznawania mowy (Whisper zadziała, ale wolniej).
5. **Rozmiar**: Whisper to ok. 200 MB pobrania na start; głosy Piper po kilkadziesiąt MB każdy.
6. **Jakość fraz**: zdania z Tatoeba bywają nienaturalne. Status `niezweryfikowane` jest konieczny.
7. **Licencje audio**: nagrania z Tatoeba często NC; dla prywatnego użytku OK, przy publikacji trzeba uważać.
8. **Tony w zdaniach**: ocena automatyczna mniej pewna niż dla pojedynczych sylab.
