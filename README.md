
WYMAGAJĄ TAMPERMONKEY, NIE WYMAGAJA WKLEJANIA NICZEGO W KONSOLE, DZIAŁAJĄ AUTOMATYCZNIE TAM GDZIE SĄ POTRZEBNE.

JEŚLI MASZ ZAINSTALOWANE TAMPERMONKEY CZY ODPOWIEDNIK - PO PROSTU KLIKNIJ I ZAINSTALUJ.



JESLI NIE MASZ:


Instalacja skryptu w Tampermonkey polega na najpierw zainstalowaniu samego rozszerzenia, a następnie dodaniu skryptu użytkownika. 

Instrukcje szczegółowe:

1. Zainstaluj Tampermonkey:

Firefox: Wchodzisz do dodatków, wybierasz rozszerzenia, wyszukujesz Tampermonkey i instalujesz.
Chrome i inne: Wchodzisz do sklepu rozszerzeń przeglądarki, wyszukujesz Tampermonkey i instalujesz.

2. Otwórz panel Tampermonkey:
Przejdź do strony rozszerzeń Tampermonkey, zazwyczaj przez menu przeglądarki lub poprzez ikonę Tampermonkey. 

3. Dodaj nowy skrypt:
Przeciągnij: Jeśli masz plik z rozszerzeniem .user.js, możesz go przeciągnąć do przeglądarki, a Tampermonkey automatycznie doda skrypt. 
Kopiuj i wklej: Możesz również otworzyć plik .js w edytorze tekstu, skopiować cały kod i wkleić go do edytora skryptu Tampermonkey. 


********WAŻNE - LICZNIK MS KOLIDUJE ZE ZBIERAKIEM MASOWYM! WYŁĄCZ GO JEŻELI POTRZEBUJESZ MASOWEGO ZBIERAKA.*************


KOD DO MK:

