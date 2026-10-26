# Poliglota

Aplikacja do nauki **mówienia** w 7 językach: francuski, mandaryński, hiszpański, niemiecki,
arabski lewantyński (palestyński), rosyjski, aramejski Suret (asyryjski).

Działa w przeglądarce (komputer, telefon, iPad), bez konta i serwera. Postępy i nagrania zostają na urządzeniu.

## Jak działa nauka

- **Rotacja 7 dni**: jeden nowy język dziennie (20 min) + powtórka języka sprzed 3 dni (5 min).
  Kolejność: FR, ZH, ES, DE, AR, RU, Suret. Nigdy FR+ES ani AR+Suret w jednym dniu (pilnuje tego test).
- **Ćwiczenia**:
  - *Powtórz za mną* (shadowing): słuchasz wzoru, mówisz razem z nim, nagrywasz się, porównujesz (A/B + wykres głosu).
  - *Powiedz sam*: widzisz znaczenie, mówisz z pamięci, aplikacja sprawdza (Whisper), oceniasz się.
  - *Szybka odpowiedź*: gra na czas z punktami.
  - *Tony* (mandaryński): słuchanie i mówienie par mā/má/mǎ/mà, pomiar wysokości głosu.
- **Powtórki** układa algorytm FSRS (biblioteka ts-fsrs).
- **Pieczęcie**: każdy język ma swoją pieczęć; wypełnia się, gdy zrobisz 20 min. Tydzień cyklu widać na ekranie „Dziś”,
  a osiągnięcie celu kończy się stemplem.
- **Skróty** (komputer): Spacja = nagraj/stop, R = wzór, Enter = dalej, 1–4 = ocena.

## Wygląd

Styl „creamygloss”: kremowy papier, szkło, tusz. Ustawienia → Wygląd: motyw Krem / Noc / Auto,
akcent (indygo, cynober, matcha, sakura, złoto), przezroczystość szkła, efekty ruchu, ciche dźwięki.
Kontrast sprawdza test axe we wszystkich motywach i akcentach (`tests/e2e/a11y.spec.ts`).

## Granice

Rozpoznawanie mowy sprawdza zrozumiałość, nie akcent. Dla arabskiego jest słabe, dla Suret nie istnieje.
Szczegóły: zakładka „Ocena” w aplikacji i [docs/research.md](docs/research.md).

## Treść

Frazy są w plikach `content/<język>/phrases.yaml`, nie w kodzie. Każda ma `source` i `status`.
Niezweryfikowane są oznaczone w aplikacji. Puste miejsca w programie to **luki**, widoczne w zakładce „Języki”.

- Mandaryński: frazy z Tatoeba (eksport w paczce npm), pinyin wygenerowany z CC-CEDICT.
- Pozostałe języki: przycisk **Actions → Import Tatoeba → Run workflow** na GitHubie pobiera frazy z Tatoeba
  (z autorem, licencją, nagraniem człowieka, jeśli jest, i polskim tłumaczeniem, jeśli jest).
- Suret i palestyński: Tatoeba ma ich mało. Dodawanie własnych źródeł: [docs/dodawanie-tresci.md](docs/dodawanie-tresci.md).

## Dla programisty

```bash
npm install
npm run dev          # buduje treść i uruchamia lokalnie
npm test             # testy jednostkowe (rotacja, tony, porównanie, treść, import)
npm run test:e2e     # testy w przeglądarce (ze sztucznym mikrofonem)
npm run build        # wersja do publikacji (dist/)
```

Stack: Vite + Svelte 5 + TypeScript, Transformers.js (Whisper w przeglądarce), pitchy (wysokość głosu),
ts-fsrs (powtórki), IndexedDB (zapis lokalny), PWA (działa offline).

Struktura:
- `content/` – treść (YAML) i schemat frazy
- `scripts/` – budowanie treści, import z Tatoeba, gra w tony
- `src/lib/` – logika (rotacja, sesje, porównanie, tony, nagrywanie, Whisper)
- `src/components/` – ekrany i ćwiczenia
- `tests/` – testy

Licencje i źródła: [ATTRIBUTION.md](ATTRIBUTION.md).
