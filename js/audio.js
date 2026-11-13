/* ============================================================
   Звук: маленький синтезатор на Web Audio.
   Никаких mp3 — значит, ничего не грузится и не ломается.
   ============================================================ */

window.Sound = (function () {
    "use strict";

    let ctx = null;
    let enabled = true;

    function ensureContext() {
        if (!enabled) return null;
        if (!ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            try {
                ctx = new AudioCtx();
            } catch (_) {
                return null;
            }
        }
        if (ctx.state === "suspended") {
            ctx.resume().catch(function () { /* ignore */ });
        }
        return ctx;
    }

    /**
     * Одна нота.
     * @param {number} freq
     * @param {object} opts
     */
    function tone(freq, opts) {
        const audio = ensureContext();
        if (!audio) return;

        const options = opts || {};
        const when = audio.currentTime + (options.delay || 0);
        const duration = options.duration || 0.14;
        const volume = options.volume == null ? 0.05 : options.volume;
        const type = options.type || "sine";

        const osc = audio.createOscillator();
        const gain = audio.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, when);

        if (options.slideTo) {
            osc.frequency.exponentialRampToValueAtTime(
                Math.max(40, options.slideTo),
                when + duration
            );
        }

        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(volume, when + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

        osc.connect(gain);
        gain.connect(audio.destination);

        osc.start(when);
        osc.stop(when + duration + 0.05);
    }

    const chord = function (notes, step, opts) {
        notes.forEach(function (freq, index) {
            tone(freq, Object.assign({}, opts, { delay: (opts && opts.delay || 0) + index * step }));
        });
    };

    return {
        unlock: function () {
            ensureContext();
        },

        setEnabled: function (value) {
            enabled = !!value;
            if (enabled) ensureContext();
        },

        isEnabled: function () {
            return enabled;
        },

        click: function () {
            tone(640, { duration: 0.06, volume: 0.03, type: "triangle" });
        },

        flip: function () {
            tone(520, { duration: 0.07, volume: 0.028, type: "sine", slideTo: 660 });
        },

        success: function () {
            chord([523.25, 659.25, 783.99], 0.085, {
                duration: 0.32,
                volume: 0.045,
                type: "sine"
            });
        },

        error: function () {
            tone(190, { duration: 0.22, volume: 0.035, type: "sawtooth", slideTo: 130 });
        },

        win: function () {
            chord([523.25, 659.25, 783.99, 1046.5], 0.11, {
                duration: 0.5,
                volume: 0.05,
                type: "sine"
            });
            chord([392, 523.25, 659.25], 0.12, {
                duration: 0.6,
                volume: 0.03,
                type: "triangle",
                delay: 0.32
            });
        }
    };
})();