{"useCostReduction":false,"useLongBuildReduction":false,"longBuildThreshold":2,"buildSequence":[{"building":"wood","targetLevel":1},{"building":"stone","targetLevel":1},{"building":"iron","targetLevel":1},{"building":"stone","targetLevel":2},{"building":"wood","targetLevel":2},{"building":"main","targetLevel":2},{"building":"storage","targetLevel":2},{"building":"iron","targetLevel":2},{"building":"main","targetLevel":3},{"building":"wood","targetLevel":3},{"building":"main","targetLevel":4},{"building":"storage","targetLevel":3},{"building":"iron","targetLevel":3},{"building":"stone","targetLevel":3},{"building":"iron","targetLevel":4},{"building":"wood","targetLevel":4},{"building":"stone","targetLevel":4},{"building":"wood","targetLevel":5},{"building":"wood","targetLevel":6},{"building":"stone","targetLevel":5},{"building":"iron","targetLevel":5},{"building":"wood","targetLevel":7},{"building":"stone","targetLevel":6},{"building":"stone","targetLevel":7},{"building":"wood","targetLevel":8},{"building":"stone","targetLevel":8},{"building":"wood","targetLevel":9},{"building":"stone","targetLevel":9},{"building":"stone","targetLevel":10},{"building":"farm","targetLevel":2},{"building":"barracks","targetLevel":1},{"building":"market","targetLevel":1},{"building":"wall","targetLevel":1},{"building":"wall","targetLevel":2},{"building":"stone","targetLevel":11},{"building":"farm","targetLevel":3},{"building":"wood","targetLevel":10},{"building":"iron","targetLevel":6},{"building":"wall","targetLevel":3},{"building":"iron","targetLevel":7},{"building":"storage","targetLevel":4},{"building":"farm","targetLevel":4},{"building":"farm","targetLevel":5},{"building":"iron","targetLevel":8},{"building":"storage","targetLevel":5},{"building":"wood","targetLevel":11},{"building":"wood","targetLevel":12},{"building":"stone","targetLevel":12},{"building":"iron","targetLevel":9},{"building":"wood","targetLevel":13},{"building":"stone","targetLevel":13},{"building":"wall","targetLevel":4},{"building":"iron","targetLevel":10},{"building":"market","targetLevel":2},{"building":"stone","targetLevel":14},{"building":"wood","targetLevel":14},{"building":"iron","targetLevel":11},{"building":"stone","targetLevel":15},{"building":"wood","targetLevel":15},{"building":"storage","targetLevel":6},{"building":"stone","targetLevel":16},{"building":"iron","targetLevel":12},{"building":"wood","targetLevel":16},{"building":"iron","targetLevel":13},{"building":"storage","targetLevel":7},{"building":"wood","targetLevel":17},{"building":"stone","targetLevel":17},{"building":"main","targetLevel":5},{"building":"storage","targetLevel":8},{"building":"stone","targetLevel":18},{"building":"iron","targetLevel":14},{"building":"market","targetLevel":3},{"building":"farm","targetLevel":6},{"building":"market","targetLevel":4},{"building":"main","targetLevel":6},{"building":"farm","targetLevel":7},{"building":"main","targetLevel":7},{"building":"wall","targetLevel":5},{"building":"market","targetLevel":5},{"building":"wood","targetLevel":18},{"building":"iron","targetLevel":15},{"building":"storage","targetLevel":9},{"building":"stone","targetLevel":19},{"building":"wood","targetLevel":19},{"building":"storage","targetLevel":10},{"building":"stone","targetLevel":20},{"building":"main","targetLevel":8},{"building":"wood","targetLevel":20},{"building":"iron","targetLevel":16},{"building":"storage","targetLevel":11},{"building":"iron","targetLevel":17},{"building":"stone","targetLevel":21},{"building":"main","targetLevel":9},{"building":"main","targetLevel":10},{"building":"wood","targetLevel":21},{"building":"storage","targetLevel":12},{"building":"farm","targetLevel":8},{"building":"farm","targetLevel":9},{"building":"storage","targetLevel":13},{"building":"stone","targetLevel":22},{"building":"wood","targetLevel":22},{"building":"iron","targetLevel":18},{"building":"storage","targetLevel":14},{"building":"stone","targetLevel":23},{"building":"wood","targetLevel":23},{"building":"storage","targetLevel":15},{"building":"stone","targetLevel":24},{"building":"iron","targetLevel":19},{"building":"wood","targetLevel":24},{"building":"storage","targetLevel":16},{"building":"stone","targetLevel":25},{"building":"iron","targetLevel":20},{"building":"wood","targetLevel":25},{"building":"main","targetLevel":11},{"building":"storage","targetLevel":17},{"building":"stone","targetLevel":26},{"building":"iron","targetLevel":21},{"building":"main","targetLevel":12},{"building":"wood","targetLevel":26},{"building":"storage","targetLevel":18},{"building":"stone","targetLevel":27},{"building":"main","targetLevel":13},{"building":"main","targetLevel":14},{"building":"wood","targetLevel":27},{"building":"storage","targetLevel":19},{"building":"storage","targetLevel":20},{"building":"stone","targetLevel":28},{"building":"iron","targetLevel":22},{"building":"main","targetLevel":15},{"building":"farm","targetLevel":10},{"building":"wood","targetLevel":28},{"building":"farm","targetLevel":11},{"building":"farm","targetLevel":12},{"building":"storage","targetLevel":21},{"building":"stone","targetLevel":29},{"building":"main","targetLevel":16},{"building":"iron","targetLevel":23},{"building":"iron","targetLevel":24},{"building":"main","targetLevel":17},{"building":"main","targetLevel":18},{"building":"farm","targetLevel":13},{"building":"storage","targetLevel":22},{"building":"storage","targetLevel":23},{"building":"stone","targetLevel":30},{"building":"main","targetLevel":19},{"building":"iron","targetLevel":25},{"building":"iron","targetLevel":26},{"building":"iron","targetLevel":27},{"building":"wood","targetLevel":29},{"building":"iron","targetLevel":28},{"building":"iron","targetLevel":29},{"building":"storage","targetLevel":24},{"building":"iron","targetLevel":30},{"building":"wood","targetLevel":30}]}





Jak zaktualizować localStorage?
Będąc w Plemionach, naciśnij F12, aby otworzyć narzędzia deweloperskie.
Przejdź do zakładki "Aplikacja" (w Chrome/Edge) lub "Pamięć" (w Firefox).
W menu po lewej stronie znajdź i rozwiń "Pamięć lokalna" (Local Storage), a następnie kliknij na adres serwera Plemion, na którym grasz.
W tabeli po prawej stronie znajdź klucz tribalWarsBuilderConfig.
Kliknij dwukrotnie w jego wartość (w kolumnie "Value"). Zaznaczy się cały tekst.
Wklej (Ctrl+V) skopiowany ode mnie tekst, zastępując starą zawartość.
Naciśnij Enter, aby zatwierdzić zmianę.
Odśwież stronę Plemion (F5). Nowa, długa kolejka budowy powinna pojawić się w interfejsie skryptu.
