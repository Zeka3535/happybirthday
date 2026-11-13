/* ============================================================
   Игровые механики · версия 2026.2
   Шесть новых игр. Каждая возвращает DOM-элемент и вызывает
   api.onSolve() при успехе.
   ============================================================ */

window.Games = (function () {
    "use strict";

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

    function statusBar(text) {
        const node = h("p", "game__status", text);
        node.setAttribute("aria-live", "polite");
        return node;
    }

    const REDUCED = function () {
        return QU.prefersReducedMotion();
    };

    const GLYPH = {
        sun: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6.2" fill="#ffb020"/><g fill="none" stroke="#f08a00" stroke-width="2.4" stroke-linecap="round"><path d="M16 2.8v3.4M16 25.8v3.4M2.8 16h3.4M25.8 16h3.4"/><path d="M6.6 6.6l2.4 2.4M23 23l2.4 2.4M6.6 25.4 9 23M23 9l2.4-2.4"/></g></svg>',
        moon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#f3c14b" d="M20 5.2A10.2 10.2 0 1 0 26.6 21 8.4 8.4 0 0 1 20 5.2Z"/><circle cx="13" cy="12" r="1.1" fill="#fff6d2"/><circle cx="10.5" cy="16.5" r="0.7" fill="#fff6d2"/></svg>',
        star: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#ffd24a" d="M16 3.2 19.2 12l9.2.6-7 5.8 2.2 8.8L16 22.2 8.4 27.2l2.2-8.8-7-5.8 9.2-.6Z"/><path fill="#fff3c4" d="M16 7.2 17.6 12h4.8l-3.8 3 1.4 4.6L16 16.8l-3.8 2.8 1.4-4.6-3.8-3h4.8Z"/></svg>',
        heart: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#e8567c" d="M16 27S6 20.6 6 13.8A5.6 5.6 0 0 1 16 10a5.6 5.6 0 0 1 10 3.8C26 20.6 16 27 16 27Z"/><path fill="#ffd0dc" d="M12.2 13.2a2.2 2.2 0 0 1 2.4-1.6 3 3 0 0 1 .8 2.2 6 6 0 0 1-3.2-.6Z"/></svg>',
        flower: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="7.2" r="4.3" fill="#ff7aa2"/><circle cx="23.6" cy="12.6" r="4.3" fill="#ff8eb3"/><circle cx="20.6" cy="21.4" r="4.3" fill="#ff6b98"/><circle cx="11.4" cy="21.4" r="4.3" fill="#ff8eb3"/><circle cx="8.4" cy="12.6" r="4.3" fill="#ff7aa2"/><circle cx="16" cy="15.2" r="3.3" fill="#ffd24a"/></svg>',
        drop: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#4aa3e8" d="M16 4.5c5 6.4 8.2 10.6 8.2 14.6a8.2 8.2 0 1 1-16.4 0C7.8 15.1 11 11 16 4.5Z"/><path fill="#d7f1ff" d="M12.2 16.5a3.2 3.2 0 0 1 3-2.6 2.2 2.2 0 0 1 .4 2.4 5 5 0 0 1-3.4.2Z"/></svg>',
        gift: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="14" width="22" height="13" rx="2" fill="#e8567c"/><rect x="4" y="10" width="24" height="5.5" rx="1.4" fill="#ff8aab"/><rect x="14.2" y="10" width="3.6" height="17" fill="#ffd24a"/><path fill="#ffd24a" d="M16 10.2c-1.6-3.6-6.2-3.4-6.2-.6 0 2.2 3.4 2.6 6.2.6 2.8 2 6.2 1.6 6.2-.6 0-2.8-4.6-3-6.2.6Z"/></svg>',
        note: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#7b61ff" d="M12.5 24.8a3.4 3.4 0 1 1-2.2-3.2V8.2L22 6v13.2a3.4 3.4 0 1 1-2.2-3.2V9.4l-7.3 1.6v13.8Z"/></svg>',
        butterfly: '<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="10.5" cy="12.5" rx="6" ry="5" fill="#ff7aa2"/><ellipse cx="21.5" cy="12.5" rx="6" ry="5" fill="#7aa2ff"/><ellipse cx="11" cy="20" rx="4.6" ry="3.6" fill="#ffb3cb"/><ellipse cx="21" cy="20" rx="4.6" ry="3.6" fill="#b7cbff"/><rect x="14.8" y="8" width="2.4" height="16" rx="1.2" fill="#5c3b28"/><circle cx="16" cy="7.2" r="1.5" fill="#5c3b28"/></svg>',
        crown: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#f0b429" d="M5 22.5 7.2 11l5.6 5.2L16 7l3.2 9.2L24.8 11 27 22.5Z"/><rect x="5" y="22" width="22" height="4.2" rx="1.2" fill="#d99212"/><circle cx="16" cy="16.5" r="1.5" fill="#e8567c"/><circle cx="9.5" cy="15" r="1.1" fill="#fff6d2"/><circle cx="22.5" cy="15" r="1.1" fill="#fff6d2"/></svg>',
        key: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="11" cy="13" r="6.2" fill="#f0b429"/><circle cx="11" cy="13" r="2.5" fill="#fff8e6"/><rect x="15.6" y="11.2" width="12" height="3.4" rx="1" fill="#f0b429"/><rect x="21.6" y="14.2" width="2.5" height="4.2" rx=".4" fill="#f0b429"/><rect x="25.4" y="14.2" width="2.4" height="3.2" rx=".4" fill="#e09a12"/></svg>',
        cake: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="16" width="20" height="10" rx="2" fill="#ff8fb3"/><path fill="#fff" d="M6 18.5c1.6 1.2 3.2.2 4.8 1.4s3.2.2 4.8-1 3.2-.2 4.8 1 3.2.2 4.8-1V16H6Z"/><rect x="14.8" y="7" width="2.4" height="9" rx=".6" fill="#f0b429"/><circle cx="16" cy="6.2" r="1.7" fill="#ff5a36"/></svg>',
        leaf: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#3cbf7a" d="M7 24C8 12 15 5.5 26 6 25 18 18 25 7 24Z"/><path d="M9 22.5c4.2-1.6 8-5.2 10.6-10.2" fill="none" stroke="#1e8a4e" stroke-width="1.7" stroke-linecap="round"/></svg>',
        quiet: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#f4e9ff"/><path fill="#b56cff" d="M16 24.5S9 19.2 9 14.4A4.4 4.4 0 0 1 16 11.6a4.4 4.4 0 0 1 7 2.8c0 4.8-7 10.1-7 10.1Z"/></svg>'
    };

    /* --------------------------------------------------------
       1. Огоньки — повтори последовательность
       -------------------------------------------------------- */
    function fireflies(level, api) {
        const root = h("div", "game game--fireflies");
        const pad = h("div", "fire");
        const note = statusBar("Приготовься…");
        const replay = button("game__action", "Показать ещё раз");
        replay.hidden = true;

        const icons = [
            { label: "Солнце", svg: GLYPH.sun },
            { label: "Луна", svg: GLYPH.moon },
            { label: "Звезда", svg: GLYPH.star },
            { label: "Сердце", svg: GLYPH.heart }
        ];
        const rounds = Array.isArray(level.rounds) && level.rounds.length
            ? level.rounds.map(function (value) { return QU.clamp(Number(value) || 2, 1, 6); })
            : [QU.clamp(level.steps || 4, 2, 6)];

        let roundIndex = 0;
        let sequence = [];
        let input = 0;
        let showing = false;
        let solved = false;
        let timers = [];

        function startRound() {
            roundIndex = Math.min(roundIndex, rounds.length - 1);
            const steps = rounds[roundIndex];
            sequence = [];

            for (let i = 0; i < steps; i++) {
                let next;
                do {
                    next = Math.floor(Math.random() * icons.length);
                } while (next === sequence[sequence.length - 1]);
                sequence.push(next);
            }

            input = 0;
            showing = true;
            replay.hidden = true;
            note.textContent = "Смотри…";
            pad.classList.add("is-waiting");
            pads.forEach(function (node) { node.classList.remove("is-lit"); });
        }

        const pads = icons.map(function (icon, index) {
            const el = button("fire__pad", null, icon.label);
            el.innerHTML = icon.svg;
            el.dataset.index = String(index);
            pad.appendChild(el);
            return el;
        });

        function later(fn, ms) {
            const id = window.setTimeout(function () {
                timers = timers.filter(function (item) { return item !== id; });
                if (!root.isConnected) return;
                fn();
            }, ms);
            timers.push(id);
            return id;
        }

        function clearTimers() {
            timers.forEach(window.clearTimeout);
            timers = [];
        }

        function flash(node, ms) {
            node.classList.add("is-lit");
            window.setTimeout(function () {
                node.classList.remove("is-lit");
            }, ms);
        }

        function show() {
            if (solved || !root.isConnected) return;

            clearTimers();
            showing = true;
            input = 0;
            replay.hidden = true;
            note.textContent = "Смотри…";
            pad.classList.add("is-waiting");
            pads.forEach(function (node) { node.classList.remove("is-lit"); });

            sequence.forEach(function (index, order) {
                later(function () {
                    flash(pads[index], 470);
                    Sound.flip();
                }, 320 + order * 760);
            });

            later(function () {
                showing = false;
                pad.classList.remove("is-waiting");
                note.textContent = "Повтори порядок";
            }, 320 + sequence.length * 760);
        }

        function fail() {
            input = 0;
            showing = true;
            replay.hidden = true;
            Sound.error();
            QU.vibrate([25, 35, 25]);
            api.shake();
            note.textContent = "Не то. Смотри ещё раз.";
            pad.classList.add("is-waiting");
            later(show, 780);
        }

        pad.addEventListener("click", function (event) {
            const node = event.target.closest(".fire__pad");
            if (!node || showing || solved) return;

            const index = Number(node.dataset.index);
            flash(node, 200);
            Sound.click();
            QU.vibrate(10);

            if (sequence[input] !== index) {
                fail();
                return;
            }

            input += 1;

            if (input === sequence.length) {
                if (roundIndex < rounds.length - 1) {
                    roundIndex += 1;
                    startRound();
                    later(show, 520);
                } else {
                    solved = true;
                    showing = true;
                    clearTimers();
                    note.textContent = "Порядок совпал ✦";
                    pads.forEach(function (item) { item.classList.add("is-lit"); });
                    later(api.onSolve, 520);
                }
            }
        });

        replay.addEventListener("click", show);

        root.appendChild(pad);
        root.appendChild(note);
        root.appendChild(replay);

        startRound();
        later(show, 520);
        return root;
    }

    /* --------------------------------------------------------
       2. Кодовые диски — собери комбинацию
       -------------------------------------------------------- */
    function disks(level, api) {
        const DEFAULT_SYMBOLS = [
            { id: "sun", label: "солнце", svg: GLYPH.sun },
            { id: "moon", label: "луна", svg: GLYPH.moon },
            { id: "star", label: "звезда", svg: GLYPH.star },
            { id: "flower", label: "цветок", svg: GLYPH.flower },
            { id: "heart", label: "сердце", svg: GLYPH.heart },
            { id: "gift", label: "подарок", svg: GLYPH.gift }
        ];

        const root = h("div", "game game--disks");
        const wrap = h("div", "disks");
        const note = statusBar("Слушай замок");

        const rawSymbols = (level.symbols && level.symbols.length)
            ? level.symbols.slice()
            : DEFAULT_SYMBOLS;

        const symbols = rawSymbols.map(function (item, index) {
            if (item && typeof item === "object") {
                return {
                    id: item.id || ("s" + index),
                    label: item.label || item.id || ("символ " + (index + 1)),
                    svg: item.svg || null,
                    text: item.text || null
                };
            }
            return {
                id: "s" + index,
                label: String(item),
                svg: null,
                text: String(item)
            };
        });

        const target = (level.target && level.target.length
            ? level.target
            : [0, 1, 2]
        ).map(function (value) {
            const number = Number(value) || 0;
            return ((number % symbols.length) + symbols.length) % symbols.length;
        });

        const dialCount = Math.max(3, target.length);
        const values = [];

        for (let i = 0; i < dialCount; i++) {
            let start = Math.floor(Math.random() * symbols.length);
            let guard = 0;
            while (start === target[i] && symbols.length > 1 && guard < 12) {
                start = Math.floor(Math.random() * symbols.length);
                guard += 1;
            }
            values.push(start);
        }

        let solved = false;
        const dials = [];

        function symbolMarkup(symbol) {
            if (symbol.svg) return symbol.svg;
            return symbol.text || "";
        }

        function paint() {
            dials.forEach(function (dial, index) {
                const symbol = symbols[values[index]];
                dial.face.innerHTML = symbolMarkup(symbol);
                dial.face.setAttribute(
                    "aria-label",
                    "Диск " + (index + 1) + ": " + symbol.label +
                    ". Нажми, чтобы повернуть."
                );
                dial.dots.forEach(function (dot, dotIndex) {
                    dot.classList.toggle("is-on", dotIndex === values[index]);
                });
            });
        }

        function check() {
            const matched = values.every(function (value, index) {
                return value === target[index];
            });

            if (!matched) return;

            solved = true;
            wrap.classList.add("is-open");
            note.textContent = "Замок уступил ✦";
            Sound.success();

            window.setTimeout(function () {
                if (root.isConnected) api.onSolve();
            }, 620);
        }

        for (let index = 0; index < dialCount; index++) {
            const dial = h("div", "disk");
            const face = button("disk__face", null, "Диск " + (index + 1));
            const dotsEl = h("div", "disk__dots");
            const dots = [];

            for (let d = 0; d < symbols.length; d++) {
                const dot = h("span", "disk__dot");
                dots.push(dot);
                dotsEl.appendChild(dot);
            }

            face.addEventListener("click", function () {
                if (solved) return;
                values[index] = (values[index] + 1) % symbols.length;
                Sound.click();
                QU.vibrate(8);
                note.textContent = "Ещё не то…";
                paint();
                check();
            });

            dial.appendChild(face);
            dial.appendChild(dotsEl);
            wrap.appendChild(dial);
            dials.push({ face: face, dots: dots });
        }

        root.appendChild(wrap);
        root.appendChild(note);
        paint();
        return root;
    }

    /* --------------------------------------------------------
       3. Созвездие — соедини звёзды по порядку
       -------------------------------------------------------- */
    function constellation(level, api) {
        const root = h("div", "game game--sky");
        const sky = h("div", "sky");
        const note = statusBar("Начни с первой звезды");

        const stars = (level.stars && level.stars.length) ? level.stars : [
            { x: 50, y: 36 },
            { x: 32, y: 22 },
            { x: 14, y: 40 },
            { x: 24, y: 64 },
            { x: 50, y: 92 },
            { x: 76, y: 64 },
            { x: 86, y: 40 },
            { x: 68, y: 22 }
        ];

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        const line = document.createElementNS(svgNS, "polyline");

        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("aria-hidden", "true");
        svg.classList.add("sky__lines");
        line.setAttribute("points", "");
        svg.appendChild(line);
        sky.appendChild(svg);

        let progress = 0;
        let solved = false;
        const nodes = [];

        function points(upTo) {
            return stars.slice(0, upTo).map(function (star) {
                return star.x + "," + star.y;
            }).join(" ");
        }

        function reset() {
            progress = 0;
            line.setAttribute("points", "");
            nodes.forEach(function (node) { node.classList.remove("is-lit"); });
            note.textContent = "Начни с первой звезды";
        }

        stars.forEach(function (star, index) {
            const node = button("sky__star", String(index + 1), "Звезда " + (index + 1));
            node.style.left = star.x + "%";
            node.style.top = star.y + "%";

            node.addEventListener("click", function () {
                if (solved) return;

                if (index !== progress) {
                    if (index < progress) return;
                    Sound.error();
                    QU.vibrate([20, 30, 20]);
                    api.shake();
                    reset();
                    return;
                }

                progress += 1;
                node.classList.add("is-lit");
                Sound.flip();
                QU.vibrate(10);

                line.setAttribute("points", points(progress));
                note.textContent = "Звёзд соединено: " + progress + " из " + stars.length;

                if (progress === stars.length) {
                    solved = true;

                    if (level.close !== false) {
                        line.setAttribute(
                            "points",
                            points(stars.length) + " " + stars[0].x + "," + stars[0].y
                        );
                    }

                    sky.classList.add("is-done");
                    note.textContent = "Созвездие собрано ✦";

                    window.setTimeout(function () {
                        if (root.isConnected) api.onSolve();
                    }, 820);
                }
            });

            nodes.push(node);
            sky.appendChild(node);
        });

        root.appendChild(sky);
        root.appendChild(note);
        return root;
    }

    /* --------------------------------------------------------
       4. Лабиринт — проведи сердечко к подарку
       -------------------------------------------------------- */
    function maze(level, api) {
        const root = h("div", "game game--maze");
        const board = h("div", "maze");
        const note = statusBar("Веди сердечко к подарку");
        const again = button("game__action", "Начать заново");

        const grid = (level.grid && level.grid.length) ? level.grid : [
            "S.....#",
            "#####.#",
            "#.....#",
            "#.#####",
            "#.....#",
            "#####.#",
            "#.....F"
        ];

        const rows = grid.length;
        const cols = grid[0].length;

        board.style.setProperty("--cols", String(cols));
        board.style.setProperty("--rows", String(rows));

        let start = null;
        let finish = null;
        let current = null;
        let solved = false;
        let dragging = false;
        let lastBuzz = 0;

        const cells = [];

        function key(row, col) {
            return row + ":" + col;
        }

        function paintCell(cell, isCurrent) {
            cell.classList.toggle("is-current", isCurrent);
        }

        function markStart() {
            cells.forEach(function (cell) {
                cell.classList.remove("is-trail", "is-current");
            });

            if (!start) return;
            current = start;
            start.cell.classList.add("is-trail", "is-current");
            current.cell.innerHTML = GLYPH.heart;
            if (finish) finish.cell.innerHTML = GLYPH.gift;
        }

        function buzz() {
            const now = Date.now();
            if (now - lastBuzz < 500) return;
            lastBuzz = now;
            QU.vibrate(14);
            Sound.error();
        }

        function moveTo(cell) {
            if (solved || !current) return;
            if (cell.classList.contains("is-wall")) {
                buzz();
                return;
            }

            const row = Number(cell.dataset.row);
            const col = Number(cell.dataset.col);

            if (row === current.row && col === current.col) return;

            const distance = Math.abs(row - current.row) + Math.abs(col - current.col);
            if (distance !== 1) return;

            current = { row: row, col: col, cell: cell };
            cell.classList.add("is-trail");
            paintCell(cell, true);

            cells.forEach(function (item) {
                if (item !== cell && item !== start.cell && item !== (finish && finish.cell)) {
                    item.classList.remove("is-current");
                }
            });

            if (start && start.cell !== cell) start.cell.classList.remove("is-current");

            Sound.click();
            QU.vibrate(8);

            if (finish && row === finish.row && col === finish.col) {
                solved = true;
                note.textContent = "Ты дошла до подарка ✦";
                board.classList.add("is-solved");
                window.setTimeout(function () {
                    if (root.isConnected) api.onSolve();
                }, 620);
            }
        }

        grid.forEach(function (row, rowIndex) {
            for (let colIndex = 0; colIndex < cols; colIndex++) {
                const char = row[colIndex] || "#";
                const cell = h("div", "maze__cell");
                cell.dataset.row = String(rowIndex);
                cell.dataset.col = String(colIndex);

                if (char === "#") {
                    cell.classList.add("is-wall");
                    cell.setAttribute("aria-hidden", "true");
                } else {
                    cell.classList.add("is-open");
                    cell.setAttribute("role", "button");
                    cell.tabIndex = 0;

                    if (char === "S") {
                        cell.classList.add("is-start");
                        start = { row: rowIndex, col: colIndex, cell: cell };
                    }

                    if (char === "F") {
                        cell.classList.add("is-finish");
                        finish = { row: rowIndex, col: colIndex, cell: cell };
                    }

                    cell.addEventListener("click", function () { moveTo(cell); });
                    cell.addEventListener("keydown", function (event) {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        moveTo(cell);
                    });
                }

                cells.push(cell);
                board.appendChild(cell);
            }
        });

        board.addEventListener("pointerdown", function (event) {
            if (solved) return;
            const cell = event.target.closest(".maze__cell");
            if (!cell) return;
            dragging = true;
            moveTo(cell);
        });

        function onMove(event) {
            if (!dragging || solved) return;
            if (!root.isConnected) {
                dragging = false;
                return;
            }

            const element = document.elementFromPoint(event.clientX, event.clientY);
            const cell = element ? element.closest(".maze__cell") : null;
            if (cell) moveTo(cell);
        }

        function onUp() {
            dragging = false;
        }

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);

        again.addEventListener("click", function () {
            if (solved) return;
            solved = false;
            board.classList.remove("is-solved");
            markStart();
            note.textContent = "Веди сердечко к подарку";
        });

        markStart();

        root.appendChild(board);
        root.appendChild(note);
        root.appendChild(again);
        return root;
    }

    /* --------------------------------------------------------
       5. Поймай звёзды
       -------------------------------------------------------- */
    function stars(level, api) {
        const root = h("div", "game game--catch");
        const arena = h("div", "catch");
        const note = statusBar("Поймано 0 из " + (level.goal || 7));
        const meter = h("div", "catch__bar");
        const fill = h("span");
        meter.appendChild(fill);

        const goal = QU.clamp(level.goal || 7, 3, 15);
        const life = REDUCED() ? 2300 : 1500;
        const gap = REDUCED() ? 1000 : 620;

        let caught = 0;
        let solved = false;
        let timers = [];

        function later(fn, ms) {
            const id = window.setTimeout(function () {
                timers = timers.filter(function (item) { return item !== id; });
                if (!root.isConnected) return;
                fn();
            }, ms);
            timers.push(id);
            return id;
        }

        function clearTimers() {
            timers.forEach(window.clearTimeout);
            timers = [];
        }

        function update() {
            note.textContent = caught >= goal
                ? "Все звёзды твои ✦"
                : "Поймано " + caught + " из " + goal;
            fill.style.width = Math.min(100, (caught / goal) * 100) + "%";
        }

        function catchStar(star) {
            if (solved) return;

            star.remove();
            caught += 1;
            Sound.click();
            QU.vibrate(12);
            update();

            if (caught >= goal) {
                solved = true;
                clearTimers();
                arena.innerHTML = "";
                note.textContent = "Все звёзды твои ✦";

                later(function () { api.onSolve(); }, 680);
            }
        }

        function spawn() {
            if (solved || !root.isConnected) return;

            const star = button("catch__star", null, "Звёздочка");
            star.innerHTML = GLYPH.star;
            star.style.left = (10 + Math.random() * 80) + "%";
            star.style.top = (14 + Math.random() * 70) + "%";
            star.addEventListener("click", function () { catchStar(star); });
            arena.appendChild(star);

            later(function () { star.remove(); }, life);
            later(spawn, gap);
        }

        root.appendChild(arena);
        root.appendChild(note);
        root.appendChild(meter);

        update();
        later(spawn, 500);
        return root;
    }

    /* --------------------------------------------------------
       6. Пары — найди одинаковые карточки
       -------------------------------------------------------- */
    function tap(level, api) {
        const ICONS = [
            { id: "heart", label: "Сердце", svg: GLYPH.heart },
            { id: "sun", label: "Солнце", svg: GLYPH.sun },
            { id: "moon", label: "Луна", svg: GLYPH.moon },
            { id: "star", label: "Звезда", svg: GLYPH.star },
            { id: "flower", label: "Цветок", svg: GLYPH.flower },
            { id: "gift", label: "Подарок", svg: GLYPH.gift },
            { id: "note", label: "Нота", svg: GLYPH.note },
            { id: "butterfly", label: "Бабочка", svg: GLYPH.butterfly },
            { id: "crown", label: "Корона", svg: GLYPH.crown },
            { id: "key", label: "Ключ", svg: GLYPH.key },
            { id: "cake", label: "Торт", svg: GLYPH.cake },
            { id: "leaf", label: "Лист", svg: GLYPH.leaf }
        ];

        const QUIET = {
            id: "quiet",
            label: "Тихое сердце",
            svg: GLYPH.quiet,
            solo: true
        };

        const root = h("div", "game game--tap");
        const board = h("div", "tap__board");
        const note = statusBar("Найди все пары");

        const size = QU.clamp(Number(level.size) || 5, 3, 5);
        const cells = size * size;
        const pairCount = Math.floor((cells - 1) / 2);
        const deckIcons = ICONS.slice(0, Math.min(pairCount, ICONS.length));
        const centerIndex = Math.floor(cells / 2);

        board.style.setProperty("--tap-cols", String(size));
        board.classList.add("tap__board--" + size);

        let pairs = [];
        deckIcons.forEach(function (icon) {
            pairs.push(icon);
            pairs.push(icon);
        });

        for (let i = pairs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = pairs[i];
            pairs[i] = pairs[j];
            pairs[j] = tmp;
        }

        const deck = [];
        let pairCursor = 0;
        for (let i = 0; i < cells; i++) {
            if (i === centerIndex) {
                deck.push(QUIET);
            } else {
                deck.push(pairs[pairCursor++]);
            }
        }

        let open = [];
        let matched = 0;
        let quietFound = false;
        let locked = false;
        let solved = false;
        let timers = [];

        function later(fn, ms) {
            const id = window.setTimeout(function () {
                timers = timers.filter(function (item) { return item !== id; });
                if (!root.isConnected) return;
                fn();
            }, ms);
            timers.push(id);
            return id;
        }

        function goalReached() {
            return quietFound && matched >= pairCount;
        }

        function finishIfReady() {
            if (!goalReached()) return;
            solved = true;
            board.classList.add("is-solved");
            note.textContent = "Тишина найдена ✦";
            Sound.success();
            later(function () { api.onSolve(); }, 620);
        }

        function setStatus() {
            if (solved) {
                note.textContent = "Тишина найдена ✦";
                return;
            }
            if (!matched && !quietFound) {
                note.textContent = "Открой две карточки";
                return;
            }
            note.textContent = "Найдено " + matched + " из " + pairCount +
                (quietFound ? "" : " · найди тихое сердце");
        }

        function closeMismatch() {
            open.forEach(function (card) {
                card.classList.remove("is-open");
                card.setAttribute("aria-pressed", "false");
                card.setAttribute("aria-label", "Карточка");
            });
            open = [];
            locked = false;
            setStatus();
        }

        deck.forEach(function (icon, index) {
            const card = button(
                "tap__card" + (icon.solo ? " tap__card--quiet" : ""),
                null,
                icon.solo ? "Тихое сердце" : "Карточка " + (index + 1)
            );
            card.setAttribute("aria-pressed", "false");
            card.dataset.id = icon.id;

            const back = h("span", "tap__face tap__face--back");
            back.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#e9b872" opacity=".55" d="M16 6l1.6 6.4L24 14l-6.4 1.6L16 22l-1.6-6.4L8 14l6.4-1.6Z"/></svg>';

            const front = h("span", "tap__face tap__face--front");
            front.innerHTML = icon.svg;

            card.appendChild(back);
            card.appendChild(front);

            card.addEventListener("click", function () {
                if (solved || locked) return;
                if (card.classList.contains("is-open") || card.classList.contains("is-matched")) return;

                if (icon.solo) {
                    if (open.length) return;
                    card.classList.add("is-open", "is-matched");
                    card.setAttribute("aria-pressed", "true");
                    card.setAttribute("aria-label", icon.label);
                    quietFound = true;
                    Sound.flip();
                    QU.vibrate(10);
                    setStatus();
                    finishIfReady();
                    return;
                }

                card.classList.add("is-open");
                card.setAttribute("aria-pressed", "true");
                card.setAttribute("aria-label", icon.label);
                Sound.flip();
                QU.vibrate(8);
                open.push(card);

                if (open.length < 2) {
                    setStatus();
                    return;
                }

                locked = true;
                const first = open[0];
                const second = open[1];

                if (first.dataset.id === second.dataset.id) {
                    first.classList.add("is-matched");
                    second.classList.add("is-matched");
                    open = [];
                    matched += 1;
                    locked = false;
                    Sound.click();
                    setStatus();
                    finishIfReady();
                    return;
                }

                Sound.error();
                QU.vibrate([16, 24, 16]);
                api.shake();
                note.textContent = "Не пара — попробуй ещё";
                later(closeMismatch, REDUCED() ? 280 : 720);
            });

            board.appendChild(card);
        });

        root.appendChild(board);
        root.appendChild(note);
        setStatus();
        return root;
    }

    return {
        fireflies: fireflies,
        tap: tap,
        disks: disks,
        constellation: constellation,
        maze: maze,
        stars: stars
    };
})();
