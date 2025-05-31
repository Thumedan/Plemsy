// ==UserScript==
// @name         ZBIERAK TOP
// @description  Provides an in-game calculator utility for scavenging within the Tribal Wars online game. Original calculation logic credit: Daniel Van Den Berg. Base script structure by Kits. MODIFIED with auto-refresh and restart loop by KUKI & AI Assistant.
// @version      1.0
// @author       KUKI
// @match        https://*.plemiona.pl/game.php*screen=place*mode=scavenge*
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/ZBIERAK%20TOP.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/ZBIERAK%20TOP.user.js
// @grant        none
// ==/UserScript==
'use strict';

// --- Helper Functions (początek) ---
function getVillageSpecificKey(baseKey) {
    if (typeof game_data !== 'undefined' && game_data.village && game_data.village.id) {
        return `${baseKey}_v${game_data.village.id}`;
    }
    console.warn("KUKI Calc: game_data.village.id not available for key generation. Base key:", baseKey);
    return baseKey;
}
const AUTO_SCAVENGE_ACTIVE_BASE_KEY = 'autoScavengeActive'; // Klucz dla flagi intencji
const AUTO_SCAVENGE_SESSION_RUNNING_BASE_KEY = 'autoScavengeSessionRunning'; // Klucz dla flagi stanu sesji
const AUTO_SCAVENGE_CHECK_INTERVAL = 30000;
const AUTO_SCAVENGE_REFRESH_DELAY = 5000;
const DEFAULT_WORLD_SPEED = 1.0; // Zmienione na 1.0

// Funkcje flag dla AUTO_SCAVENGE_ACTIVE_BASE_KEY (intencja użytkownika - teraz w sessionStorage)
function getAutoScavengeActiveFlag() { return sessionStorage.getItem(getVillageSpecificKey(AUTO_SCAVENGE_ACTIVE_BASE_KEY)) === 'true'; }
function setAutoScavengeActiveFlag(value) { sessionStorage.setItem(getVillageSpecificKey(AUTO_SCAVENGE_ACTIVE_BASE_KEY), value ? 'true' : 'false'); }
function removeAutoScavengeActiveFlag() { sessionStorage.removeItem(getVillageSpecificKey(AUTO_SCAVENGE_ACTIVE_BASE_KEY)); }

// Funkcje flag dla AUTO_SCAVENGE_SESSION_RUNNING_BASE_KEY (stan pętli w sesji - pozostaje w sessionStorage)
function getSessionStorageFlag(baseKey) { return sessionStorage.getItem(getVillageSpecificKey(baseKey)) === 'true'; }
function setSessionStorageFlag(baseKey, value) { sessionStorage.setItem(getVillageSpecificKey(baseKey), value ? 'true' : 'false'); }
function removeSessionStorageFlag(baseKey) { sessionStorage.removeItem(getVillageSpecificKey(baseKey)); }

// Funkcje dla localStorage (dla ustawień interfejsu, np. persistent inputs)
function getLocalStorageItem(key) { return localStorage.getItem(key); }
function setLocalStorageItem(key, value) { localStorage.setItem(key, value); }


let unitCapacities = { spear: 25, sword: 15, axe: 10, archer: 10, light: 80, marcher: 50, heavy: 50, knight: 100 };

if (typeof window.TribalWars === 'undefined') { window.TribalWars = {}; }
window.TribalWars.worldSpeed = DEFAULT_WORLD_SPEED;

function updateStatusMessage(message, type = 'info', clearPrevious = false) {
    // Upewnij się, że game_data jest dostępne, zanim spróbujesz uzyskać villageId
    if (typeof game_data === 'undefined' || !game_data.village || !game_data.village.id) {
        console.warn("KUKI Calc: Cannot update status message, game_data not fully available.");
        return;
    }
    const villageId = game_data.village.id;
    const uiSuffix = `_v${villageId}`;
    const resultsElement = document.querySelector(`#calc_request_results${uiSuffix}`);
    if (!resultsElement) return;

    let color = 'black';
    let prefix = '';
    switch (type) {
        case 'success': color = 'green'; prefix = 'SUKCES: '; break;
        case 'error': color = 'red'; prefix = 'BŁĄD: '; break;
        case 'warning': color = 'orange'; prefix = 'OSTRZEŻENIE: '; break;
        case 'info': color = 'blue'; prefix = 'INFO: '; break;
        case 'system': color = '#555'; prefix = 'SYSTEM: '; break;
    }

    const time = new Date().toLocaleTimeString();
    const newMessage = `<span style="color:${color};">[${time}] ${prefix}${message}</span>`;

    if (clearPrevious) {
        resultsElement.innerHTML = newMessage;
    } else {
        resultsElement.innerHTML += `<br>${newMessage}`;
        const maxLines = 15;
        let lines = resultsElement.innerHTML.split('<br>');
        if (lines.length > maxLines) {
            lines = lines.slice(lines.length - maxLines);
            resultsElement.innerHTML = lines.join('<br>');
        }
    }
    resultsElement.scrollTop = resultsElement.scrollHeight;
}
// --- Helper Functions (koniec) ---

function main() {
    if (window.location.href.indexOf('screen=place&mode=scavenge') < 0) return;
    if (typeof game_data === 'undefined' || !game_data.village || !game_data.village.id) {
        console.warn("KUKI Calc: game_data or village.id not available. Retrying...");
        setTimeout(main, 500);
        return;
    }
    console.log(`KUKI Calc: Initial world speed (default): ${window.TribalWars.worldSpeed}`);
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", `https://${game_data.world}.plemiona.pl/interface.php?func=get_config`);
    xhttp.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE) {
            let rawResponseText = this.responseText;
            if (this.status === 200 && rawResponseText) {
                try {
                    let xmlDoc = (new DOMParser()).parseFromString(rawResponseText, "text/xml");
                    let speedNode = xmlDoc.querySelector("config speed");
                    if (speedNode && speedNode.textContent) {
                        let parsedSpeed = parseFloat(speedNode.textContent);
                        if (!isNaN(parsedSpeed) && parsedSpeed > 0) {
                            window.TribalWars.worldSpeed = parsedSpeed;
                            console.log(`KUKI Calc: Successfully parsed world speed from server: ${window.TribalWars.worldSpeed}`);
                        } else {
                             console.warn(`KUKI Calc: Parsed world speed ('${speedNode.textContent}') invalid. Using default: ${DEFAULT_WORLD_SPEED}`);
                             window.TribalWars.worldSpeed = DEFAULT_WORLD_SPEED;
                        }
                    } else {
                        console.warn(`KUKI Calc: 'config speed' node not found or empty in XML. Using default: ${DEFAULT_WORLD_SPEED}`);
                        window.TribalWars.worldSpeed = DEFAULT_WORLD_SPEED;
                    }
                } catch (e) {
                    console.error(`KUKI Calc: Error parsing world config XML. Using default: ${DEFAULT_WORLD_SPEED}. Error:`, e);
                    window.TribalWars.worldSpeed = DEFAULT_WORLD_SPEED;
                }
            } else {
                console.warn(`KUKI Calc: Failed to fetch world config. Status: ${this.status}. Using default: ${DEFAULT_WORLD_SPEED}`);
                window.TribalWars.worldSpeed = DEFAULT_WORLD_SPEED;
            }
            console.log("KUKI Calc: Final World Speed to be used:", window.TribalWars.worldSpeed);
            constructInterface();
            checkAndManageAutoScavengeState();
        }
    };
    xhttp.send();
}

