/* ============================================================
   Движок квеста: экраны, прогресс, сохранение
   ============================================================ */

(function () {
    "use strict";

    const STORAGE_KEY = "hb2026.progress.v1";

    const HEART_SVG =
        '<svg viewBox="0 0 32 32" aria-hidden="true">' +
        '<path d="M16 27S6 20.6 6 13.8A5.6 5.6 0 0 1 16 10a5.6 5.6 0 0 1 10 3.8C26 20.6 16 27 16 27Z"/>' +
        '</svg>';

    const HEART_FILLED =
        '<svg viewBox="0 0 32 32" aria-hidden="true">' +
        '<path d="M16 27S6 20.6 6 13.8A5.6 5.6 0 0 1 16 10a5.6 5.6 0 0 1 10 3.8C26 20.6 16 27 16 27Z"/>' +
        '</svg>';

    const SPARKLE_SVG =
        '<svg viewBox="0 0 32 32" aria-hidden="true">' +
        '<path d="M16 4l2.4 9.6L28 16l-9.6 2.4L16 28l-2.4-9.6L4 16l9.6-2.4L16 4Z"/>' +
        '</svg>';

    const screen = document.getElementById("screen");
    const progressDots = document.getElementById("progressDots");
    const progressFill = document.getElementById("progressFill");
    const soundToggle = document.getElementById("soundToggle");
    const demoChip = document.getElementById("demoChip");
    const toastEl = document.getElementById("toast");

    const total = QUEST.levels.length;

    const state = {
        view: "intro",
        index: 0,
        completed: [],
        keys: []
    };

    const PHRASE_CSV_URL = "phrases.csv";
    let phrasesData = null;

    let toastTimer = null;
    let rewardStage = "clue";

    /* --------------------------------------------------------
       Вспомогательное
       -------------------------------------------------------- */

    function h(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    const esc = QU.escapeHtml;

    /** Возвращает список допустимых слов-ключей у награды. */
    function rewardKeys(reward) {
        if (!reward || reward.key == null) return [];
        const list = Array.isArray(reward.key) ? reward.key : [reward.key];
        return list
            .filter(function (value) { return value != null && String(value).trim() !== ""; })
            .map(function (value) { return String(value).trim(); });
    }

    function keyCopy() {
        return QUEST.meta.keyLock || {};
    }

    function saveProgress() {
        QU.storage.set(STORAGE_KEY, {
            index: state.index,
            completed: state.completed,
            keys: state.keys,
            sound: Sound.isEnabled(),
            savedAt: Date.now()
        });
    }

    function clearProgress() {
        QU.storage.remove(STORAGE_KEY);
    }

    function showToast(text) {
        if (!toastEl) return;
        window.clearTimeout(toastTimer);
        toastEl.textContent = text;
        toastEl.classList.add("is-visible");
        toastTimer = window.setTimeout(function () {
            toastEl.classList.remove("is-visible");
        }, 2300);
    }

    function focusHeading(card) {
        const heading = card.querySelector("h1, h2");
        if (!heading) return;
        heading.setAttribute("tabindex", "-1");
        window.setTimeout(function () {
            try {
                heading.focus({ preventScroll: true });
            } catch (_) {
                heading.focus();
            }
        }, 80);
    }

    function shakeCard(card) {
        card.classList.remove("shake");
        // перезапуск анимации
        void card.offsetWidth;
        card.classList.add("shake");
        window.setTimeout(function () {
            card.classList.remove("shake");
        }, 460);
    }

    function updateSoundButton() {
        if (!soundToggle) return;
        const on = Sound.isEnabled();
        soundToggle.classList.toggle("is-muted", !on);
        soundToggle.setAttribute("aria-pressed", String(on));
        soundToggle.setAttribute("aria-label", on ? "Выключить звук" : "Включить звук");
        soundToggle.title = on ? "Выключить звук" : "Включить звук";
    }

    /* --------------------------------------------------------
       Прогресс
       -------------------------------------------------------- */

    function renderProgress() {
        progressDots.innerHTML = "";

        QUEST.levels.forEach(function (level, index) {
            const dot = h("span", "progress__dot");
            const done = state.completed.indexOf(level.id) !== -1;
            dot.classList.toggle("is-done", done);
            dot.classList.toggle(
                "is-current",
                !done && state.view !== "intro" && index === state.index
            );
            progressDots.appendChild(dot);
        });

        const percent = total ? (state.completed.length / total) * 100 : 0;
        progressFill.style.width = Math.min(100, Math.max(0, percent)) + "%";
    }

    /* --------------------------------------------------------
       Экран: приветствие
       -------------------------------------------------------- */

    function renderIntro() {
        const saved = QU.storage.get(STORAGE_KEY, null);
        const savedCompleted = saved && Array.isArray(saved.completed) ? saved.completed : [];
        const canContinue = Boolean(
            saved &&
            saved.index < total &&
            (saved.index > 0 || savedCompleted.length > 0)
        );

        const card = h("section", "card");
        card.innerHTML =
            '<div class="hero">' +
                '<div class="hero__seal">' + HEART_SVG + "</div>" +
                '<p class="kicker">' + esc(QUEST.meta.heroKicker) + "</p>" +
                '<h1 class="title">' + QUEST.meta.heroTitle + "</h1>" +
                (QUEST.meta.heroText ? '<p class="lead">' + esc(QUEST.meta.heroText) + "</p>" : "") +
                '<button type="button" class="btn btn--primary" data-action="start">' +
                    esc(QUEST.meta.startLabel) +
                "</button>" +
                (canContinue
                    ? '<button type="button" class="btn btn--ghost" data-action="continue">' +
                        esc(QUEST.meta.continueLabel) +
                        " · глава " + (saved.index + 1) +
                      "</button>"
                    : "") +
                (QUEST.meta.fineprint ? '<p class="fineprint">' + esc(QUEST.meta.fineprint) + "</p>" : "") +
            "</div>";

        card.addEventListener("click", function (event) {
            const trigger = event.target.closest("[data-action]");
            if (!trigger) return;

            const action = trigger.dataset.action;

            if (action === "start") {
                state.completed = [];
                state.keys = [];
                state.index = 0;
                state.view = "level";
                rewardStage = "clue";
                saveProgress();
                render();
            }

            if (action === "continue") {
                const stored = QU.storage.get(STORAGE_KEY, null);
                if (stored && typeof stored.index === "number") {
                    state.index = QU.clamp(stored.index, 0, total - 1);
                    state.completed = Array.isArray(stored.completed) ? stored.completed : [];
                    state.keys = Array.isArray(stored.keys) ? stored.keys : [];
                    rewardStage = "clue";

                    const current = QUEST.levels[state.index];
                    state.view = current && state.completed.indexOf(current.id) !== -1
                        ? "reward"
                        : "level";
                } else {
                    state.view = "level";
                }
                render();
            }
        });

        show(card);
        focusHeading(card);
    }

    /* --------------------------------------------------------
       Экран: уровень
       -------------------------------------------------------- */

    function renderLevel() {
        const level = QUEST.levels[state.index];
        if (!level) {
            state.view = "finale";
            state.index = total;
            render();
            return;
        }

        rewardStage = "clue";

        const card = h("section", "card");
        const counter =
            String(state.index + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");

        card.innerHTML =
            '<div class="level-head">' +
                '<p class="level-count">' + counter + "</p>" +
                (level.eyebrow ? '<p class="kicker">' + esc(level.eyebrow) + "</p>" : "") +
                '<h2 class="title title--level">' + esc(level.title) + "</h2>" +
                '<p class="lead">' + esc(level.prompt) + "</p>" +
            "</div>" +
            '<div class="game-mount"></div>' +
            (level.hint
                ? '<button type="button" class="hint-toggle" data-action="hint" aria-expanded="false">' +
                    "<span>✦</span> Подсказка</button>" +
                  '<div class="hint-box" hidden>' + esc(level.hint) + "</div>"
                : "");

        const mount = card.querySelector(".game-mount");

        const api = {
            onSolve: function () {
                handleSolved(level);
            },
            shake: function () {
                shakeCard(card);
            },
            revealHint: function () {
                const box = card.querySelector(".hint-box");
                const toggle = card.querySelector('[data-action="hint"]');
                if (!box || !toggle || !box.hidden) return;
                box.hidden = false;
                toggle.setAttribute("aria-expanded", "true");
                toggle.innerHTML = "<span>✦</span> Скрыть подсказку";
            },
            toast: showToast
        };

        const game = Games[level.type];
        if (typeof game === "function") {
            mount.appendChild(game(level, api));
        } else {
            mount.appendChild(h("p", "error", "Неизвестный тип уровня: " + level.type));
        }

        card.addEventListener("click", function (event) {
            const trigger = event.target.closest('[data-action="hint"]');
            if (!trigger) return;

            const box = card.querySelector(".hint-box");
            if (!box) return;

            const willOpen = box.hidden;
            box.hidden = !willOpen;
            trigger.setAttribute("aria-expanded", String(willOpen));
            trigger.innerHTML = willOpen
                ? "<span>✦</span> Скрыть подсказку"
                : "<span>✦</span> Подсказка";
        });

        show(card);
        focusHeading(card);
    }

    function handleSolved(level) {
        if (state.completed.indexOf(level.id) === -1) {
            state.completed.push(level.id);
        }

        rewardStage = "clue";
        saveProgress();

        Sound.success();
        QU.vibrate([20, 40, 20, 40, 60]);
        FX.burst(window.innerWidth / 2, window.innerHeight * 0.34, 46);

        state.view = "reward";
        render();
    }

    /* --------------------------------------------------------
       Экран: награда и подсказка
       -------------------------------------------------------- */

    function renderReward() {
        const level = QUEST.levels[state.index];
        if (!level) {
            state.view = "finale";
            state.index = total;
            render();
            return;
        }

        const reward = level.reward || {};
        const isLast = state.index === total - 1;
        const allowed = rewardKeys(reward);
        const needsKey = allowed.length > 0;
        const keyFound = state.keys.indexOf(level.id) !== -1;
        const unlocked = !needsKey || keyFound;
        const copy = keyCopy();

        const stage = keyFound
            ? "done"
            : (needsKey && rewardStage === "enter" ? "enter" : "clue");

        const card = h(
            "section",
            "card reward" + (stage === "enter" ? " reward--enter" : "")
        );

        const keyBlock = stage === "enter"
            ? '<div class="keylock">' +
                (reward.text
                    ? '<p class="keylock__where"><span>' +
                        esc(copy.whereLabel || "Где искать") + "</span>" +
                        esc(reward.text) +
                      "</p>"
                    : "") +
                '<p class="keylock__label">' + esc(copy.label || "Ключ с записки") + "</p>" +
                '<p class="keylock__text">' + esc(copy.text || "Нашла записку? Введи слово, которое на ней написано.") + "</p>" +
                '<form class="form" data-key-form novalidate>' +
                    '<input class="field keylock__input" type="text" ' +
                        'placeholder="' + esc(copy.placeholder || "Слово с записки") + '" ' +
                        'aria-label="' + esc(copy.placeholder || "Слово с записки") + '" ' +
                        'autocomplete="off" autocapitalize="characters" spellcheck="false" ' +
                        'enterkeyhint="go">' +
                    '<p class="error" aria-live="polite"></p>' +
                    '<button class="btn btn--primary" type="submit">' +
                        esc(copy.button || "Проверить ключ") +
                    "</button>" +
                "</form>" +
                (reward.keyHint
                    ? '<button type="button" class="link-btn" data-action="key-hint">' +
                        esc(copy.hintToggle || "Не получается? Подсказка") +
                      "</button>" +
                      '<p class="keylock__hint" hidden>' + esc(reward.keyHint) + "</p>"
                    : "") +
                '<button type="button" class="link-btn keylock__back" data-action="key-back">' +
                    esc(copy.backLabel || "← Вернуться к подсказке") +
                "</button>" +
            "</div>"
            : "";

        const acceptedBlock = stage === "done" && needsKey
            ? '<p class="keylock__ok">' + "✦ " +
                esc(copy.accepted || "Ключ принят") + ": <b>" +
                esc(allowed[0]) + "</b></p>"
            : "";

        const foundButton = stage === "clue" && needsKey
            ? '<button type="button" class="btn btn--primary" data-action="key-start">' +
                esc(copy.foundLabel || "Я нашла записку") +
              "</button>"
            : "";

        const nextButton = unlocked
            ? '<button type="button" class="btn btn--primary" data-action="next">' +
                esc(isLast
                    ? QUEST.meta.finalButtonLabel
                    : (copy.nextLabel || "Дальше")) +
              "</button>"
            : "";

        card.innerHTML =
            (stage === "enter" ? "" : '<div class="reward__seal">' + SPARKLE_SVG + "</div>") +
            '<p class="reward__label">' +
                esc(reward.label || "Подсказка " + (state.index + 1)) +
            "</p>" +
            '<h2 class="title title--level">' +
                esc(reward.title || "Подарок ждёт") +
            "</h2>" +
            (stage === "enter"
                ? ""
                : '<div class="clue">' +
                    "<p>" + esc(reward.text || "") + "</p>" +
                    (reward.note ? '<p class="clue__note">' + esc(reward.note) + "</p>" : "") +
                  "</div>") +
            (reward.image && stage !== "enter"
                ? '<div class="reward__photo"><img src="' + esc(reward.image) + '" alt="" loading="lazy"></div>'
                : "") +
            acceptedBlock +
            keyBlock +
            foundButton +
            nextButton;

        /* --- ввод ключа --- */
        const form = card.querySelector("[data-key-form]");
        if (form) {
            const input = form.querySelector(".keylock__input");
            const error = form.querySelector(".error");
            const hint = card.querySelector(".keylock__hint");
            let attempts = 0;

            form.addEventListener("submit", function (event) {
                event.preventDefault();

                const given = QU.normalize(input.value);
                if (!given) {
                    error.textContent = copy.empty || "Впиши слово с записки ✦";
                    return;
                }

                const accepted = allowed.map(QU.normalize);

                if (accepted.indexOf(given) !== -1) {
                    if (state.keys.indexOf(level.id) === -1) {
                        state.keys.push(level.id);
                    }
                    saveProgress();

                    Sound.success();
                    QU.vibrate([20, 40, 20, 40, 60]);
                    FX.burst(window.innerWidth / 2, window.innerHeight * 0.34, 52);

                    render();
                    showToast(copy.toast || "Ключ принят ✦");
                    return;
                }

                attempts += 1;
                Sound.error();
                QU.vibrate([25, 35, 25]);
                shakeCard(card);
                error.textContent = attempts >= 2
                    ? (copy.errorStrong || "Пока не то. Проверь, все ли буквы на записке.")
                    : (copy.error || "Не совпало. Попробуй ещё раз.");

                if (attempts >= 3 && hint) {
                    hint.hidden = false;
                }

                input.select();
            });

            if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
                window.setTimeout(function () {
                    input.focus({ preventScroll: true });
                }, 350);
            }
        }

        /* --- клики: шаги, подсказка, переход дальше --- */
        card.addEventListener("click", function (event) {
            if (event.target.closest('[data-action="key-start"]')) {
                rewardStage = "enter";
                render();
                return;
            }

            if (event.target.closest('[data-action="key-back"]')) {
                rewardStage = "clue";
                render();
                return;
            }

            const hintTrigger = event.target.closest('[data-action="key-hint"]');
            if (hintTrigger) {
                const hint = card.querySelector(".keylock__hint");
                if (!hint) return;
                hint.hidden = !hint.hidden;
                hintTrigger.textContent = hint.hidden
                    ? (copy.hintToggle || "Не получается? Подсказка")
                    : "Скрыть подсказку";
                return;
            }

            if (!event.target.closest('[data-action="next"]')) return;

            if (isLast) {
                state.index = total;
                state.view = "finale";
            } else {
                state.index += 1;
                state.view = "level";
                rewardStage = "clue";
            }

            saveProgress();
            render();
        });

        show(card);
        focusHeading(card);
    }

    /* --------------------------------------------------------
       Финальная фраза (из phrases.csv)
       -------------------------------------------------------- */

    function parsePhrases(text) {
        const rows = [];
        const lines = String(text || "")
            .split(/\r\n|\n|\r/)
            .map(function (line) { return line.trim(); })
            .filter(function (line) { return line !== ""; });

        for (let i = 1; i < lines.length; i += 1) {
            const cells = lines[i].split(",");
            const id = (cells[0] || "").trim();
            const value = cells.slice(1).join(",").replace(/^"|"$/g, "").trim();
            if (!id) continue;

            const existing = rows.filter(function (row) { return row.id === id; })[0];
            if (existing) {
                existing.text = value;
            } else {
                rows.push({ id: id, text: value });
            }
        }

        return rows;
    }

    function finalPhraseText() {
        const phrases = (typeof QUEST !== "undefined" && Array.isArray(QUEST.phrases)) ? QUEST.phrases : [];
        const final = phrases.filter(function (phrase) { return phrase && phrase.id === "final"; })[0];
        const text = (final && final.text) || (phrases[0] && phrases[0].text) || "";
        const fromFile = (phrasesData && phrasesData.filter(function (row) { return row.id === "final"; })[0]) || null;
        const value = text || (fromFile && fromFile.text) || "";

        if (value) return value;

        const words = QUEST.levels
            .map(function (level) { return rewardKeys(level.reward)[0]; })
            .filter(Boolean);
        return words.join(" ");
    }

    function loadPhrases() {
        return fetch(PHRASE_CSV_URL)
            .then(function (response) { return response.ok ? response.text() : null; })
            .then(function (text) { phrasesData = text ? parsePhrases(text) : null; })
            .catch(function () { phrasesData = null; })
            .then(function () { render(); });
    }

    /* --------------------------------------------------------
       Экран: финал
       -------------------------------------------------------- */

    function renderFinale() {
        const card = h("section", "card finale");

        const clues = QUEST.levels.map(function (level) {
            const reward = level.reward || {};
            return (
                "<li><strong>" + esc(level.eyebrow || "Глава") + "</strong>" +
                esc(reward.text || "") +
                (reward.note ? "<br><span>" + esc(reward.note) + "</span>" : "") +
                "</li>"
            );
        }).join("");

        const finalPhrase = finalPhraseText();

        const phraseBlock = finalPhrase
            ? '<div class="phrase">' +
                "<small>" + esc(QUEST.meta.phraseLabel || "Из найденных слов") + "</small>" +
                "«" + esc(finalPhrase) + "»" +
              "</div>"
            : "";

        const giftMark = "Твой подарок ждёт там, где рождается музыка: под крышкой клавиш инструмента";
        const message = QUEST.meta.finalMessage || "";
        const markAt = message.indexOf(giftMark);
        const messageHtml = markAt === -1
            ? esc(message)
            : esc(message.slice(0, markAt)) +
                "<strong>" + esc(giftMark) + "</strong>" +
                esc(message.slice(markAt + giftMark.length));

        card.innerHTML =
            '<div class="finale__heart">' + HEART_FILLED + "</div>" +
            '<p class="kicker">' + esc(QUEST.meta.finalKicker) + "</p>" +
            '<h1 class="title">' + esc(QUEST.meta.finalTitle) + "</h1>" +
            phraseBlock +
            '<p class="final-message">' + messageHtml + "</p>" +
            '<p class="signature">' + esc(QUEST.meta.signature) + "</p>" +
            '<details class="clues">' +
                "<summary>Все подсказки</summary>" +
                "<ol>" + clues + "</ol>" +
            "</details>" +
            '<button type="button" class="btn btn--primary" data-action="restart">' +
                esc(QUEST.meta.replayLabel) +
            "</button>";

        card.addEventListener("click", function (event) {
            if (!event.target.closest('[data-action="restart"]')) return;

            clearProgress();
            state.completed = [];
            state.keys = [];
            state.index = 0;
            state.view = "intro";
            rewardStage = "clue";
            render();
            showToast(QUEST.meta.restartToast);
        });

        show(card);
        focusHeading(card);

        Sound.win();
        QU.vibrate([30, 60, 30, 60, 120]);

        window.setTimeout(function () {
            FX.celebrate();
        }, 220);
        window.setTimeout(function () {
            FX.rain(90, window.innerHeight * 0.8);
        }, 520);
    }

    /* --------------------------------------------------------
       Рендер
       -------------------------------------------------------- */

    function show(card) {
        screen.innerHTML = "";
        screen.appendChild(card);
    }

    function render() {
        document.body.dataset.view = state.view;
        renderProgress();

        if (state.view === "intro") {
            renderIntro();
        } else if (state.view === "level") {
            renderLevel();
        } else if (state.view === "reward") {
            renderReward();
        } else {
            renderFinale();
        }

        window.scrollTo(0, 0);
        const card = screen.querySelector(".card");
        if (card) card.scrollTop = 0;
    }

    /* --------------------------------------------------------
       Инициализация
       -------------------------------------------------------- */

    function restore() {
        const saved = QU.storage.get(STORAGE_KEY, null);
        if (!saved) return;

        if (typeof saved.sound === "boolean") {
            Sound.setEnabled(saved.sound);
        }

        if (Array.isArray(saved.completed)) {
            state.completed = saved.completed.filter(function (id) {
                return QUEST.levels.some(function (level) { return level.id === id; });
            });
        }

        if (Array.isArray(saved.keys)) {
            state.keys = saved.keys.filter(function (id) {
                const level = QUEST.levels.find(function (item) { return item.id === id; });
                return Boolean(level) && rewardKeys(level.reward).length > 0;
            });
        }

        const allDone = QUEST.levels.every(function (level) {
            const solved = state.completed.indexOf(level.id) !== -1;
            const keyOk = rewardKeys(level.reward).length === 0 ||
                state.keys.indexOf(level.id) !== -1;
            return solved && keyOk;
        });

        if (typeof saved.index === "number" && (saved.index >= total || allDone)) {
            state.index = total;
            state.view = "finale";
        } else if (typeof saved.index === "number" && saved.index > 0) {
            state.index = saved.index;
            state.view = "intro";
        } else if (state.completed.length > 0) {
            state.index = 0;
            state.view = "intro";
        }
    }

    function applyUrlOptions() {
        const params = new URLSearchParams(window.location.search);

        if (params.get("reset") === "1") {
            clearProgress();
            state.view = "intro";
            state.index = 0;
            state.completed = [];
            state.keys = [];

            // Убираем параметр из адреса, чтобы случайное обновление страницы
            // не стирало прогресс повторно.
            try {
                const clean = new URL(window.location.href);
                clean.searchParams.delete("reset");
                window.history.replaceState({}, "", clean.pathname + clean.search + clean.hash);
            } catch (_) { /* не критично */ }
        }

        if (params.has("level")) {
            const requested = parseInt(params.get("level"), 10);
            if (!isNaN(requested) && requested >= 1 && requested <= total) {
                state.index = requested - 1;
                state.completed = QUEST.levels.slice(0, state.index).map(function (level) {
                    return level.id;
                });
                state.keys = state.completed.slice();
                state.view = "level";
            }
        }

        if (QUEST.meta.demo || params.get("demo") === "1") {
            demoChip.hidden = false;
        }
    }

    function init() {
        if (!screen) return;

        Sound.setEnabled(QUEST.settings.sound);
        restore();
        applyUrlOptions();
        updateSoundButton();

        if (soundToggle) {
            soundToggle.addEventListener("click", function () {
                const next = !Sound.isEnabled();
                Sound.setEnabled(next);
                updateSoundButton();
                saveProgress();
                if (next) Sound.click();
            });
        }

        document.addEventListener("pointerdown", function () {
            Sound.unlock();
        }, { once: true });

        FX.init();

        loadPhrases();

        let resizeTimer = null;
        window.addEventListener("resize", function () {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(function () {
                FX.resize();
            }, 180);
        });

        render();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
