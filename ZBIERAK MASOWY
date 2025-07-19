// ==UserScript==
// @name         ZBIERAK MASOWY
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Burst zbieractwa w Tribal Wars: wykrywa .option-inactive, pamięta stan Start/Stop per serwer (świat), klika Launch Group sekwencyjnie, wpisuje jednostki, reloaduje co 30 min. Idealne do multi-tab farmienia! 💥🔥⛏️📦
// @author       TwojeImię
// @match        https://*.plemiona.pl/game.php*screen=place&mode=scavenge_mass*
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/ZBIERAK MASOWY.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/ZBIERAK MASOWY.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
'use strict';

const massScavengeUrl = 'https://shinko-to-kuma.com/scripts/massScavenge.js';
const storageKeyThreshold = 'twmasowe_trigger_slot_threshold';
const AUTO_BASE_KEY = 'twmasowe_script_state';

// === ⛏️ GLOBALNY KLUCZ SESSION PER SERWER ===
function getServerKey(base) {
    const server = window.location.hostname.split('.')[0]; // np. pl160
    return `${base}_${server}`;
}

if (sessionStorage.getItem(getServerKey(AUTO_BASE_KEY)) === null) {
    sessionStorage.setItem(getServerKey(AUTO_BASE_KEY), 'false');
}
let isRunning = sessionStorage.getItem(getServerKey(AUTO_BASE_KEY)) === 'true';
let minInactiveSlotsTrigger = parseInt(localStorage.getItem(storageKeyThreshold)) || 5;

function logStatus(msg) {
    $('#twscavStatus').text(msg);
    console.log('[MasoweZbieractwo]', msg);
}

// === 🧩 GUI ===
function createSettingsUI() {
    if ($('#scavengeSettingsPanel').length) return;
    const panel = $(`
        <div id="scavengeSettingsPanel" style="position: fixed; top: 100px; right: 10px;
            background: rgba(0,0,0,0.93); color: #fff; padding: 14px 18px; border-radius: 12px;
            font-family: Arial, sans-serif; z-index: 99999; width: 420px; box-shadow: 0 2px 16px #222;">
            <label for="slotThreshold" style="display: block; margin-bottom: 10px; font-size: 16px;">
                Minimalna liczba <code>.option-inactive</code> do burstu:
            </label>
            <input type="number" id="slotThreshold"
                min="1" max="300" value="${minInactiveSlotsTrigger}"
                style="width: 100%; padding: 7px; font-size: 16px; margin-bottom: 10px; border-radius: 6px;">
            <button id="toggleScript" style="width: 100%; font-size: 16px;
                padding: 10px; border-radius: 6px; background: #444; color: #fff; margin-bottom: 10px;">
                ${isRunning ? '⏸️ Zatrzymaj automat' : '▶️ Wznów automat'}
            </button>
            <div style="font-size: 15px;">
                Slotów gotowych (<code>.option-inactive</code>): <b id="currentReadySlots">?</b>
            </div>
            <div style="font-size: 13px; color: #ccc; margin-top: 10px;">
                Status automatu: <span id="twscavStatus" style="color:#6ca8ff;">?</span>
            </div>
        </div>
    `);
    $('body').append(panel);

    $('#slotThreshold').on('change', function () {
        minInactiveSlotsTrigger = parseInt(this.value);
        localStorage.setItem(storageKeyThreshold, minInactiveSlotsTrigger);
        logStatus(`🎯 Nowy próg slotów: ${minInactiveSlotsTrigger}`);
    });

    $('#toggleScript').on('click', function () {
        isRunning = !isRunning;
        sessionStorage.setItem(getServerKey(AUTO_BASE_KEY), isRunning.toString());
        $(this).text(isRunning ? '⏸️ Zatrzymaj automat' : '▶️ Wznów automat');
        logStatus(isRunning ? '✅ Automat WZNOWIONY' : '⏸️ Automat ZATRZYMANY');
    });
}

