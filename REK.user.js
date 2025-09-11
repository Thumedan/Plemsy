// ==UserScript==
// @name         Plemiona Trener Personalny - Szkółka Kukiego
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Wersja finalna. Prawdziwa pętla, inteligentny start, poprawne ID wiosek i niezawodne przyciski.
// @author       KUKI
// @match        https://*.plemiona.pl/game.php?village=*&screen=train*
// @grant        none
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/REK.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/REK.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Czekaj na załadowanie obiektu game_data
    const checkGameDataReady = setInterval(() => {
        if (typeof game_data !== 'undefined' && game_data.village && game_data.village.id) {
            clearInterval(checkGameDataReady);
            initializeScript();
        }
    }, 100);

    function initializeScript() {
        if (window.autoRecruiterInitialized) return;
        window.autoRecruiterInitialized = true;

        // --- GŁÓWNA KONFIGURACJA ---
        const MIN_INTERVAL_MINUTES = 15;
        const MAX_INTERVAL_MINUTES = 30;
        const DEBUG = true;

        const PACKET_SIZES = { spear: 50, sword: 50, axe: 50, archer: 50, spy: 20, light: 20, marcher: 20, heavy: 20, ram: 10, catapult: 10, knight: 1, snob: 1 };
        const UNIT_POPULATION = { spear: 1, sword: 1, axe: 1, archer: 1, spy: 2, light: 4, marcher: 5, heavy: 6, ram: 5, catapult: 8, knight: 10, snob: 100 };
        const RECRUITMENT_GROUPS = [ ['spear', 'sword', 'axe', 'archer'], ['spy', 'light', 'marcher', 'heavy'], ['ram', 'catapult'] ];

        // --- NARZĘDZIA I ZAPISYWANIE DANYCH ---
        // == FINALNA POPRAWKA DLA ID WIOSKI ==
        // Używamy globalnego obiektu gry 'game_data', aby uzyskać czysty, numeryczny ID wioski.
        // Jest to w 100% niezawodne, w przeciwieństwie do parsowania URL.
        const villageId = game_data.village.id;

        const STORAGE_KEY = `autoRecruiterConfig_v3_${villageId}`;
        const RECRUIT_LOCK_KEY = `recruitmentJustFired_${villageId}`;
        let timerId = null;
        let isRecruiting = false;

        // --- ZMIENNE GLOBALNE DLA ELEMENTÓW UI ---
        let forceBtn, toggleBtn;

        const log = (message) => { if (DEBUG) console.log(`[Trener Personalny ${new Date().toLocaleTimeString()}] ${message}`); };
        const loadConfig = () => { const defaultConfig = { targets: {}, isPaused: true }; try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig; } catch (e) { return defaultConfig; } };
        const saveConfig = (config) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); log("Konfiguracja zapisana."); } catch (e) { log("Błąd zapisu konfiguracji!"); } };

        // --- TWORZENIE INTERFEJSU UŻYTKOWNIKA (GUI) ---
        function createGUI() {
            if (document.getElementById('autoRecruiterPanel')) return;
            const table = document.querySelector('#train_form .vis');
            if (!table) return;
            const headerRow = table.querySelector('tr');
            if (headerRow) { const th = document.createElement('th'); th.className = 'target-header'; th.style.textAlign = 'center'; th.textContent = 'Cel (Limit)'; headerRow.appendChild(th); }
            const config = loadConfig();
            const unitRows = table.querySelectorAll('tr.row_a, tr.row_b');
            unitRows.forEach(row => { const unitLink = row.querySelector('a.unit_link'); if (!unitLink) return; const unitId = unitLink.dataset.unit; const targetCell = row.insertCell(-1); targetCell.style.textAlign = 'center'; const input = document.createElement('input'); input.type = 'number'; input.className = 'target-limit-input'; input.dataset.unit = unitId; input.style.width = '80px'; input.min = '0'; input.value = config.targets[unitId] || '0'; targetCell.appendChild(input); });
            const container = document.createElement('div'); container.id = 'autoRecruiterPanel'; container.style.cssText = 'background: #f4e4bc; padding: 10px; margin-top: 10px; border: 1px solid #603000;'; container.innerHTML = ` <button id="saveTargetsBtn" class="btn">Zapisz Cele</button> <button id="forceRecruitBtn" class="btn" style="margin-left: 10px;">Wymuś rekrutację</button> <button id="togglePauseBtn" class="btn" style="margin-left: 10px;"></button> <div id="recruiterStatus" style="margin-top: 8px; font-weight: bold;"></div> <div id="populationCount" style="margin-top: 5px; color: #603000;"></div>`; table.parentElement.appendChild(container);
        }

        // --- DOŁĄCZANIE ZDARZEŃ DO PRZYCISKÓW ---
        function attachEventListeners() {
            forceBtn = document.getElementById('forceRecruitBtn');
            toggleBtn = document.getElementById('togglePauseBtn');

            document.getElementById('saveTargetsBtn').addEventListener('click', () => {
                const currentConfig = loadConfig();
                currentConfig.targets = {};
                document.querySelectorAll('.target-limit-input').forEach(input => {
                    const value = parseInt(input.value, 10);
                    if (!isNaN(value) && value >= 0) currentConfig.targets[input.dataset.unit] = value;
                });
                saveConfig(currentConfig);
                alert("Ustawienia celów zostały zapisane!");
                updatePopulationCount();
            });

            forceBtn.addEventListener('click', () => {
                log("Ręczne wymuszenie rekrutacji.");
                disableButtons();
                checkAndRecruit();
                setTimeout(enableButtons, 2000);
            });

            toggleBtn.addEventListener('click', () => {
                const currentConfig = loadConfig();
                currentConfig.isPaused = !currentConfig.isPaused;
                saveConfig(currentConfig);
                updateStatusUI();

                if (currentConfig.isPaused) {
                    clearTimeout(timerId);
                    log("Skrypt zapauzowany.");
                } else {
                    log("Skrypt wznowiony. Uruchamiam cykl.");
                    disableButtons();
                    checkAndRecruit();
                    setTimeout(enableButtons, 2000);
                }
            });

            document.querySelectorAll('.target-limit-input').forEach(input => {
                input.addEventListener('input', updatePopulationCount);
            });
        }

        // --- FUNKCJE POMOCNICZE UI ---
        function disableButtons() { if(forceBtn) { forceBtn.disabled = true; forceBtn.textContent = 'Pracuję...'; } if(toggleBtn) { toggleBtn.disabled = true; } }
        function enableButtons() { if(forceBtn) { forceBtn.disabled = false; forceBtn.textContent = 'Wymuś rekrutację'; } if(toggleBtn) { toggleBtn.disabled = false; } updateStatusUI(); }
        function updatePopulationCount() { let totalPop = 0; document.querySelectorAll('.target-limit-input').forEach(input => { const unitId = input.dataset.unit; const targetAmount = parseInt(input.value, 10) || 0; const popCost = UNIT_POPULATION[unitId] || 0; totalPop += targetAmount * popCost; }); const popDiv = document.getElementById('populationCount'); if (popDiv) { popDiv.innerHTML = `Całkowite miejsce w zagrodzie dla celów: <span style="font-weight: bold;">${totalPop.toLocaleString('pl-PL')}</span> <span class="icon header population"></span>`; } }
        function updateStatusUI(nextRunDate) { const statusDiv = document.getElementById('recruiterStatus'); const toggleBtn = document.getElementById('togglePauseBtn'); if (!statusDiv || !toggleBtn) return; const config = loadConfig(); if (config.isPaused) { statusDiv.textContent = 'Status: Zatrzymany (Pauza)'; statusDiv.style.color = 'red'; toggleBtn.textContent = 'Wznów'; } else { toggleBtn.textContent = 'Pauzuj'; if (nextRunDate) { statusDiv.textContent = `Status: Aktywny. Następne sprawdzenie o ${nextRunDate.toLocaleTimeString()}`; statusDiv.style.color = 'green'; } else { statusDiv.textContent = 'Status: Aktywny. Sprawdzam teraz...'; statusDiv.style.color = 'green'; } } }
        function getQueuedUnits() { const queuedUnits = new Map(); const queueTables = document.querySelectorAll('.trainqueue_wrap table'); queueTables.forEach(table => { table.querySelectorAll('tr').forEach(row => { try { const unitSprite = row.querySelector('.unit_sprite_smaller'); if (!unitSprite) return; const unitClass = Array.from(unitSprite.classList).find(c => c !== 'unit_sprite' && c !== 'unit_sprite_smaller'); if (!unitClass) return; const unitId = unitClass; const textContent = row.cells[0].textContent.trim(); const quantity = parseInt(textContent.match(/^(\d+)/)[1], 10); if (!isNaN(quantity)) { queuedUnits.set(unitId, (queuedUnits.get(unitId) || 0) + quantity); } } catch (e) {} }); }); return queuedUnits; }

        // --- GŁÓWNA LOGIKA REKRUTACJI ---
        function checkAndRecruit() {
            if (isRecruiting) { log('Poprzedni cykl jest jeszcze w toku. Pomijam.'); return; }
            isRecruiting = true;

            const config = loadConfig();
            if (config.isPaused) { log('Cykl przerwany - skrypt jest zapauzowany.'); isRecruiting = false; enableButtons(); return; }
            log('Uruchamianie cyklu sprawdzania rekrutacji.');
            updateStatusUI();

            const queuedUnits = getQueuedUnits();
            const unitData = new Map();
            document.querySelectorAll('#train_form .vis tr.row_a, #train_form .vis tr.row_b').forEach(row => { const unitLink = row.querySelector('a.unit_link'); if (!unitLink) return; const unitId = unitLink.dataset.unit; const currentInVillage = parseInt(row.cells[2].textContent.split('/')[0], 10); const currentInQueue = queuedUnits.get(unitId) || 0; const effectiveCurrent = currentInVillage + currentInQueue; const maxLink = row.querySelector(`a[href*="set_max('${unitId}')"]`); const maxPossible = maxLink ? parseInt((maxLink.textContent.match(/\((\d+)\)/) || [])[1] || 0, 10) : 0; unitData.set(unitId, { current: effectiveCurrent, max: maxPossible }); });

            let commandsToExecute = [];
            for (const group of RECRUITMENT_GROUPS) { let candidates = []; for (const unitId of group) { if (!unitData.has(unitId)) continue; const targetAmount = parseInt(config.targets[unitId] || 0, 10); if (targetAmount <= 0) continue; const data = unitData.get(unitId); if (data.current >= targetAmount) continue; candidates.push({ id: unitId, completion: (data.current / targetAmount) * 100, needed: targetAmount - data.current, maxPossible: data.max, }); } if (candidates.length === 0) continue; candidates.sort((a, b) => a.completion - b.completion); const bestCandidate = candidates[0]; const packetSize = PACKET_SIZES[bestCandidate.id] || 1; const amountToRecruit = Math.min(bestCandidate.needed, packetSize); if (bestCandidate.maxPossible >= amountToRecruit) { commandsToExecute.push({ unit: bestCandidate.id, amount: amountToRecruit }); } }

            if (commandsToExecute.length > 0) {
                log(`Planuję rekrutację: ${commandsToExecute.map(c => `${c.amount}x ${c.unit}`).join(', ')}`);
                commandsToExecute.forEach(cmd => { const inputField = document.querySelector(`input[name="${cmd.unit}"]`); if (inputField) inputField.value = cmd.amount; });
                sessionStorage.setItem(RECRUIT_LOCK_KEY, 'true');
                document.querySelector('input.btn-recruit').click();
                return;
            }

            log('W tym cyklu nie podjęto żadnych działań rekrutacyjnych.');
            isRecruiting = false;
            scheduleNextCheck();
        }

        // --- PLANOWANIE CYKLI ---
        function scheduleNextCheck() {
            clearTimeout(timerId);
            enableButtons();

            const config = loadConfig();
            if (config.isPaused) { log('Pauza aktywna, nie planuję kolejnego cyklu.'); return; }
            const delayMinutes = Math.random() * (MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES) + MIN_INTERVAL_MINUTES;
            const delayMs = delayMinutes * 60 * 1000;
            const nextRunDate = new Date(Date.now() + delayMs);
            updateStatusUI(nextRunDate);
            log(`Następne sprawdzenie za ${delayMinutes.toFixed(2)} minut.`);
            timerId = setTimeout(checkAndRecruit, delayMs);
        }

        // --- INICJALIZACJA SKRYPTU ---
        function initialize() {
            createGUI();
            attachEventListeners();
            updatePopulationCount();

            if (sessionStorage.getItem(RECRUIT_LOCK_KEY)) {
                sessionStorage.removeItem(RECRUIT_LOCK_KEY);
                log('Wykryto przeładowanie po rekrutacji.');
                const config = loadConfig();
                if (!config.isPaused) {
                    log('Kontynuuję pracę w pętli. Planuję następny cykl.');
                    scheduleNextCheck();
                } else {
                    log('Skrypt był zapauzowany, więc pozostaje w pauzie.');
                    enableButtons();
                }
            } else {
                log('Wykryto ręczną nawigację. Skrypt czeka na akcję użytkownika.');
                enableButtons();
            }

            log('Skrypt zainicjalizowany.');
        }

        initialize();
    }
})();
