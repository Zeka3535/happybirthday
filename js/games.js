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

    /* --------------------------------------------------------
       1. Огоньки — повтори последовательность
       -------------------------------------------------------- */
    function fireflies(level, api) {
        const root = h("div", "game game--fireflies");
        const pad = h("div", "fire");
        const note = statusBar("Приготовься…");
        const replay = button("game__action", "Показать ещё раз");
        replay.hidden = true;

        const icons = ["✦", "❀", "☾", "♥"];
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
            const el = button("fire__pad", icon, "Огонёк " + (index + 1));
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
        const root = h("div", "game game--disks");
        const wrap = h("div", "disks");
        const note = statusBar("Поверни диски");

        const symbols = (level.symbols && level.symbols.length)
            ? level.symbols.slice()
            : ["☀️", "🌙", "⭐", "🌸"];

        const target = (level.target || []).map(function (value) {
            const number = Number(value) || 0;
            return ((number % symbols.length) + symbols.length) % symbols.length;
        });

        const values = target.map(function () { return 0; });
        if (target.every(function (value) { return value === 0; }) && values.length) {
            values[0] = 1;
        }

        let solved = false;
        const dials = [];

        function paint() {
            dials.forEach(function (dial, index) {
                dial.face.textContent = symbols[values[index]];
                dial.face.setAttribute(
                    "aria-label",
                    "Диск " + (index + 1) + ": " + symbols[values[index]] +
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
            note.textContent = "Замок открылся ✦";
            Sound.success();

            window.setTimeout(function () {
                if (root.isConnected) api.onSolve();
            }, 620);
        }

        target.forEach(function (_, index) {
            const dial = h("div", "disk");
            const face = button("disk__face", symbols[values[index]], "Диск " + (index + 1));
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
                paint();
                check();
            });

            dial.appendChild(face);
            dial.appendChild(dotsEl);
            wrap.appendChild(dial);
            dials.push({ face: face, dots: dots });
        });

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
            current.cell.textContent = "♥";
            if (finish) finish.cell.textContent = "🎁";
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

            const star = button("catch__star", "✦", "Звёздочка");
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
       6. Тихий тап — нажми, когда сердце вспыхнет
       -------------------------------------------------------- */
    function tap(level, api) {
        const root = h("div", "game game--tap");
        const stage = h("div", "tap__stage");
        const note = statusBar("Нажми на сердце, когда оно вспыхнет");
        const pulse = button("tap__heart", "♥", "Сердце");

        let lit = false;
        let waiting = true;
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

        function glow() {
            lit = true;
            waiting = false;
            pulse.classList.add("is-lit");
            Sound.flip();
            QU.vibrate(8);
            note.textContent = "Тапни!";
        }

        function start() {
            clearTimers();
            lit = false;
            waiting = true;
            solved = false;
            pulse.classList.remove("is-lit");
            note.textContent = "Сердце готовится…";
            later(glow, 900 + Math.random() * 1300);
        }

        pulse.addEventListener("click", function () {
            if (solved) return;

            if (lit) {
                solved = true;
                clearTimers();
                note.textContent = "Тап прошёл ✦";
                Sound.success();
                later(function () { api.onSolve(); }, 520);
                return;
            }

            Sound.error();
            QU.vibrate([20, 30, 20]);
            api.shake();
            note.textContent = "Слишком рано. Сделай тап, когда вспыхнет.";
            start();
        });

        root.appendChild(stage);
        stage.appendChild(pulse);
        root.appendChild(note);
        start();
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