// === ✅ Detekcja slotów: tylko .option-inactive
function countSlotStatuses() {
    const inactive = $("td.option-inactive, td.scavenge-option.option-inactive").length;
    return { inactive };
}

// === 🧠 Uzupełnianie jednostek
function fillUnitsInFreeSlots() {
    const units = {};
    $("div.units-entry-all input:not([type='checkbox'])").each(function () {
        const name = $(this).attr('name');
        const val = parseInt($(this).attr('data-all'), 10);
        if (name && !isNaN(val)) units[name] = val;
    });

    $("td.option-inactive, td.scavenge-option.option-inactive").each(function () {
        $(this).find("input[type='number']").each(function () {
            const $input = $(this);
            const unitName = $input.attr("name");
            if (unitName && units[unitName] && !$input.prop("disabled")) {
                $input.val(units[unitName]).trigger('input').trigger('change');
            }
        });
    });
}

// === 🚀 Klikanie Launch Group po kolei
function clickLaunchGroupsSequentially(delay = 1200, cb) {
    const next = () => {
        const $btn = $("button, input[type=button]").filter(function () {
            const txt = ($(this).text() || $(this).val() || '').toLowerCase();
            return /^launch group|uruchom grupę/.test(txt) &&
                   !$(this).prop('disabled') && $(this).is(':visible');
        }).first();

        if ($btn.length) {
            $btn[0].click();
            logStatus("🚀 Klikam: " + ($btn.text() || $btn.val()));
            setTimeout(next, delay);
        } else if (cb) {
            cb();
        }
    };
    next();
}

// === 🔁 Automatyczny Burst
function burstMassScavenge(retry = 0) {
    if (!isRunning) return;

    if (typeof window.readyToSend !== "function") {
        if (retry < 5) return setTimeout(() => burstMassScavenge(retry + 1), 2000);
        return logStatus('❌ readyToSend niedostępne');
    }

    fillUnitsInFreeSlots();
    logStatus("🧩 Jednostki wpisane – uruchamiam readyToSend...");

    try {
        window.readyToSend();
    } catch (e) {
        logStatus("❌ Błąd readyToSend: " + e);
        if (retry < 5) return setTimeout(() => burstMassScavenge(retry + 1), 3000);
    }

    setTimeout(() => {
        clickLaunchGroupsSequentially(1300, () => {
            logStatus("✅ Wysłano wszystkie grupy. Reload za 3 sekundy...");
            setTimeout(() => location.reload(), 3000);
        });
    }, 1200);
}

// === ⏱️ Pętla monitorująca automat
function monitorLoop() {
    const { inactive } = countSlotStatuses();
    $("#currentReadySlots").text(inactive);

    if (!isRunning) {
        logStatus("🟡 Automat zatrzymany — nic nie robię");
        setTimeout(monitorLoop, 10000);
        return;
    }

    logStatus(`Aktualnie gotowe sloty: ${inactive} / próg: ${minInactiveSlotsTrigger}`);

    if (inactive >= minInactiveSlotsTrigger) {
        logStatus("🔥 Spełniono próg burstu – wysyłam!");
        burstMassScavenge();
        setTimeout(monitorLoop, 35000);
    } else {
        setTimeout(monitorLoop, 15000);
    }
}

// === 🔁 Reload co 30 minut (fail-safe)
function setupFailsafeReload() {
    setTimeout(() => {
        logStatus("🔄 30 minut minęło – wykonuję pełny reload");
        location.reload();
    }, 1800 * 1000);
}

// === START ===
console.log("🚀 Masowe Zbieractwo v8.4.1 (GLOBAL PER SERWER mode)");
$.getScript(massScavengeUrl)
    .done(() => {
        logStatus("✅ massScavenge.js poprawnie załadowany");
        createSettingsUI();
        setTimeout(monitorLoop, 2000);
        setupFailsafeReload();
    })
    .fail(() => logStatus("❌ Nie udało się załadować massScavenge.js."));
})();