function constructInterface() {
    const villageId = game_data.village.id;
    const uniqueIdSuffix = `_v${villageId}`;

    let mainTable = document.querySelector("#contentContainer");
    let contentRoot = null;

    if (document.querySelector(`#scavenge_calculator${uniqueIdSuffix}`)) {
        console.log("KUKI Calc: Interface already exists. Updating button visibility.");
        updateAutoScavengeButtonVisibility();
        return;
    }
    if (mainTable) {
        let mainTableBody = mainTable.childNodes[1];
        mainTable.style["border-spacing"] = "10px"; mainTable.style["border-collapse"] = "separate";
        let tr = document.createElement("tr"); tr.id = `scavenge_calculator${uniqueIdSuffix}`;
        mainTableBody.insertBefore(tr, mainTableBody.childNodes[0]);
        let td = document.createElement("td"); td.id = `content_value_userscript${uniqueIdSuffix}`;
        td.className = "content-border calc-root"; td.colSpan = mainTable.querySelector('tr').cells.length;
        tr.appendChild(td); contentRoot = td;
    } else {
        let mobileRoot = document.querySelector("#mobileContent"); let stdContent = document.querySelector("#content_value");
        contentRoot = document.createElement("div"); contentRoot.id = `content_value_userscript${uniqueIdSuffix}`; contentRoot.className = "calc-root";
        if (stdContent) mobileRoot.insertBefore(contentRoot, stdContent); else mobileRoot.appendChild(contentRoot);
    }
    const html = `<h3>KUKI Scavenging Calculator (v2.3) <span id="kuki_auto_status_indicator${uniqueIdSuffix}" style="font-size: 0.8em; margin-left: 15px;"></span></h3>
    <div class="candidate-squad-container"><table class="candidate-squad-widget vis" style="width: 490px"><tbody id="calcTableBody${uniqueIdSuffix}">
    <tr><th style="width:80px"></th><th>Enable</th><th>Available</th><th>LL</th><th>HH</th><th>CC</th><th>GG</th></tr>
    <tr><th>Mission Enable</th><td></td><td></td>
    <td><input type="checkbox" id="calc_mission_enabled_0${uniqueIdSuffix}" class="calc-mission-enabled input-persist"></td>
    <td><input type="checkbox" id="calc_mission_enabled_1${uniqueIdSuffix}" class="calc-mission-enabled input-persist"></td>
    <td><input type="checkbox" id="calc_mission_enabled_2${uniqueIdSuffix}" class="calc-mission-enabled input-persist"></td>
    <td><input type="checkbox" id="calc_mission_enabled_3${uniqueIdSuffix}" class="calc-mission-enabled input-persist"></td>
    </tr></tbody></table></div>`;
    contentRoot.insertAdjacentHTML('beforeend', html);
    const tableBody = document.querySelector(`#calcTableBody${uniqueIdSuffix}`);
    const unitNames = Array.from(document.querySelectorAll(".unit_link")).map(e => e.getAttribute("data-unit"));
    const unitCounts = Array.from(document.querySelectorAll(".units-entry-all")).reduce((a, e) => ({ ...a, [e.getAttribute("data-unit")]: parseInt(e.textContent.substring(1, e.textContent.length - 1)) || 0 }), {});
    for (let unitName of unitNames) {
        const htmlUnitRow = `<tr><th><a href="#" data-unit="${unitName}"><img src="https://dsuk.innogamescdn.com/asset/27dd28b8/graphic/unit/unit_${unitName}.png" style="text-align:center;"><a>  ${unitName}</a></a></th>
        <td><input type="checkbox" id="calc_unit_enabled_${unitName}${uniqueIdSuffix}" class="calc-unit-enabled input-persist"></td>
        <td><a id="calc_unit_available_${unitName}${uniqueIdSuffix}" class="calc-unit-available">${unitCounts[unitName] || 0}</a></td>
        <td><a id="calc_output_${unitName}_0${uniqueIdSuffix}" class="calc-output-mission-0" unitname="${unitName}">0</a></td>
        <td><a id="calc_output_${unitName}_1${uniqueIdSuffix}" class="calc-output-mission-1" unitname="${unitName}">0</a></td>
        <td><a id="calc_output_${unitName}_2${uniqueIdSuffix}" class="calc-output-mission-2" unitname="${unitName}">0</a></td>
        <td><a id="calc_output_${unitName}_3${uniqueIdSuffix}" class="calc-output-mission-3" unitname="${unitName}">0</a></td></tr>`;
        tableBody.insertAdjacentHTML('beforeend', htmlUnitRow);
    }
    const html2 = `<tr><th><a>Res/Hour</a></th><td colspan="2"><a class="calc-output-res-hour">0</a></td></tr>
    <tr><th><a>Res/Run</a></th><td colspan="2"><a class="calc-output-res-run">0</a></td></tr>
    <tr><th><a>Run Time</a></th><td colspan="2"><a class="calc-output-run-time">0</a></td></tr>
    <tr><th><a>Time Limit</a></th><td colspan="2"><select id="calc_time_limit${uniqueIdSuffix}" class="input-persist" input-default="0">
    <option value="15">15 Mins</option><option value="30">30 Mins</option><option value="45">45 Mins</option><option value="60">1 Hour</option><option value="90">1.5 Hours</option><option value="120">2 Hours</option><option value="180">3 Hours</option><option value="240">4 Hours</option><option value="300">5 Hours</option><option value="360">6 Hours</option><option value="420">7 Hours</option><option value="480">8 Hours</option><option value="540">9 Hours</option><option value="600">10 Hours</option><option value="720">12 Hours</option><option value="840">14 Hours</option><option value="960">16 Hours</option><option value="1080">18 Hours</option><option value="1200">20 Hours</option><option value="0" selected="1">Unlimited</option></select></td></tr>
    <tr><th><a>Method</a></th><td colspan="2"><select id="calc_method${uniqueIdSuffix}" class="input-persist" input-default="0">
    <option value="0">Equal</option><option value="1">Max</option></select></td></tr>`;
    tableBody.insertAdjacentHTML('beforeend', html2);
    const html3 = `<a href="#" id="calc_button_calculate${uniqueIdSuffix}" class="btn">Calculate Only</a>
    <a href="#" id="calc_button_calculateSendDebug${uniqueIdSuffix}" class="btn" title="Oblicza i wysyła wojska, ale nie uruchamia pętli AUTO. Strona odświeży się po wysłaniu.">Calculate & Send (DEBUG)</a>
    <a href="#" id="calc_button_calculateSendAuto${uniqueIdSuffix}" class="btn" title="Uruchamia automatyczną pętlę zbieractwa dla tej sesji karty. Skrypt będzie sam wysyłał wojska i odświeżał stronę.">Calculate & Send (AUTO)</a>
    <a href="#" id="calc_button_stopAutoScavenge${uniqueIdSuffix}" class="btn" style="display:none; background-color: #f44336;" title="Zatrzymuje automatyczną pętlę zbieractwa.">Stop Auto Scavenge</a>
    <div style="margin-top: 10px; border: 1px solid #ccc; padding: 5px; max-height: 150px; overflow-y: auto; background-color: #f9f9f9;">
      <span style="font-weight: bold;">Log Aktywności:</span>
      <pre class="calc-request-results" id="calc_request_results${uniqueIdSuffix}" style="margin:0; padding:0; white-space: pre-wrap; word-wrap: break-word;"></pre>
    </div>
    <div style="font-size:0.9em; margin-top:5px; color: #666;">
        Wskazówka: Tryb AUTO jest aktywny tylko dla tej sesji karty. Po zamknięciu i ponownym otwarciu karty, tryb AUTO należy uruchomić ponownie.
    </div>`;
    contentRoot.insertAdjacentHTML('beforeend', html3);

    document.querySelector(`#calc_button_calculate${uniqueIdSuffix}`).addEventListener("click", (e) => { e.preventDefault(); calculateUnits(); });
    document.querySelector(`#calc_button_calculateSendDebug${uniqueIdSuffix}`).addEventListener("click", (e) => {
        e.preventDefault(); console.log("KUKI Calc: Debug send initiated.");
        updateStatusMessage('Inicjowanie wysyłania DEBUG...', 'system', true);
        if (calculateUnits()) {
            sendScavRequests(false);
        } else {
            updateStatusMessage('Obliczenia nie znalazły wojsk do wysłania.', 'warning');
        }
    });
    document.querySelector(`#calc_button_calculateSendAuto${uniqueIdSuffix}`).addEventListener("click", (e) => { e.preventDefault(); initiateAutoScavengeLoop(); });
    document.querySelector(`#calc_button_stopAutoScavenge${uniqueIdSuffix}`).addEventListener("click", (e) => { e.preventDefault(); stopAutoScavengeLoop(); });

    const inputs = Array.from(contentRoot.querySelectorAll(".input-persist"));
    for (let input of inputs) { makePersistentInput(input); }
    updateAutoScavengeButtonVisibility();
}

