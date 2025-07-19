// ==UserScript==
// @name         ETYKIETER v2.0
// @namespace    PLEMIONA
// @version      2.0
// @description  Etykietuje po wykryciu zmiany ataków. Odświeża, retry z limitem, fail-safe co 20–30 min. Brak spamu i błędów przy "znikających" atakach. Full control 💪
// @author       KUKI
// @match        https://*.plemiona.pl/game.php?village=*&screen=overview_villages&mode=incomings*
// @match        https://*.plemiona.pl/game.php?screen=overview_villages&mode=incomings&type=unignored&subtype=all&village=*
// @match        https://*.plemiona.pl/game.php?screen=overview_villages&mode=incomings&type=unignored&subtype=*
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/ETYKIETER.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/ETYKIETER.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'etykieter_ready_after_reload';

    console.log('[ETYKIETER] Skrypt załadowany (v2.3)');

    function showStatus(text) {
        console.log(`[ETYKIETER] ${text}`);
        let box = document.getElementById('etykieterStatus');
        if (!box) {
            box = document.createElement('div');
            box.id = 'etykieterStatus';
            box.style = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: #2c3e50;
                color: #fff;
                padding: 10px 15px;
                border-radius: 6px;
                z-index: 9999;
                font-family: sans-serif;
                font-size: 14px;
                box-shadow: 0 0 10px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(box);
        }
        box.textContent = `[ETYKIETER] ${text}`;
        setTimeout(() => box.remove(), 5000);
    }

    // === Retry po przeładowaniu, jeśli zmiana została wykryta wcześniej ===
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
        sessionStorage.removeItem(STORAGE_KEY);

        const tryEtykietuj = (attempt = 1, notFoundCount = 0) => {
            const MAX_ATTEMPTS = 60;
            const MAX_NOT_FOUND = 10;

            const form = document.getElementById('incomings_form');
            const checkboxes = form?.querySelectorAll('input[type="checkbox"][name^="id_"]') ?? [];
            const labelBtn = form?.querySelector('input.btn[type="submit"][name="label"][value="Etykieta"]');

            console.log(`[ETYKIETER] Retry #${attempt}: form=${!!form}, checkboxy=${checkboxes.length}, btn=${!!labelBtn}, notFound=${notFoundCount}`);

            if (form && checkboxes.length > 0 && labelBtn) {
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                });

                showStatus(`Etykietuję ${checkboxes.length} atak(ów)`);
                labelBtn.click();

                setTimeout(() => window.location.reload(), 3000);
            } else if (attempt < MAX_ATTEMPTS) {
                const nextNotFound = (form || document.readyState === 'complete') ? notFoundCount + 1 : notFoundCount;

                if (nextNotFound >= MAX_NOT_FOUND) {
                    showStatus('Brak ataków – zatrzymano retry');
                    console.warn('[ETYKIETER] Retry anulowany z powodu braku danych');
                    return;
                }

                setTimeout(() => tryEtykietuj(attempt + 1, nextNotFound), 1000);
            } else {
                showStatus(`Retry zatrzymany – przekroczono limit prób (${MAX_ATTEMPTS})`);
                console.warn('[ETYKIETER] Retry zakończony (timeout)');
            }
        };

        setTimeout(() => tryEtykietuj(), 1000);
        return;
    }

    // === Monitorowanie zmian liczby ataków (#incomings_amount) ===
    const incomingEl = document.getElementById('incomings_amount');
    if (!incomingEl) {
        console.warn('[ETYKIETER] Nie znaleziono #incomings_amount – wyjście.');
        return;
    }

    let baseValue = parseInt(incomingEl.textContent.trim(), 10);
    if (isNaN(baseValue)) baseValue = 0;

    console.log(`[ETYKIETER] Baza ataków: ${baseValue}`);

    const observer = new MutationObserver(() => {
        const newValue = parseInt(incomingEl.textContent.trim(), 10) || 0;

        if (newValue !== baseValue) {
            console.log(`[ETYKIETER] Zmiana incomingów: ${baseValue} → ${newValue}`);
            sessionStorage.setItem(STORAGE_KEY, '1');
            showStatus('Nowy atak wykryty – odświeżam...');
            observer.disconnect();
            setTimeout(() => window.location.reload(), 500);
        }
    });

    observer.observe(incomingEl, {
        childList: true,
        characterData: true,
        subtree: true
    });

    // === Fail-safe reload co 20–30 minut ===
    const reloadDelay = 20 * 60_000 + Math.floor(Math.random() * 10 * 60_000);
    console.log(`[ETYKIETER] Fail-safe reload za ${(reloadDelay / 60000).toFixed(1)} minut`);

    setTimeout(() => {
        showStatus('Zapasowe odświeżenie strony');
        window.location.reload();
    }, reloadDelay);
})();
