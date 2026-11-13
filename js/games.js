/* ============================================================
   Игровые механики
   Каждая игра возвращает DOM-элемент и вызывает api.onSolve()
   при успехе.
   ============================================================ */

window.Games = (function () {
    "use strict";

    const WIN_LINES = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    function h(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function button(className, text, label) {
        const node = h("button", className, text);
        node.type = "button";
        if (label) node.setAttribute("aria-label", label);
        return node;
    }

    /* --------------------------------------------------------
       Вопрос с текстовым ответом
       -------------------------------------------------------- */
    function quiz(level, api) {
        const root = h("div", "game game--quiz");
        const form = h("form", "form");
        const input = document.createElement("input");

        input.type = "text";
        input.className = "field";
        input.placeholder = level.placeholder || "Твой ответ";
        input.autocomplete = "off";
        input.autocapitalize = "off";
        input.spellcheck = false;
        input.setAttribute("enterkeyhint", "done");
        input.setAttribute("aria-label", level.placeholder || "Ответ");

        const error = h("p", "error");
        error.setAttribute("aria-live", "polite");

        const submit = h("button", "btn btn--primary", "Проверить");
        submit.type = "submit";

        form.appendChild(input);
        form.appendChild(error);
        form.appendChild(submit);
        root.appendChild(form);

        let attempts = 0;
        let solved = false;

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (solved) return;

            const value = input.value;
            if (!value.trim()) {
                error.textContent = "Напиши хотя бы слово ✦";
                return;
            }

            const given = QU.normalize(value);
            const answers = (level.answers || []).map(QU.normalize);

            if (answers.indexOf(given) !== -1) {
                solved = true;
                input.disabled = true;
                submit.disabled = true;
                submit.textContent = "Верно ✦";
                error.textContent = "";
                api.onSolve();
                return;
            }

            attempts += 1;
            Sound.error();
            QU.vibrate([25, 35, 25]);
            api.shake();

            if (attempts >= 2) {
                error.textContent = "Пока не то. Загляни в подсказку ниже.";
                if (attempts === 3) api.revealHint();
            } else {
                error.textContent = "Не то. Попробуй ещё раз.";
            }

            input.select();
        });

        if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
            window.setTimeout(function () {
                input.focus({ preventScroll: true });
            }, 350);
        }

        return root;
    }

    /* --------------------------------------------------------
       Кодовый замок
       -------------------------------------------------------- */
    function lock(level, api) {
        const root = h("div", "game game--lock");
        const code = String(level.code || "").replace(/\D/g, "");
        const dots = h("div", "lock__dots");
        const pad = h("div", "keypad");

        let value = "";
        let solved = false;

        dots.setAttribute("role", "status");
        dots.setAttribute("aria-label", "Введено цифр: 0 из " + code.length);

        for (let i = 0; i < code.length; i++) {
            dots.appendChild(h("span", "lock__dot"));
        }

        function paint() {
            QU.$$(".lock__dot", dots).forEach(function (dot, index) {
                dot.textContent = value[index] || "";
                dot.classList.toggle("is-filled", Boolean(value[index]));
            });
            dots.setAttribute(
                "aria-label",
                "Введено цифр: " + value.length + " из " + code.length
            );
        }

        function check() {
            if (value === code) {
                solved = true;
                api.onSolve();
                return;
            }

            Sound.error();
            QU.vibrate([30, 40, 30]);
            api.shake();
            root.classList.add("shake");

            window.setTimeout(function () {
                value = "";
                paint();
                root.classList.remove("shake");
            }, 430);
        }

        function press(digit) {
            if (solved || value.length >= code.length) return;
            value += digit;
            Sound.click();
            paint();
            if (value.length === code.length) {
                window.setTimeout(check, 140);
            }
        }

        for (let digit = 1; digit <= 9; digit++) {
            (function (d) {
                const key = h("button", "key", String(d));
                key.type = "button";
                key.setAttribute("aria-label", "Цифра " + d);
                key.addEventListener("click", function () { press(String(d)); });
                pad.appendChild(key);
            })(digit);
        }

        const clear = h("button", "key key--ghost", "Сброс");
        clear.type = "button";
        clear.setAttribute("aria-label", "Сбросить код");
        clear.addEventListener("click", function () {
            if (solved) return;
            value = "";
            Sound.click();
            paint();
        });
        pad.appendChild(clear);

        const zero = h("button", "key", "0");
        zero.type = "button";
        zero.setAttribute("aria-label", "Цифра 0");
        zero.addEventListener("click", function () { press("0"); });
        pad.appendChild(zero);

        const back = h("button", "key key--ghost", "⌫");
        back.type = "button";
        back.setAttribute("aria-label", "Удалить последнюю цифру");
        back.addEventListener("click", function () {
            if (solved) return;
            value = value.slice(0, -1);
            Sound.click();
            paint();
        });
        pad.appendChild(back);

        root.appendChild(dots);
        root.appendChild(pad);
        paint();

        return root;
    }

    /* --------------------------------------------------------
       Найди пары
       -------------------------------------------------------- */
    function memory(level, api) {
        const root = h("div", "game game--memory");
        const grid = h("div", "memory");
        const pairs = level.pairs || [];

        root.appendChild(grid);
        grid.setAttribute("role", "group");
        grid.setAttribute("aria-label", "Игра «найди пары»");

        const cards = [];

        pairs.forEach(function (pair) {
            for (let copy = 0; copy < 2; copy++) {
                cards.push({ pair: pair, copy: copy });
            }
        });

        let first = null;
        let second = null;
        let locked = false;
        let matched = 0;

        function unflip(card) {
            card.classList.remove("is-flipped");
            card.setAttribute("aria-label", "Закрытая карточка");
        }

        function makeCard(entry) {
            const card = button("mem", null, "Закрытая карточка");
            const inner = h("span", "mem__inner");
            const back = h("span", "mem__face mem__face--back", "✦");
            const front = h("span", "mem__face mem__face--front");

            back.setAttribute("aria-hidden", "true");
            front.setAttribute("aria-hidden", "true");

            if (entry.pair.image) {
                const img = document.createElement("img");
                img.src = entry.pair.image;
                img.alt = "";
                img.loading = "lazy";
                front.appendChild(img);
            } else {
                front.textContent = entry.pair.emoji || "✦";
            }

            card.dataset.pair = entry.pair.id || entry.pair.label || String(pairs.indexOf(entry.pair));
            card.dataset.label = entry.pair.label || "";

            inner.appendChild(back);
            inner.appendChild(front);
            card.appendChild(inner);

            card.addEventListener("click", function () {
                if (locked || card.classList.contains("is-flipped")) return;
                if (card.classList.contains("is-matched")) return;

                card.classList.add("is-flipped");
                card.setAttribute("aria-label", "Карточка: " + (entry.pair.label || "открыта"));
                Sound.flip();

                if (!first) {
                    first = card;
                    return;
                }

                second = card;
                locked = true;

                if (first.dataset.pair === second.dataset.pair) {
                    matched += 1;
                    const a = first;
                    const b = second;

                    window.setTimeout(function () {
                        a.classList.add("is-matched");
                        b.classList.add("is-matched");
                        a.disabled = true;
                        b.disabled = true;
                        first = null;
                        second = null;
                        locked = false;

                        if (matched === pairs.length) {
                            window.setTimeout(function () {
                                api.onSolve();
                            }, 520);
                        }
                    }, 420);
                } else {
                    QU.vibrate(18);
                    window.setTimeout(function () {
                        if (!first || !second) return;
                        unflip(first);
                        unflip(second);
                        first = null;
                        second = null;
                        locked = false;
                    }, 900);
                }
            });

            return card;
        }

        QU.shuffle(cards).forEach(function (entry) {
            grid.appendChild(makeCard(entry));
        });

        return root;
    }

    /* --------------------------------------------------------
       Собери слово из букв
       -------------------------------------------------------- */
    function word(level, api) {
        const root = h("div", "game game--word");
        const target = String(level.word || "").toUpperCase().replace(/[^А-ЯЁA-Z]/g, "");
        const tiles = target.split("").map(function (char, index) {
            return { id: index, char: char };
        });

        const slotsEl = h("div", "word__slots");
        const keysEl = h("div", "word__keys");
        const actions = h("div", "word__actions");

        const backspace = button("word__action", "⌫ Стереть", "Стереть последнюю букву");
        const shuffleBtn = button("word__action", "⇄ Перемешать", "Перемешать буквы");

        actions.appendChild(backspace);
        actions.appendChild(shuffleBtn);
        root.appendChild(slotsEl);
        root.appendChild(keysEl);
        root.appendChild(actions);

        let order = QU.shuffle(tiles);
        let slots = new Array(target.length).fill(null);
        let locked = false;
        let solved = false;

        function isUsed(tileId) {
            return slots.indexOf(tileId) !== -1;
        }

        function renderSlots() {
            slotsEl.innerHTML = "";
            slots.forEach(function (tileId, index) {
                const tile = tileId == null ? null : tiles[tileId];
                const slot = button(
                    "word__slot" + (tile ? " is-filled" : ""),
                    tile ? tile.char : "",
                    tile ? "Убрать букву " + tile.char : "Пустая клетка " + (index + 1)
                );
                slot.dataset.index = String(index);
                slotsEl.appendChild(slot);
            });
        }

        function renderKeys() {
            keysEl.innerHTML = "";
            order.forEach(function (tile) {
                const key = button("word__key", tile.char, "Буква " + tile.char);
                key.dataset.tile = String(tile.id);
                key.disabled = solved || isUsed(tile.id);
                keysEl.appendChild(key);
            });
        }

        function render() {
            renderSlots();
            renderKeys();
        }

        function validate() {
            const guess = slots.map(function (id) {
                return tiles[id].char;
            }).join("");

            if (guess === target) {
                solved = true;
                locked = true;
                render();
                api.onSolve();
                return;
            }

            Sound.error();
            QU.vibrate([30, 40, 30]);
            api.shake();
            root.classList.add("shake");

            locked = true;
            window.setTimeout(function () {
                slots = new Array(target.length).fill(null);
                locked = false;
                root.classList.remove("shake");
                render();
            }, 560);
        }

        function place(tileId) {
            if (locked || solved || isUsed(tileId)) return;

            const empty = slots.indexOf(null);
            if (empty === -1) return;

            slots[empty] = tileId;
            Sound.click();
            render();

            if (slots.indexOf(null) === -1) {
                locked = true;
                window.setTimeout(validate, 180);
            }
        }

        function removeAt(index) {
            if (locked || solved || slots[index] == null) return;
            slots[index] = null;
            Sound.click();
            render();
        }

        slotsEl.addEventListener("click", function (event) {
            const slot = event.target.closest(".word__slot");
            if (!slot) return;
            removeAt(Number(slot.dataset.index));
        });

        keysEl.addEventListener("click", function (event) {
            const key = event.target.closest(".word__key");
            if (!key || key.disabled) return;
            place(Number(key.dataset.tile));
        });

        backspace.addEventListener("click", function () {
            if (locked || solved) return;
            for (let i = slots.length - 1; i >= 0; i--) {
                if (slots[i] != null) {
                    slots[i] = null;
                    Sound.click();
                    render();
                    return;
                }
            }
        });

        shuffleBtn.addEventListener("click", function () {
            if (locked || solved) return;
            order = QU.shuffle(order);
            Sound.click();
            renderKeys();
        });

        render();
        return root;
    }

    /* --------------------------------------------------------
       Крестики-нолики (добрый ИИ: иногда ошибается)
       -------------------------------------------------------- */
    function ttt(level, api) {
        const root = h("div", "game game--ttt");
        const boardEl = h("div", "ttt");
        const status = h("p", "ttt__status", "Твой ход");
        const reset = button("btn btn--ghost btn--small", "Сыграть ещё раз");

        boardEl.setAttribute("role", "group");
        boardEl.setAttribute("aria-label", "Крестики-нолики");
        status.setAttribute("aria-live", "polite");
        reset.hidden = true;

        let board = new Array(9).fill("");
        let active = true;
        let solved = false;
        let cells = [];

        function paint() {
            cells.forEach(function (cell, index) {
                cell.textContent = board[index] === "X" ? "✕" : board[index] === "O" ? "○" : "";
                cell.classList.toggle("is-o", board[index] === "O");
                cell.setAttribute(
                    "aria-label",
                    "Клетка " + (index + 1) + ": " +
                    (board[index] === "X" ? "крестик" : board[index] === "O" ? "нолик" : "пусто")
                );
            });
        }

        function winningLine(player) {
            for (let i = 0; i < WIN_LINES.length; i++) {
                const line = WIN_LINES[i];
                if (board[line[0]] === player && board[line[1]] === player && board[line[2]] === player) {
                    return line;
                }
            }
            return null;
        }

        function highlight(line) {
            line.forEach(function (index) {
                cells[index].classList.add("is-win");
            });
        }

        function resetGame() {
            board = new Array(9).fill("");
            active = true;
            solved = false;
            cells.forEach(function (cell) {
                cell.disabled = false;
                cell.classList.remove("is-win");
            });
            reset.hidden = true;
            status.textContent = "Твой ход";
            paint();
        }

        function finishWin() {
            const line = winningLine("X");
            if (!line) return false;
            highlight(line);
            active = false;
            solved = true;
            status.textContent = "Три в ряд! ✦";
            window.setTimeout(function () {
                api.onSolve();
            }, 750);
            return true;
        }

        function aiMove() {
            if (solved) return;

            const free = board.map(function (value, index) {
                return value === "" ? index : null;
            }).filter(function (value) { return value !== null; });

            if (!free.length) return;

            let move = null;

            // Добрый ИИ: в трети случаев играет случайно,
            // чтобы у игрока всегда был шанс выиграть.
            if (Math.random() < 0.32) {
                move = free[Math.floor(Math.random() * free.length)];
            } else {
                move = bestMove("O") ?? bestMove("X");
                if (move == null && board[4] === "") move = 4;
                if (move == null) {
                    const corners = [0, 2, 6, 8].filter(function (i) { return board[i] === ""; });
                    if (corners.length) move = corners[Math.floor(Math.random() * corners.length)];
                }
                if (move == null) move = free[Math.floor(Math.random() * free.length)];
            }

            board[move] = "O";
            paint();
            Sound.click();

            if (winningLine("O")) {
                highlight(winningLine("O"));
                active = false;
                status.textContent = "Я выиграл. Но ты можешь ещё раз 😉";
                reset.hidden = false;
                QU.vibrate(30);
                return;
            }

            if (board.indexOf("") === -1) {
                active = false;
                status.textContent = "Ничья. Сыграем ещё?";
                reset.hidden = false;
                return;
            }

            active = true;
            status.textContent = "Твой ход";
        }

        function bestMove(player) {
            for (let i = 0; i < WIN_LINES.length; i++) {
                const line = WIN_LINES[i];
                const values = line.map(function (index) { return board[index]; });
                const playerCount = values.filter(function (v) { return v === player; }).length;
                const emptyCount = values.filter(function (v) { return v === ""; }).length;

                if (playerCount === 2 && emptyCount === 1) {
                    return line[values.indexOf("")];
                }
            }
            return null;
        }

        function playerMove(index) {
            if (!active || solved || board[index] !== "") return;

            board[index] = "X";
            paint();
            Sound.click();

            if (finishWin()) return;

            if (board.indexOf("") === -1) {
                active = false;
                status.textContent = "Ничья. Сыграем ещё?";
                reset.hidden = false;
                return;
            }

            active = false;
            status.textContent = "Думаю…";
            window.setTimeout(function () {
                if (!root.isConnected) return;
                aiMove();
            }, 420);
        }

        for (let index = 0; index < 9; index++) {
            (function (i) {
                const cell = button("ttt__cell", "", "Клетка " + (i + 1) + ": пусто");
                cell.addEventListener("click", function () { playerMove(i); });
                cells.push(cell);
                boardEl.appendChild(cell);
            })(index);
        }

        reset.addEventListener("click", resetGame);

        root.appendChild(boardEl);
        root.appendChild(status);
        root.appendChild(reset);
        paint();

        return root;
    }

    return {
        quiz: quiz,
        lock: lock,
        memory: memory,
        word: word,
        ttt: ttt
    };
})();
