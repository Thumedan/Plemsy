// ==UserScript==
// @name         Zegar MS
// @namespace    PLEMIONA
// @version      1.0
// @description  Adds milliseconds to server time display in Plemionach
// @author       Original by Pinky and the Brain, Ercho; Adapted for Tampermonkey
// @match        *://*.plemiona.pl/*
// @downloadURL  https://raw.githubusercontent.com/Thumedan/Plemsy/main/Zegar%20MS.user.js
// @updateURL    https://raw.githubusercontent.com/Thumedan/Plemsy/main/Zegar%20MS.user.js
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    function waitForElement(selector, callback) {
        if (document.querySelector(selector)) {
            callback();
        } else {
            setTimeout(function() {
                waitForElement(selector, callback);
            }, 100);
        }
    }

    waitForElement('#serverTime', function() {
        var serverTime = $('#serverTime');
        serverTime.css('font-size', '20px');
        serverTime.css('text-shadow', '1px 1px #3e3e3e');

        function getTimeStringWithMilliseconds(timestamp, t) {
            var dateObject = new Date(Math.round(window.Timing.getCurrentServerTime() + window.server_utc_diff));
            timestamp = Math.floor(timestamp);
            var hours = Math.floor(timestamp / 3600);
            t && (hours %= 24);
            var minutes = Math.floor(timestamp / 60) % 60,
                seconds = timestamp % 60,
                milliseconds = Math.floor(dateObject.getMilliseconds() / 1e2) % 10,
                hoursFormatted = hours + ':';
            return minutes < 10 && (hoursFormatted += '0'), hoursFormatted += minutes + ':', seconds < 10 && (hoursFormatted += '0'), hoursFormatted += seconds, hoursFormatted += ':' + milliseconds;
        }

        var vendors = ['webkit', 'moz'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame =
                window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        var interval     =    1e3,
            lastTime     =    (new Date()).getTime(),
            currentTime  =    0,
            delta = 0;

        function milisecondsTimer() {
            window.requestAnimationFrame(milisecondsTimer);

            currentTime = (new Date()).getTime();
            delta = (currentTime-lastTime);

            if(delta > interval) {
                serverTime.text(getTimeStringWithMilliseconds(window.Timing.getCurrentServerTime() / 1e3 + window.server_utc_diff, !0));
            }
        }

        if (serverTime.length) {
            window.Timing.tickHandlers.serverTime.tick = function () {}
            milisecondsTimer();
        }
    });
})();