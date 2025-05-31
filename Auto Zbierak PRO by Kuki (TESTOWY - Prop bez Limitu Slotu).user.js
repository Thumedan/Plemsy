// ==UserScript==
// @name         Auto Zbierak PRO by Kuki (TESTOWY - Prop bez Limitu Slotu)
// @namespace    PLEMIONA
// @version      4.3.LS4-PropNoLimit
// @description  Automatyczne zbieractwo. Dystrybucja proporcjonalna do wag, bez indywidualnego limitu pojemności na slot (poza ogólną dostępnością wojsk).
// @author       Kuki
// @match        https://*.plemiona.pl/game.php*screen=place*mode=scavenge*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (typeof game_data === 'undefined' || typeof game_data.village === 'undefined' || !game_data.village.id) {
        if (document.URL.includes('screen=place') && document.URL.includes('mode=scavenge')) {
            console.log('KukiZbierakPRO (PropNoLimit) v4.3.LS4-PNL: game_data nie jest jeszcze dostępne. Ponawiam próbę za 500ms.');
            setTimeout(arguments.callee, 500);
        }
        return;
    }

    if (!document.URL.includes('screen=place') || !document.URL.includes('mode=scavenge')) {
        console.log('KukiZbierakPRO (PropNoLimit) v4.3.LS4-PNL: Skrypt działa tylko na ekranie zbieractwa.');
        return;
    }

    const STORAGE_KEY_BASE_SETTINGS = 'kukiZbierakPro_Settings_v43LS4_PropNoLimit';
    const getStorageKey = () => `${STORAGE_KEY_BASE_SETTINGS}_v${game_data.village.id}`;

    // --- Konfiguracja ---
    const config = {
        archers: game_data.units.includes('archer'),
        // maxResPerSlot: 1000000, // Można zostawić jako bardzo dużą wartość lub usunąć, bo nie będzie używane do ograniczania
        delayBetweenActions: 1500,
        checkInterval: 30000,
        processSlotsFromRightToLeft: false
    };

    const unitStats = {
        spear: { capacity: 25, name: "Pikinier" }, sword: { capacity: 15, name: "Miecznik" }, axe: { capacity: 10, name: "Topornik" },
        archer: { capacity: 10, name: "Łucznik" }, light: { capacity: 80, name: "LK" }, marcher: { capacity: 50, name: "ŁK" },
        heavy: { capacity: 50, name: "CK" }
    };

    // WAGI POZIOMÓW - TERAZ JEDYNY CZYNNIK DECYDUJĄCY O PODZIALE CAŁKOWITEJ POJEMNOŚCI
    // Zacznij od wag, które mają szansę wyrównać czasy, np. mniej dla szybkich slotów, więcej dla wolnych.
    // Przykład: const levelWeights = [5, 7, 10, 12]; // Jeśli P1 szybki, P4 wolny
    const levelWeights = [15, 6, 3, 2]; // Twoje startowe, ale prawdopodobnie będziesz musiał je mocno zmienić!

    const unitOrder = ["spear", "sword", "axe"];
    if (config.archers) {
        unitOrder.push("archer", "light", "marcher", "heavy");
    } else {
        unitOrder.push("light", "heavy");
    }

    // --- Stan skryptu ---
    let isRunning = false;
    let autoLoopRunning = false;

    let state = {
        enableDefOnAttack: false,
        enableReserveOnAttack: false,
        selectedLevels: [true, true, true, true],
        leaveInVillage: {},
        defOnAttack: {}
    };
    unitOrder.forEach(unit => {
        state.leaveInVillage[unit] = 0;
        state.defOnAttack[unit] = 0;
    });

    // --- GUI ---
    const gui = document.createElement('div');
    gui.id = 'scavengeGui_kuki_v43LS4_PropNoLimit'; // Nowe ID
    gui.style.position = 'fixed'; gui.style.top = '80px'; gui.style.left = '10px';
    gui.style.width = '320px'; gui.style.background = 'rgba(30,30,30,0.9)';
    gui.style.color = 'white'; gui.style.padding = '15px'; gui.style.zIndex = '10002';
    gui.style.borderRadius = '8px'; gui.style.fontFamily = 'Verdana, Arial, sans-serif';
    gui.style.fontSize = '13px'; gui.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    gui.style.border = '1px solid #555';

    function generateUnitInputsHTML(prefixId) {
        let html = '';
        unitOrder.forEach(unit => {
            const unitCap = unit.charAt(0).toUpperCase() + unit.slice(1);
            const unitNameLabel = unitStats[unit] ? unitStats[unit].name : unitCap;
            if ((unit === 'archer' || unit === 'marcher') && !config.archers) return;
            html += `<div style="display: flex; align-items: center; margin-bottom: 5px;">
                       <label for="${prefixId}${unitCap}" style="width: 80px; text-align: right; margin-right: 8px; font-size:0.9em; color: #ccc;">${unitNameLabel}:</label>
                       <input type="number" id="${prefixId}${unitCap}" placeholder="" min="0" value="0"
                              style="width: 70px; background-color: #3b3b3b; color: white; border: 1px solid #555; padding: 4px; border-radius: 3px; font-size:0.9em;">
                     </div>`;
        });
        return html;
    }
    const leaveInputsHTML = generateUnitInputsHTML('kukiLeave_PropNoLimit');
    const defInputsHTML = generateUnitInputsHTML('kukiDef_PropNoLimit');

    gui.innerHTML = `
        <h4 style="margin:0 0 10px 0; color: #3498db; text-align: center; border-bottom: 1px solid #555; padding-bottom: 8px; font-size: 1.1em;">AUTO ZBIERAK PRO (PropNoLimit)</h4>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px;"><input type="checkbox" id="kukiToggleDefOnAttack_PropNoLimit"> STOP GDY ATAKOWANY</label>
            <label style="display: block;"><input type="checkbox" id="kukiToggleReserveOnAttack_PropNoLimit"> REZERWA NA ATAK</label>
        </div>
        <div style="margin-bottom: 10px; border-top: 1px solid #444; padding-top: 10px;">
            <h5 style="margin: 0 0 8px 0; font-size: 1em;">Wybierz poziomy:</h5>
            <label style="display: block; margin-bottom: 3px;"><input type="checkbox" id="kukiLvl1_PropNoLimit"> Poziom 1</label>
            <label style="display: block; margin-bottom: 3px;"><input type="checkbox" id="kukiLvl2_PropNoLimit"> Poziom 2</label>
            <label style="display: block; margin-bottom: 3px;"><input type="checkbox" id="kukiLvl3_PropNoLimit"> Poziom 3</label>
            <label style="display: block;"><input type="checkbox" id="kukiLvl4_PropNoLimit"> Poziom 4</label>
        </div>
        <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 10px;">
            <h5 style="margin: 5px 0 8px 0; font-size: 1em;">Zostaw w wiosce (normalnie):</h5>
            <div>${leaveInputsHTML}</div>
        </div>
        <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 10px;">
            <h5 style="margin: 5px 0 8px 0; font-size: 1em;">Zostaw w wiosce (przy ataku):</h5>
            <div>${defInputsHTML}</div>
        </div>
        <div style="margin-top: 15px; display: flex; justify-content: space-around;">
            <button id="kukiStartScript_PropNoLimit" style="background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">▶ Start</button>
            <button id="kukiStopScript_PropNoLimit" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">■ Stop</button>
        </div>
        <div id="kukiStatus_PropNoLimit" style="margin-top: 12px; font-size: 0.9em; color: #bdc3c7; text-align: center; min-height: 1.2em; background-color: #424242; padding: 3px; border-radius: 3px;">Status: Oczekuje...</div>
    `;
    document.body.appendChild(gui);

    // --- Funkcje zapisu/odczytu ---
    function savePersistentSettings() {
        try {
            const settingsToSave = {
                selectedLevels: state.selectedLevels,
                leaveInVillage: state.leaveInVillage,
                defOnAttack: state.defOnAttack
            };
            localStorage.setItem(getStorageKey(), JSON.stringify(settingsToSave));
        } catch (e) {
            console.error("KukiZbierakPRO (PropNoLimit): Błąd zapisu ustawień:", e);
        }
    }

    function loadPersistentSettings() {
        try {
            const savedSettings = localStorage.getItem(getStorageKey());
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                if (Array.isArray(parsedSettings.selectedLevels) && parsedSettings.selectedLevels.length === 4) {
                    state.selectedLevels = parsedSettings.selectedLevels;
                }
                unitOrder.forEach(unit => {
                    if (parsedSettings.leaveInVillage) {
                        state.leaveInVillage[unit] = parsedSettings.leaveInVillage[unit] || 0;
                    }
                    if (parsedSettings.defOnAttack) {
                        state.defOnAttack[unit] = parsedSettings.defOnAttack[unit] || 0;
                    }
                });
                logToConsole("[SYSTEM] Ustawienia (poziomy i rezerwy) załadowane.");
            } else {
                logToConsole("[SYSTEM] Brak zapisanych ustawień, używam domyślnych i zapisuję.");
                savePersistentSettings();
            }
        } catch (e) {
            console.error("KukiZbierakPRO (PropNoLimit): Błąd odczytu/parsowania ustawień:", e);
            logToConsole("[SYSTEM] Błąd odczytu ustawień, używam domyślnych.");
        }
        updateGuiFromState();
    }

    function updateGuiFromState() {
        document.getElementById('kukiToggleDefOnAttack_PropNoLimit').checked = state.enableDefOnAttack;
        document.getElementById('kukiToggleReserveOnAttack_PropNoLimit').checked = state.enableReserveOnAttack;

        for (let i = 0; i < 4; i++) {
            const cb = document.getElementById(`kukiLvl${i + 1}_PropNoLimit`);
            if (cb) cb.checked = state.selectedLevels[i];
        }
        unitOrder.forEach(unit => {
            const unitCap = unit.charAt(0).toUpperCase() + unit.slice(1);
            const leaveInputEl = document.getElementById(`kukiLeave_PropNoLimit${unitCap}`);
            if (leaveInputEl) leaveInputEl.value = state.leaveInVillage[unit] || 0;

            const defInputEl = document.getElementById(`kukiDef_PropNoLimit${unitCap}`);
            if (defInputEl) defInputEl.value = state.defOnAttack[unit] || 0;
        });
    }

    // --- Event Listeners ---
    document.getElementById('kukiToggleDefOnAttack_PropNoLimit').addEventListener('change', (e) => {
        state.enableDefOnAttack = e.target.checked;
        if (state.enableDefOnAttack && state.enableReserveOnAttack) {
            state.enableReserveOnAttack = false;
            document.getElementById('kukiToggleReserveOnAttack_PropNoLimit').checked = false;
        }
        logToConsole(`[CONFIG] STOP GDY ATAKOWANY: ${state.enableDefOnAttack ? 'WŁĄCZONY' : 'WYŁĄCZONY'}`);
    });
    document.getElementById('kukiToggleReserveOnAttack_PropNoLimit').addEventListener('change', (e) => {
        state.enableReserveOnAttack = e.target.checked;
        if (state.enableReserveOnAttack && state.enableDefOnAttack) {
            state.enableDefOnAttack = false;
            document.getElementById('kukiToggleDefOnAttack_PropNoLimit').checked = false;
        }
        logToConsole(`[CONFIG] REZERWA NA ATAK: ${state.enableReserveOnAttack ? 'WŁĄCZONA' : 'WYŁĄCZONA'}`);
    });

    for (let i = 0; i < 4; i++) {
        const cb = document.getElementById(`kukiLvl${i + 1}_PropNoLimit`);
        if (cb) {
            cb.addEventListener('change', (e) => {
                state.selectedLevels[i] = e.target.checked;
                logToConsole(`[CONFIG] Poziom ${i + 1} ${e.target.checked ? 'WŁĄCZONY' : 'WYŁĄCZONY'}`);
                savePersistentSettings();
            });
        }
    }

    unitOrder.forEach(unit => {
        const unitCap = unit.charAt(0).toUpperCase() + unit.slice(1);
        const leaveInputEl = document.getElementById(`kukiLeave_PropNoLimit${unitCap}`);
        if (leaveInputEl) {
            leaveInputEl.addEventListener('change', (e) => {
                state.leaveInVillage[unit] = parseInt(e.target.value) || 0;
                savePersistentSettings();
            });
        }
        const defInputEl = document.getElementById(`kukiDef_PropNoLimit${unitCap}`);
        if(defInputEl) {
            defInputEl.addEventListener('change', (e) => {
                state.defOnAttack[unit] = parseInt(e.target.value) || 0;
                savePersistentSettings();
            });
        }
    });

    document.getElementById('kukiStartScript_PropNoLimit').addEventListener('click', () => {
        if (!autoLoopRunning) {
            autoLoopRunning = true;
            logToConsole("[SYSTEM] Uruchomiono automatyczne zbieractwo (PropNoLimit)");
            updateStatus("Działa: sprawdzanie...");
            mainLoop().catch(e => {
                console.error("KukiZbierakPRO (PropNoLimit) [BŁĄD GŁÓWNY]:", e);
                logToConsole("[BŁĄD] Wystąpił krytyczny błąd.");
                autoLoopRunning = false;
                updateStatus("BŁĄD KRYTYCZNY - Zatrzymany");
            });
        } else {
            logToConsole("[INFO] Skrypt (PropNoLimit) już działa.");
        }
    });
    document.getElementById('kukiStopScript_PropNoLimit').addEventListener('click', () => {
        if (autoLoopRunning) {
            autoLoopRunning = false;
            logToConsole("[SYSTEM] Zatrzymano skrypt (PropNoLimit).");
            updateStatus("Zatrzymany");
        } else {
            logToConsole("[INFO] Skrypt (PropNoLimit) nie był uruchomiony.");
        }
    });

    // --- Funkcje pomocnicze ---
    function logToConsole(message) {
        console.log("KukiZbierakPRO (PropNoLimit) v4.3.LS4-PNL:", message);
        const statusEl = document.getElementById('kukiStatus_PropNoLimit');
        if (statusEl) statusEl.textContent = `Status: ${message.replace(/^\[.*?\]\s*/, '')}`;
    }
    function updateStatus(text) {
        const statusEl = document.getElementById('kukiStatus_PropNoLimit');
        if (statusEl) statusEl.textContent = `Status: ${text}`;
    }
    function isUnderAttack() {
        if (!state.enableDefOnAttack && !state.enableReserveOnAttack) return false;
        const attackCountElement = document.querySelector('#incomings_amount');
        const attackCount = attackCountElement ? parseInt(attackCountElement.textContent.trim(), 10) : 0;
        return attackCount > 0;
    }
    function getActiveScavenges() {
         return Array.from(document.querySelectorAll('.scavenge-option')).filter(opt => {
            return opt.querySelector('.return-countdown') ||
                   (opt.querySelector('.squad_scavenging_details') && !opt.querySelector('.free_send_button'));
        }).length;
    }

    // --- WERSJA sendScavenges BEZ LIMITU POJEMNOŚCI NA SLOT ---
    async function sendScavenges() {
        const selectedSlotIndicesFromState = state.selectedLevels
            .map((checked, index) => checked ? index : -1)
            .filter(i => i !== -1);

        if (selectedSlotIndicesFromState.length === 0) {
            logToConsole("[BŁĄD] Nie wybrano żadnych poziomów!");
            return false;
        }

        const isAttack = isUnderAttack();
        if (isAttack && state.enableDefOnAttack) {
            logToConsole("[OBRONA] Atak i STOP GDY ATAKOWANY.");
            return false;
        }

        const initialAvailableUnits = {};
        let totalAvailableUnitsCapacity = 0;
        for (let unit of unitOrder) {
            const gameUnitElement = document.querySelector(`.units-entry-all[data-unit='${unit}']`);
            let amountInVillage = gameUnitElement ? parseInt(gameUnitElement.textContent.replace(/\(|\)/g, '')) || 0 : 0;
            const leaveAmount = (isAttack && state.enableReserveOnAttack) ?
                Math.max(state.leaveInVillage[unit] || 0, state.defOnAttack[unit] || 0) :
                (state.leaveInVillage[unit] || 0);
            initialAvailableUnits[unit] = Math.max(0, amountInVillage - leaveAmount);
            if (unitStats[unit] && unitStats[unit].capacity > 0) {
                totalAvailableUnitsCapacity += initialAvailableUnits[unit] * unitStats[unit].capacity;
            }
        }

        if (totalAvailableUnitsCapacity === 0) {
            logToConsole("[INFO] Brak dostępnych jednostek.");
            return false;
        }

        const totalWeightOfSelectedSlots = selectedSlotIndicesFromState.reduce((sum, lvlIdx) => sum + (levelWeights[lvlIdx] || 0), 0);
        if (totalWeightOfSelectedSlots === 0 && selectedSlotIndicesFromState.length > 0) {
            logToConsole("[OSTRZEŻENIE] Wybrane sloty mają łączną wagę 0. Sprawdź 'levelWeights'. Rozdzielam równo.");
        }

        const targetCapacitiesForSelectedSlots = {};
        const scavengeOptionElements = Array.from(document.querySelectorAll('.scavenge-option'));
        let freeAndSelectedSlotIndices = [];

        for (const lvlIdx of selectedSlotIndicesFromState) {
            const optionElement = scavengeOptionElements[lvlIdx];
            if (optionElement && optionElement.querySelector('.free_send_button:not(.btn-disabled)')) {
                freeAndSelectedSlotIndices.push(lvlIdx);
                let targetCap;
                if (totalWeightOfSelectedSlots > 0) {
                    targetCap = (totalAvailableUnitsCapacity * (levelWeights[lvlIdx] || 0)) / totalWeightOfSelectedSlots;
                } else if (selectedSlotIndicesFromState.length > 0) { // Jeśli suma wag 0, a są sloty, podziel równo
                    targetCap = totalAvailableUnitsCapacity / selectedSlotIndicesFromState.length;
                } else {
                    targetCap = 0; // Nie powinno się zdarzyć jeśli selectedSlotIndicesFromState.length > 0
                }
                // KLUCZOWA ZMIANA: Brak ograniczania przez config.maxResPerSlot
                targetCapacitiesForSelectedSlots[lvlIdx] = targetCap;
                logToConsole(`Slot ${lvlIdx + 1} (wolny): Docelowa pojemność = ${targetCapacitiesForSelectedSlots[lvlIdx].toFixed(0)}`);
            }
        }

        if (freeAndSelectedSlotIndices.length === 0) {
            logToConsole("[INFO] Brak wolnych wybranych slotów.");
            return false;
        }

        if (config.processSlotsFromRightToLeft) {
            freeAndSelectedSlotIndices.sort((a, b) => b - a);
            logToConsole("[CONFIG] Przetwarzanie slotów od prawej do lewej.");
        } else {
            logToConsole("[CONFIG] Przetwarzanie slotów od lewej do prawej.");
        }

        let troopsSentThisCycle = false;
        let tempOverallAvailableUnits = { ...initialAvailableUnits };

        for (const lvlIdx of freeAndSelectedSlotIndices) {
            if (!autoLoopRunning) break;
            const optionElement = scavengeOptionElements[lvlIdx];
            const btn = optionElement.querySelector('.free_send_button:not(.btn-disabled)');
            if (!btn) {
                logToConsole(`[INFO] Slot ${lvlIdx + 1} stał się zajęty, pomijam.`);
                continue;
            }
            const row = btn.closest('tr');
            if (!row) continue;

            let unitsToSendOnThisSlot = {};
            let currentSlotFilledCapacity = 0;
            const maxCapacityForThisSlot = targetCapacitiesForSelectedSlots[lvlIdx] || 0;

            logToConsole(`Przetwarzam slot ${lvlIdx + 1}. Docelowa pojemność dla tego slotu: ${maxCapacityForThisSlot.toFixed(0)}`);

            if (maxCapacityForThisSlot < 1) { // Mniejsza niż 1, bo pojemności są całkowite
                logToConsole(`[INFO] Docelowa pojemność dla slotu ${lvlIdx + 1} jest zbyt mała (<1), pomijam.`);
                continue;
            }

            for (let unit of unitOrder) {
                if (tempOverallAvailableUnits[unit] > 0 && unitStats[unit] && unitStats[unit].capacity > 0) {
                    // Ile jednostek tego typu potrzeba, aby wypełnić POZOSTAŁĄ docelową pojemność slotu
                    let unitsNeededForTarget = Math.floor((maxCapacityForThisSlot - currentSlotFilledCapacity) / unitStats[unit].capacity);
                    unitsNeededForTarget = Math.max(0, unitsNeededForTarget);

                    let numToSend = Math.min(tempOverallAvailableUnits[unit], unitsNeededForTarget);

                    if (numToSend > 0) {
                        const inputFieldInRow = row.querySelector(`input[name='${unit}']`);
                        if (inputFieldInRow) {
                            inputFieldInRow.value = numToSend;
                            inputFieldInRow.dispatchEvent(new Event('input', { bubbles: true }));
                            inputFieldInRow.dispatchEvent(new Event('change', { bubbles: true }));

                            unitsToSendOnThisSlot[unit] = (unitsToSendOnThisSlot[unit] || 0) + numToSend;
                            currentSlotFilledCapacity += numToSend * unitStats[unit].capacity;
                        }
                    }
                }
            }

            if (Object.keys(unitsToSendOnThisSlot).length > 0) {
                for (let unit in unitsToSendOnThisSlot) {
                    tempOverallAvailableUnits[unit] -= unitsToSendOnThisSlot[unit];
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                const currentSendButton = optionElement.querySelector('.free_send_button:not(.btn-disabled)');
                if (currentSendButton) {
                    currentSendButton.click();
                    logToConsole(`[AKCJA] Wysłano Poziom ${lvlIdx + 1}: ${JSON.stringify(unitsToSendOnThisSlot)} (Poj: ${currentSlotFilledCapacity.toFixed(0)})`);
                    troopsSentThisCycle = true;
                    await new Promise(resolve => setTimeout(resolve, config.delayBetweenActions));
                } else {
                    logToConsole(`[INFO] Przycisk dla Poziomu ${lvlIdx + 1} niedostępny przed kliknięciem.`);
                    for (let unit in unitsToSendOnThisSlot) {
                        tempOverallAvailableUnits[unit] += unitsToSendOnThisSlot[unit];
                    }
                    logToConsole(`[INFO] Przywrócono jednostki z Poziomu ${lvlIdx + 1} do puli.`);
                }
            } else {
                logToConsole(`[INFO] Brak jednostek do wysłania na Poziom ${lvlIdx + 1} (w ramach docelowej pojemności ${maxCapacityForThisSlot.toFixed(0)}).`);
            }
        }
        return troopsSentThisCycle;
    }
    // --- Koniec WERSJI sendScavenges BEZ LIMITU ---

    // --- Główna pętla ---
    async function mainLoop() {
        logToConsole("[PĘTLA] Rozpoczęto główną pętlę.");
        while (autoLoopRunning) {
            if (!isRunning) {
                isRunning = true;
                updateStatus("Sprawdzanie statusu...");
                const active = getActiveScavenges();
                logToConsole(`[STATUS] Aktywne zbieractwa: ${active}`);
                if (active === 0) {
                    updateStatus("Wysyłanie wojsk...");
                    const sent = await sendScavenges();
                    if (!sent && !(isUnderAttack() && state.enableDefOnAttack) ) {
                        logToConsole("[INFO] Nie wysłano nowych wojsk (lub brak wolnych slotów/jednostek).");
                        updateStatus("Oczekiwanie (brak wojsk/poziomów/slotów?).");
                    } else if (sent) {
                        updateStatus("Wysłano, oczekiwanie...");
                    } else if (isUnderAttack() && state.enableDefOnAttack) {
                        updateStatus("Zatrzymano z powodu ataku.");
                    }
                } else {
                    logToConsole(`[INFO] Oczekiwanie na zakończenie ${active} zbieractw...`);
                    updateStatus(`Oczekiwanie (${active} aktywne)...`);
                }
                isRunning = false;
            }
            await new Promise(resolve => setTimeout(resolve, config.checkInterval));
            if (!autoLoopRunning) break;
        }
        logToConsole("[PĘTLA] Główna pętla zakończona.");
        if (document.getElementById('kukiStatus_PropNoLimit')) {
             updateStatus("Zatrzymany");
        }
    }

    // --- Inicjalizacja ---
    loadPersistentSettings();
    document.getElementById('kukiToggleDefOnAttack_PropNoLimit').checked = state.enableDefOnAttack;
    document.getElementById('kukiToggleReserveOnAttack_PropNoLimit').checked = state.enableReserveOnAttack;

    logToConsole("[SYSTEM] Skrypt KukiZbierakPRO (PropNoLimit) v4.3.LS4-PNL załadowany. Ustaw opcje i kliknij ▶ Start.");

})();