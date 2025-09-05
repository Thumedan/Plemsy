// ==UserScript==
// @name         Plemiona Bob Budowniczy - Menadżer Kukiego
// @namespace    http://tampermonkey.net/
// @version      1.9.0
// @description  full afk z szablonem pod eko + export i import
// @author       kradzione 
// @match        https://*.plemiona.pl/game.php?village=*&screen=main*
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/MK.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/MK.user.js
// ==/UserScript==


(function() {
    'use strict';

    // Konfiguracja
    const CHECK_INTERVAL = 5 * 61 * 1000;
    const DEBUG = true;
    const STORAGE_KEY = 'tribalWarsBuilderConfig';

    // Wbudowany szablon rozbudowy
    const BUILD_TEMPLATE = [{"building":"wood","targetLevel":1},{"building":"stone","targetLevel":1},{"building":"iron","targetLevel":1},{"building":"stone","targetLevel":2},{"building":"wood","targetLevel":2},{"building":"main","targetLevel":2},{"building":"storage","targetLevel":2},{"building":"iron","targetLevel":2},{"building":"main","targetLevel":3},{"building":"wood","targetLevel":3},{"building":"main","targetLevel":4},{"building":"storage","targetLevel":3},{"building":"iron","targetLevel":3},{"building":"stone","targetLevel":3},{"building":"iron","targetLevel":4},{"building":"wood","targetLevel":4},{"building":"stone","targetLevel":4},{"building":"wood","targetLevel":5},{"building":"wood","targetLevel":6},{"building":"stone","targetLevel":5},{"building":"iron","targetLevel":5},{"building":"wood","targetLevel":7},{"building":"stone","targetLevel":6},{"building":"stone","targetLevel":7},{"building":"wood","targetLevel":8},{"building":"stone","targetLevel":8},{"building":"wood","targetLevel":9},{"building":"stone","targetLevel":9},{"building":"stone","targetLevel":10},{"building":"farm","targetLevel":2},{"building":"barracks","targetLevel":1},{"building":"market","targetLevel":1},{"building":"wall","targetLevel":1},{"building":"wall","targetLevel":2},{"building":"stone","targetLevel":11},{"building":"farm","targetLevel":3},{"building":"wood","targetLevel":10},{"building":"iron","targetLevel":6},{"building":"wall","targetLevel":3},{"building":"iron","targetLevel":7},{"building":"storage","targetLevel":4},{"building":"farm","targetLevel":4},{"building":"farm","targetLevel":5},{"building":"iron","targetLevel":8},{"building":"storage","targetLevel":5},{"building":"wood","targetLevel":11},{"building":"wood","targetLevel":12},{"building":"stone","targetLevel":12},{"building":"iron","targetLevel":9},{"building":"wood","targetLevel":13},{"building":"stone","targetLevel":13},{"building":"wall","targetLevel":4},{"building":"iron","targetLevel":10},{"building":"market","targetLevel":2},{"building":"stone","targetLevel":14},{"building":"wood","targetLevel":14},{"building":"iron","targetLevel":11},{"building":"stone","targetLevel":15},{"building":"wood","targetLevel":15},{"building":"storage","targetLevel":6},{"building":"stone","targetLevel":16},{"building":"iron","targetLevel":12},{"building":"wood","targetLevel":16},{"building":"iron","targetLevel":13},{"building":"storage","targetLevel":7},{"building":"wood","targetLevel":17},{"building":"stone","targetLevel":17},{"building":"main","targetLevel":5},{"building":"storage","targetLevel":8},{"building":"stone","targetLevel":18},{"building":"iron","targetLevel":14},{"building":"market","targetLevel":3},{"building":"farm","targetLevel":6},{"building":"market","targetLevel":4},{"building":"main","targetLevel":6},{"building":"farm","targetLevel":7},{"building":"main","targetLevel":7},{"building":"wall","targetLevel":5},{"building":"market","targetLevel":5},{"building":"wood","targetLevel":18},{"building":"iron","targetLevel":15},{"building":"storage","targetLevel":9},{"building":"stone","targetLevel":19},{"building":"wood","targetLevel":19},{"building":"storage","targetLevel":10},{"building":"stone","targetLevel":20},{"building":"main","targetLevel":8},{"building":"wood","targetLevel":20},{"building":"iron","targetLevel":16},{"building":"storage","targetLevel":11},{"building":"iron","targetLevel":17},{"building":"stone","targetLevel":21},{"building":"main","targetLevel":9},{"building":"main","targetLevel":10},{"building":"wood","targetLevel":21},{"building":"storage","targetLevel":12},{"building":"farm","targetLevel":8},{"building":"farm","targetLevel":9},{"building":"storage","targetLevel":13},{"building":"stone","targetLevel":22},{"building":"wood","targetLevel":22},{"building":"iron","targetLevel":18},{"building":"storage","targetLevel":14},{"building":"stone","targetLevel":23},{"building":"wood","targetLevel":23},{"building":"storage","targetLevel":15},{"building":"stone","targetLevel":24},{"building":"iron","targetLevel":19},{"building":"wood","targetLevel":24},{"building":"storage","targetLevel":16},{"building":"stone","targetLevel":25},{"building":"iron","targetLevel":20},{"building":"wood","targetLevel":25},{"building":"main","targetLevel":11},{"building":"storage","targetLevel":17},{"building":"stone","targetLevel":26},{"building":"iron","targetLevel":21},{"building":"main","targetLevel":12},{"building":"wood","targetLevel":26},{"building":"storage","targetLevel":18},{"building":"stone","targetLevel":27},{"building":"main","targetLevel":13},{"building":"main","targetLevel":14},{"building":"wood","targetLevel":27},{"building":"storage","targetLevel":19},{"building":"storage","targetLevel":20},{"building":"stone","targetLevel":28},{"building":"iron","targetLevel":22},{"building":"main","targetLevel":15},{"building":"farm","targetLevel":10},{"building":"wood","targetLevel":28},{"building":"farm","targetLevel":11},{"building":"farm","targetLevel":12},{"building":"storage","targetLevel":21},{"building":"stone","targetLevel":29},{"building":"main","targetLevel":16},{"building":"iron","targetLevel":23},{"building":"iron","targetLevel":24},{"building":"main","targetLevel":17},{"building":"main","targetLevel":18},{"building":"farm","targetLevel":13},{"building":"storage","targetLevel":22},{"building":"storage","targetLevel":23},{"building":"stone","targetLevel":30},{"building":"main","targetLevel":19},{"building":"iron","targetLevel":25},{"building":"iron","targetLevel":26},{"building":"iron","targetLevel":27},{"building":"wood","targetLevel":29},{"building":"iron","targetLevel":28},{"building":"iron","targetLevel":29},{"building":"storage","targetLevel":24},{"building":"iron","targetLevel":30},{"building":"wood","targetLevel":30}];

    // Główne funkcje skryptu
    function getAvailableBuildings() {
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
        return buildings;
    }

    function loadConfig() {
        const defaultConfig = { useCostReduction: true, useLongBuildReduction: false, longBuildThreshold: 2, buildSequence: [] };
        try { const savedConfig = localStorage.getItem(STORAGE_KEY); return savedConfig ? JSON.parse(savedConfig) : defaultConfig; }
        catch (error) { debugLog('Error loading config:', error); return defaultConfig; }
    }

    function saveConfig(config) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); debugLog('Config saved:', config); }
        catch (error) { debugLog('Error saving config:', error); }
    }

    function createUI() {
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
        const headerButtons = document.createElement('div');
        headerButtons.style.display = 'flex';
        headerButtons.style.gap = '10px';

        // --- Nowe przyciski Import/Export ---
        const importButton = document.createElement('button');
        importButton.textContent = 'Importuj';
        importButton.className = 'btn';
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Eksportuj';
        exportButton.className = 'btn';
        const loadTemplateButton = document.createElement('button');
        loadTemplateButton.textContent = 'Wczytaj szablon';
        loadTemplateButton.className = 'btn';
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Wyczyść';
        clearButton.className = 'btn btn-default';

        headerButtons.appendChild(importButton);
        headerButtons.appendChild(exportButton);
        headerButtons.appendChild(loadTemplateButton);
        headerButtons.appendChild(clearButton);
        sequenceHeader.appendChild(sequenceTitle);
        sequenceHeader.appendChild(headerButtons);
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

        // --- Nowa logika przycisków Import/Export ---
        exportButton.onclick = () => {
            const sequence = Array.from(sequenceList.querySelectorAll('.sequence-item')).map(item => ({
                building: item.dataset.buildingId,
                targetLevel: parseInt(item.dataset.targetLevel)
            }));
            if (sequence.length === 0) { UI.ErrorMessage('Kolejka jest pusta. Nie ma czego eksportować.'); return; }
            const exportString = btoa(JSON.stringify(sequence)); // Kodowanie do Base64
            const dialogContent = `<h3>Szablon gotowy do skopiowania</h3><p>Skopiuj cały poniższy kod i wyślij go innej osobie.</p><textarea readonly style="width: 95%; height: 150px; font-size: 11px; word-break: break-all;">${exportString}</textarea>`;
            Dialog.show('export_dialog', dialogContent);
        };

        importButton.onclick = () => {
            const content = `<h3>Importuj szablon</h3><p>Wklej tutaj kod szablonu otrzymany od innej osoby.</p><textarea id="import_textarea" style="width: 95%; height: 150px;"></textarea><br><br><button id="confirm_import" class="btn">Importuj</button>`;
            Dialog.show('import_dialog', content);

            document.getElementById('confirm_import').onclick = () => {
                const importString = document.getElementById('import_textarea').value.trim();
                if (!importString) { UI.ErrorMessage('Pole jest puste.'); return; }
                try {
                    const decoded = atob(importString); // Dekodowanie z Base64
                    const sequence = JSON.parse(decoded);
                    if (!Array.isArray(sequence) || (sequence.length > 0 && (!sequence[0].building || !sequence[0].targetLevel))) {
                        throw new Error('Invalid format');
                    }
                    if (!confirm(`Znaleziono ${sequence.length} poleceń budowy. Czy chcesz nadpisać swoją obecną kolejkę?`)) return;
                    sequenceList.innerHTML = '';
                    sequence.forEach(item => addSequenceItem(item.building, item.targetLevel));
                    saveButton.click(); // Symuluje kliknięcie zapisu
                    Dialog.close();
                    UI.SuccessMessage('Szablon został pomyślnie zaimportowany i zapisany!');
                } catch (e) {
                    UI.ErrorMessage('Nieprawidłowy kod szablonu! Sprawdź, czy skopiowałeś go w całości.');
                }
            };
        };


        loadTemplateButton.onclick = () => {
            if (!confirm('Czy na pewno chcesz wczytać szablon? Spowoduje to nadpisanie Twojej obecnej kolejki.')) return;
            sequenceList.innerHTML = '';
            BUILD_TEMPLATE.forEach(item => { addSequenceItem(item.building, item.targetLevel); });
            const currentConfig = loadConfig();
            const newConfig = { ...currentConfig, buildSequence: BUILD_TEMPLATE };
            saveConfig(newConfig);
            UI.SuccessMessage('Szablon startowy został wczytany i zapisany!');
        };
        clearButton.onclick = () => {
            const emptyText = document.createElement('div');
            emptyText.textContent = 'Brak budynków w kolejce';
            emptyText.style.cssText = 'color: #666; font-style: italic; text-align: center;';
            sequenceList.innerHTML = '';
            sequenceList.appendChild(emptyText);
            UI.SuccessMessage('Kolejka wyczyszczona');
        };
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
    }

    function debugLog(message, data = null) {
        if (!DEBUG) return;
        const timestamp = new Date().toLocaleTimeString();
        if (data) { console.log(`[${timestamp}] ${message}`, data); } else { console.log(`[${timestamp}] ${message}`); }
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
        } catch (error) { debugLog('Error in reduceLongBuilds:', error); return false; }
    }

    function getBuildingLevel(buildingName) {
        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            if (!row) return null;
            const levelSpan = row.querySelector('span[style*="font-size"]');
            if (!levelSpan) return null;
            const levelMatch = levelSpan.textContent.match(/\d+/);
            return levelMatch ? parseInt(levelMatch[0]) : 0;
        } catch (error) { debugLog(`Error getting level for ${buildingName}:`, error); return null; }
    }

    function canBuildResource(buildingName) {
        const config = loadConfig();
        const buttonSelector = config.useCostReduction ? `#main_buildlink_${buildingName}_cheap` : `a.btn-build[href*="action=upgrade"][href*="id=${buildingName}"]:not([href*="cheap"])`;
        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            if (!row) return false;
            const buildButton = row.querySelector(buttonSelector);
            if (!buildButton) return false;
            const isDisabled = buildButton.classList.contains('btn-disabled') || buildButton.classList.contains('btn-bcr-disabled');
            const hasValidHref = buildButton.getAttribute('href') && buildButton.getAttribute('href') !== '#';
            return hasValidHref && !isDisabled;
        } catch (error) { debugLog(`Error checking if ${buildingName} can be built:`, error); return false; }
    }

    function isConstructionInProgress() {
        const buildQueueTable = document.getElementById('build_queue');
        return buildQueueTable && buildQueueTable.querySelector('tr') !== null;
    }

    function buildResource(buildingName) {
        const config = loadConfig();
        const buttonSelector = config.useCostReduction ? `#main_buildlink_${buildingName}_cheap` : `a.btn-build[href*="action=upgrade"][href*="id=${buildingName}"]:not([href*="cheap"])`;
        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            const buildButton = row.querySelector(buttonSelector);
            if (buildButton && buildButton.getAttribute('href') !== '#') {
                debugLog(`Clicking build button for ${buildingName}`);
                buildButton.click();
                return true;
            }
            return false;
        } catch (error) { debugLog(`Error building ${buildingName}:`, error); return false; }
    }

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
        let itemsSkipped = false;
        while (config.buildSequence.length > 0) {
            const task = config.buildSequence[0];
            const currentLvl = getBuildingLevel(task.building);
            if (currentLvl === null) { break; }
            if (currentLvl >= task.targetLevel) {
                debugLog(`Skipping completed task: ${task.building} to level ${task.targetLevel}. (Current level: ${currentLvl})`);
                config.buildSequence.shift();
                itemsSkipped = true;
            } else {
                break;
            }
        }
        if (itemsSkipped) {
            debugLog('Skipped one or more completed tasks. Saving new queue and reloading to reflect changes.');
            saveConfig(config);
            setTimeout(() => window.location.reload(), 1500);
            return;
        }
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

    function initializeScript() {
        try {
            createUI();
            debugLog('Script UI created. Performing initial check...');
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
    }

    const checkPageReady = setInterval(() => {
        if (document.getElementById('buildings')) {
            clearInterval(checkPageReady);
            initializeScript();
        }
    }, 250);
})();
