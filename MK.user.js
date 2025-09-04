// ==UserScript==
// @name         Plemiona Bob Budowniczy - Menadżer Kukiego
// @namespace    http://tampermonkey.net/
// @version      1.6.0
// @description  afk builder cały szablon 
// @author       kradzione (poprawki Gemini)
// @match        https://*.plemiona.pl/game.php?village=*&screen=main*
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/MK.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/MK.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Konfiguracja z oryginalnego skryptu
    const CHECK_INTERVAL = 5 * 61 * 1000;
    const DEBUG = true;
    const STORAGE_KEY = 'tribalWarsBuilderConfig';

    // Oryginalna funkcja getAvailableBuildings
    function getAvailableBuildings() {
        debugLog('Starting getAvailableBuildings function');
        const buildings = [];
        const buildingRows = document.querySelectorAll('#buildings tbody tr[id^="main_buildrow_"]');
        buildingRows.forEach((row) => {
            const buildingCell = row.querySelector('td:first-child');
            if (!buildingCell) return;
            const buildingId = row.id.replace('main_buildrow_', '');
            if (!buildingId) return;
            const links = buildingCell.querySelectorAll('a');
            const nameLink = links[1];
            if (!nameLink) return;
            const inactiveCell = row.querySelector('td.inactive');
            if (inactiveCell && (inactiveCell.textContent.includes('vollständig ausgebaut') || inactiveCell.textContent.includes('w pełni rozbudowany'))) return;
            const levelSpan = buildingCell.querySelector('span[style*="font-size"]');
            const currentLevel = levelSpan ? levelSpan.textContent.trim() : 'unknown';
            const buildingName = nameLink.textContent.trim();
            buildings.push({ id: buildingId, name: buildingName, currentLevel: currentLevel });
        });
        debugLog('Completed getAvailableBuildings. Found buildings:', buildings);
        return buildings;
    }

    // Oryginalne funkcje loadConfig i saveConfig
    function loadConfig() {
        const defaultConfig = {
            useCostReduction: true,
            useLongBuildReduction: false,
            longBuildThreshold: 2,
            buildSequence: []
        };
        try {
            const savedConfig = localStorage.getItem(STORAGE_KEY);
            return savedConfig ? JSON.parse(savedConfig) : defaultConfig;
        } catch (error) {
            debugLog('Error loading config:', error);
            return defaultConfig;
        }
    }

    function saveConfig(config) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            debugLog('Config saved:', config);
        } catch (error) {
            debugLog('Error saving config:', error);
        }
    }

    // Oryginalna, NIETKNIĘTA funkcja tworzenia interfejsu (UI)
    function createUI() {
        debugLog('Starting UI creation');
        const config = loadConfig();
        const buildings = getAvailableBuildings();
        const uiContainer = document.createElement('div');
        uiContainer.style.cssText = 'background: #f4e4bc; padding: 15px; margin: 10px 0; border: 1px solid #603000; font-size: 12px;';

        const titleSection = document.createElement('div');
        titleSection.style.marginBottom = '20px';
        const title = document.createElement('h3');
        title.textContent = 'Auto Builder Settings';
        title.style.cssText = 'margin: 0 0 5px 0; font-size: 14px; font-weight: bold;';
        titleSection.appendChild(title);
        uiContainer.appendChild(titleSection);

        const settingsSection = document.createElement('div');
        settingsSection.style.cssText = 'background: #fff3d9; padding: 10px; border: 1px solid #c1a264; margin-bottom: 15px;';

        const costReductionDiv = document.createElement('div');
        costReductionDiv.style.marginBottom = '10px';
        const costReductionCheckbox = document.createElement('input');
        costReductionCheckbox.type = 'checkbox';
        costReductionCheckbox.id = 'autoBuildCostReduction';
        costReductionCheckbox.checked = config.useCostReduction !== false;
        const costReductionLabel = document.createElement('label');
        costReductionLabel.htmlFor = 'autoBuildCostReduction';
        costReductionLabel.textContent = ' Używaj redukcji kosztów -20%';
        costReductionLabel.style.cursor = 'pointer';
        costReductionDiv.appendChild(costReductionCheckbox);
        costReductionDiv.appendChild(costReductionLabel);
        settingsSection.appendChild(costReductionDiv);

        const longBuildDiv = document.createElement('div');
        longBuildDiv.style.marginBottom = '5px';
        const longBuildCheckbox = document.createElement('input');
        longBuildCheckbox.type = 'checkbox';
        longBuildCheckbox.id = 'autoBuildLongReduction';
        longBuildCheckbox.checked = config.useLongBuildReduction !== false;
        const longBuildLabel = document.createElement('label');
        longBuildLabel.htmlFor = 'autoBuildLongReduction';
        longBuildLabel.textContent = ' Automatycznie skracaj budowy dłuższe niż ';
        longBuildLabel.style.cursor = 'pointer';
        const longBuildThreshold = document.createElement('input');
        longBuildThreshold.type = 'number';
        longBuildThreshold.min = '0.5';
        longBuildThreshold.step = '0.5';
        longBuildThreshold.value = config.longBuildThreshold || 2;
        longBuildThreshold.style.cssText = 'width: 60px; padding: 2px; margin: 0 5px; background-color: #fff; border: 1px solid #c1a264;';
        const hoursLabel = document.createElement('span');
        hoursLabel.textContent = ' godzin';
        longBuildDiv.appendChild(longBuildCheckbox);
        longBuildDiv.appendChild(longBuildLabel);
        longBuildDiv.appendChild(longBuildThreshold);
        longBuildDiv.appendChild(hoursLabel);
        settingsSection.appendChild(longBuildDiv);
        uiContainer.appendChild(settingsSection);

        const sequenceSection = document.createElement('div');
        const sequenceHeader = document.createElement('div');
        sequenceHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
        const sequenceTitle = document.createElement('div');
        sequenceTitle.textContent = 'Kolejka budowy';
        sequenceTitle.style.cssText = 'font-weight: bold;';
        sequenceHeader.appendChild(sequenceTitle);
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Wyczyść wszystko';
        clearButton.className = 'btn btn-default';
        clearButton.onclick = () => {
            sequenceList.innerHTML = '';
            const emptyText = document.createElement('div');
            emptyText.textContent = 'Brak budynków w kolejce';
            emptyText.style.cssText = 'color: #666; font-style: italic; text-align: center;';
            sequenceList.appendChild(emptyText);
            UI.SuccessMessage('Kolejka wyczyszczona');
        };
        sequenceHeader.appendChild(clearButton);
        sequenceSection.appendChild(sequenceHeader);

        const sequenceList = document.createElement('div');
        sequenceList.id = 'buildSequenceList';
        sequenceList.style.cssText = 'border: 1px solid #c1a264; padding: 10px; margin-bottom: 10px; min-height: 50px; background: #fff3d9;';
        sequenceSection.appendChild(sequenceList);

        const addControls = document.createElement('div');
        addControls.style.cssText = 'display: flex; gap: 10px; align-items: center; background: #fff3d9; padding: 10px; border: 1px solid #c1a264;';
        const buildingSelect = document.createElement('select');
        buildingSelect.style.cssText = 'flex: 1; padding: 2px; background-color: #fff; border: 1px solid #c1a264;';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Wybierz budynek --';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        buildingSelect.appendChild(defaultOption);
        buildings.forEach(building => {
            const option = document.createElement('option');
            option.value = building.id;
            option.textContent = `${building.name} (${building.currentLevel})`;
            buildingSelect.appendChild(option);
        });
        const untilLevelInput = document.createElement('input');
        untilLevelInput.type = 'number';
        untilLevelInput.min = '1';
        untilLevelInput.style.cssText = 'width: 80px; padding: 2px; background-color: #fff; border: 1px solid #c1a264;';
        untilLevelInput.placeholder = 'Poziom docelowy';
        const addButton = document.createElement('button');
        addButton.textContent = 'Dodaj do kolejki';
        addButton.className = 'btn';
        addControls.appendChild(buildingSelect);
        addControls.appendChild(untilLevelInput);
        addControls.appendChild(addButton);
        sequenceSection.appendChild(addControls);
        uiContainer.appendChild(sequenceSection);

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Zapisz Ustawienia';
        saveButton.className = 'btn';
        saveButton.style.marginTop = '10px';
        uiContainer.appendChild(saveButton);

        function addSequenceItem(buildingId, targetLevel) {
            const building = buildings.find(b => b.id === buildingId);
            if (!building) return;
            const item = document.createElement('div');
            item.className = 'sequence-item';
            item.dataset.buildingId = buildingId;
            item.dataset.targetLevel = targetLevel;
            item.style.cssText = 'display: flex; gap: 10px; margin-bottom: 5px; align-items: center; background: #fff; padding: 5px; border: 1px solid #c1a264;';
            const text = document.createElement('span');
            text.style.flex = '1';
            text.textContent = `${building.name} do poziomu ${targetLevel}`;
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = 'display: flex; gap: 5px;';
            const moveUpBtn = document.createElement('button');
            moveUpBtn.innerHTML = '&#9650;';
            moveUpBtn.className = 'btn';
            moveUpBtn.style.padding = '0 5px';
            moveUpBtn.onclick = () => { const prev = item.previousElementSibling; if (prev) sequenceList.insertBefore(item, prev); };
            const moveDownBtn = document.createElement('button');
            moveDownBtn.innerHTML = '&#9660;';
            moveDownBtn.className = 'btn';
            moveDownBtn.style.padding = '0 5px';
            moveDownBtn.onclick = () => { const next = item.nextElementSibling; if (next) sequenceList.insertBefore(next, item); };
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '&#10005;';
            removeBtn.className = 'btn';
            removeBtn.style.padding = '0 5px';
            removeBtn.style.color = '#ff0000';
            removeBtn.onclick = () => {
                item.remove();
                if (sequenceList.children.length === 0) {
                    const emptyText = document.createElement('div');
                    emptyText.textContent = 'Brak budynków w kolejce';
                    emptyText.style.cssText = 'color: #666; font-style: italic; text-align: center;';
                    sequenceList.appendChild(emptyText);
                }
            };
            buttonsDiv.appendChild(moveUpBtn);
            buttonsDiv.appendChild(moveDownBtn);
            buttonsDiv.appendChild(removeBtn);
            item.appendChild(text);
            item.appendChild(buttonsDiv);
            sequenceList.appendChild(item);
        }

        addButton.onclick = () => {
            const buildingId = buildingSelect.value;
            if (!buildingId) { UI.ErrorMessage('Wybierz budynek'); return; }
            const building = buildings.find(b => b.id === buildingId);
            const currentLevel = parseInt(building.currentLevel.replace(/[^\d]/g, '')) || 0;
            const targetLevel = parseInt(untilLevelInput.value);
            if (!targetLevel) { UI.ErrorMessage('Podaj poziom docelowy'); return; }
            if (targetLevel <= currentLevel) { UI.ErrorMessage('Poziom docelowy musi być wyższy od obecnego'); return; }
            const emptyText = sequenceList.querySelector('div[style*="text-align: center"]');
            if (emptyText) sequenceList.innerHTML = '';
            addSequenceItem(buildingId, targetLevel);
            untilLevelInput.value = '';
            buildingSelect.value = '';
        };

        saveButton.onclick = () => {
            const sequence = Array.from(sequenceList.querySelectorAll('.sequence-item')).map(item => ({
                building: item.dataset.buildingId,
                targetLevel: parseInt(item.dataset.targetLevel)
            }));
            const newConfig = {
                useCostReduction: costReductionCheckbox.checked,
                useLongBuildReduction: longBuildCheckbox.checked,
                longBuildThreshold: parseFloat(longBuildThreshold.value) || 2,
                buildSequence: sequence
            };
            saveConfig(newConfig);
            UI.SuccessMessage(`Ustawienia zapisane! Kolejka zawiera ${sequence.length} budynków.`);
        };

        function initializeSequenceList() {
            if (!config.buildSequence || config.buildSequence.length === 0) {
                const emptyText = document.createElement('div');
                emptyText.textContent = 'Brak budynków w kolejce';
                emptyText.style.cssText = 'color: #666; font-style: italic; text-align: center;';
                sequenceList.appendChild(emptyText);
            } else {
                config.buildSequence.forEach(item => addSequenceItem(item.building, item.targetLevel));
            }
        }

        const buildingsTable = document.getElementById('buildings');
        if (buildingsTable && buildingsTable.parentElement) {
            buildingsTable.parentElement.insertBefore(uiContainer, buildingsTable);
        }
        initializeSequenceList();
        debugLog('UI creation completed');
    }

    function debugLog(message, data = null) {
        if (!DEBUG) return;
        const timestamp = new Date().toLocaleTimeString();
        if (data) { console.log(`[${timestamp}] ${message}`, data); }
        else { console.log(`[${timestamp}] ${message}`); }
    }

    function reduceLongBuilds() {
        try {
            const config = loadConfig();
            if (!config.useLongBuildReduction) return false;
            const threshold = config.longBuildThreshold || 2;
            const buildRows = document.querySelectorAll('#buildorder_1, #buildorder_2');
            for (const row of buildRows) {
                const durationCell = row.querySelector('td.nowrap.lit-item');
                if (!durationCell) continue;
                const timeSpan = durationCell.querySelector('span');
                if (!timeSpan) continue;
                const durationText = timeSpan.textContent.trim();
                if (!durationText) continue;
                const [hours, minutes, seconds] = durationText.split(':').map(Number);
                const totalHours = hours + minutes / 60 + seconds / 3600;
                if (totalHours > threshold) {
                    const reductionButton = row.querySelector('a.order_feature.btn.btn-btr:not(.btn-instant)');
                    if (reductionButton) {
                        debugLog(`Found long build, clicking reduction button for build longer than ${threshold}h`);
                        reductionButton.click();
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            debugLog('Error in reduceLongBuilds:', error);
            return false;
        }
    }

    function getBuildingLevel(buildingName) {
        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            if (!row) return null;
            const levelSpan = row.querySelector('span[style*="font-size"]');
            if (!levelSpan) return null;
            const levelMatch = levelSpan.textContent.match(/\d+/);
            return levelMatch ? parseInt(levelMatch[0]) : 0;
        } catch (error) {
            debugLog(`Error getting level for ${buildingName}:`, error);
            return null;
        }
    }

    function canBuildResource(buildingName) {
        const config = loadConfig();
        const buttonSelector = config.useCostReduction ?
            `#main_buildlink_${buildingName}_cheap` :
            `a.btn-build[href*="action=upgrade"][href*="id=${buildingName}"]:not([href*="cheap"])`;
        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            if (!row) return false;
            const buildButton = row.querySelector(buttonSelector);
            if (!buildButton) return false;
            const isDisabled = buildButton.classList.contains('btn-disabled') || buildButton.classList.contains('btn-bcr-disabled');
            const hasValidHref = buildButton.getAttribute('href') && buildButton.getAttribute('href') !== '#';
            return hasValidHref && !isDisabled;
        } catch (error) {
            debugLog(`Error checking if ${buildingName} can be built:`, error);
            return false;
        }
    }

    function isConstructionInProgress() {
        const buildQueueTable = document.getElementById('build_queue');
        return buildQueueTable && buildQueueTable.querySelector('tr') !== null;
    }

    function buildResource(buildingName) {
        const config = loadConfig();
        const buttonSelector = config.useCostReduction ?
            `#main_buildlink_${buildingName}_cheap` :
            `a.btn-build[href*="action=upgrade"][href*="id=${buildingName}"]:not([href*="cheap"])`;
        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            const buildButton = row.querySelector(buttonSelector);
            if (buildButton && buildButton.getAttribute('href') !== '#') {
                debugLog(`Clicking build button for ${buildingName}`);
                buildButton.click();
                return true;
            }
            return false;
        } catch (error) {
            debugLog(`Error building ${buildingName}:`, error);
            return false;
        }
    }

    // ====================================================================
    // === POPRAWIONA, INTELIGENTNA FUNKCJA checkAndBuild ===
    // ====================================================================
    function checkAndBuild() {
        debugLog('Starting building check cycle...');
        reduceLongBuilds();

        if (isConstructionInProgress()) {
            debugLog('Construction already in progress, skipping build check');
            return;
        }

        const config = loadConfig();
        if (!config.buildSequence || config.buildSequence.length === 0) {
            debugLog('No building sequence configured, stopping.');
            return;
        }

        // --- Nowa, inteligentna pętla do "przewijania" ukończonych zadań ---
        let itemsSkipped = false;
        while (config.buildSequence.length > 0) {
            const task = config.buildSequence[0];
            const currentLvl = getBuildingLevel(task.building);

            if (currentLvl === null) {
                debugLog(`Cannot determine level for ${task.building}, cannot proceed with this task.`);
                break; 
            }

            if (currentLvl >= task.targetLevel) {
                debugLog(`Skipping completed task: ${task.building} to level ${task.targetLevel}. (Current level: ${currentLvl})`);
                config.buildSequence.shift(); // Usuń ukończone zadanie z początku listy
                itemsSkipped = true;
            } else {
                // Znaleziono pierwsze zadanie, które nie jest ukończone. Przerwij pętlę.
                break;
            }
        }

        // Jeśli pominięto jakiekolwiek zadania, zapisz nową (krótszą) kolejkę i odśwież stronę, aby zaktualizować UI
        if (itemsSkipped) {
            debugLog('Skipped one or more completed tasks. Saving new queue and reloading to reflect changes.');
            saveConfig(config);
            setTimeout(() => window.location.reload(), 1500);
            return; // Zatrzymaj dalsze wykonywanie w tym cyklu, poczekaj na odświeżenie
        }
        // --- Koniec nowej logiki ---


        // Jeśli doszliśmy tutaj, oznacza to, że pierwsze zadanie w kolejce jest tym właściwym do zbudowania.
        // Sprawdzamy, czy kolejka nie jest teraz pusta.
        if (config.buildSequence.length === 0) {
            debugLog('Building sequence is now empty after skipping tasks.');
            return;
        }
        
        const currentTask = config.buildSequence[0];
        debugLog('Next task to build:', { building: currentTask.building, targetLevel: currentTask.targetLevel });

        if (canBuildResource(currentTask.building)) {
            debugLog(`Building ${currentTask.building} is available for construction.`);
            buildResource(currentTask.building);
        } else {
            debugLog(`Cannot build ${currentTask.building} yet (not enough resources or other condition).`);
        }
    }


    // Główna logika uruchomieniowa
    try {
        createUI();
        debugLog('Script initialized, performing initial check...');
        checkAndBuild();
        setInterval(() => {
            debugLog('Triggering page reload for next check');
            window.location.reload();
        }, CHECK_INTERVAL);
        debugLog('Script setup completed successfully.');
    } catch (error) {
        console.error('[BUILDER SCRIPT] A critical error occurred:', error);
        alert('Builder Script encountered a critical error. Check the console (F12).');
    }
})();
