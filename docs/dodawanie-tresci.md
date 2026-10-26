# Dodawanie fraz (np. Suret, palestyński)

Frazy są w plikach `content/<kod>/phrases.yaml`. Kody: `fr`, `zh`, `es`, `de`, `ar`, `ru`, `aii` (Suret).

## Najprościej: na stronie GitHuba

1. Otwórz repozytorium na github.com, wejdź w `content/aii/phrases.yaml`.
2. Kliknij ołówek (Edit).
3. Dopisz frazę według wzoru poniżej (wcięcia spacjami, nie tabulatorem).
4. Na dole kliknij **Commit changes**. Po ok. 3 minutach aplikacja się zaktualizuje.
   Jeśli plik ma błąd (np. brak `source`), test zatrzyma publikację, a GitHub przyśle maila.

## Wzór

```yaml
phrases:
  - id: aii-hello          # kod języka + myślnik + dowolna nazwa (małe litery)
    lesson: 1              # numer lekcji (1–10, patrz content/core/curriculum.yaml)
    key: hello             # klucz z programu: wtedy fraza wypełnia lukę
    original: ""           # pismo; puste, dopóki nie mamy zweryfikowanego pisma
    romanization: "..."    # romanizacja dokładnie jak w źródle
    meaning:
      pl: "..."
    audio: null
    source: "Podręcznik X, s. 12"   # skąd to masz – OBOWIĄZKOWE
    status: niezweryfikowane       # albo: zweryfikowane (gdy sprawdził native speaker)
```

- `status: zweryfikowane` chroni frazę: import z Tatoeba jej nie nadpisze.
- Nie znasz pisma? Zostaw `original: ""` i podaj `romanization`.
- Nagranie wzoru od native speakera nagrasz w aplikacji: Języki → fraza → „Nagraj wzór”.

## Palestyński

Import z Tatoeba bierze zdania oznaczone jako lewantyńskie (`apc`/`ajp`). Każde trzeba sprawdzić,
czy jest palestyńskie, i dopiero wtedy zmienić `status` na `zweryfikowane`.