function updateAutoScavengeButtonVisibility() {
    const villageId = game_data.village.id;
    const uiSuffix = `_v${villageId}`;
    const isAutoIntentActive = getAutoScavengeActiveFlag(); // ZMIANA na nową funkcję
    const autoButton = document.querySelector(`#calc_button_calculateSendAuto${uiSuffix}`);
    const stopButton = document.querySelector(`#calc_button_stopAutoScavenge${uiSuffix}`);
    const debugButton = document.querySelector(`#calc_button_calculateSendDebug${uiSuffix}`);
    const autoStatusIndicator = document.querySelector(`#kuki_auto_status_indicator${uiSuffix}`);

    if (autoButton && stopButton && debugButton && autoStatusIndicator) {
        if (isAutoIntentActive) {
            autoButton.style.display = 'none'; debugButton.style.display = 'none'; stopButton.style.display = 'inline-block';
            autoStatusIndicator.innerHTML = '<span style="color:green; font-weight:bold;">AUTO AKTYWNE (SESJA)</span>';
        } else {
            autoButton.style.display = 'inline-block'; debugButton.style.display = 'inline-block'; stopButton.style.display = 'none';
            autoStatusIndicator.innerHTML = '<span style="color:red;">AUTO NIEAKTYWNE</span>';
        }
    }
}

function initiateAutoScavengeLoop() {
    const villageId = game_data.village.id;
    console.log(`KUKI Calc: Activating AUTO Scavenge Loop for village ${villageId}.`);
    updateStatusMessage(`Aktywowanie trybu AUTO (sesja karty) dla wioski ${villageId}...`, 'system', true);
    setAutoScavengeActiveFlag(true); // ZMIANA na nową funkcję
    setSessionStorageFlag(AUTO_SCAVENGE_SESSION_RUNNING_BASE_KEY, true);
    updateAutoScavengeButtonVisibility();
    updateStatusMessage('Tryb AUTO (sesja karty) aktywowany. Rozpoczynanie pierwszego cyklu...', 'success');
    console.log("KUKI Calc: AUTO Scavenge Loop activated. Initial cycle run will be triggered.");
    if (calculateUnits()) {
        console.log("KUKI Calc: Initial calculation for AUTO mode found missions. Sending and starting loop.");
        updateStatusMessage('Obliczono początkowe wysłanie. Wysyłanie wojsk...', 'info');
        sendScavRequests(true);
    } else {
        console.log("KUKI Calc: Initial calculation for AUTO mode found NO missions to send. Will start monitoring cycle.");
        updateStatusMessage('Brak misji do natychmiastowego wysłania. Rozpoczynam monitorowanie i czekam na wolne sloty.', 'info');
        setTimeout(() => {
            if (getAutoScavengeActiveFlag()) { // ZMIANA na nową funkcję
                 runAutoScavengeCycle(true);
            }
        }, 1000);
    }
}

function stopAutoScavengeLoop() {
    const villageId = game_data.village.id;
    console.log(`KUKI Calc: Stopping AUTO Scavenge Loop for village ${villageId}.`);
    updateStatusMessage(`Zatrzymywanie trybu AUTO dla wioski ${villageId}.`, 'system', true);
    removeAutoScavengeActiveFlag(); // ZMIANA na nową funkcję
    removeSessionStorageFlag(AUTO_SCAVENGE_SESSION_RUNNING_BASE_KEY);
    updateAutoScavengeButtonVisibility();
    updateStatusMessage('Tryb AUTO został zatrzymany dla tej sesji karty.', 'warning');
}

