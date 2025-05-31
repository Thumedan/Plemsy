// ==UserScript==
// @name                Snajper
// @version     	    1.0
// @description         Planuj ataki i wsparcia, zoptymalizowane pod kątem maksymalnej precyzji. Używa Service Workerów przeglądarki. Wyświetla licznik do wysłania.
// @author              KUKI (z modyfikacjami)
// @icon                https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiHwVUssXEmxpfbbQyX4dkysx69ogUuid3s4xfDb0QIIBom3XC7F3v1beXEJjgp-MaAVfmcF83hvBQtRITZugnA4ie5btSdEd7GmwgteVv8oOGrAP8roAUS7VTlXdqHTq0MAhfdkpExBjQ/s0/Flag_of_Poland.gif
// @match               https://*.plemiona.pl/game.php?village=*&screen=place&try=confirm*
// @downloadURL         https://raw.githubusercontent.com/Thumedan/Plemsy/main/Snajper.user.js
// @updateURL           https://raw.githubusercontent.com/Thumedan/Plemsy/main/Snajper.user.js
// @grant               GM_addStyle
// @supportURL https://github.com/Thumedan/Plemsy/issues
// ==/UserScript==

(async (ModuleLoader) => {
    'use strict';

    //****************************** Konfiguracja ******************************//
    const defaultInternetDelay = 30;
    const worldBackwardDelay = 50;
    const loopStartTime = 1500;
    //*************************** Koniec Konfiguracji ***************************//

    // Dependency loading
    try {
        await ModuleLoader.loadModule('utils/notify-utils');
    } catch (e) {
        console.warn('ACS: Nie udało się załadować utils/notify-utils, niektóre powiadomienia mogą nie działać.', e);
    }


    // Controls the window title
    if (typeof TwFramework !== 'undefined' && TwFramework.setIdleTitlePreffix) {
        TwFramework.setIdleTitlePreffix('WYSYŁANIE', document.title);
    } else {
        console.warn('ACS: TwFramework lub setIdleTitlePreffix nie jest dostępne.');
    }


    const CommandSender = {
        confirmButton: null,
        duration: null,
        dateNow: null,
        internetDelay: null,
        sent: false,
        timerIntervalId: null, // Do przechowywania ID interwału licznika
        attackTimeForTimer: null, // Do przechowywania czasu wysłania dla licznika

        init: function () {
            // Create some Html
            $($('#command-data-form').find('tbody')[0]).append(
                `<tr>
                    <td>Czas dotarcia:</td><td><input type="datetime-local" id="ACStime" step=".001"></td>
                 </tr>
                 <tr>
                    <td>Opóźnienie sieciowe (ms):</td>
                    <td><input type="number" id="ACSInternetDelay"><button type="button" id="ACSbutton" class="btn">Potwierdź</button></td>
                 </tr>
                 <tr>
                    <td>Czas do wysłania:</td><td id="ACSTimerDisplay" style="font-weight: bold; color: #2a9fd6;">--:--:--</td>
                 </tr>` // Dodano miejsce na licznik
            );
            this.confirmButton = $('#troop_confirm_submit');

            const durationText = $('#command-data-form').find('td:contains("Trwanie:")').next().text().trim();
            if (durationText) {
                this.duration = durationText.split(':').map(Number);
                if (this.duration.some(isNaN) || (this.duration.length !== 3 && this.duration.length !== 2 && this.duration.length !==1) ) {
                    console.error('ACS: Błąd parsowania czasu trwania. Odczytano:', durationText, 'Wynik:', this.duration, '. Używam [0,0,0].');
                    this.duration = [0,0,0];
                } else if (this.duration.length === 1) {
                    this.duration = [0, 0, this.duration[0]];
                } else if (this.duration.length === 2) {
                    this.duration = [0, this.duration[0], this.duration[1]];
                }
            } else {
                console.error('ACS: Nie znaleziono tekstu czasu trwania obok etykiety "Trwanie:". Używam [0,0,0].');
                this.duration = [0,0,0];
            }

            this.internetDelay = localStorage.getItem('ACS.internetDelay') || defaultInternetDelay;
            this.dateNow = this.convertToInput((() => {
                var d;
                if (typeof Timing !== 'undefined' && Timing.getCurrentServerTime) {
                    d = new Date(Timing.getCurrentServerTime());
                } else {
                    d = new Date();
                    console.warn("ACS: Timing.getCurrentServerTime() niedostępne. Używam czasu lokalnego.");
                }
                d.setSeconds(d.getSeconds() + 10);
                d.setMilliseconds(501);
                return d;
            })());
            $('#ACSInternetDelay').val(this.internetDelay);
            $('#ACStime').val(this.dateNow);

            $('#ACSbutton').click(function () {
                CommandSender.sent = false;
                CommandSender.attackTimeForTimer = CommandSender.getAttackTime(); // Zapisz czas ataku dla timera

                if (!CommandSender.attackTimeForTimer || isNaN(CommandSender.attackTimeForTimer.getTime())) {
                    alert("Błąd: Nieprawidłowy czas dotarcia lub czas trwania. Nie można obliczyć czasu wysłania.");
                    console.error("ACS: getAttackTime() zwróciło nieprawidłową datę. Anulowanie.", CommandSender.attackTimeForTimer);
                    $('#ACSTimerDisplay').text('Błąd czasu').css('color', 'red');
                    return;
                }

                CommandSender.internetDelay = parseInt($('#ACSInternetDelay').val());
                localStorage.setItem('ACS.internetDelay', CommandSender.internetDelay);
                CommandSender.confirmButton.addClass('btn-disabled');
                $(this).prop('disabled', true);
                $('#ACSTimerDisplay').text('Uruchamianie...').css('color', '#2a9fd6');


                const serverTimeNow = (typeof Timing !== 'undefined' && Timing.getCurrentServerTime) ? Timing.getCurrentServerTime() : new Date().getTime();
                const timeToWait = (CommandSender.attackTimeForTimer.getTime() - serverTimeNow) - loopStartTime;

                if (timeToWait < -loopStartTime * 2) {
                    alert("Błąd: Obliczony czas wysłania jest w przeszłości. Popraw czas dotarcia.");
                    console.error("ACS: Czas wysłania jest w przeszłości. Anulowanie.", new Date(CommandSender.attackTimeForTimer.getTime()), new Date(serverTimeNow));
                    CommandSender.confirmButton.removeClass('btn-disabled');
                    $('#ACSbutton').prop('disabled', false);
                    $('#ACSTimerDisplay').text('Czas minął!').css('color', 'red');
                    if (CommandSender.timerIntervalId) clearInterval(CommandSender.timerIntervalId);
                    return;
                }

                // Uruchom licznik
                CommandSender.startTimerDisplay();

                setTimeout(function () {
                    console.log('ACS: Rozpoczynanie pętli o = ', new Date().toISOString());
                    ((day, hour, minute, second, millisecond) => {
                        if (isNaN(second) || isNaN(millisecond)) {
                            console.error('ACS: Krytyczny błąd - sekundy lub milisekundy to NaN przed pętlą. attackTime:', CommandSender.attackTimeForTimer.toISOString());
                            alert("Błąd krytyczny: Nie udało się ustalić sekund/milisekund wysłania.");
                            CommandSender.confirmButton.removeClass('btn-disabled');
                            $('#ACSbutton').prop('disabled', false);
                            $('#ACSTimerDisplay').text('Błąd krytyczny!').css('color', 'red');
                            if (CommandSender.timerIntervalId) clearInterval(CommandSender.timerIntervalId);
                            return;
                        }
                        console.log('ACS: Celowana sekunda wysłania = ', second);
                        console.log('ACS: Celowana milisekunda wysłania = ', millisecond);
                        console.log('ACS: Opóźnienie internetu = ', CommandSender.internetDelay);
                        if (typeof Timing !== 'undefined') {
                            console.log('ACS: Przesunięcie od serwera (Timing.offset_from_server) = ', Timing.offset_from_server);
                        }

                        var _nextFn = () => {
                            const realOffset = parseInt(CommandSender.internetDelay) - worldBackwardDelay;
                            const currentServerTimeWithOffset = CommandSender.createServerDate(realOffset);

                            if (currentServerTimeWithOffset.getSeconds() >= second) {
                                _nextFn = () => {
                                    const realDate = CommandSender.createServerDate(realOffset);
                                    if (realDate.getMilliseconds() >= millisecond) {
                                        if (CommandSender.sent === true) {
                                            return true;
                                        }
                                        CommandSender.sent = true;
                                        CommandSender.confirmButton.click();
                                        console.log('ACS: ROZKAZ WYSŁANY o ', realDate.toISOString(), '.');
                                        $('#ACSTimerDisplay').text('Wysłano!').css('color', 'green');
                                        if (CommandSender.timerIntervalId) clearInterval(CommandSender.timerIntervalId);
                                        return true;
                                    }
                                    return false;
                                };
                                return _nextFn();
                            }
                            return false;
                        };

                        (() => {
                            const initialServerTime = (typeof Timing !== 'undefined' && Timing.getCurrentServerTime) ? Timing.getCurrentServerTime() : new Date().getTime();
                            console.log('ACS: PĘTLA WORKERA STARTUJE O (czas serwera) = ', new Date(initialServerTime).toISOString());
                            const blob = new Blob([`
                                const interval = setInterval(() => postMessage('tick'), 1);
                                self.onmessage = (e) => {
                                    if (e.data === 'stop') {
                                        clearInterval(interval);
                                        close();
                                    }
                                };
                            `], { type: 'application/javascript' });
                            const worker = new Worker(window.URL.createObjectURL(blob));
                            let _is_Done = false;
                            worker.onmessage = function () {
                                if (_is_Done) {
                                    if (typeof UI !== 'undefined' && UI.Notification) {
                                        UI.Notification.show("https://dsbr.innogamescdn.com/asset/c092731a/graphic/unit/recruit/axe.png", 'Gratulacje!', 'Twój rozkaz został pomyślnie wysłany!');
                                    } else {
                                        alert('Gratulacje! Twój rozkaz został pomyślnie wysłany!');
                                    }
                                    worker.postMessage('stop');
                                    CommandSender.confirmButton.removeClass('btn-disabled');
                                    $('#ACSbutton').prop('disabled', false);
                                    // Timer jest już zatrzymywany w _nextFn po wysłaniu
                                    return;
                                }
                                _is_Done = _nextFn();
                            };
                            worker.onerror = function(errorEvent) {
                                console.error('ACS: Błąd workera:', errorEvent);
                                alert('Wystąpił błąd z Web Workerem. Szczegóły w konsoli.');
                                CommandSender.confirmButton.removeClass('btn-disabled');
                                $('#ACSbutton').prop('disabled', false);
                                $('#ACSTimerDisplay').text('Błąd workera!').css('color', 'red');
                                if (CommandSender.timerIntervalId) clearInterval(CommandSender.timerIntervalId);
                                if (worker) worker.terminate();
                            };

                        })();
                    })(
                        CommandSender.attackTimeForTimer.getDay(),
                        CommandSender.attackTimeForTimer.getHours(),
                        CommandSender.attackTimeForTimer.getMinutes(),
                        CommandSender.attackTimeForTimer.getSeconds(),
                        CommandSender.attackTimeForTimer.getMilliseconds()
                    );
                }, (timeToWait > 0 ? timeToWait : 0));
            });
        },

        formatTimeRemaining: function(milliseconds) {
            if (milliseconds < 0) milliseconds = 0;
            let totalSeconds = Math.floor(milliseconds / 1000);
            let hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;
            let minutes = Math.floor(totalSeconds / 60);
            let seconds = totalSeconds % 60;

            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        },

        updateTimerDisplay: function() {
            if (!CommandSender.attackTimeForTimer || isNaN(CommandSender.attackTimeForTimer.getTime())) {
                $('#ACSTimerDisplay').text('--:--:--').css('color', '#2a9fd6');
                if (CommandSender.timerIntervalId) clearInterval(CommandSender.timerIntervalId);
                return;
            }

            const now = (typeof Timing !== 'undefined' && Timing.getCurrentServerTime) ? Timing.getCurrentServerTime() : new Date().getTime();
            const timeLeft = CommandSender.attackTimeForTimer.getTime() - now;

            if (timeLeft <= 0) {
                $('#ACSTimerDisplay').text('00:00:00').css('color', 'orange'); // lub 'Wysyłanie...'
                // Nie zatrzymuj tutaj interwału, bo pętla wysyłania powinna to obsłużyć
            } else {
                $('#ACSTimerDisplay').text(CommandSender.formatTimeRemaining(timeLeft)).css('color', '#2a9fd6');
            }
        },

        startTimerDisplay: function() {
            if (this.timerIntervalId) {
                clearInterval(this.timerIntervalId);
            }
            this.updateTimerDisplay(); // Wywołaj od razu, aby nie było opóźnienia 1s
            this.timerIntervalId = setInterval(this.updateTimerDisplay, 1000);
        },


        getAttackTime: function () {
            var arrivalTimeStr = $('#ACStime').val();
            if (!arrivalTimeStr) {
                console.error("ACS: [getAttackTime] Pusty czas dotarcia.");
                return new Date(NaN);
            }
            var d = new Date(arrivalTimeStr.replace('T', ' '));

            if (isNaN(d.getTime())) {
                 console.error("ACS: [getAttackTime] Nieprawidłowy format czasu dotarcia w inpucie:", arrivalTimeStr);
                 return d;
            }
            if (!this.duration || this.duration.some(isNaN)) {
                console.error("ACS: [getAttackTime] Nieprawidłowy this.duration:", this.duration);
                return new Date(NaN);
            }

            d.setHours(d.getHours() - this.duration[0]);
            d.setMinutes(d.getMinutes() - this.duration[1]);
            d.setSeconds(d.getSeconds() - this.duration[2]);
            return d;
        },
        createServerDate: function (delay) {
            let serverTime;
            if (typeof Timing !== 'undefined' && Timing.getCurrentServerTime) {
                serverTime = Timing.getCurrentServerTime();
            } else {
                serverTime = new Date().getTime();
            }
            return new Date(serverTime + (delay || 0));
        },
        convertToInput: function (t) {
            if (isNaN(t.getTime()) || !this.duration || this.duration.some(isNaN)) {
                console.error("ACS: [convertToInput] Błędna data lub czas trwania. Data:", t, "Trwanie:", this.duration);
                const nowPlusMinute = new Date();
                nowPlusMinute.setMinutes(nowPlusMinute.getMinutes() + 1);
                t = nowPlusMinute;
            } else {
                t = new Date(t.getTime());
                t.setHours(t.getHours() + this.duration[0]);
                t.setMinutes(t.getMinutes() + this.duration[1]);
                t.setSeconds(t.getSeconds() + this.duration[2]);
            }

            const a = {
                y: t.getFullYear(),
                m: t.getMonth() + 1,
                d: t.getDate(),
                time: t.toTimeString().split(' ')[0],
                ms: t.getMilliseconds()
            };
            if (a.m < 10) { a.m = '0' + a.m; }
            if (a.d < 10) { a.d = '0' + a.d; }

            let msStr = a.ms.toString();
            while (msStr.length < 3) { msStr = '0' + msStr; }

            return a.y + '-' + a.m + '-' + a.d + 'T' + a.time + '.' + msStr;
        },
        addGlobalStyle: function (css) {
            if (typeof GM_addStyle !== 'undefined') {
                GM_addStyle(css);
            } else {
                var head, style;
                head = document.getElementsByTagName('head')[0];
                if (!head) { return; }
                style = document.createElement('style');
                style.type = 'text/css';
                style.innerHTML = css;
                head.appendChild(style);
            }
        }
    };

    CommandSender.addGlobalStyle('#ACStime, #ACSInternetDelay {font-size: 9pt;font-family: Verdana,Arial;}#ACSbutton {float:right;} #ACSTimerDisplay {padding-top: 5px;}'); // Dodano padding do timera

    const _temporaryLoop = setInterval(function () {
        if (document.getElementById('command-data-form') &&
            typeof jQuery !== 'undefined' &&
            $('#command-data-form').find('td:contains("Trwanie:")').next().text().trim() !== "" &&
            typeof Timing !== 'undefined' && Timing.getCurrentServerTime) {
            CommandSender.init();
            clearInterval(_temporaryLoop);
        }
    }, 100);

})({
    loadModule: moduleName => {
        return new Promise((resolve, reject) => {
            const modulePath = moduleName.replace('.', '/');
            const moduleUrl = `https://raw.githubusercontent.com/joaovperin/TribalWars/master/Modules/${modulePath}.js`;
            console.debug('[TwScripts] Ładowanie ', modulePath, ' z URL ', moduleUrl, '...');
            return $.ajax({
                    method: "GET",
                    url: moduleUrl,
                    dataType: "text"
                }).done(res => {
                    try {
                        resolve(eval(res));
                    } catch(e) {
                        console.error("[TwScripts] Błąd wykonania modułu '", moduleName, "'.", e);
                        reject(e);
                    }
                })
                .fail(req => reject(console.error("[TwScripts] Błąd ładowania modułu '", moduleName, "'.")));
        });
    }
});