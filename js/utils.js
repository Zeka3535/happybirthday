/* ============================================================
   Утилиты
   ============================================================ */

window.QU = (function () {
    "use strict";

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function $$(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    /** Приводит ответ к сравнимому виду: регистр, «ё», пробелы, пунктуация. */
    function normalize(value) {
        return String(value == null ? "" : value)
            .toLowerCase()
            .replace(/ё/g, "е")
            .replace(/[^a-zа-я0-9]+/gi, "")
            .trim();
    }

    function shuffle(list) {
        const result = list.slice();
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = result[i];
            result[i] = result[j];
            result[j] = tmp;
        }
        return result;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function prefersReducedMotion() {
        return window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function vibrate(pattern) {
        if (!QUEST.settings.haptics) return;
        try {
            if (navigator.vibrate) navigator.vibrate(pattern);
        } catch (_) { /* не критично */ }
    }

    function sleep(ms) {
        return new Promise(function (resolve) {
            window.setTimeout(resolve, ms);
        });
    }

    const storage = {
        get: function (key, fallback) {
            try {
                const raw = window.localStorage.getItem(key);
                if (!raw) return fallback;
                return JSON.parse(raw);
            } catch (_) {
                return fallback;
            }
        },
        set: function (key, value) {
            try {
                window.localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (_) {
                return false;
            }
        },
        remove: function (key) {
            try {
                window.localStorage.removeItem(key);
            } catch (_) { /* ignore */ }
        }
    };

    /** Небольшая задержка, чтобы не дёргать интерфейс лишний раз. */
    function once(fn) {
        let called = false;
        return function () {
            if (called) return;
            called = true;
            return fn.apply(this, arguments);
        };
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    return {
        $: $,
        $$: $$,
        normalize: normalize,
        shuffle: shuffle,
        escapeHtml: escapeHtml,
        prefersReducedMotion: prefersReducedMotion,
        vibrate: vibrate,
        sleep: sleep,
        storage: storage,
        once: once,
        clamp: clamp
    };
})();