function checkAndManageAutoScavengeState(retryCount = 0) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 2000;
    const villageId = game_data.village.id;
    const uiSuffix = `_v${villageId}`;
    console.log(`KUKI Calc: Entered checkAndManageAutoScavengeState. Retry attempt: ${retryCount + 1}`);

    if (!document.querySelector(`#scavenge_calculator${uiSuffix}`)) {
        console.log("KUKI Calc: UI not ready for checkAndManage. Retrying soon.");
        setTimeout(() => checkAndManageAutoScavengeState(retryCount), 500);
        return;
    }
    updateAutoScavengeButtonVisibility();

    const isAutoIntentActive = getAutoScavengeActiveFlag(); // ZMIANA na nową funkcję
    const isSessionLoopRunning = getSessionStorageFlag(AUTO_SCAVENGE_SESSION_RUNNING_BASE_KEY);

    if (isAutoIntentActive) {
        console.log(`KUKI Calc: Auto intent ACTIVE for ${villageId}. Session loop running flag: ${isSessionLoopRunning}.`);

        setTimeout(() => {
            console.log("KUKI Calc: Inside setTimeout for page element check.");
            const scavengeOptions = document.querySelectorAll('.scavenge-option');
            const scavengeOptionsExist = scavengeOptions.length > 0;
            const isMassScreenActive = document.querySelector('#scavenge_mass_screen') !== null;

            console.log(`KUKI Calc: scavengeOptionsExist: ${scavengeOptionsExist}, isMassScreenActive: ${isMassScreenActive}`);
            if (scavengeOptionsExist) {
                console.log(`KUKI Calc: Found ${scavengeOptions.length} scavenge-option elements.`);
            }

            if (!scavengeOptionsExist && !isMassScreenActive) {
                console.warn(`KUKI Calc: No .scavenge-option elements found (and not on mass screen).`);
                if (retryCount < MAX_RETRIES) {
                    console.log(`KUKI Calc: Retrying checkAndManageAutoScavengeState in ${RETRY_DELAY}ms (attempt ${retryCount + 2}).`);
                    updateStatusMessage(`Brak opcji zbieractwa. Ponawiam próbę za ${RETRY_DELAY/1000}s... (próba ${retryCount + 2}/${MAX_RETRIES+1})`, 'warning');
                    setTimeout(() => checkAndManageAutoScavengeState(retryCount + 1), RETRY_DELAY);
                } else {
                    console.error("KUKI Calc: Max retries reached for finding .scavenge-option. Forcing page reload as a last resort.");
                    updateStatusMessage(`Maksymalna liczba prób znalezienia opcji zbieractwa osiągnięta. Próbuję odświeżyć stronę...`, 'error');
                    setTimeout(() => { if (getAutoScavengeActiveFlag()) location.reload(); }, 1000); // ZMIANA na nową funkcję
                }
                return;
            }

            if (!scavengeOptionsExist && isMassScreenActive) {
                console.warn("KUKI Calc: Scavenge options not loaded on mass screen yet.");
                 if (retryCount < MAX_RETRIES) {
                    console.log(`KUKI Calc: Retrying checkAndManageAutoScavengeState for mass screen in ${RETRY_DELAY}ms (attempt ${retryCount + 2}).`);
                    updateStatusMessage(`Opcje na ekranie masowym niezaładowane. Ponawiam próbę za ${RETRY_DELAY/1000}s... (próba ${retryCount + 2}/${MAX_RETRIES+1})`, 'warning');
                    setTimeout(() => checkAndManageAutoScavengeState(retryCount + 1), RETRY_DELAY);
                } else {
                    console.error("KUKI Calc: Max retries reached for finding options on mass screen. Forcing page reload.");
                    updateStatusMessage("Maksymalna liczba prób znalezienia opcji na ekranie masowym osiągnięta. Próbuję odświeżyć stronę.", 'error');
                    setTimeout(() => { if (getAutoScavengeActiveFlag()) location.reload(); }, 1000); // ZMIANA na nową funkcję
                }
                return;
            }
            console.log(`KUKI Calc: Proceeding to runAutoScavengeCycle. isSessionLoopRunning: ${isSessionLoopRunning}.`);
            runAutoScavengeCycle(true);

        }, 1500);
    } else {
        console.log(`KUKI Calc: Auto intent INACTIVE for ${villageId}.`);
        updateStatusMessage('Tryb AUTO jest nieaktywny dla tej sesji karty.', 'info', true);
        if (isSessionLoopRunning) removeSessionStorageFlag(AUTO_SCAVENGE_SESSION_RUNNING_BASE_KEY);
    }
}

