# Edytor artykułów

Panel: `/admin/articles`. Nowy edytor używa Tiptap i zachowuje istniejące pola publikacji.

- Formatowanie tekstu, nagłówki, listy, cytaty, linki, cofanie/ponawianie.
- Zdjęcia w miejscu kursora, opis alternatywny, podpis, szerokość 50/75/100%.
- Galeria do 60 zdjęć: wybór wielu plików lub upuszczenie, kolejność strzałkami, usuwanie z galerii, ponowne użycie w treści bez dodatkowego uploadu.
- Podgląd treści i galerii, przewijanie dotykiem/klawiaturą, miniatury i powiększenie z obsługą fokusu.
- JPG/PNG/WebP do 30 MB: przetwarzanie sekwencyjnie w przeglądarce, domyślnie dłuższy bok 2000 px, WebP 82%. Mały oryginał pozostaje, gdy jest lżejszy od konwersji. Bez powiększania zdjęć, z zachowaniem proporcji. Rozmiar i jakość można zmienić dla kolejnych plików.
- Częściowy błąd importu zachowuje udane pliki. Zapis i zamknięcie są blokowane podczas wysyłania. Ostrzeżenie przy porzuceniu zmian; zapis jest ręczny.

## Dane i zgodność

`contentJson` to dokument z listą dozwolonych węzłów. Backend usuwa adresy `src` i obce atrybuty; frontend renderuje elementy React, nie HTML dokumentu. Nowe zdjęcia są zapisane jako identyfikatory storage (`inlineImageIds`, `galleryIds`), adresy są rozwiązywane przy odczycie. Edycja odbywa się po ID, kolizja sluga nie nadpisuje innego wpisu. Szkice nie są publiczne.

Importowane wcześniej artykuły mają zdjęcia inline zapisane wyłącznie w HTML, bez storage ID. Edytor zachowuje te zdjęcia jako indeksy `legacyIndex` do oryginalnego `contentHtml`. Backend dopuszcza jedynie indeksy istniejące w danym artykule. Gdy dokument nadal korzysta z tych zdjęć, oryginalny HTML zostaje jako źródło odwołań, a aktualna treść i formatowanie są w `content`/`contentJson`. Nie wykonujemy migracji ani ponownego uploadu.

Niezapisane pliki z bieżącej sesji są sprzątane przy anulowaniu. Istniejące pliki usunięte z treści/galerii nie są automatycznie kasowane ze storage przy zapisie, aby zachować bezpieczeństwo ponownego użycia. Usuwanie artykułu usuwa jego znane pliki. Historyczne pliki inline bez ID wymagają osobnego audytu przed fizycznym usuwaniem.

## Weryfikacja

- Testy Convex: autoryzacja, prywatność szkiców, kolizje adresów, edycja po ID, media, kolejność, zgodność starszych zdjęć.
- Testy dokumentu: niedozwolone węzły, linki i atrybuty, limit zagnieżdżenia.
- Ręcznie w Chrome/dev: import dwóch zdjęć (1,0 MB → 0,2 MB), resize 3200 → 2000 px, kolejność, podgląd, powiększenie, widok 390×844, zapis i ponowne otwarcie, podpis i szerokość zdjęcia w tekście.
- Szkic `TEST techniczny edytora — szkic` jest wyłącznie w środowisku developerskim.
