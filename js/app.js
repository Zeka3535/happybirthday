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
        completed: []
    };

    let toastTimer = null;

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

    function saveProgress() {
        QU.storage.set(STORAGE_KEY, {
            index: state.index,
            completed: state.completed,
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
        const pills = (QUEST.meta.metaPills || []).map(function (pill) {
            return '<span class="meta-pill">' + esc(pill) + "</span>";
        }).join("");

        card.innerHTML =
            '<div class="hero">' +
                '<div class="hero__seal">' + HEART_SVG + "</div>" +
                '<p class="kicker">' + esc(QUEST.meta.heroKicker) + "</p>" +
                '<h1 class="title">' + QUEST.meta.heroTitle + "</h1>" +
                '<p class="lead">' + esc(QUEST.meta.heroText) + "</p>" +
                (pills ? '<div class="meta-row">' + pills + "</div>" : "") +
                '<button type="button" class="btn btn--primary" data-action="start">' +
                    esc(QUEST.meta.startLabel) +
                "</button>" +
                (canContinue
                    ? '<button type="button" class="btn btn--ghost" data-action="continue">' +
                        esc(QUEST.meta.continueLabel) +
                        " · глава " + (saved.index + 1) +
                      "</button>"
                    : "") +
                '<p class="fineprint">' + esc(QUEST.meta.fineprint) + "</p>" +
            "</div>";

        card.addEventListener("click", function (event) {
            const trigger = event.target.closest("[data-action]");
            if (!trigger) return;

            const action = trigger.dataset.action;

            if (action === "start") {
                state.completed = [];
                state.index = 0;
                state.view = "level";
                saveProgress();
                render();
            }

            if (action === "continue") {
                const stored = QU.storage.get(STORAGE_KEY, null);
                if (stored && typeof stored.index === "number") {
                    state.index = QU.clamp(stored.index, 0, total - 1);
                    state.completed = Array.isArray(stored.completed) ? stored.completed : [];

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

        const card = h("section", "card reward");

        card.innerHTML =
            '<div class="reward__seal">' + SPARKLE_SVG + "</div>" +
            '<p class="reward__label">' +
                esc(reward.label || "Подсказка " + (state.index + 1)) +
            "</p>" +
            '<h2 class="title title--level">' +
                esc(reward.title || "Подарок ждёт") +
            "</h2>" +
            '<div class="clue">' +
                "<p>" + esc(reward.text || "") + "</p>" +
                (reward.note ? '<p class="clue__note">' + esc(reward.note) + "</p>" : "") +
            "</div>" +
            (reward.image
                ? '<div class="reward__photo"><img src="' + esc(reward.image) + '" alt="" loading="lazy"></div>'
                : "") +
            '<button type="button" class="btn btn--primary" data-action="next">' +
                esc(isLast ? QUEST.meta.finalButtonLabel : "Дальше") +
            "</button>";

        card.addEventListener("click", function (event) {
            if (!event.target.closest('[data-action="next"]')) return;

            if (isLast) {
                state.index = total;
                state.view = "finale";
            } else {
                state.index += 1;
                state.view = "level";
            }

            saveProgress();
            render();
        });

        show(card);
        focusHeading(card);
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

        card.innerHTML =
            '<div class="finale__heart">' + HEART_FILLED + "</div>" +
            '<p class="kicker">' + esc(QUEST.meta.finalKicker) + "</p>" +
            '<h1 class="title">' + esc(QUEST.meta.finalTitle) + "</h1>" +
            '<p class="final-message">' + esc(QUEST.meta.finalMessage) + "</p>" +
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
            state.index = 0;
            state.view = "intro";
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

        const allDone = QUEST.levels.every(function (level) {
            return state.completed.indexOf(level.id) !== -1;
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
        }

        if (params.has("level")) {
            const requested = parseInt(params.get("level"), 10);
            if (!isNaN(requested) && requested >= 1 && requested <= total) {
                state.index = requested - 1;
                state.completed = QUEST.levels.slice(0, state.index).map(function (level) {
                    return level.id;
                });
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
