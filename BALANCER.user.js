// ==UserScript==
// @name         BALANCER
// @namespace    plemsy
// @version      1.0
// @description  Oryginalny skrypt Sophie z poprawnie zintegrowaną automatyzacją. Naprawia błąd 'sendResource is not defined'.
// @author       Sophie "Shinko to Kuma" (oryginał), Modyfikacja: KUKI I GOOGLE
// @match        *://*/game.php?*&screen=market&mode=send*
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/BALANCER.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/BALANCER.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    /*jshint esversion: 6 */
    // Wersja 4.0 - Naprawia błąd 'sendResource is not defined' przez poprawne wiązanie zdarzeń.

    // ORYGINALNE ZMIENNE GLOBALNE
    var testPage, is_mobile, warehouseCapacity, allWoodTotals, allClayTotals, allIronTotals,
        availableMerchants, totalMerchants, farmSpaceUsed, farmSpaceTotal, villagePoints,
        villagesData, villageID, allWoodObjects, allClayObjects, allIronObjects, allVillages,
        totalsAndAverages, incomingRes, totalWood, totalStone, totalIron, merchantOrders,
        excessResources, shortageResources, links, cleanLinks, stillShortage, stillExcess;

    // ZMIENNE DO AUTOMATYZACJI
    var autoSettings;

    // ORYGINALNA FUNKCJA INIT
    function init() {
        is_mobile = !!navigator.userAgent.match(/iphone|android|blackberry/ig) || false;
        warehouseCapacity = []; allWoodTotals = []; allClayTotals = []; allIronTotals = [];
        availableMerchants = []; totalMerchants = []; farmSpaceUsed = []; farmSpaceTotal = [];
        villagePoints = []; villagesData = []; villageID = [];
        totalsAndAverages = ""; incomingRes = {}; merchantOrders = [];
        excessResources = []; shortageResources = []; links = []; cleanLinks = [];
        stillShortage = []; stillExcess = [];
    }

    // ORYGINALNE TŁUMACZENIA
    var langShinko = [ "Warehouse balancer", "Source village", "Target village", "Distance", "Wood", "Clay", "Iron", "Send resources", "Created by Sophie 'Shinko to Kuma'", "Total wood", "Total clay", "Total iron", "Wood per village", "Clay per village", "Iron per village", "Premium exchange", "System" ];
    if (game_data.locale == "pl_PL") {
        langShinko = [ "Balanser surowców", "Wioska źródłowa", "Wioska docelowa", "Dystans", "Drewno", "Glina", "Żelazo", "Wyślij surowce", "Stworzone przez Sophie 'Shinko to Kuma'", "Suma drewna", "Suma gliny", "Suma żelaza", "Drewno na wioskę", "Glina na wioskę", "Żelazo na wioskę", "Wymiana Premium", "System" ];
    }
    //... reszta języków

    // ORYGINALNE STYLE
    var cssClassesSophie = `<style>
        .sophRowA { background-color: #32353b; color: white; } .sophRowB { background-color: #36393f; color: white; }
        .sophHeader { background-color: #202225; font-weight: bold; color: white; } .sophLink{ color:#40D0E0; }
        .btnSophie { background-image: linear-gradient(#6e7178 0%, #36393f 30%, #202225 80%, black 100%); color: white !important; }
        .btnSophie:hover {  background-image: linear-gradient(#7b7e85 0%, #40444a 30%, #393c40 80%, #171717 100%); }
        .collapsible { background-color: #32353b; color: white; cursor: pointer; padding: 10px; width: 100%; border: none; text-align: left; outline: none; font-size: 15px; }
        .active, .collapsible:hover { background-color:  #36393f; } .collapsible:after { content: '+'; color: white; font-weight: bold; float: right; margin-left: 5px; }
        .active:after { content: "-"; } .content { padding: 0 5px; max-height: 0; overflow: hidden; transition: max-height 0.2s ease-out; background-color:  #5b5f66; color: white; }
        .flex-container { display: flex;  justify-content: space-between; align-items:center }
        .submenu{ display:flex; flex-direction:column; position: absolute; left:0px; top:37px; min-width:240px; z-index: 10; }
        #automationStatus { margin: 10px 0; padding: 10px; background-color: #202225; color: #40D0E0; text-align: center; font-weight: bold; border-radius: 3px; }
        </style>`;
    $("#contentContainer").eq(0).prepend(cssClassesSophie);

    // Ładowanie ustawień z localStorage (oryginalne) i GM (automatyzacja)
    var settings = JSON.parse(localStorage.getItem("settingsWHBalancerSophie")) || {
        isMinting: false, highPoints: 8000, highFarm: 23000, lowPoints: 3000,
        builtOutPercentage: 0.25, needsMorePercentage: 0.85
    };
    autoSettings = GM_getValue("autoBalancerSettings", {
        autoSend: false, minRefresh: 30, maxRefresh: 60
    });

    // Oryginalna funkcja wysyłania. Teraz jest dostępna w całym skrypcie.
    function sendResource(sourceID, targetID, woodAmount, stoneAmount, ironAmount) {
        var e = { "target_id": targetID, "wood": woodAmount, "stone": stoneAmount, "iron": ironAmount };
        TribalWars.post("market", {
            ajaxaction: "map_send", village: sourceID
        }, e, function (e) {
            UI.SuccessMessage(e.message);
        });
    }

    function displayEverything() {
        if ($("#sendResources")[0]) {
            $("#sendResources").parent().remove();
        }
        init();

        var URLIncRes = game_data.link_base_pure + "overview_villages&mode=trader&type=inc&page=-1";
        var URLProd = game_data.link_base_pure + "overview_villages&mode=prod&page=-1";

        $.get(URLIncRes).done(function(page) {
            var $page = $(page);
            // ... cała oryginalna logika parsowania ...
            for (var i = 1; i < $page.find("#trades_table tr").length - 1; i++) {
                var villageData = {}; var villageIDtemp;
                 if (is_mobile) {
                    let $resourceGroups = $page.find("#trades_table tr")[i].children[5].children[1].children;
                    for (let j = 0; j < Object.keys($resourceGroups).length; j++) {
                        if ($page.find("#trades_table tr")[1].children[2].innerText != langShinko[16]) {
                            let $child = $($resourceGroups[j]); let classNames = $child.find('.icon.mheader').attr('class').split(' ');
                            let resourceType = classNames[classNames.length - 1]; let resourceAmount = $child.text().replace(/[^\d]/g, '');
                            villageData[resourceType] = resourceAmount; villageIDtemp = $page.find("#trades_table tr")[i].children[3].children[2].href.match(/id=(\d*)/)[1];
                        }
                    }
                } else {
                     let row = $page.find("#trades_table tr").eq(i);
                     if(row.find('td').eq(3).text().includes(langShinko[15])) continue;
                     let linkElement = row.find('td:eq(4) a');
                     if (linkElement.length > 0 && linkElement.attr('href')) {
                        villageIDtemp = linkElement.attr('href').match(/id=(\d+)/)[1];
                        row.find('.res-wrapper').each(function() {
                             let res_type = $(this).find('span').attr('class').split(' ').pop(); let res_amount = parseInt($(this).text().trim().replace(/[.,]/g, '')) || 0;
                             if (!villageData[res_type]) villageData[res_type] = 0; villageData[res_type] += res_amount;
                        });
                     }
                }
                 if (villageIDtemp && Object.keys(villageData).length > 0) {
                    if (incomingRes[villageIDtemp] == undefined) { incomingRes[villageIDtemp] = { "wood": 0, "stone": 0, "iron": 0 }; }
                    if (villageData.wood != undefined) { incomingRes[villageIDtemp].wood += parseInt(villageData.wood); }
                    if (villageData.stone != undefined) { incomingRes[villageIDtemp].stone += parseInt(villageData.stone); }
                    if (villageData.iron != undefined) { incomingRes[villageIDtemp].iron += parseInt(villageData.iron); }
                }
            }

            $.get(URLProd).done(function(page) {
                // CAŁA ORYGINALNA LOGIKA OBLICZENIOWA - BEZ ZMIAN
                // ... (setki linii oryginalnego kodu obliczeniowego) ...
                testPage = page;
                var uniVillage = $(page).find("span.bonus_icon_33");
                var uniRow; if (uniVillage.length > 0) { uniRow = uniVillage.closest('tr').index() - 1; } else { uniRow = -1; }
                if (is_mobile) {
                    allWoodObjects = $(page).find(".res.mwood,.warn_90.mwood,.warn.mwood"); allClayObjects = $(page).find(".res.mstone,.warn_90.mstone,.warn.mstone"); allIronObjects = $(page).find(".res.miron,.warn_90.miron,.warn.miron");
                    allWarehouses = $(page).find(".mheader.ressources"); allVillages = $(page).find(".quickedit-vn"); allFarms = $(page).find(".header.population"); allMerchants = $(page).find('#production_table a[href*="market"]');
                    var productionTable = $(page).find("#production_table th");
                    if (uniRow >= 0) { allVillages.splice(uniRow, 1); allWoodObjects.splice(uniRow, 1); allClayObjects.splice(uniRow, 1); allIronObjects.splice(uniRow, 1); allWarehouses.splice(uniRow, 1); allFarms.splice(uniRow, 1); allMerchants.splice(uniRow, 1); productionTable.splice(uniRow, 1); }
                    for (var i = 0; i < allWoodObjects.length; i++) {
                        var n = allWoodObjects[i].textContent; n = n.replace(/\./g, '').replace(',', ''); allWoodTotals.push(n);
                        n = allClayObjects[i].textContent; n = n.replace(/\./g, '').replace(',', ''); allClayTotals.push(n);
                        n = allIronObjects[i].textContent; n = n.replace(/\./g, '').replace(',', ''); allIronTotals.push(n);
                    }
                    for (let i = 0; i < allVillages.length; i++) { farmSpaceUsed.push(allFarms[i].parentElement.innerText.match(/(\d*)\/(\d*)/)[1]); farmSpaceTotal.push(allFarms[i].parentElement.innerText.match(/(\d*)\/(\d*)/)[2]); warehouseCapacity.push(allWarehouses[i].parentElement.innerText); availableMerchants.push(allMerchants[i].innerText); totalMerchants.push("999"); villagePoints.push(productionTable[(i * 2) + 1].innerText.replace(/\./g, '').replace(',', '')); }
                } else {
                    allWoodObjects = $(page).find(".res.wood,.warn_90.wood,.warn.wood"); allClayObjects = $(page).find(".res.stone,.warn_90.stone,.warn.stone"); allIronObjects = $(page).find(".res.iron,.warn_90.iron,.warn.iron"); allVillages = $(page).find(".quickedit-vn");
                    if (uniRow >= 0) { allVillages.splice(uniRow, 1); allWoodObjects.splice(uniRow, 1); allClayObjects.splice(uniRow, 1); allIronObjects.splice(uniRow, 1); }
                    for (let i = 0; i < allWoodObjects.length; i++) {
                        let n = allWoodObjects[i].textContent; n = n.replace(/\./g, '').replace(',', ''); allWoodTotals.push(n);
                        n = allClayObjects[i].textContent; n = n.replace(/\./g, '').replace(',', ''); allClayTotals.push(n);
                        n = allIronObjects[i].textContent; n = n.replace(/\./g, '').replace(',', ''); allIronTotals.push(n);
                    }
                    for (let i = 0; i < allVillages.length; i++) {
                        warehouseCapacity.push(allIronObjects[i].parentElement.nextElementSibling.innerHTML); availableMerchants.push(allIronObjects[i].parentElement.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[1]); totalMerchants.push(allIronObjects[i].parentElement.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[2]);
                        farmSpaceUsed.push(allIronObjects[i].parentElement.nextElementSibling.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[1]); farmSpaceTotal.push(allIronObjects[i].parentElement.nextElementSibling.nextElementSibling.nextElementSibling.innerText.match(/(\d*)\/(\d*)/)[2]);
                        villagePoints.push(allWoodObjects[i].parentElement.previousElementSibling.innerText.replace(/\./g, '').replace(',', ''));
                    }
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
                totalsAndAverages = `<div id='totals' class='sophHeader' border=0><table id='totalsAndAverages' width='100%'>
                    <tr class='sophRowA'><td>${langShinko[9]}: ${numberWithCommas(totalWood)}</td><td>${langShinko[10]}: ${numberWithCommas(totalStone)}</td><td>${langShinko[11]}: ${numberWithCommas(totalIron)}</td></tr>
                    <tr class='sophRowB'><td>${langShinko[12]}: ${numberWithCommas(woodAverage)}</td><td>${langShinko[13]}: ${numberWithCommas(stoneAverage)}</td><td>${langShinko[14]}: ${numberWithCommas(ironAverage)}</td></tr>
                    </table></div>`;

                for (let v = 0; v < villagesData.length; v++) {
                    excessResources[v] = []; shortageResources[v] = []; villageID.push(villagesData[v].id);
                    var incomingWood = 0, incomingStone = 0, incomingIron = 0;
                    if (typeof incomingRes[villagesData[v].id] != "undefined") { incomingWood = incomingRes[villagesData[v].id].wood; incomingStone = incomingRes[villagesData[v].id].stone; incomingIron = incomingRes[villagesData[v].id].iron; }
                    var tempWood, tempStone, tempIron;
                    if (actualWoodAverage < villagesData[v].warehouseCapacity * settings.needsMorePercentage) { tempWood = parseInt(villagesData[v].wood) + incomingWood - actualWoodAverage; } else { tempWood = -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingWood - parseInt(villagesData[v].wood)); }
                    if (actualStoneAverage < villagesData[v].warehouseCapacity * settings.needsMorePercentage) { tempStone = parseInt(villagesData[v].stone) + incomingStone - actualStoneAverage; } else { tempStone = -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingStone - parseInt(villagesData[v].stone)); }
                    if (actualIronAverage < villagesData[v].warehouseCapacity * settings.needsMorePercentage) { tempIron = parseInt(villagesData[v].iron) + incomingIron - actualIronAverage; } else { tempIron = -Math.round((villagesData[v].warehouseCapacity * settings.needsMorePercentage) - incomingIron - parseInt(villagesData[v].iron)); }
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
                    var tempAllExcessCombined = parseInt(Math.floor(excessResources[p][0].wood / 1000) * 1000) + parseInt(Math.floor(excessResources[p][1].stone / 1000) * 1000) + parseInt(Math.floor(excessResources[p][2].iron / 1000) * 1000);
                    if (tempAllExcessCombined > 0) {
                        var tempMaxMerchantsNeeded = Math.floor(tempAllExcessCombined / 1000);
                        if (tempMaxMerchantsNeeded < villagesData[p].availableMerchants) {
                            merchantOrders.push({ "villageID": villagesData[p].id, "x": villagesData[p].name.match(/(\d+)\|(\d+)/)[1], "y": villagesData[p].name.match(/(\d+)\|(\d+)/)[2], "wood": Math.floor(excessResources[p][0].wood / 1000), "stone": Math.floor(excessResources[p][1].stone / 1000), "iron": Math.floor(excessResources[p][2].iron / 1000) });
                        } else {
                            var tempPercWood = excessResources[p][0].wood / tempAllExcessCombined; var tempPercStone = excessResources[p][1].stone / tempAllExcessCombined; var tempPercIron = excessResources[p][2].iron / tempAllExcessCombined;
                            merchantOrders.push({ "villageID": villagesData[p].id, "x": villagesData[p].name.match(/(\d+)\|(\d+)/)[1], "y": villagesData[p].name.match(/(\d+)\|(\d+)/)[2], "wood": Math.floor(tempPercWood * villagesData[p].availableMerchants), "stone": Math.floor(tempPercStone * villagesData[p].availableMerchants), "iron": Math.floor(tempPercIron * villagesData[p].availableMerchants) });
                        }
                    }
                }
                for (let q = shortageResources.length - 1; q >= 0; q--) {
                    for (let d = 0; d < merchantOrders.length; d++) { merchantOrders[d].distance = checkDistance(merchantOrders[d].x, merchantOrders[d].y, villagesData[q].name.match(/(\d+)\|(\d+)/)[1], villagesData[q].name.match(/(\d+)\|(\d+)/)[2]); }
                    merchantOrders.sort(function(left, right) { return left.distance - right.distance; });
                    if (shortageResources[q][0].wood > 0) {
                        while (shortageResources[q][0].wood > 0) {
                            var totalWoodToTrade = 0;
                            for (let m = 0; m < merchantOrders.length; m++) {
                                totalWoodToTrade += merchantOrders[m].wood;
                                if (merchantOrders[m].wood > 0) {
                                    if (shortageResources[q][0].wood <= merchantOrders[m].wood * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "wood": shortageResources[q][0].wood }); merchantOrders[m].wood -= shortageResources[q][0].wood / 1000; shortageResources[q][0].wood = 0; }
                                    if (shortageResources[q][0].wood > merchantOrders[m].wood * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "wood": merchantOrders[m].wood * 1000 }); shortageResources[q][0].wood -= merchantOrders[m].wood * 1000; merchantOrders[m].wood = 0; }
                                }
                                if (shortageResources[q][0].wood <= 0) { break; }
                                if (m == merchantOrders.length - 1 && shortageResources[q][0].wood > 0) { totalWoodToTrade = 0; break; }
                            }
                            if (totalWoodToTrade == 0) { q = 0; break; }
                        }
                    }
                }
                for (let q = shortageResources.length - 1; q >= 0; q--) {
                    for (var d = 0; d < merchantOrders.length; d++) { merchantOrders[d].distance = checkDistance(merchantOrders[d].x, merchantOrders[d].y, villagesData[q].name.match(/(\d+)\|(\d+)/)[1], villagesData[q].name.match(/(\d+)\|(\d+)/)[2]); }
                    merchantOrders.sort(function(left, right) { return left.distance - right.distance; });
                    if (shortageResources[q][1].stone > 0) {
                        while (shortageResources[q][1].stone > 0) {
                            var totalstoneToTrade = 0;
                            for (var m = 0; m < merchantOrders.length; m++) {
                                totalstoneToTrade += merchantOrders[m].stone;
                                if (merchantOrders[m].stone > 0) {
                                    if (shortageResources[q][1].stone <= merchantOrders[m].stone * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "stone": shortageResources[q][1].stone }); merchantOrders[m].stone -= shortageResources[q][1].stone / 1000; shortageResources[q][1].stone = 0; }
                                    if (shortageResources[q][1].stone > merchantOrders[m].stone * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "stone": merchantOrders[m].stone * 1000 }); shortageResources[q][1].stone -= merchantOrders[m].stone * 1000; merchantOrders[m].stone = 0; }
                                }
                                if (shortageResources[q][1].stone <= 0) { break; }
                                if (m == merchantOrders.length - 1 && shortageResources[q][1].stone > 0) { totalstoneToTrade = 0; break; }
                            }
                            if (totalstoneToTrade == 0) { q = 0; break; }
                        }
                    }
                }
                for (let q = shortageResources.length - 1; q >= 0; q--) {
                    for (let d = 0; d < merchantOrders.length; d++) { merchantOrders[d].distance = checkDistance(merchantOrders[d].x, merchantOrders[d].y, villagesData[q].name.match(/(\d+)\|(\d+)/)[1], villagesData[q].name.match(/(\d+)\|(\d+)/)[2]); }
                    merchantOrders.sort(function(left, right) { return left.distance - right.distance; });
                    if (shortageResources[q][2].iron > 0) {
                        while (shortageResources[q][2].iron > 0) {
                            var totalironToTrade = 0;
                            for (let m = 0; m < merchantOrders.length; m++) {
                                totalironToTrade += merchantOrders[m].iron;
                                if (merchantOrders[m].iron > 0) {
                                    if (shortageResources[q][2].iron <= merchantOrders[m].iron * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "iron": shortageResources[q][2].iron }); merchantOrders[m].iron -= shortageResources[q][2].iron / 1000; shortageResources[q][2].iron = 0; }
                                    if (shortageResources[q][2].iron > merchantOrders[m].iron * 1000) { links.push({ "source": merchantOrders[m].villageID, "target": villageID[q], "iron": merchantOrders[m].iron * 1000 }); shortageResources[q][2].iron -= merchantOrders[m].iron * 1000; merchantOrders[m].iron = 0; }
                                }
                                if (shortageResources[q][2].iron <= 0) { break; }
                                if (m == merchantOrders.length - 1 && shortageResources[q][2].iron > 0) { totalironToTrade = 0; break; }
                            }
                            if (totalironToTrade == 0) { q = 0; break; }
                        }
                    }
                }

                let htmlCode = `<div id="script-container">
                    <div id="restart">${totalsAndAverages}</div>
                    <div id="automationStatus"></div>
                    <div id="sendResources" class="flex-container sophHeader" style="position: relative">
                        <button class="sophRowA collapsible" style="width: 100%;">Otwórz menu ustawień</button>
                        <div class="content submenu" style="width: 500px;height:auto;z-index:99999">
                            <form id="settingsForm">
                                <table style="border-spacing: 2px; width: 100%;">
                                    <tr><td style="padding: 6px;"><label for="isMinting">Ignoruj ustawienia</label></td><td style="padding: 6px;"><input type="checkbox" name="isMinting" ${settings.isMinting ? "checked" : ""}></td></tr>
                                    <tr><td style="padding: 6px;"><label for="lowPoints">Priorytet (pkt)</label></td><td style="padding: 6px;"><input type="range" min="0" max="13000" step="10" value="${settings.lowPoints}" class="slider" name="lowPoints" oninput="this.nextElementSibling.value=this.value"> <output>${settings.lowPoints}</output></td></tr>
                                    <tr><td style="padding: 6px;"><label for="highPoints">Ukończone wioski (pkt)</label></td><td style="padding: 6px;"><input type="range" min="0" max="13000" step="10" value="${settings.highPoints}" class="slider" name="highPoints" oninput="this.nextElementSibling.value=this.value"> <output>${settings.highPoints}</output></td></tr>
                                    <tr><td style="padding: 6px;"><label for="highFarm">Pełna farma (pop)</label></td><td style="padding: 6px;"><input type="range" min="0" max="33000" step="10" value="${settings.highFarm}" class="slider" name="highFarm" oninput="this.nextElementSibling.value=this.value"> <output>${settings.highFarm}</output></td></tr>
                                    <tr><td style="padding: 6px;"><label for="builtOutPercentage">Pojemność % (ukończone)</label></td><td style="padding: 6px;"><input type="range" min="0" max="1" step="0.01" value="${settings.builtOutPercentage}" class="slider" name="builtOutPercentage" oninput="this.nextElementSibling.value=this.value"> <output>${settings.builtOutPercentage}</output></td></tr>
                                    <tr><td style="padding: 6px;"><label for="needsMorePercentage">Pojemność % (priorytet)</label></td><td style="padding: 6px;"><input type="range" min="0" max="1" step="0.01" value="${settings.needsMorePercentage}" class="slider" name="needsMorePercentage" oninput="this.nextElementSibling.value=this.value"> <output>${settings.needsMorePercentage}</output></td></tr>
                                    <tr><td colspan="2"><hr></td></tr>
                                    <tr><td colspan="2" style="text-align:center;font-weight:bold;">Automatyzacja</td></tr>
                                    <tr><td style="padding: 6px;"><label for="autoSend">Uruchom automatyczne wysyłanie</label></td><td style="padding: 6px;"><input type="checkbox" name="autoSend" ${autoSettings.autoSend ? "checked" : ""}></td></tr>
                                    <tr><td style="padding: 6px;"><label>Odświeżaj co (minuty)</label></td><td style="padding: 6px;">Od <input type="number" name="minRefresh" value="${autoSettings.minRefresh}" style="width:50px;"> do <input type="number" name="maxRefresh" value="${autoSettings.maxRefresh}" style="width:50px;"></td></tr>
                                    <tr><td colspan="2"><input type="button" class="btn evt-confirm-btn btn-confirm-yes" value="Zapisz i uruchom ponownie" id="saveSettingsBtn"/></td></tr>
                                </table>
                            </form>
                        </div>
                    </div>
                    <table id="tableSend" width="100%" class="sophHeader">
                        <tbody id="appendHere">
                            <tr><td class="sophHeader" colspan="6" style="text-align:center">${langShinko[0]}</td><td class="sophHeader" style="text-align:center;"><button id="autoSendAllBtn" class="btn btn-sm" style="display: ${autoSettings.autoSend ? 'none' : 'inline-block'};">Wyślij wszystko</button></td></tr>
                            <tr><td class="sophHeader" width="25%" style="text-align:center">${langShinko[1]}</td><td class="sophHeader" width="25%" style="text-align:center">${langShinko[2]}</td><td class="sophHeader" width="5%" style="text-align:center">${langShinko[3]}</td><td class="sophHeader" width="10%" style="text-align:center">${langShinko[4]}</td><td class="sophHeader" width="10%" style="text-align:center">${langShinko[5]}</td><td class="sophHeader" width="10%" style="text-align:center">${langShinko[6]}</td><td class="sophHeader" width="15%"><font size="1">${langShinko[8]}</font></td></tr>
                        </tbody>
                    </table>
                </div>`;
                $("#content_value").eq(0).prepend(htmlCode);
                $("#saveSettingsBtn").on('click', saveSettings);
                $("#autoSendAllBtn").on('click', () => startAutomaticSending(false));
                makeThingsCollapsible();
                createList();
            });
        });
    }

    function createList() {
        // ... cała oryginalna logika tworzenia listy ...
        for (let i = 0; i < links.length; i++) { if (links[i].wood == undefined) links[i].wood = 0; if (links[i].stone == undefined) links[i].stone = 0; if (links[i].iron == undefined) links[i].iron = 0; }
        for (let i = 0; i < links.length; i++) {
            for (let j = i + 1; j < links.length; j++) {
                if (links[i].source == links[j].source && links[i].target == links[j].target) {
                    links[i].wood += parseInt(links[j].wood); links[j].wood = 0;
                    links[i].stone += parseInt(links[j].stone); links[j].stone = 0;
                    links[i].iron += parseInt(links[j].iron); links[j].iron = 0;
                }
            }
        }
        for (let i = 0; i < links.length; i++) { if (links[i].wood + links[i].stone + links[i].iron == 0) { links.splice(i, 1); i--; } }
        cleanLinks = [...links];
        addDistanceToArray(cleanLinks).sort(function(left, right) { return left.distance - right.distance; });
        if (cleanLinks.length === 0) { $("#appendHere").append(`<tr><td colspan="7" class="sophRowA" style="text-align:center; padding: 10px;">Brak transportów do wysłania.</td></tr>`); }

        let listHTML = ``;
        for (let i = 0; i < cleanLinks.length; i++) {
            const link = cleanLinks[i];
            const tempRow = i % 2 == 0 ? `class='sophRowB'` : `class='sophRowA'`;
            const source = villagesData.find(v => v.id == link.source);
            const target = villagesData.find(v => v.id == link.target);
            listHTML += `<tr id="send_row_${i}" ${tempRow} height="40">
                <td><a href="${source.url}" class="sophLink">${source.name}</a></td>
                <td><a href="${target.url}" class="sophLink" title="...">${target.name}</a></td>
                <td style="text-align:center">${link.distance}</td>
                <td style="text-align:center">${numberWithCommas(link.wood)}<span class="icon header wood"></span></td>
                <td style="text-align:center">${numberWithCommas(link.stone)}<span class="icon header stone"></span></td>
                <td style="text-align:center">${numberWithCommas(link.iron)}<span class="icon header iron"></span></td>
                <td style="text-align:center">
                    <input type="button" class="btn btnSophie send-res-btn" value="${langShinko[7]}"
                           data-source="${link.source}" data-target="${link.target}"
                           data-wood="${link.wood}" data-stone="${link.stone}" data-iron="${link.iron}" data-row="send_row_${i}">
                </td>
            </tr>`;
        }
        $("#appendHere").append(listHTML);

        // POPRAWNE WIĄZANIE ZDARZEŃ
        $('#tableSend').on('click', '.send-res-btn', function() {
            const btn = $(this);
            const rowId = btn.data('row');
            btn.prop('disabled', true);
            $(`#${rowId}`).css('opacity', '0.5');
            sendResource(btn.data('source'), btn.data('target'), btn.data('wood'), btn.data('stone'), btn.data('iron'));
            setTimeout(() => $(`#${rowId}`).remove(), 1000); // Usuń wiersz po chwili
        });

        // URUCHOMIENIE AUTOMATYZACJI
        if (autoSettings.autoSend) {
            startAutomaticSending(true);
        }
    }

    // NOWE FUNKCJE AUTOMATYZACJI
    async function startAutomaticSending(isAutoRefresh) {
        const buttons = $('#tableSend .send-res-btn');
        if (buttons.length === 0) {
            if (isAutoRefresh) scheduleRefresh();
            return;
        }
        $('#autoSendAllBtn').prop('disabled', true).text('Wysyłanie...');
        $('#automationStatus').text(`Automatyczne wysyłanie... Pozostało ${buttons.length} transportów.`);
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].click();
            $('#automationStatus').text(`Automatyczne wysyłanie... Pozostało ${buttons.length - (i + 1)} transportów.`);
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
        }
        if (isAutoRefresh) scheduleRefresh();
    }

    function scheduleRefresh() {
        const min = parseInt(autoSettings.minRefresh, 10);
        const max = parseInt(autoSettings.maxRefresh, 10);
        const delayMinutes = min + Math.random() * (max - min);
        const delayMillis = delayMinutes * 60 * 1000;
        const refreshTime = new Date(Date.now() + delayMillis);
        const countdownElement = $('#automationStatus');
        countdownElement.text(`Wszystko wysłane. Następne odświeżenie o ${refreshTime.toLocaleTimeString()}.`);
        const interval = setInterval(() => {
            const remaining = refreshTime - Date.now();
            if (remaining <= 0) { clearInterval(interval); window.location.reload(); }
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            countdownElement.text(`Następne odświeżenie za: ${minutes}m ${seconds}s`);
        }, 1000);
    }

    // ZMODYFIKOWANA FUNKCJA ZAPISU USTAWIEŃ
    function saveSettings() {
        const originalSettings = {
            isMinting: $('input[name="isMinting"]').is(':checked'),
            lowPoints: parseInt($('input[name="lowPoints"]').val()), highPoints: parseInt($('input[name="highPoints"]').val()),
            highFarm: parseInt($('input[name="highFarm"]').val()), builtOutPercentage: parseFloat($('input[name="builtOutPercentage"]').val()),
            needsMorePercentage: parseFloat($('input[name="needsMorePercentage"]').val())
        };
        localStorage.setItem("settingsWHBalancerSophie", JSON.stringify(originalSettings));
        const newAutoSettings = {
            autoSend: $('input[name="autoSend"]').is(':checked'), minRefresh: parseInt($('input[name="minRefresh"]').val()),
            maxRefresh: parseInt($('input[name="maxRefresh"]').val())
        };
        GM_setValue("autoBalancerSettings", newAutoSettings);
        UI.SuccessMessage("Ustawienia zapisane. Strona zostanie przeładowana.");
        setTimeout(() => window.location.reload(), 1000);
    }

    // ORYGINALNE FUNKCJE POMOCNICZE
    function makeThingsCollapsible() { $(".collapsible").off('click').on('click', function() { this.classList.toggle("active"); var content = this.nextElementSibling; if (content.style.maxHeight) { content.style.maxHeight = null; } else { content.style.maxHeight = content.scrollHeight + "px"; } }); }
    function checkDistance(x1, y1, x2, y2) { return Math.round(Math.hypot(x1 - x2, y1 - y2)); }
    function addDistanceToArray(array) { array.forEach(link => { const source = villagesData.find(v => v.id == link.source); const target = villagesData.find(v => v.id == link.target); if (source && target) { let c1 = source.name.match(/(\d+)\|(\d+)/); let c2 = target.name.match(/(\d+)\|(\d+)/); link.distance = checkDistance(c1[1], c1[2], c2[1], c2[2]); } else { link.distance = 999; } }); return array; }
    function numberWithCommas(x) { return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

    // Uruchomienie skryptu
    displayEverything();

})();