function runAutoScavengeCycle(shouldAutoSendOnFree) {
    const villageId = game_data.village.id;
    const uiSuffix = `_v${villageId}`;
    console.log(`KUKI Calc: Entered runAutoScavengeCycle for ${villageId}. shouldAutoSendOnFree: ${shouldAutoSendOnFree}. Session Active Flag: ${getAutoScavengeActiveFlag()}`); // ZMIANA na nową funkcję

    if (!getAutoScavengeActiveFlag()) { // ZMIANA na nową funkcję
        console.log(`KUKI Calc: (Cycle) Auto mode was stopped for ${villageId} (Session Active flag is false). Terminating cycle.`);
        return;
    }

    console.log(`KUKI Calc: (Cycle) Checking status for ${villageId}. Auto-send on free: ${shouldAutoSendOnFree}`);
    let activeScavenges = 0;
    const scavengeOptionElements = document.querySelectorAll('.scavenge-option');
    const isMassScreen = document.querySelector('#scavenge_mass_screen') !== null;

    if (scavengeOptionElements.length === 0 && !isMassScreen) {
        console.warn(`KUKI Calc: (Cycle) No .scavenge-option elements found in runAutoScavengeCycle. Re-scheduling main checkAndManage.`);
        updateStatusMessage(`Problem z odczytem opcji zbieractwa. Ponawiam główną weryfikację za ${AUTO_SCAVENGE_CHECK_INTERVAL / 1000}s...`, 'warning');
        setTimeout(() => checkAndManageAutoScavengeState(), AUTO_SCAVENGE_CHECK_INTERVAL);
        return;
    }

    scavengeOptionElements.forEach(option => {
        if (option.querySelector('a.btn.btn-cancel[href*="cancel_squad"]') ||
            option.querySelector('.return-countdown') ||
            (option.querySelector('.squad_scavenging_details') && !option.querySelector('.free_send_button'))) {
            activeScavenges++;
        }
    });
    console.log(`KUKI Calc: (Cycle) Active/Returning scavenges for ${villageId}: ${activeScavenges}`);

    if (activeScavenges > 0) {
        updateStatusMessage(`Aktywne/wracające misje: ${activeScavenges}. Następne sprawdzenie za ${AUTO_SCAVENGE_CHECK_INTERVAL / 1000}s. (Auto-wysyłanie: ${shouldAutoSendOnFree})`, 'system');
        setTimeout(() => runAutoScavengeCycle(shouldAutoSendOnFree), AUTO_SCAVENGE_CHECK_INTERVAL);
    } else {
        console.log(`KUKI Calc: (Cycle) All missions appear complete for ${villageId}. shouldAutoSendOnFree: ${shouldAutoSendOnFree}`);
        if (shouldAutoSendOnFree) {
            console.log(`KUKI Calc: (Cycle) Preparing for auto-send for ${villageId}.`);
            updateStatusMessage('Wszystkie misje zakończone. Przygotowuję ponowne wysłanie...', 'info');
            setSessionStorageFlag(AUTO_SCAVENGE_SESSION_RUNNING_BASE_KEY, true);

            const delayBeforeResend = 3000;
            console.log(`KUKI Calc: (Cycle) Waiting ${delayBeforeResend / 1000}s for DOM to potentially update before calculating and sending.`);
            updateStatusMessage(`Czekam ${delayBeforeResend / 1000}s na ustabilizowanie interfejsu...`, 'system');

            setTimeout(() => {
                if (!getAutoScavengeActiveFlag()) { // ZMIANA na nową funkcję
                    console.log("KUKI Calc: (Cycle) Auto mode was stopped during delay before resend. Aborting.");
                    updateStatusMessage('Tryb AUTO zatrzymany przed ponownym wysłaniem.', 'warning');
                    return;
                }

                console.log(`KUKI Calc: (Cycle) Proceeding with calculateUnits and sendScavRequests for ${villageId} after delay.`);
                updateStatusMessage('Rozpoczynam obliczenia i ponowne wysyłanie wojsk...', 'info');

                const currentScavengeOptions = document.querySelectorAll('.scavenge-option');
                const onMassScreenNow = document.querySelector('#scavenge_mass_screen') !== null;
                if (currentScavengeOptions.length === 0 && !onMassScreenNow) {
                     console.warn(`KUKI Calc: (Cycle) CRITICAL - .scavenge-option elements STILL NOT found right before sending! Attempting page reload.`);
                     updateStatusMessage('KRYTYCZNY: Brak opcji zbieractwa tuż przed wysłaniem! Próbuję odświeżyć stronę...', 'error');
                     setTimeout(() => { if (getAutoScavengeActiveFlag()) { location.reload(); } }, 2000); // ZMIANA na nową funkcję
                     return;
                }
                if (currentScavengeOptions.length > 0) {
                    console.log(`KUKI Calc: (Cycle) Confirmed ${currentScavengeOptions.length} .scavenge-option elements before sending.`);
                }

                if (calculateUnits()) {
                    sendScavRequests(true);
                } else {
                    console.log(`KUKI Calc: (Cycle) calculateUnits found NO missions to send even though slots should be free. Refreshing.`);
                    updateStatusMessage('Obliczenia nie znalazły misji do wysłania, mimo wolnych slotów. Odświeżam stronę...', 'warning');
                    setTimeout(() => { if (getAutoScavengeActiveFlag()) { location.reload(); } }, AUTO_SCAVENGE_REFRESH_DELAY); // ZMIANA na nową funkcję
                }
            }, delayBeforeResend);

        } else {
            console.warn(`KUKI Calc: (Cycle) In runAutoScavengeCycle with shouldAutoSendOnFree=false, but auto intent is active. Logic inconsistency. Refreshing.`);
            updateStatusMessage(`Niespójność logiczna w cyklu AUTO. Odświeżam stronę...`, 'error');
            setTimeout(() => {
                if (getAutoScavengeActiveFlag()) { // ZMIANA na nową funkcję
                    location.reload();
                }
            }, AUTO_SCAVENGE_REFRESH_DELAY);
        }
    }
}

