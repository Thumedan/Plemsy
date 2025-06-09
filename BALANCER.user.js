// ==UserScript==
// @name         BALANCER
// @namespace    plemsy
// @version      1.2.1
// @description  Korekta graficzna
// @author       Sophie "Shinko to Kuma" (oryginał), Modyfikacja: KUKI I GOOGLE
// @match        *://*/game.php?*&screen=market&mode=send*
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/BALANCER.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/BALANCER.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    /*jshint esversion: 6 */

    // ======================================================================
    // POCZĄTEK: Logika aktywnej sesji (wzorowana na skrypcie Zbierak)
    // ======================================================================
    const BALANCER_SESSION_KEY = 'balancerSessionActive';

    function isBalancerSessionActive() {
        return sessionStorage.getItem(BALANCER_SESSION_KEY) === 'true';
    }

    function setBalancerSessionActive(isActive) {
        sessionStorage.setItem(BALANCER_SESSION_KEY, isActive);
    }

    function startBalancerSession() {
        if (!settings.autoSendEnabled) {
            UI.ErrorMessage("Najpierw włącz 'Automatyczne wysyłanie' w menu ustawień, a następnie zapisz.");
            return;
        }
        setBalancerSessionActive(true);
        UI.InfoMessage("Sesja automatycznego balansowania rozpoczęta. Strona zostanie odświeżona, aby rozpocząć pętlę.");
        setTimeout(() => location.reload(), 1500);
    }

    function stopBalancerSession() {
        setBalancerSessionActive(false);
        UI.InfoMessage("Sesja automatycznego balansowania zatrzymana. Strona zostanie odświeżona.");
        setTimeout(() => location.reload(), 1500);
    }
    // ======================================================================
    // KONIEC: Logika aktywnej sesji
    // ======================================================================

    //script by Sophie "Shinko to Kuma". Skype: live:sophiekitsune discord: Sophie#2418 website: https://shinko-to-kuma.my-free.website/
    var testPage;
    var is_mobile = !!navigator.userAgent.match(/iphone|android|blackberry/ig) || false;
    var warehouseCapacity = [];
    var allWoodTotals = [];
    var allClayTotals = [];
    var allIronTotals = [];
    var availableMerchants = [];
    var totalMerchants = [];
    var farmSpaceUsed = [];
    var farmSpaceTotal = [];
    var villagePoints = [];
    var villagesData = [];
    var villageID = [];
    var allWoodObjects, allClayObjects, allIronObjects, allVillages, allWarehouses, allFarms, allMerchants;
    var totalsAndAverages = "";
    var incomingRes = {};
    var totalWood, totalStone, totalIron;
    var merchantOrders = [];
    var excessResources = [];
    var shortageResources = [];
    var links = [];
    var cleanLinks = [];
    var stillShortage = [];
    var stillExcess = [];

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function init() {
        warehouseCapacity = []; allWoodTotals = []; allClayTotals = []; allIronTotals = []; availableMerchants = []; totalMerchants = [];
        farmSpaceUsed = []; farmSpaceTotal = []; villagePoints = []; villagesData = []; villageID = [];
        allWoodObjects = undefined; allClayObjects = undefined; allIronObjects = undefined; allVillages = undefined; allWarehouses = undefined; allFarms = undefined; allMerchants = undefined;
        totalsAndAverages = ""; incomingRes = {}; totalWood = undefined; totalStone = undefined; totalIron = undefined;
        merchantOrders = []; excessResources = []; shortageResources = []; links = []; cleanLinks = []; stillShortage = []; stillExcess = [];
    }

    var langShinko = [ "Warehouse balancer", "Source village", "Target village", "Distance", "Wood", "Clay", "Iron", "Send resources", "Created by Sophie 'Shinko to Kuma'", "Total wood", "Total clay", "Total iron", "Wood per village", "Clay per village", "Iron per village", "Premium exchange", "System" ];
    if (game_data.locale == "pl_PL") { langShinko = [ "Balanser surowców", "Wioska źródłowa", "Wioska docelowa", "Dystans", "Drewno", "Glina", "Żelazo", "Wyślij surowce", "Stworzone przez Sophie 'Shinko to Kuma'", "Suma drewna", "Suma gliny", "Suma żelaza", "Drewno na wioskę", "Glina na wioskę", "Żelazo na wioskę", "Giełda Premium", "System" ]; }

    var cssClassesSophie = `
    <style>
    .sophRowA { background-color: #32353b; color: white; } .sophRowB { background-color: #36393f; color: white; }
    .sophHeader { background-color: #202225; font-weight: bold; color: white; } .sophLink { color:#40D0E0; }
    .btnSophie { background-image: linear-gradient(#6e7178 0%, #36393f 30%, #202225 80%, black 100%); color: white !important; }
    .btnSophie:hover { background-image: linear-gradient(#7b7e85 0%, #40444a 30%, #393c40 80%, #171717 100%); }
    .btn-auto-start { background-color: #4CAF50 !important; } .btn-auto-stop { background-color: #f44336 !important; }
    .collapsible { background-color: #32353b; color: white; cursor: pointer; padding: 10px; width: 100%; border: none; text-align: left; outline: none; font-size: 15px; }
    .active, .collapsible:hover { background-color:  #36393f; }
    .collapsible:after { content: '+'; color: white; font-weight: bold; float: right; margin-left: 5px; } .active:after { content: "-"; }
    .content { padding: 0 5px; max-height: 0; overflow: hidden; transition: max-height 0.2s ease-out; background-color:  #5b5f66; color: white; }
    .flex-container { display: flex; justify-content: space-between; align-items:center; flex-wrap: wrap; }
    .submenu{ display:flex; flex-direction:column; position: absolute; left:0px; top:37px; min-width:240px; }
    </style>`;

    $("#contentContainer").eq(0).prepend(cssClassesSophie);
    $("#mobileHeader").eq(0).prepend(cssClassesSophie);

    var settings;
    if (localStorage.getItem("settingsWHBalancerSophie") != null) {
        settings = JSON.parse(localStorage.getItem("settingsWHBalancerSophie"));
    } else {
        settings = { "isMinting": false, "highPoints": 8000, "highFarm": 23000, "lowPoints": 3000, "builtOutPercentage": 0.25, "needsMorePercentage": 0.85, "autoSendEnabled": false, "minRefresh": 30, "maxRefresh": 60, "idleTitlePrefix": "(SUROWCE)" };
        localStorage.setItem("settingsWHBalancerSophie", JSON.stringify(settings));
    }

    if (settings.isMinting === undefined) settings.isMinting = false;
    if (settings.highFarm === undefined) settings.highFarm = 99999;
    if (settings.highPoints === undefined) settings.highPoints = 12000;
    if (settings.lowPoints === undefined) settings.lowPoints = 1;
    if (settings.builtOutPercentage === undefined || settings.builtOutPercentage > 1 || settings.builtOutPercentage < 0) settings.builtOutPercentage = 0.20;
    if (settings.needsMorePercentage === undefined || settings.needsMorePercentage > 1 || settings.needsMorePercentage < 0) settings.needsMorePercentage = 0.85;
    if (settings.autoSendEnabled === undefined) settings.autoSendEnabled = false;
    if (settings.minRefresh === undefined) settings.minRefresh = 30;
    if (settings.maxRefresh === undefined) settings.maxRefresh = 60;
    if (settings.idleTitlePrefix === undefined) settings.idleTitlePrefix = "(SUROWCE)"; // NOWA OPCJA

    if ($("#sendResources")[0]) { $("#sendResources")[0].remove(); $("#totals")[0].remove(); }

    var URLIncRes, URLProd;
    if (game_data.player.sitter > 0) {
        URLIncRes = `game.php?t=${game_data.player.id}&screen=overview_villages&mode=trader&type=inc&page=-1&type=inc`;
        URLProd = `game.php?t=${game_data.player.id}&screen=overview_villages&mode=prod&page=-1&`;
    } else {
        URLIncRes = "game.php?&screen=overview_villages&mode=trader&type=inc&page=-1&type=inc";
        URLProd = `game.php?&screen=overview_villages&mode=prod&page=-1&`;
    }

    // ======================================================================
    // DEKLARACJA FUNKCJI, KTÓRE BĘDĄ WYSTAWIONE GLOBALNIE
    // ======================================================================
    function saveSettings() {
        settings.isMinting = $("input[name='isMinting']").is(':checked');
        settings.autoSendEnabled = $("input[name='autoSendEnabled']").is(':checked');
        settings.lowPoints = parseInt($("input[name='lowPoints']").val());
        settings.highPoints = parseInt($("input[name='highPoints']").val());
        settings.highFarm = parseInt($("input[name='highFarm']").val());
        settings.builtOutPercentage = parseFloat($("input[name='builtOutPercentage']").val());
        settings.needsMorePercentage = parseFloat($("input[name='needsMorePercentage']").val());
        settings.minRefresh = parseInt($("input[name='minRefresh']").val());
        settings.maxRefresh = parseInt($("input[name='maxRefresh']").val());
        settings.idleTitlePrefix = $("input[name='idleTitlePrefix']").val(); // ZAPIS NOWEJ OPCJI

        localStorage.setItem("settingsWHBalancerSophie", JSON.stringify(settings));
        UI.SuccessMessage("Ustawienia zapisane! Odświeżanie interfejsu...");

        $("#restart, #sendResources, #tableSend").remove();
        init();
        displayEverything();
    }

    function sendResource(sourceID, targetID, woodAmount, stoneAmount, ironAmount, rowNr) {
        $("#" + rowNr)[0].remove();
        var e = { "target_id": targetID, "wood": woodAmount, "stone": stoneAmount, "iron": ironAmount };
        TribalWars.post("market", { ajaxaction: "map_send", village: sourceID }, e, function (e) {
            UI.SuccessMessage(e.message);
            if ($(':button[id="building"]').length > 0) {
                $(':button[id="building"]')[0].focus();
            }
        }, !1);

        $(':button[id="building"]').prop('disabled', true);
        setTimeout(function () {
            $(':button[id="building"]').prop('disabled', false);
            if ($("#tableSend tr").length <= 2) { UI.InfoMessage("Wysłano wszystko!"); }
            if ($(':button[id="building"]').length > 0) { $(':button[id="building"]')[0].focus(); }
        }, 250);
    }

    function showStats() {
        var htmlStats = "<div class='sophRowA' style='width:800px; max-height: 80vh; overflow-y: auto;'><center><h1>Braki:</h1><table class='sophHeader' width='95%'><tr class='sophHeader'><td>Nazwa wioski</td><td>Surowce</td></tr>";
        stillShortage.forEach((item, i) => {
            let tempRow = (i % 2 == 0) ? `class='sophRowB'` : `class='sophRowA'`;
            htmlStats += `<tr ${tempRow} height="40"><td>${item[0]}</td><td>Drewno: ${numberWithCommas(item[1][0].wood)}, Glina: ${numberWithCommas(item[1][1].stone)}, Żelazo: ${numberWithCommas(item[1][2].iron)}</td></tr>`;
        });
        htmlStats += "</table><h1>Nadwyżki:</h1><table class='sophHeader' width='95%'><tr class='sophHeader'><td>Nazwa wioski</td><td>Surowce</td></tr>";
        stillExcess.forEach((item, i) => {
            let tempRow = (i % 2 == 0) ? `class='sophRowB'` : `class='sophRowA'`;
            htmlStats += `<tr ${tempRow} height="40"><td>${item[0]}</td><td>Drewno: ${numberWithCommas(item[1][0].wood)}, Glina: ${numberWithCommas(item[1][1].stone)}, Żelazo: ${numberWithCommas(item[1][2].iron)}</td></tr>`;
        });
        htmlStats += "</table></center></div>";
        Dialog.show("stats_dialog", htmlStats);
    }

    function resAfterBalance() {
        var resBalancedHTML = `<div class='sophRowA' style='width:800px; max-height: 80vh; overflow-y: auto;'><table style='width:100%'><tr class="sophHeader"><td>Wioska</td><td>Punkty</td><td>Kupcy</td><td colspan="3">Surowce</td><td>Spichlerz</td></tr>`;
        villagesData.forEach((village, i) => {
            var thisMerchantLeft = village.availableMerchants;
            var thisVillageTotalWood, thisVillageTotalStone, thisVillageTotalIron;
            if (incomingRes[village.id] != undefined) {
                thisVillageTotalWood = incomingRes[village.id].wood + parseInt(village.wood);
                thisVillageTotalStone = incomingRes[village.id].stone + parseInt(village.stone);
                thisVillageTotalIron = incomingRes[village.id].iron + parseInt(village.iron);
            } else {
                thisVillageTotalWood = parseInt(village.wood); thisVillageTotalStone = parseInt(village.stone); thisVillageTotalIron = parseInt(village.iron);
            }
            cleanLinks.forEach(link => {
                if (link.target == village.id) { thisVillageTotalWood += link.wood; thisVillageTotalStone += link.stone; thisVillageTotalIron += link.iron; }
                if (link.source == village.id) { thisVillageTotalWood -= link.wood; thisVillageTotalStone -= link.stone; thisVillageTotalIron -= link.iron; thisMerchantLeft -= (link.wood + link.stone + link.iron) / 1000; }
            });
            let tempRow = (i % 2 == 0) ? "class='sophRowB'" : "class='sophRowA'";
            resBalancedHTML += `<tr ${tempRow}><td>${village.name}</td><td>${village.points}</td><td style="text-align:right;padding-right:2em">${thisMerchantLeft}/${village.totalMerchants}</td><td><span class="res wood"></span>${numberWithCommas(thisVillageTotalWood)}</td><td><span class="res stone"></span>${numberWithCommas(thisVillageTotalStone)}</td><td><span class="res iron"></span>${numberWithCommas(thisVillageTotalIron)}</td><td style="text-align:right">${numberWithCommas(village.warehouseCapacity)}</td></tr>`;
        });
        resBalancedHTML += `</table></div>`;
        Dialog.show('balance_result', resBalancedHTML);
    }

    function makeThingsCollapsible() {
        var coll = $(".collapsible");
        coll.off('click').on('click', function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    }

    window.saveSettings = saveSettings;
    window.sendResource = sendResource;
    window.showStats = showStats;
    window.resAfterBalance = resAfterBalance;
    window.startBalancerSession = startBalancerSession;
    window.stopBalancerSession = stopBalancerSession;
    // ======================================================================

    async function automateSending() {
        if (!settings.autoSendEnabled || !isBalancerSessionActive()) {
            console.log("Automation: Anulowano. Automatyzacja wyłączona w ustawieniach lub sesja nie jest aktywna.");
            return;
        }

        const sendButtons = $('#tableSend input.btnSophie[id="building"]');
        if (sendButtons.length === 0) {
            console.log("Automation: Brak transportów do wysłania. Planowanie odświeżenia.");
            scheduleRefresh();
            return;
        }
        UI.InfoMessage(`Automatyzacja (sesja aktywna): Rozpoczynam wysyłanie ${sendButtons.length} transportów...`);
        for (const button of sendButtons) {
            $(button).click();
            await delay(250 + Math.random() * 250);
        }
        UI.SuccessMessage("Wszystkie transporty zostały wysłane automatycznie.");
        scheduleRefresh();
    }

    function scheduleRefresh() {
        if (!settings.autoSendEnabled || !isBalancerSessionActive()) {
            console.log("Automation: Anulowano odświeżanie. Automatyzacja wyłączona w ustawieniach lub sesja nie jest aktywna.");
            return;
        }
        const minMins = parseInt(settings.minRefresh, 10);
        const maxMins = parseInt(settings.maxRefresh, 10);
        if (isNaN(minMins) || isNaN(maxMins) || minMins <= 0 || maxMins < minMins) {
            UI.ErrorMessage("Nieprawidłowe ustawienia odświeżania. Anulowano."); return;
        }
        const refreshMinutes = Math.floor(Math.random() * (maxMins - minMins + 1)) + minMins;
        const refreshMilliseconds = refreshMinutes * 60 * 1000;
        UI.InfoMessage(`(Sesja aktywna) Strona zostanie automatycznie odświeżona za ${refreshMinutes} minut.`);
        setTimeout(() => {
            if (isBalancerSessionActive()) {
                location.reload();
            } else {
                UI.InfoMessage("Automatyczne odświeżanie anulowane, ponieważ sesja została zatrzymana.");
            }
        }, refreshMilliseconds);
    }

    function createList() {
        for (let i = 0; i < links.length; i++) {
            if (links[i].wood === undefined) links[i].wood = 0;
            if (links[i].stone === undefined) links[i].stone = 0;
            if (links[i].iron === undefined) links[i].iron = 0;
        }
        for (let i = 0; i < links.length; i++) {
            for (let j = i + 1; j < links.length; j++) {
                if (links[i].source == links[j].source && links[i].target == links[j].target) {
                    links[i].wood += parseInt(links[j].wood);
                    links[i].stone += parseInt(links[j].stone);
                    links[i].iron += parseInt(links[j].iron);
                    links[j].wood = 0; links[j].stone = 0; links[j].iron = 0;
                }
            }
        }
        cleanLinks = links.filter(link => link.wood + link.stone + link.iron > 0);
        cleanLinks = addDistanceToArray(cleanLinks);
        var listHTML = ``;
        cleanLinks.sort((left, right) => left.distance - right.distance);
        cleanLinks.forEach((link, i) => {
            let tempRow = (i % 2 == 0) ? ` id='${i}' class='sophRowB'` : ` id='${i}' class='sophRowA'`;
            const sourceVillage = villagesData.find(v => v.id == link.source);
            const targetVillage = villagesData.find(v => v.id == link.target);
            if (!sourceVillage || !targetVillage) return;

            listHTML += `<tr ${tempRow} height="40">
                <td><a href="${sourceVillage.url}" class="sophLink">${sourceVillage.name}</a></td>
                <td><a href="${targetVillage.url}" class="sophLink" data-toggle="tooltip" title="Drewno: ${targetVillage.wood}\nGlina: ${targetVillage.stone}\nŻelazo: ${targetVillage.iron}\nPojemność: ${targetVillage.warehouseCapacity}">${targetVillage.name}</a></td>
                <td style="text-align:center">${link.distance}</td>
                <td style="text-align:center">${numberWithCommas(link.wood)}<span class="icon header wood"></span></td>
                <td style="text-align:center">${numberWithCommas(link.stone)}<span class="icon header stone"></span></td>
                <td style="text-align:center">${numberWithCommas(link.iron)}<span class="icon header iron"></span></td>
                <td style="text-align:center"><input type="button" class="btn btnSophie" id="building" value="${langShinko[7]}" onclick="sendResource(${link.source},${link.target},${link.wood},${link.stone},${link.iron},${i})"></td>
            </tr>`;
        });
        $("#appendHere").eq(0).append(listHTML);

        stillShortage = []; stillExcess = [];
        villagesData.forEach((village, i) => {
            if(shortageResources[i] && (shortageResources[i][0].wood + shortageResources[i][1].stone + shortageResources[i][2].iron) > 0) stillShortage.push([village.name, shortageResources[i]]);
            if(excessResources[i] && (excessResources[i][0].wood + excessResources[i][1].stone + excessResources[i][2].iron) > 0) stillExcess.push([village.name, excessResources[i]]);
        });

        $("#totals").eq(0).append(`<div id='aftermath'><center>
            <button type="button" class="btn btnSophie" name="showStats" style="padding: 10px;width: 300px" onclick="showStats()">Pokaż nadwyżki/braki</button>
            <button type="button" class="btn btnSophie" name="showEndResult" style="padding: 10px;width: 300px" onclick="resAfterBalance()">Pokaż stan po balansie</button>
            </center></div>`);

        if (settings.autoSendEnabled && isBalancerSessionActive()) {
            automateSending();
        } else if ($("#building").length > 0) {
            $("#building")[0].focus();
        }
    }

    function numberWithCommas(x) { return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
    function addDistanceToArray(array) {
        array.forEach(item => {
            const source = villagesData.find(v => v.id == item.source);
            const target = villagesData.find(v => v.id == item.target);
            if(source && target){
                const [x1, y1] = source.name.match(/(\d+)\|(\d+)/).slice(1);
                const [x2, y2] = target.name.match(/(\d+)\|(\d+)/).slice(1);
                item.distance = Math.round(Math.hypot(x1 - x2, y1 - y2));
            } else {
                item.distance = 999;
            }
        });
        return array;
    }

    // ============================================================================
    //  GŁÓWNA FUNKCJA WYŚWIETLAJĄCA
    // ============================================================================
    function displayEverything() {
        $.get(URLIncRes).done(function (page) {
            var $page = $(page);
            for (var i = 1; i < $page.find("#trades_table tr").length - 1; i++) {
                var villageData = {}; var villageIDtemp;
                if ($("#mobileHeader")[0]) {
                    let $resourceGroups = $page.find("#trades_table tr")[i].children[5].children[1].children;
                    for (let j = 0; j < Object.keys($resourceGroups).length; j++) {
                        if ($page.find("#trades_table tr")[1].children[2].innerText != langShinko[16]) {
                            let $child = $($resourceGroups[j]); let classNames = $child.find('.icon.mheader').attr('class').split(' ');
                            let resourceType = classNames[classNames.length - 1]; let resourceAmount = $child.text().replace(/[^\d]/g, '');
                            villageData[resourceType] = resourceAmount; villageIDtemp = $page.find("#trades_table tr")[i].children[3].children[2].href.match(/id=(\d*)/)[1];
                        }
                    }
                } else {
                    let $resourceGroups = $page.find("#trades_table tr")[i].children[8].children;
                    for (let j = 0; j < Object.keys($resourceGroups).length; j++) {
                        let $child = $($resourceGroups[j]); var classNames;
                        if ($child[0].innerHTML.indexOf("header") > -1) { classNames = $child.find('.icon.header').attr('class').split(' '); }
                        else { classNames = $child.attr('class').split(' '); }
                        if ($page.find("#trades_table tr")[1].children[3].innerText != langShinko[15]) {
                            let resourceType = classNames[classNames.length - 1]; let resourceAmount = $child.text().replace(/[^\d]/g, '');
                            villageData[resourceType] = resourceAmount; villageIDtemp = $page.find("#trades_table tr")[i].children[4].children[0].href.match(/id=(\d*)/)[1];
                        }
                    }
                }
                if (villageIDtemp && $page.find("#trades_table tr")[1].children[3].innerText != langShinko[15] && $page.find("#trades_table tr")[1].children[2].innerText != langShinko[16]) {
                    if (incomingRes[villageIDtemp] == undefined) { incomingRes[villageIDtemp] = { "wood": 0, "stone": 0, "iron": 0 }; }
                    if (villageData.wood != undefined) { incomingRes[villageIDtemp].wood += parseInt(villageData.wood); }
                    if (villageData.stone != undefined) { incomingRes[villageIDtemp].stone += parseInt(villageData.stone); }
                    if (villageData.iron != undefined) { incomingRes[villageIDtemp].iron += parseInt(villageData.iron); }
                }
            }
            $.get(URLProd).done(function (pageProd) {
                testPage = pageProd;
                let uniVillage = $(pageProd).find("span.bonus_icon_33");
                let uniRow = (uniVillage.length > 0) ? uniVillage.closest('tr').index() - 1 : -1;
                if ($("#mobileHeader")[0]) {
                    allWoodObjects = $(pageProd).find(".res.mwood,.warn_90.mwood,.warn.mwood"); allClayObjects = $(pageProd).find(".res.mstone,.warn_90.mstone,.warn.mstone"); allIronObjects = $(pageProd).find(".res.miron,.warn_90.miron,.warn.miron"); allWarehouses = $(pageProd).find(".mheader.ressources"); allVillages = $(pageProd).find(".quickedit-vn"); allFarms = $(pageProd).find(".header.population"); allMerchants = $(pageProd).find('#production_table a[href*="market"]');
                    var productionTable = $(pageProd).find("#production_table th");
                    if (uniRow >= 0) { allVillages.splice(uniRow, 1); allWoodObjects.splice(uniRow, 1); allClayObjects.splice(uniRow, 1); allIronObjects.splice(uniRow, 1); allWarehouses.splice(uniRow, 1); allFarms.splice(uniRow, 1); allMerchants.splice(uniRow, 1); productionTable.splice(uniRow, 1); }
                    for (var i = 0; i < allWoodObjects.length; i++) { let n; n = allWoodObjects[i].textContent.replace(/\./g, '').replace(',', ''); allWoodTotals.push(n); n = allClayObjects[i].textContent.replace(/\./g, '').replace(',', ''); allClayTotals.push(n); n = allIronObjects[i].textContent.replace(/\./g, '').replace(',', ''); allIronTotals.push(n); }
                    for (let i = 0; i < allVillages.length; i++) { farmSpaceUsed.push(allFarms[i].parentElement.innerText.match(/(\d*)\/(\d*)/)[1]); farmSpaceTotal.push(allFarms[i].parentElement.innerText.match(/(\d*)\/(\d*)/)[2]); warehouseCapacity.push(allWarehouses[i].parentElement.innerText); availableMerchants.push(allMerchants[i].innerText); totalMerchants.push("999"); villagePoints.push(productionTable[(i * 2) + 1].innerText.replace(/\./g, '').replace(',', '')); }
                } else {
                    allWoodObjects = $(pageProd).find(".res.wood,.warn_90.wood,.warn.wood"); allClayObjects = $(pageProd).find(".res.stone,.warn_90.stone,.warn.stone"); allIronObjects = $(pageProd).find(".res.iron,.warn_90.iron,.warn.iron"); allVillages = $(pageProd).find(".quickedit-vn");
                    if (uniRow >= 0) { allVillages.splice(uniRow, 1); allWoodObjects.splice(uniRow, 1); allClayObjects.splice(uniRow, 1); allIronObjects.splice(uniRow, 1); }
                    for (let i = 0; i < allWoodObjects.length; i++) { let n; n = allWoodObjects[i].textContent.replace(/\./g, '').replace(',', ''); allWoodTotals.push(n); n = allClayObjects[i].textContent.replace(/\./g, '').replace(',', ''); allClayTotals.push(n); n = allIronObjects[i].textContent.replace(/\./g, '').replace(',', ''); allIronTotals.push(n); }
                    for (let i = 0; i < allVillages.length; i++) { warehouseCapacity.push(allIronObjects[i].parentElement.nextElementSibling.innerHTML); availableMerchants.push(allIronObjects[i].parentElement.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[1]); totalMerchants.push(allIronObjects[i].parentElement.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[2]); farmSpaceUsed.push(allIronObjects[i].parentElement.nextElementSibling.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[1]); farmSpaceTotal.push(allIronObjects[i].parentElement.nextElementSibling.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[2]); villagePoints.push(allWoodObjects[i].parentElement.previousElementSibling.innerText.replace(/\./g, '').replace(',', '')); }
                }
                for (let i = 0; i < allVillages.length; i++) { villagesData.push({ "id": allVillages[i].dataset.id, "points": villagePoints[i], "url": allVillages[i].children[0].children[0].href, "name": allVillages[i].innerText.trim(), "wood": allWoodTotals[i], "stone": allClayTotals[i], "iron": allIronTotals[i], "availableMerchants": availableMerchants[i], "totalMerchants": totalMerchants[i], "warehouseCapacity": warehouseCapacity[i], "farmSpaceUsed": farmSpaceUsed[i], "farmSpaceTotal": farmSpaceTotal[i] }); }
                villagesData.sort((a, b) => (parseInt(a.points) < parseInt(b.points)) ? 1 : -1);
                totalWood = 0; totalStone = 0; totalIron = 0;
                for (let i in allWoodTotals) { totalWood += parseInt(allWoodTotals[i]); } for (let i in allClayTotals) { totalStone += parseInt(allClayTotals[i]); } for (let i in allIronTotals) { totalIron += parseInt(allIronTotals[i]); }
                for (let o = 0; o < Object.keys(incomingRes).length; o++) { totalWood += incomingRes[Object.keys(incomingRes)[o]].wood; totalStone += incomingRes[Object.keys(incomingRes)[o]].stone; totalIron += incomingRes[Object.keys(incomingRes)[o]].iron; }
                var woodAverage = Math.floor(totalWood / warehouseCapacity.length); var stoneAverage = Math.floor(totalStone / warehouseCapacity.length); var ironAverage = Math.floor(totalIron / warehouseCapacity.length);
                var actualWoodAverage, actualStoneAverage, actualIronAverage;
                if (settings.isMinting == false) {
                    actualWoodAverage = woodAverage; actualStoneAverage = stoneAverage; actualIronAverage = ironAverage;
                    var actualTotalWood = totalWood; var actualTotalStone = totalStone; var actualTotalIron = totalIron;
                    var actualWHCountNeedsBalancingWood = warehouseCapacity.length; var actualWHCountNeedsBalancingStone = warehouseCapacity.length; var actualWHCountNeedsBalancingIron = warehouseCapacity.length;
                    for (let i = 0; i < warehouseCapacity.length; i++) {
                        actualWoodAverage = Math.floor(actualTotalWood / actualWHCountNeedsBalancingWood); actualStoneAverage = Math.floor(actualTotalStone / actualWHCountNeedsBalancingStone); actualIronAverage = Math.floor(actualTotalIron / actualWHCountNeedsBalancingIron);
                        if (warehouseCapacity[i] < actualWoodAverage) { actualTotalWood -= actualWoodAverage - warehouseCapacity[i] * settings.needsMorePercentage; actualWHCountNeedsBalancingWood--; }
                        if (warehouseCapacity[i] < actualStoneAverage) { actualTotalStone -= actualStoneAverage - warehouseCapacity[i] * settings.needsMorePercentage; actualWHCountNeedsBalancingStone--; }
                        if (warehouseCapacity[i] < actualIronAverage) { actualTotalIron -= actualIronAverage - warehouseCapacity[i] * settings.needsMorePercentage; actualWHCountNeedsBalancingIron--; }
                    }
                } else { actualWoodAverage = woodAverage; actualStoneAverage = stoneAverage; actualIronAverage = ironAverage; }
                totalsAndAverages = `<div id='totals' class='sophHeader' border=0><table id='totalsAndAverages' width='100%'><tr class='sophRowA'><td>${langShinko[9]}: ${numberWithCommas(totalWood)}</td><td>${langShinko[10]}: ${numberWithCommas(totalStone)}</td><td>${langShinko[11]}: ${numberWithCommas(totalIron)}</td></tr><tr class='sophRowB'><td>${langShinko[12]}: ${numberWithCommas(woodAverage)}</td><td>${langShinko[13]}: ${numberWithCommas(stoneAverage)}</td><td>${langShinko[14]}: ${numberWithCommas(ironAverage)}</td></tr><tr class='sophRowA'><td>Średnia Drewna po korekcie: ${numberWithCommas(actualWoodAverage)}</td><td>Średnia Gliny po korekcie: ${numberWithCommas(actualStoneAverage)}</td><td>Średnia Żelaza po korekcie: ${numberWithCommas(actualIronAverage)}</td></tr></table>`;
                $(".content-border").eq(0).prepend(`<div id="progressbar" style="width: 100%;background-color: #36393f;"><div id="progress" style="width: 0%;height: 35px;background-color: #4CAF50;text-align: center;line-height: 32px;color: black;"></div></div>`);
                for (let v = 0; v < villagesData.length; v++) {
                    excessResources[v] = []; shortageResources[v] = []; villageID.push(villagesData[v].id);
                    let incomingWood = 0, incomingStone = 0, incomingIron = 0;
                    if (incomingRes[villagesData[v].id] != undefined) { incomingWood = incomingRes[villagesData[v].id].wood; incomingStone = incomingRes[villagesData[v].id].stone; incomingIron = incomingRes[villagesData[v].id].iron; }
                    var tempWood, tempStone, tempIron;
                    tempWood = (actualWoodAverage < villagesData[v].warehouseCapacity * settings.needsMorePercentage) ? parseInt(villagesData[v].wood) + incomingWood - actualWoodAverage : -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingWood - parseInt(villagesData[v].wood));
                    tempStone = (actualStoneAverage < villagesData[v].warehouseCapacity * settings.needsMorePercentage) ? parseInt(villagesData[v].stone) + incomingStone - actualStoneAverage : -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingStone - parseInt(villagesData[v].stone));
                    tempIron = (actualIronAverage < villagesData[v].warehouseCapacity * settings.needsMorePercentage) ? parseInt(villagesData[v].iron) + incomingIron - actualIronAverage : -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingIron - parseInt(villagesData[v].iron));
                    if (villagesData[v].farmSpaceUsed > settings.highFarm || villagesData[v].points > settings.highPoints) {
                        if (parseInt(villagesData[v].wood) + incomingWood > settings.builtOutPercentage * villagesData[v].warehouseCapacity) { tempWood = Math.round((parseInt(villagesData[v].wood) + incomingWood) - (settings.builtOutPercentage * villagesData[v].warehouseCapacity)); }
                        if (parseInt(villagesData[v].stone) + incomingStone > settings.builtOutPercentage * villagesData[v].warehouseCapacity) { tempStone = Math.round((parseInt(villagesData[v].stone) + incomingStone) - (settings.builtOutPercentage * villagesData[v].warehouseCapacity)); }
                        if (parseInt(villagesData[v].iron) + incomingIron > settings.builtOutPercentage * villagesData[v].warehouseCapacity) { tempIron = Math.round((parseInt(villagesData[v].iron) + incomingIron) - (settings.builtOutPercentage * villagesData[v].warehouseCapacity)); }
                    }
                    if (villagesData[v].points < settings.lowPoints) { tempWood = -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - parseInt(villagesData[v].wood) - incomingWood); tempStone = -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - parseInt(villagesData[v].stone) - incomingStone); tempIron = -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - parseInt(villagesData[v].iron) - incomingIron); }
                    if (incomingWood + parseInt(villagesData[v].wood) > villagesData[v].warehouseCapacity) { tempWood = -(Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingWood - parseInt(villagesData[v].wood))); }
                    if (incomingStone + parseInt(villagesData[v].stone) > villagesData[v].warehouseCapacity) { tempStone = -(Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingStone - parseInt(villagesData[v].stone))); }
                    if (incomingIron + parseInt(villagesData[v].iron) > villagesData[v].warehouseCapacity) { tempIron = -(Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingIron - parseInt(villagesData[v].iron))); }
                    if (tempWood > 0 && tempWood > parseInt(villagesData[v].wood)) { tempWood = parseInt(villagesData[v].wood); } if (tempStone > 0 && tempStone > parseInt(villagesData[v].stone)) { tempStone = parseInt(villagesData[v].stone); } if (tempIron > 0 && tempIron > parseInt(villagesData[v].iron)) { tempIron = parseInt(villagesData[v].iron); }
                    if (tempWood > 0) { excessResources[v].push({ "wood": Math.floor(tempWood / 1000) * 1000 }); shortageResources[v].push({ "wood": 0 }); } else { shortageResources[v].push({ "wood": Math.floor(-tempWood / 1000) * 1000 }); excessResources[v].push({ "wood": 0 }); }
                    if (tempStone > 0) { excessResources[v].push({ "stone": Math.floor(tempStone / 1000) * 1000 }); shortageResources[v].push({ "stone": 0 }); } else { shortageResources[v].push({ "stone": Math.floor(-tempStone / 1000) * 1000 }); excessResources[v].push({ "stone": 0 }); }
                    if (tempIron > 0) { excessResources[v].push({ "iron": Math.floor(tempIron / 1000) * 1000 }); shortageResources[v].push({ "iron": 0 }); } else { shortageResources[v].push({ "iron": Math.floor(-tempIron / 1000) * 1000 }); excessResources[v].push({ "iron": 0 }); }
                }
                for (let p = 0; p < excessResources.length; p++) {
                    let tempAllExcessCombined = parseInt(Math.floor(excessResources[p][0].wood / 1000) * 1000) + parseInt(Math.floor(excessResources[p][1].stone / 1000) * 1000) + parseInt(Math.floor(excessResources[p][2].iron / 1000) * 1000);
                    if (tempAllExcessCombined > 0) {
                        let tempMaxMerchantsNeeded = Math.floor(tempAllExcessCombined / 1000);
                        if (tempMaxMerchantsNeeded < villagesData[p].availableMerchants) { merchantOrders.push({ "villageID": villagesData[p].id, "x": villagesData[p].name.match(/(\d+)\|(\d+)/)[1], "y": villagesData[p].name.match(/(\d+)\|(\d+)/)[2], "wood": Math.floor(excessResources[p][0].wood / 1000), "stone": Math.floor(excessResources[p][1].stone / 1000), "iron": Math.floor(excessResources[p][2].iron / 1000) }); }
                        else { let tempPercWood = excessResources[p][0].wood / tempAllExcessCombined; let tempPercStone = excessResources[p][1].stone / tempAllExcessCombined; let tempPercIron = excessResources[p][2].iron / tempAllExcessCombined; merchantOrders.push({ "villageID": villagesData[p].id, "x": villagesData[p].name.match(/(\d+)\|(\d+)/)[1], "y": villagesData[p].name.match(/(\d+)\|(\d+)/)[2], "wood": Math.floor(tempPercWood * villagesData[p].availableMerchants), "stone": Math.floor(tempPercStone * villagesData[p].availableMerchants), "iron": Math.floor(tempPercIron * villagesData[p].availableMerchants) }); }
                    }
                }
                for (let q = shortageResources.length - 1; q >= 0; q--) {
                    $("#progress").css("width", `${(shortageResources.length - q) / shortageResources.length * 100}%`);
                    for (let d = 0; d < merchantOrders.length; d++) { merchantOrders[d].distance = addDistanceToArray([merchantOrders[d]])[0].distance; }
                    merchantOrders.sort(function (left, right) { return left.distance - right.distance; });
                    if (shortageResources[q][0].wood > 0) { while (shortageResources[q][0].wood > 0) { var totalWoodToTrade = 0; for (let m = 0; m < merchantOrders.length; m++) { totalWoodToTrade += merchantOrders[m].wood; if (merchantOrders[m].wood > 0) { if (shortageResources[q][0].wood <= merchantOrders[m].wood * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "wood": shortageResources[q][0].wood }); merchantOrders[m].wood -= shortageResources[q][0].wood / 1000; shortageResources[q][0].wood = 0; } else { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "wood": merchantOrders[m].wood * 1000 }); shortageResources[q][0].wood -= merchantOrders[m].wood * 1000; merchantOrders[m].wood = 0; } } if (shortageResources[q][0].wood <= 0) { break; } } if (totalWoodToTrade == 0) { break; } } }
                    if (shortageResources[q][1].stone > 0) { while (shortageResources[q][1].stone > 0) { var totalStoneToTrade = 0; for (let m = 0; m < merchantOrders.length; m++) { totalStoneToTrade += merchantOrders[m].stone; if (merchantOrders[m].stone > 0) { if (shortageResources[q][1].stone <= merchantOrders[m].stone * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "stone": shortageResources[q][1].stone }); merchantOrders[m].stone -= shortageResources[q][1].stone / 1000; shortageResources[q][1].stone = 0; } else { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "stone": merchantOrders[m].stone * 1000 }); shortageResources[q][1].stone -= merchantOrders[m].stone * 1000; merchantOrders[m].stone = 0; } } if (shortageResources[q][1].stone <= 0) { break; } } if (totalStoneToTrade == 0) { break; } } }
                    if (shortageResources[q][2].iron > 0) { while (shortageResources[q][2].iron > 0) { var totalIronToTrade = 0; for (let m = 0; m < merchantOrders.length; m++) { totalIronToTrade += merchantOrders[m].iron; if (merchantOrders[m].iron > 0) { if (shortageResources[q][2].iron <= merchantOrders[m].iron * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "iron": shortageResources[q][2].iron }); merchantOrders[m].iron -= shortageResources[q][2].iron / 1000; shortageResources[q][2].iron = 0; } else { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "iron": merchantOrders[m].iron * 1000 }); shortageResources[q][2].iron -= merchantOrders[m].iron * 1000; merchantOrders[m].iron = 0; } } if (shortageResources[q][2].iron <= 0) { break; } } if (totalIronToTrade == 0) { break; } } }
                }
                $("#progress").remove();

                const sessionActive = isBalancerSessionActive();
                const statusColor = sessionActive && settings.autoSendEnabled ? 'green' : 'red';
                const statusText = sessionActive && settings.autoSendEnabled ? 'AKTYWNE (SESJA)' : 'NIETAKTYWNE';

                let htmlCode = `<div id="restart">${totalsAndAverages}</div>
                <div id="sendResources" class="flex-container sophHeader" style="position: relative; padding: 5px;">
                    <div>
                        <button class="sophRowA collapsible" style="width: 250px;min-width: 230px;">Otwórz menu ustawień</button>
                        <div class="content submenu" style="width: 500px; z-index:99999;">
                            <form id="settings">
                                <table style="border-spacing: 2px; width: 100%;">
                                    <tr><td style="padding: 6px;"><label for="isMinting">Ignoruj ustawienia</label></td><td style="padding: 6px;"><input type="checkbox" name="isMinting" ${settings.isMinting ? 'checked' : ''}></td></tr>
                                    <tr><td style="padding: 6px;"><label for="lowPoints">Priorytet <</label></td><td style="padding: 6px;"><input type="range" min="0" max="13000" step="100" value="${settings.lowPoints}" name="lowPoints" oninput="this.nextElementSibling.value=this.value"> <output>${settings.lowPoints}</output> pkt</td></tr>
                                    <tr><td style="padding: 6px;"><label for="highPoints">Skończone ></label></td><td style="padding: 6px;"><input type="range" min="0" max="13000" step="100" value="${settings.highPoints}" name="highPoints" oninput="this.nextElementSibling.value=this.value"> <output>${settings.highPoints}</output> pkt</td></tr>
                                    <tr><td style="padding: 6px;"><label for="highFarm">Dużo farmy ></label></td><td style="padding: 6px;"><input type="range" min="0" max="33000" step="100" value="${settings.highFarm}" name="highFarm" oninput="this.nextElementSibling.value=this.value"> <output>${settings.highFarm}</output> pop</td></tr>
                                    <tr><td style="padding: 6px;"><label for="builtOutPercentage">Poj. spich. (skończone)</label></td><td style="padding: 6px;"><input type="range" min="0" max="1" step="0.01" value="${settings.builtOutPercentage}" name="builtOutPercentage" oninput="this.nextElementSibling.value=this.value"> <output>${settings.builtOutPercentage}</output></td></tr>
                                    <tr><td style="padding: 6px;"><label for="needsMorePercentage">Poj. spich. (priorytet)</label></td><td style="padding: 6px;"><input type="range" min="0" max="1" step="0.01" value="${settings.needsMorePercentage}" name="needsMorePercentage" oninput="this.nextElementSibling.value=this.value"> <output>${settings.needsMorePercentage}</output></td></tr>
                                    <tr class='sophRowA'><td style="padding: 6px;" colspan="2"><hr><b>Automatyzacja</b></td></tr>
                                    <tr><td style="padding: 6px;"><label for="autoSendEnabled" title="Główny włącznik funkcji. Musi być zaznaczony, aby można było uruchomić sesję AUTO.">Automatyczne wysyłanie</label></td><td style="padding: 6px;"><input type="checkbox" name="autoSendEnabled" ${settings.autoSendEnabled ? 'checked' : ''}></td></tr>
                                    <tr><td style="padding: 6px;"><label for="minRefresh">Min. odświeżenie (min)</label></td><td style="padding: 6px;"><input type="number" name="minRefresh" min="1" value="${settings.minRefresh}" style="width:60px; color: black;"></td></tr>
                                    <tr><td style="padding: 6px;"><label for="maxRefresh">Max. odświeżenie (min)</label></td><td style="padding: 6px;"><input type="number" name="maxRefresh" min="1" value="${settings.maxRefresh}" style="width:60px; color: black;"></td></tr>
                                    <tr><td style="padding: 6px;"><label for="idleTitlePrefix">Tytuł nieaktywnej karty</label></td><td style="padding: 6px;"><input type="text" name="idleTitlePrefix" value="${settings.idleTitlePrefix}" style="width:150px; color: black;"></td></tr>
                                    <tr class='sophRowA'><td style="padding: 6px;" colspan="2"><hr></td></tr>
                                    <tr><td style="padding: 6px;" colspan="2"><input type="button" class="btn evt-confirm-btn btn-confirm-yes" value="Zapisz i uruchom ponownie" onclick="saveSettings();"/></td></tr>
                                    <td colspan="2" style="padding: 6px;"><p style="padding:5px"><font size="1">Script by Sophie "Shinko to Kuma"</font></p></td>
                                </table>
                            </form>
                        </div>
                    </div>
                    <div style="text-align: right; margin: 5px;">
                        <span id="auto_status_indicator" style="font-weight: bold; color: ${statusColor}; margin-right: 15px;">AUTO: ${statusText}</span>
                        <button class="btn btn-auto-start" onclick="startBalancerSession()" style="display: ${sessionActive ? 'none' : 'inline-block'};" title="Uruchamia automatyczną pętlę balansowania dla tej sesji karty.">Start AUTO (sesja)</button>
                        <button class="btn btn-auto-stop" onclick="stopBalancerSession()" style="display: ${sessionActive ? 'inline-block' : 'none'};" title="Zatrzymuje automatyczną pętlę balansowania.">Stop AUTO (sesja)</button>
                    </div>
                </div>
                <table id="tableSend" width="100%" class="sophHeader">
                <tbody id="appendHere">
                    <tr><td class="sophHeader" colspan=7 style="text-align:center" >${langShinko[0]}</td></tr>
                    <tr><td class="sophHeader" width="25%" style="text-align:center">${langShinko[1]}</td><td class="sophHeader" width="25%" style="text-align:center">${langShinko[2]}</td><td class="sophHeader" width="5%" style="text-align:center">${langShinko[3]}</td><td class="sophHeader" width="10%" style="text-align:center">${langShinko[4]}</td><td class="sophHeader" width="10%" style="text-align:center">${langShinko[5]}</td><td class="sophHeader" width="10%" style="text-align:center">${langShinko[6]}</td><td class="sophHeader" width="10%"><font size="1">${langShinko[8]}</font></td></tr>
                </tbody></table>`;

                $("#content_value").eq(0).prepend(htmlCode);
                if (is_mobile == true) { $("#mobile_header").eq(0).prepend(htmlCode); }
                makeThingsCollapsible();
                createList();
            });
        });
    }

    // ============================================================================
    //  NOWA FUNKCJA DO ZMIANY TYTUŁU KARTY
    // ============================================================================
    function initTitleChanger() {
        const originalTitle = document.title;
        // Funkcja nie zrobi nic, jeśli prefiks w ustawieniach jest pusty
        if (!settings.idleTitlePrefix || settings.idleTitlePrefix.trim() === "") {
            return;
        }

        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                document.title = `${settings.idleTitlePrefix} | ${originalTitle}`;
            } else {
                document.title = originalTitle;
            }
        });

        // Ustaw tytuł od razu, jeśli karta jest już nieaktywna przy ładowaniu skryptu
        if (document.hidden) {
             document.title = `${settings.idleTitlePrefix} | ${originalTitle}`;
        }
    }


    // Uruchomienie głównych funkcji
    displayEverything();
    initTitleChanger(); // Uruchomienie mechanizmu zmiany tytułu

})();
