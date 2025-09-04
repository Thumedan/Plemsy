// ==UserScript==
// @name         Plemiona Bob Budowniczy - Menadżer Kukiego
// @namespace    http://tampermonkey.net/
// @version      1.3.4
// @description  już możecie spać x)
// @author       kradzione (poprawki Gemini)
// @match        https://*.plemiona.pl/game.php?village=*&screen=main*
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/MK.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/MK.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const CHECK_INTERVAL = 5 * 61 * 1000; // 5 minutes in milliseconds
    const WAIT_FOR_HIGHER_PRIORITY = 10 * 60; // Wait up to 10 minutes for higher priority building
    const DEBUG = true;
    const STORAGE_KEY = 'tribalWarsBuilderConfig';

    // Extract available buildings from the table
    function getAvailableBuildings() {
        debugLog('Starting getAvailableBuildings function');
        const buildings = [];
        const buildingRows = document.querySelectorAll('#buildings tbody tr[id^="main_buildrow_"]');
        debugLog(`Found ${buildingRows.length} building rows`);

        buildingRows.forEach((row, index) => {
            const buildingCell = row.querySelector('td:first-child');
            if (!buildingCell) {
                return;
            }
            const buildingId = row.id.replace('main_buildrow_', '');
            if (!buildingId) {
                return;
            }
            const links = buildingCell.querySelectorAll('a');
            const nameLink = links[1];
            if (!nameLink) {
                return;
            }
            const inactiveCell = row.querySelector('td.inactive');
            if (inactiveCell && inactiveCell.textContent.includes('vollständig ausgebaut')) {
                return;
            }
            const levelSpan = buildingCell.querySelector('span[style*="font-size"]');
            const currentLevel = levelSpan ? levelSpan.textContent.trim() : 'unknown';
            const buildingName = nameLink.textContent.trim();

            buildings.push({
                id: buildingId,
                name: buildingName,
                currentLevel: currentLevel
            });
        });
        debugLog('Completed getAvailableBuildings. Found buildings:', buildings);
        return buildings;
    }

    // Load saved configuration
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

    // Save configuration
    function saveConfig(config) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            debugLog('Config saved:', config);
        } catch (error) {
            debugLog('Error saving config:', error);
        }
    }

    // Create UI
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
        costReductionLabel.textContent = ' Use -20% cost reduction when available';
        costReductionLabel.style.cursor = 'pointer';
        costReductionDiv.appendChild(costReductionCheckbox);
        costReductionDiv.appendChild(costReductionLabel);
        settingsSection.appendChild(costReductionDiv);
        uiContainer.appendChild(settingsSection);
        const sequenceSection = document.createElement('div');
        const sequenceHeader = document.createElement('div');
        sequenceHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
        const sequenceTitle = document.createElement('div');
        sequenceTitle.textContent = 'Building Sequence';
        sequenceTitle.style.cssText = 'font-weight: bold;';
        sequenceHeader.appendChild(sequenceTitle);
        const sequenceList = document.createElement('div');
        sequenceList.id = 'buildSequenceList';
        sequenceList.style.cssText = 'border: 1px solid #c1a264; padding: 10px; margin-bottom: 10px; min-height: 50px; background: #fff3d9;';
        sequenceSection.appendChild(sequenceHeader);
        sequenceSection.appendChild(sequenceList);
        const addControls = document.createElement('div');
        addControls.style.cssText = 'display: flex; gap: 10px; align-items: center; background: #fff3d9; padding: 10px; border: 1px solid #c1a264;';
        const buildingSelect = document.createElement('select');
        buildingSelect.style.cssText = 'flex: 1; padding: 2px; background-color: #fff; border: 1px solid #c1a264;';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select Building --';
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
        untilLevelInput.placeholder = 'Target lvl';
        const addButton = document.createElement('button');
        addButton.textContent = 'Add to Sequence';
        addButton.className = 'btn';
        addControls.appendChild(buildingSelect);
        addControls.appendChild(untilLevelInput);
        addControls.appendChild(addButton);
        sequenceSection.appendChild(addControls);
        uiContainer.appendChild(sequenceSection);
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Settings';
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
            text.textContent = `${building.name} to level ${targetLevel}`;
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '&#10005;';
            removeBtn.className = 'btn';
            removeBtn.style.cssText = 'padding: 0 5px; color: #ff0000;';
            removeBtn.onclick = () => item.remove();
            item.appendChild(text);
            item.appendChild(removeBtn);
            sequenceList.appendChild(item);
        }

        addButton.onclick = () => {
            const buildingId = buildingSelect.value;
            const targetLevel = parseInt(untilLevelInput.value);
            if (!buildingId || !targetLevel) {
                alert('Please select a building and enter a target level.');
                return;
            }
            const building = buildings.find(b => b.id === buildingId);
            const currentLevel = parseInt(building.currentLevel.replace(/[^\d]/g, '')) || 0;
            if (targetLevel <= currentLevel) {
                alert('Target level must be higher than current level.');
                return;
            }
            if (sequenceList.querySelector('.empty-text')) {
                sequenceList.innerHTML = '';
            }
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
                useLongBuildReduction: false,
                longBuildThreshold: 2,
                buildSequence: sequence
            };
            saveConfig(newConfig);
            alert('Settings saved!');
        };

        function initializeSequenceList() {
            if (!config.buildSequence || config.buildSequence.length === 0) {
                const emptyText = document.createElement('div');
                emptyText.className = 'empty-text';
                emptyText.textContent = 'No buildings in sequence';
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
        if (data) {
            console.log(`[${timestamp}] ${message}`, data);
        } else {
            console.log(`[${timestamp}] ${message}`);
        }
    }

    function getBuildingLevel(buildingName) {
        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            if (!row) return null;
            const levelSpan = row.querySelector('span[style*="font-size"]');
            if (!levelSpan) return null;
            const levelMatch = levelSpan.textContent.match(/\d+/);
            const level = levelMatch ? parseInt(levelMatch[0]) : null;
            debugLog(`Current level for ${buildingName}: ${level}`);
            return level;
        } catch (error) {
            debugLog(`Error getting level for ${buildingName}:`, error);
            return null;
        }
    }

    // === NAPRAWIONA FUNKCJA SPRAWDZANIA MOŻLIWOŚCI BUDOWY ===
    function canBuildResource(buildingName) {
        const config = loadConfig();
        const buttonSelector = config.useCostReduction
            ? `#main_buildlink_${buildingName}_cheap`
            : `a.btn-build[href*="action=upgrade"][href*="id=${buildingName}"]:not([href*="cheap"])`;

        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            if (!row) {
                debugLog(`No row found for ${buildingName} when checking buildability`);
                return false;
            }

            const buildButton = row.querySelector(buttonSelector);
            if (!buildButton) {
                debugLog(`No build button found for ${buildingName} with selector: ${buttonSelector}`);
                return false;
            }

            const isDisabled = buildButton.classList.contains('btn-disabled') || buildButton.classList.contains('btn-bcr-disabled');
            const hasValidHref = buildButton.getAttribute('href') && buildButton.getAttribute('href') !== '#';
            const canBuild = hasValidHref && !isDisabled;

            debugLog(`Checking if ${buildingName} can be built:`, {
                usingCostReduction: config.useCostReduction,
                selector: buttonSelector,
                buttonFound: !!buildButton,
                isDisabled: isDisabled,
                canBuild: canBuild,
            });

            return canBuild;
        } catch (error) {
            debugLog(`Error checking if ${buildingName} can be built:`, error);
            return false;
        }
    }

    // === POPRAWIONA FUNKCJA WYKRYWANIA KOLEJKI ===
    function isConstructionInProgress() {
        const buildQueueTable = document.getElementById('build_queue');
        const isBuilding = buildQueueTable && buildQueueTable.querySelector('tr') !== null;
        debugLog('Checking for ongoing construction:', {
            isBuilding: isBuilding,
            reason: isBuilding ? "Found row (tr) in #build_queue table" : "No rows (tr) in #build_queue table, queue is empty"
        });
        return isBuilding;
    }

    function buildResource(buildingName) {
        const config = loadConfig();
        const buttonSelector = config.useCostReduction
            ? `#main_buildlink_${buildingName}_cheap`
            : `a.btn-build[href*="action=upgrade"][href*="id=${buildingName}"]:not([href*="cheap"])`;

        try {
            const row = document.querySelector(`#main_buildrow_${buildingName}`);
            const buildButton = row.querySelector(buttonSelector);
            if (buildButton && buildButton.getAttribute('href') !== '#') {
                debugLog(`Clicking build button for ${buildingName}`);
                buildButton.click();
                return true;
            }
            debugLog(`Could not find a valid build button for ${buildingName}`);
            return false;
        } catch (error) {
            debugLog(`Error building ${buildingName}:`, error);
            return false;
        }
    }

    function checkAndBuild() {
        debugLog('Starting building check cycle...');
        if (isConstructionInProgress()) {
            debugLog('Construction already in progress, skipping build check');
            return;
        }

        const config = loadConfig();
        if (!config.buildSequence || config.buildSequence.length === 0) {
            debugLog('No building sequence configured, stopping.');
            return;
        }

        const currentTask = config.buildSequence[0];
        const buildingId = currentTask.building;
        const targetLevel = currentTask.targetLevel;
        const currentLevel = getBuildingLevel(buildingId);

        if (currentLevel === null) {
            debugLog(`Could not determine current level for ${buildingId}. Skipping.`);
            return;
        }

        debugLog('Checking sequence item:', {
            building: buildingId,
            currentLevel,
            targetLevel
        });

        if (currentLevel >= targetLevel) {
            debugLog(`Target level for ${buildingId} reached. Removing from sequence.`);
            config.buildSequence.shift();
            saveConfig(config);
            setTimeout(() => window.location.reload(), 1500); // Reload to update UI
            return;
        }

        if (canBuildResource(buildingId)) {
            debugLog(`Building ${buildingId} is available for construction.`);
            buildResource(buildingId);
        } else {
            debugLog(`Cannot build ${buildingId} yet (not enough resources or other condition).`);
        }
    }

    // === GŁÓWNA LOGIKA URUCHOMIENIOWA Z OBSŁUGĄ BŁĘDÓW ===
    try {
        debugLog('Attempting to initialize script...');
        createUI();
        debugLog('Script UI created. Performing initial build check...');
        checkAndBuild();

        debugLog(`Setting up periodic page reload every ${CHECK_INTERVAL / 1000} seconds`);
        setInterval(() => {
            debugLog('Triggering page reload for next check');
            window.location.reload();
        }, CHECK_INTERVAL);

        debugLog('Script setup completed successfully.');
    } catch (error) {
        console.error('[TRIBAL WARS BUILDER] A critical error occurred during script initialization:');
        console.error(error);
        alert('Tribal Wars Auto Builder encountered a critical error. Check the console (F12) for details.');
    }

})();