function calculateUnits() {
    // ... (bez zmian w komunikatach wewnętrznych, logika pozostaje ta sama)
    const villageId = game_data.village.id;
    const uiSuffix = `_v${villageId}`;
    console.log("KUKI Calc: Entered calculateUnits.");
    let unitsEnabled = Array.from(document.querySelectorAll(`#calcTableBody${uiSuffix} .calc-unit-enabled`)).map(e => e.checked);
    let allUnitsElements = Array.from(document.querySelectorAll(".units-entry-all"));
    let missionsToSendFound = false;

    if (allUnitsElements.length === 0) {
        console.warn("KUKI Calc: No units found (.units-entry-all). Cannot calculate.");
        updateStatusMessage('Nie znaleziono jednostek na stronie do obliczeń.', 'error');
        return false;
    } else {
        console.log(`KUKI Calc: Found ${allUnitsElements.length} unit entries (.units-entry-all) for calculation.`);
    }

    let time_limit_select = document.querySelector(`#calc_time_limit${uiSuffix}`);
    let calc_method_select = document.querySelector(`#calc_method${uiSuffix}`);
    if (!time_limit_select || !calc_method_select) {
        console.error("KUKI Calc: Critical inputs (time_limit or calc_method) not found for calculation.");
        updateStatusMessage('Brak krytycznych elementów konfiguracyjnych (limit czasu / metoda).', 'error');
        return false;
    }
    let time_limit = parseInt(time_limit_select.value);
    time_limit = time_limit == 0 ? Infinity : time_limit * 60;
    let durationFactor = Math.pow(window.TribalWars.worldSpeed, -0.55);
    let calcMethod = parseInt(calc_method_select.value);

    let calculateUnitsMissions = (availableMissionsConfig) => {
        let units = []; let totalCapacity = 0; let unitIdx = 0;
        for (let allUnitElement of allUnitsElements) {
            let thisUnit = { name: allUnitElement.getAttribute("data-unit"), count: parseInt(allUnitElement.textContent.substring(1, allUnitElement.textContent.length - 1)) || 0, enabled: unitsEnabled[unitIdx] === true };
            thisUnit.unitCapacity = unitCapacities[thisUnit.name] || 0;
            if (thisUnit.enabled) { totalCapacity += thisUnit.count * thisUnit.unitCapacity; } else { thisUnit.count = 0; }
            units.push(thisUnit); unitIdx++;
        }
        units.sort((a, b) => b.unitCapacity - a.unitCapacity);
        let r = [7.5, 3, 1.5, 1];
        for (let i = 0; i < 4; i++) if (!availableMissionsConfig[i]) r[i] = 0;
        let iDiv = Math.max(r.reduce((sum, val) => sum + val, 0), 1);
        if (iDiv !== 0) r = r.map(val => val / iDiv);
        var stats = { ResPerRun: 0, ResPerHour: 0, RunTime: 0 };
        let maxMissionCapacity = { 0: Infinity, 1: Infinity, 2: Infinity, 3: Infinity };
        if (time_limit !== Infinity) {
            const baseTimeForCalc = (time_limit / durationFactor) - 1800;
            if (baseTimeForCalc > 0) {
                const factor = Math.pow(baseTimeForCalc, 1 / 0.45) / 100;
                maxMissionCapacity = {
                    0: r[0] == 0 ? 0 : Math.pow(factor / Math.pow(0.10, 2), 0.5), 1: r[1] == 0 ? 0 : Math.pow(factor / Math.pow(0.25, 2), 0.5),
                    2: r[2] == 0 ? 0 : Math.pow(factor / Math.pow(0.50, 2), 0.5), 3: r[3] == 0 ? 0 : Math.pow(factor / Math.pow(0.75, 2), 0.5)
                };
            } else { maxMissionCapacity = { 0: 0, 1: 0, 2: 0, 3: 0 }; }
        }
        let desiredMissionCapacity = {
            0: Math.round(Math.min(totalCapacity * r[0], maxMissionCapacity[0])), 1: Math.round(Math.min(totalCapacity * r[1], maxMissionCapacity[1])),
            2: Math.round(Math.min(totalCapacity * r[2], maxMissionCapacity[2])), 3: Math.round(Math.min(totalCapacity * r[3], maxMissionCapacity[3]))
        };
        if (calcMethod == 1) {
            desiredMissionCapacity = {
                0: Math.round(r[0] == 0 ? 0 : maxMissionCapacity[0]), 1: Math.round(r[1] == 0 ? 0 : maxMissionCapacity[1]),
                2: Math.round(r[2] == 0 ? 0 : maxMissionCapacity[2]), 3: Math.round(r[3] == 0 ? 0 : maxMissionCapacity[3])
            };
        }
        document.querySelectorAll(`#calcTableBody${uiSuffix} [id^="calc_output_"]`).forEach(el => el.innerText = '0');
        let currentUnits = JSON.parse(JSON.stringify(units.filter(u => u.enabled)));
        let fill = (missionIdx, unit_param) => {
            let currentUnit = currentUnits.find(u => u.name === unit_param.name);
            if (!currentUnit || currentUnit.count === 0 || currentUnit.unitCapacity === 0) return 0;
            let allocatedUnitCount = desiredMissionCapacity[missionIdx] === Infinity ? currentUnit.count : Math.min(currentUnit.count, Math.floor(desiredMissionCapacity[missionIdx] / currentUnit.unitCapacity));
            allocatedUnitCount = Math.max(0, allocatedUnitCount);
            desiredMissionCapacity[missionIdx] -= allocatedUnitCount * currentUnit.unitCapacity;
            currentUnit.count -= allocatedUnitCount;
            let outputElement = document.querySelector(`#calc_output_${currentUnit.name}_${missionIdx}${uiSuffix}`);
            if (outputElement) outputElement.innerText = allocatedUnitCount;
            if (allocatedUnitCount > 0) missionsToSendFound = true;
            return allocatedUnitCount * currentUnit.unitCapacity;
        };
        let fillMission = (missionIdx, missionCapReturn) => {
            let totalCapMission = 0;
            if (r[missionIdx] > 0) units.filter(u => u.enabled).forEach(unit => totalCapMission += fill(missionIdx, unit));
            let resources = Math.round(totalCapMission * missionCapReturn);
            let runTime = (totalCapMission > 0) ? (Math.pow(Math.pow(totalCapMission, 2) * 100 * Math.pow(missionCapReturn, 2), 0.45) + 1800) * durationFactor : 0;
            stats.ResPerRun += resources; stats.ResPerHour += (runTime > 0 ? resources / runTime * 3600 : 0); stats.RunTime = Math.max(stats.RunTime, runTime);
        };
        if (availableMissionsConfig[3]) fillMission(3, 0.75);
        if (availableMissionsConfig[2]) fillMission(2, 0.50);
        if (availableMissionsConfig[1]) fillMission(1, 0.25);
        if (availableMissionsConfig[0]) fillMission(0, 0.10);

        let fnPadTime = (num) => ("0" + Math.floor(num)).slice(-2);
        let resHE = document.querySelector(`#content_value_userscript${uiSuffix} .calc-output-res-hour`);
        let resRE = document.querySelector(`#content_value_userscript${uiSuffix} .calc-output-res-run`);
        let runTE = document.querySelector(`#content_value_userscript${uiSuffix} .calc-output-run-time`);
        if (resHE) resHE.innerText = `${stats.ResPerHour.toFixed(0)} (${(stats.ResPerHour / 3).toFixed(0)})`;
        if (resRE) resRE.innerText = `${stats.ResPerRun.toFixed(0)} (${(stats.ResPerRun / 3).toFixed(0)})`;
        if (runTE) runTE.innerText = stats.RunTime > 0 ? `${fnPadTime(stats.RunTime/3600)}:${fnPadTime(stats.RunTime%3600/60)}:${fnPadTime(stats.RunTime%60)}` : "00:00:00";
        return stats.ResPerHour;
    };

    let actualPageAvailableMissions = [false, false, false, false];
    const scavengeOptionNodes = document.querySelectorAll('.scavenge-option');
    if(scavengeOptionNodes.length === 0 && !document.querySelector('#scavenge_mass_screen')) {
        console.warn("KUKI Calc: No .scavenge-option elements found when determining available missions in calculateUnits. Calculation will assume no slots are free.");
        updateStatusMessage('Brak opcji zbieractwa przy określaniu dostępnych misji.', 'warning');
    } else {
        scavengeOptionNodes.forEach((option, index) => {
            if (index < 4) {
                const isCancelable = option.querySelector('a.btn.btn-cancel[href*="cancel_squad"]');
                const isReturning = option.querySelector('.return-countdown');
                const isActiveDetails = option.querySelector('.squad_scavenging_details') && !option.querySelector('.free_send_button');
                if (!isCancelable && !isReturning && !isActiveDetails &&
                    (option.querySelector('.status-specific .inactive-view') || option.querySelector('.free_send_button'))) {
                    actualPageAvailableMissions[index] = true;
                }
            }
        });
    }
    console.log("KUKI Calc: Actual page available missions for calculation:", actualPageAvailableMissions);

    let missionsEnabledByUser = Array.from(document.querySelectorAll(`#calcTableBody${uiSuffix} .calc-mission-enabled`)).map(e => e.checked);
    let bestPerm = 0, bestPermRate = -1;
    missionsToSendFound = false;

    for (let perm = 0; perm < 16; perm++) {
        let currentMissionConfig = [(perm&1)==1, (perm&2)==2, (perm&4)==4, (perm&8)==8];
        let isValid = currentMissionConfig.every((sel, i) => !sel || (missionsEnabledByUser[i] && actualPageAvailableMissions[i]));
        if (!isValid) continue;
        let resourceRate = calculateUnitsMissions(currentMissionConfig);
        if (resourceRate > bestPermRate) {
            bestPermRate = resourceRate;
            bestPerm = perm;
        }
    }

    if (bestPermRate <= 0 && missionsEnabledByUser.some(m => m) && actualPageAvailableMissions.some(a => a)) {
        console.warn("KUKI Calc: Best permutation rate is <= 0, but user enabled some missions and page has available slots. This might mean no units for them, or config issue.");
        updateStatusMessage('Nie można obliczyć optymalnego wysłania dla zaznaczonych misji (brak jednostek lub problem z konfiguracją).', 'warning');
    } else if (bestPermRate <= 0 && !actualPageAvailableMissions.some(a => a)) {
        console.log("KUKI Calc: Best permutation rate is <= 0 because no slots are available on the page.");
        updateStatusMessage('Brak dostępnych slotów na misje.', 'info');
    }

    let finalMissionConfig = [(bestPerm&1)==1, (bestPerm&2)==2, (bestPerm&4)==4, (bestPerm&8)==8];
    console.log("KUKI Calc: Final mission config to be sent:", finalMissionConfig);
    missionsToSendFound = false;
    calculateUnitsMissions(finalMissionConfig);

    if (!missionsToSendFound && finalMissionConfig.some(m => m)) {
        console.log("KUKI Calc: Final calculation resulted in no units being sent, despite a valid mission config. Likely no units available for the chosen missions.");
        updateStatusMessage('Brak jednostek dla wybranych misji lub za mało, by cokolwiek wysłać.', 'info');
    } else if (missionsToSendFound) {
        console.log("KUKI Calc: Calculation determined units to be sent.");
        updateStatusMessage('Obliczenia zakończone. Jednostki gotowe do wysłania.', 'info');
    } else {
        console.log("KUKI Calc: Calculation determined NO units to be sent.");
        updateStatusMessage('Obliczenia nie wykazały jednostek do wysłania (brak zaznaczonych misji/slotów lub brak jednostek).', 'info');
    }
    return missionsToSendFound;
}

