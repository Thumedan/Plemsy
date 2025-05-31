// ==UserScript==
// @name         ETYKIETER
// @namespace    PLEMIONA
// @version      1.0
// @description  Etykietuje co 2-5 minut z przeładowaniem i zmienia tytuł nieaktywnej karty.
// @author       KUKI
// @match        https://*.plemiona.pl/game.php?village=*&screen=overview_villages&mode=incomings*
// @match        https://*.plemiona.pl/game.php?screen=overview_villages&mode=incomings&type=unignored&subtype=all&village=*
// @match        https://*.plemiona.pl/game.php?village=*&screen=overview_villages
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/ETYKIETER.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/ETYKIETER.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log('[AutoLabel] Skrypt został załadowany (wersja z tytułem nieaktywnej karty)');

    const config = {
        minDelay: 120000,  // 2 minuty
        maxDelay: 300000,  // 5 minut
        initDelay: 3000,   // opóźnienie początkowe 3 sekundy
        idleTitlePrefix: "ETYKIETY" // Prefiks dla nieaktywnej karty
    };

    // --- POCZĄTEK LOGIKI ZMIANY TYTUŁU NIEAKTYWNEJ KARTY ---
    let originalPageTitle = document.title; // Zapamiętaj oryginalny tytuł na starcie

    function updatePageTitleBasedOnVisibility() {
        if (document.hidden) {
            // Karta stała się nieaktywna
            // Sprawdź, czy tytuł nie ma już naszego prefiksu, aby uniknąć duplikacji
            if (!document.title.startsWith(`(${config.idleTitlePrefix})`)) {
                originalPageTitle = document.title; // Na wszelki wypadek zaktualizuj oryginalny tytuł
                document.title = `(${config.idleTitlePrefix}) ${originalPageTitle}`;
            }
        } else {
            // Karta stała się aktywna
            // Jeśli tytuł ma nasz prefiks, przywróć oryginalny
            if (document.title.startsWith(`(${config.idleTitlePrefix})`)) {
                document.title = originalPageTitle;
            } else {
                // Jeśli tytuł nie ma prefiksu, ale jest inny niż zapamiętany originalPageTitle,
                // oznacza to, że gra mogła go zmienić, gdy byliśmy na karcie.
                // Aktualizujemy nasz originalPageTitle.
                originalPageTitle = document.title;
            }
        }
    }

    // Ustaw tytuł od razu, jeśli strona jest już ukryta przy starcie skryptu
    // (chociaż UserScripty zwykle działają na aktywnej karcie przy pierwszym ładowaniu)
    if (document.hidden) {
        updatePageTitleBasedOnVisibility();
    }

    // Nasłuchuj na zmianę widoczności karty
    document.addEventListener('visibilitychange', updatePageTitleBasedOnVisibility, false);

    // Gra może zmieniać tytuł dynamicznie (np. gdy pojawi się nowy atak).
    // Musimy obserwować te zmiany, aby nasz `originalPageTitle` był zawsze aktualny,
    // a także aby poprawnie dodawać prefiks, gdy karta jest nieaktywna.
    const titleObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // Sprawdzamy, czy zmiana dotyczy elementu <title> i czy nowy tytuł nie jest już naszym "idle" tytułem
            if (mutation.target.nodeName === 'TITLE' && !document.title.startsWith(`(${config.idleTitlePrefix})`)) {
                if (document.hidden) {
                    // Karta jest nieaktywna, a gra zmieniła tytuł.
                    // Zapamiętujemy nowy tytuł jako oryginalny i dodajemy nasz prefiks.
                    originalPageTitle = document.title;
                    document.title = `(${config.idleTitlePrefix}) ${originalPageTitle}`;
                } else {
                    // Karta jest aktywna, gra zmieniła tytuł.
                    // Po prostu aktualizujemy nasz `originalPageTitle`.
                    originalPageTitle = document.title;
                }
            }
        });
    });

    const titleElement = document.querySelector('head > title');
    if (titleElement) {
        titleObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
    }
    // --- KONIEC LOGIKI ZMIANY TYTUŁU NIEAKTYWNEJ KARTY ---


    function getRandomTime() {
        return Math.floor(Math.random() * (config.maxDelay - config.minDelay)) + config.minDelay;
    }

    function showStatus(text) {
        console.log(`[AutoLabel] ${text}`);
        let statusDiv = document.getElementById('autoLabelStatus');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'autoLabelStatus';
            statusDiv.style = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: #2c3e50;
                color: white;
                padding: 10px;
                border-radius: 5px;
                z-index: 9999;
                font-family: Arial;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                opacity: 1;
                transition: opacity 0.5s ease-in-out;
            `;
            document.body.appendChild(statusDiv);
        }

        statusDiv.textContent = `[AutoLabel] ${text}`;
        statusDiv.style.opacity = '1'; // Pokaż/zresetuj opacity

        // Zresetuj timer usuwania, jeśli istnieje
        if (statusDiv.timerId) {
            clearTimeout(statusDiv.timerId);
        }

        statusDiv.timerId = setTimeout(() => {
            statusDiv.style.opacity = '0';
            // Usuń element po zakończeniu animacji, aby nie zaśmiecać DOM
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.parentNode.removeChild(statusDiv);
                }
            }, 500); // Czas zgodny z transition duration
        }, 5000);
    }

    function tryLabelAndReload() {
        try {
            // Szukamy formularza i przycisku "Etykieta"
            const labelBtn = document.querySelector('input.btn[type="submit"][name="label"][value="Etykieta"]');
            const form = labelBtn?.closest('form');

            if (!form || !labelBtn) {
                showStatus('Brak formularza etykietowania – przeładowanie za chwilę.');
                setTimeout(() => window.location.reload(), 2000); // Dajmy chwilę na przeczytanie statusu
                return;
            }

            const checkboxes = form.querySelectorAll('input[type="checkbox"][name^="id_"]:not([name="all"])');
            if (checkboxes.length === 0) {
                showStatus('Brak ataków do etykietowania – przeładowanie za chwilę.');
                setTimeout(() => window.location.reload(), 2000);
                return;
            }

            checkboxes.forEach(cb => {
                cb.checked = true;
                // Symulowanie zdarzenia 'change' może być potrzebne, jeśli strona ma logikę JS podpiętą pod to zdarzenie
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            });

            showStatus(`Etykietuję ${checkboxes.length} ataków...`);
            labelBtn.click(); // To powinno spowodować wysłanie formularza i przeładowanie strony przez grę

            // Zazwyczaj kliknięcie przycisku submit w formularzu powoduje przeładowanie.
            // Jeśli z jakiegoś powodu tak nie jest, można odkomentować poniższy kod,
            // ale warto najpierw sprawdzić, czy jest on konieczny.
            // setTimeout(() => {
            //     showStatus('Przeładowanie strony po etykietowaniu...');
            //     window.location.reload();
            // }, 1500); // Dłuższy czas na wypadek, gdyby kliknięcie było asynchroniczne

        } catch (error) {
            console.error('[AutoLabel] Błąd:', error);
            showStatus('Wystąpił błąd – przeładowanie za chwilę.');
            setTimeout(() => window.location.reload(), 2000);
        }
    }

    setTimeout(() => {
        const waitTime = getRandomTime();
        const minutes = Math.floor(waitTime / 60000);
        const seconds = Math.floor((waitTime % 60000) / 1000);

        showStatus(`Start etykietowania za ${minutes}m ${seconds}s`);
        setTimeout(tryLabelAndReload, waitTime);
    }, config.initDelay);
})();