function sendScavRequests(isAutoMode = false) {
    const villageIdForAPI = game_data.village.id;
    const uiSuffix = `_v${villageIdForAPI}`;
    if (typeof TribalWars === 'undefined' || !TribalWars.getGameData) {
        console.error("KUKI Calc: TribalWars.getGameData() is not available.");
        updateStatusMessage('Krytyczny: Brak TribalWars.getGameData().', 'error');
        return;
    }
    const gameData = TribalWars.getGameData();
    const csrfToken = gameData.csrf;
    const worldName = game_data.world;

    if (!csrfToken || !villageIdForAPI || !worldName) {
        console.error("KUKI Calc: Critical game data missing for API.", {villageIdForAPI, csrfToken, worldName});
        updateStatusMessage('Brak danych gry (CSRF, ID wioski, świat) do wysłania API.', 'error');
        return;
    }

    const resultsElement = document.querySelector(`#calc_request_results${uiSuffix}`);
    const resultNames = ["LL", "HH", "CC", "GG"];
    let resultStrings = resultNames.map(() => "Nie wysłano (oczekuje)");
    let requestsSentCount = 0;
    let requestsCompletedCount = 0;
    let missionsAttemptedToSend = 0;

    if (resultsElement) {
        let currentHTML = resultsElement.innerHTML;
        const apiBlockMarker = "<b>Wyniki wysyłania API:</b>";
        const apiBlockIndex = currentHTML.indexOf(apiBlockMarker);
        if (apiBlockIndex !== -1) {
            resultsElement.innerHTML = currentHTML.substring(0, apiBlockIndex).trim();
        }
         // Jeśli nie ma bloku API, a są inne wiadomości, nie czyścimy, tylko dodamy
        if (resultsElement.innerHTML.trim() !== "") {
            resultsElement.innerHTML += "<br>";
        }
    }
    updateStatusMessage('Rozpoczynam wysyłanie żądań do serwera...', 'system', resultsElement ? resultsElement.innerHTML.trim() === "" : true);


    let updateApiResultsDisplay = () => {
        if (!resultsElement) return;
        let apiResultsText = "<b>Wyniki wysyłania API:</b><br>" + resultStrings.map((str, idx) => {
             let color = 'grey';
             if (str.startsWith("Successful")) color = 'green';
             else if (str.startsWith("Failed") || str.startsWith("Possibly Failed")) color = 'red';
             else if (str.startsWith("Sending")) color = 'blue';
             return `${resultNames[idx]}: <span style="color:${color};">${str}</span>`;
        }).join("<br>");

        let currentContent = resultsElement.innerHTML;
        const apiMarkerStart = "<b>Wyniki wysyłania API:</b><br>";
        let startIndex = currentContent.lastIndexOf(apiMarkerStart); // Znajdź ostatni, jeśli było więcej

        if(startIndex !== -1) {
            // Znajdź koniec bloku API. Założenie: blok API to ostatnia rzecz lub przed nim jest <br>
            let tempContentAfterMarker = currentContent.substring(startIndex + apiMarkerStart.length);
            let nextBrIndex = tempContentAfterMarker.indexOf("<br>");
            if(nextBrIndex === -1) { // Blok API jest na końcu
                 currentContent = currentContent.substring(0, startIndex);
            } else { // Za blokiem API jest coś jeszcze, usuwamy tylko blok
                 // Ta logika może być zbyt skomplikowana i ryzykowna, uprośćmy.
                 // Po prostu dodajemy nowy blok, stary zostanie "nadpisany" przez logikę maxLines w updateStatusMessage
            }
        }
         // Zamiast skomplikowanego usuwania, po prostu dodaj, a updateStatusMessage ograniczy linie
        resultsElement.innerHTML = currentContent + (currentContent.endsWith("<br>") || currentContent === "" ? "" : "<br>") + apiResultsText;


        if (requestsCompletedCount === requestsSentCount) {
            if (missionsAttemptedToSend > 0) {
                updateStatusMessage('Wszystkie żądania API przetworzone.', 'success');
            } else {
                updateStatusMessage('Nie było misji do wysłania (wg obliczeń).', 'info');
            }

            if (isAutoMode && getAutoScavengeActiveFlag()) { // ZMIANA na nową funkcję
                setSessionStorageFlag(AUTO_SCAVENGE_SESSION_RUNNING_BASE_KEY, true);
                updateStatusMessage(`Tryb AUTO: ${(missionsAttemptedToSend > 0 ? 'Wojska wysłane.' : 'Nic nie wysłano.')} Odświeżanie za ${AUTO_SCAVENGE_REFRESH_DELAY / 1000}s...`, 'system');
                setTimeout(() => {
                    if (getAutoScavengeActiveFlag()) { // ZMIANA na nową funkcję
                        location.reload();
                    }
                }, AUTO_SCAVENGE_REFRESH_DELAY);
            } else if (!isAutoMode) {
                 updateStatusMessage('Tryb ręczny/DEBUG: Zakończono wysyłanie. Strona nie odświeży się automatycznie.', 'system');
            }
        }
        resultsElement.scrollTop = resultsElement.scrollHeight;
    };

    function handleResponse(missionIdx, responseText) {
        requestsCompletedCount++;
        const currentVillageId = game_data.village.id;
        const optionIdApi = missionIdx + 1;
        const resultName = resultNames[missionIdx];

        if (!responseText || responseText.trim() === "") {
            resultStrings[missionIdx] = "Failed, Empty Server Response (200 OK)";
            console.warn(`KUKI Calc: Empty response for mission ${resultName} (API opt: ${optionIdApi}) for village ${currentVillageId}. Slot might be busy or invalid units.`);
        } else {
            try {
                const fullResponse = JSON.parse(responseText);
                if (fullResponse.squad_responses && fullResponse.squad_responses[0]) {
                    const squadResponse = fullResponse.squad_responses[0];
                    if (squadResponse.success) { resultStrings[missionIdx] = "Successful (via squad_responses)"; }
                    else if (squadResponse.error) { resultStrings[missionIdx] = `Failed, Error: ${squadResponse.error}`; }
                    else { resultStrings[missionIdx] = "Partial Response (squad_responses found, no clear success/error)"; }
                } else if (fullResponse.response && fullResponse.response.error) { resultStrings[missionIdx] = `Failed, API Error: ${fullResponse.response.error}`; }
                else if (fullResponse.error) { resultStrings[missionIdx] = `Failed, Top-Level API Error: ${fullResponse.error}`; }
                else if (fullResponse.response && fullResponse.response.villages && fullResponse.response.villages[currentVillageId] &&
                           fullResponse.response.villages[currentVillageId].options && fullResponse.response.villages[currentVillageId].options[optionIdApi] &&
                           fullResponse.response.villages[currentVillageId].options[optionIdApi].scavenging_squad !== null) {
                    resultStrings[missionIdx] = "Successful (inferred from village data update)";
                } else if (fullResponse.response && fullResponse.response.villages && fullResponse.response.villages[currentVillageId] &&
                         fullResponse.response.villages[currentVillageId].options && fullResponse.response.villages[currentVillageId].options[optionIdApi]) {
                    const optionData = fullResponse.response.villages[currentVillageId].options[optionIdApi];
                    if (optionData.is_locked || (optionData.scavenging_squad !== null && !resultStrings[missionIdx].startsWith("Successful"))) {
                        resultStrings[missionIdx] = "Possibly Failed (slot occupied/locked)";
                        console.warn(`KUKI Calc: Mission ${resultName} (API opt: ${optionIdApi}) for ${currentVillageId} - slot seems occupied/locked. Data:`, optionData);
                    } else { resultStrings[missionIdx] = "Unknown response structure (A)"; console.log(`KUKI Calc: Unknown response (A) for ${resultName} (API opt: ${optionIdApi}) for ${currentVillageId}: `, fullResponse); }
                } else { resultStrings[missionIdx] = "Unknown response structure (B)"; console.log(`KUKI Calc: Unknown response (B) for ${resultName} (API opt: ${optionIdApi}) for ${currentVillageId}: `, fullResponse); }
            } catch (e) {
                resultStrings[missionIdx] = "Failed, Error parsing JSON response";
                console.error(`KUKI Calc: JSON Parse Error for ${resultName} (API opt: ${optionIdApi}) for ${currentVillageId}:`, e, "\nResponse Text (first 300):", responseText.substring(0,300));
            }
        }
        updateApiResultsDisplay();
    }

    for (let missionIdx = 0; missionIdx < 4; missionIdx++) {
        let unitCountsForMission = [], totalCapacityForMission = 0;
        document.querySelectorAll(`#calcTableBody${uiSuffix} .calc-output-mission-${missionIdx}`).forEach(el => {
            let unitName = el.getAttribute("unitname"), unitCount = parseInt(el.innerText);
            if (unitCount > 0 && unitCapacities[unitName]) {
                totalCapacityForMission += unitCount * unitCapacities[unitName];
                unitCountsForMission.push({ name: unitName, count: unitCount });
            }
        });

        if (totalCapacityForMission > 0 && unitCountsForMission.length > 0) {
            missionsAttemptedToSend++;
            resultStrings[missionIdx] = "Sending...";
            requestsSentCount++;
            let data = `squad_requests%5B0%5D%5Bvillage_id%5D=${villageIdForAPI}&` +
                       unitCountsForMission.map(u => `squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bunit_counts%5D%5B${u.name}%5D=${u.count}`).join("&") +
                       `&squad_requests%5B0%5D%5Bcandidate_squad%5D%5Bcarry_max%5D=${totalCapacityForMission}&squad_requests%5B0%5D%5Boption_id%5D=${missionIdx + 1}&squad_requests%5B0%5D%5Buse_premium%5D=false&h=${csrfToken}`;
            var xhttp = new XMLHttpRequest();
            xhttp.open("POST", `https://${worldName}.plemiona.pl/game.php?village=${villageIdForAPI}&screen=scavenge_api&ajaxaction=send_squads&`);
            xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhttp.setRequestHeader("tribalwars-ajax", "1");
            xhttp.onreadystatechange = function() {
                if (this.readyState === XMLHttpRequest.DONE) {
                    if (this.status === 200) {
                        handleResponse(missionIdx, xhttp.responseText);
                    } else {
                        requestsCompletedCount++;
                        resultStrings[missionIdx] = `Failed, HTTP: ${this.status}`;
                        console.error(`KUKI Calc: HTTP Error for ${resultNames[missionIdx]} (idx ${missionIdx}, option ${missionIdx + 1}): ${this.status} ${this.statusText}. Village: ${villageIdForAPI}. Resp:`, this.responseText.substring(0,300));
                        updateApiResultsDisplay();
                    }
                }
            };
            xhttp.send(data);
        } else {
            resultStrings[missionIdx] = "Nie wysłano (0 jedn.)";
        }
    }
    updateApiResultsDisplay();
    if (missionsAttemptedToSend === 0) {
        updateApiResultsDisplay();
    }
}

function makePersistentInput(eInput) {
    if (!eInput.id) { console.warn("KUKI Calc: makePersistentInput on element without id.", eInput); return; }
    let storageKey = `persistent_input_${eInput.id}`;
    let sStoredState = getLocalStorageItem(storageKey); // Użycie funkcji dla localStorage
    let defaultAttrib = eInput.getAttribute("input-default");
    if (sStoredState === null && defaultAttrib !== null) sStoredState = defaultAttrib; // localStorage zwraca null, nie undefined
    eInput.setValue = (sInput) => { setLocalStorageItem(storageKey, sInput); }; // Użycie funkcji dla localStorage
    switch (eInput.type) {
        case "checkbox": eInput.doRestore = () => { eInput.checked = sStoredState === "true"; }; eInput.getValue = () => eInput.checked; break;
        case "select-one": eInput.doRestore = () => { if (sStoredState !== undefined && sStoredState !== null) eInput.value = sStoredState; }; eInput.getValue = () => eInput.value; break;
        default: eInput.doRestore = () => { if (sStoredState !== undefined && sStoredState !== null) eInput.value = sStoredState; }; eInput.getValue = () => eInput.value; break;
    }
    eInput.addEventListener("change",(e) => eInput.setValue(e.target.getValue()));
    eInput.doRestore();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}