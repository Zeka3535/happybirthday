/* ============================================================
   Фон: звёздное небо + конфетти
   ============================================================ */

window.FX = (function () {
    "use strict";

    let starCanvas = null;
    let starCtx = null;
    let fxCanvas = null;
    let fxCtx = null;

    let width = 0;
    let height = 0;
    let dpr = 1;

    let stars = [];
    let particles = [];
    let starRaf = null;
    let fxRaf = null;
    let running = true;

    const COLORS = ["#e9b872", "#e8567c", "#fff8f1", "#8fd3c7", "#c9a7e8", "#f3c78d"];

    function sizeCanvas(canvas, ctx) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildStars() {
        const count = QU.clamp(Math.round((width * height) / 16000), 40, 110);
        stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 1.25 + 0.35,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.4,
                gold: Math.random() < 0.18
            });
        }
    }

    function drawStars(time) {
        if (!starCtx) return;

        starCtx.clearRect(0, 0, width, height);

        const reduced = QU.prefersReducedMotion();

        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            const twinkle = reduced
                ? 0.55
                : 0.28 + 0.72 * (0.5 + 0.5 * Math.sin((time / 1000) * star.speed + star.phase));

            starCtx.beginPath();
            starCtx.fillStyle = star.gold
                ? "rgba(233, 184, 114, " + (twinkle * 0.9).toFixed(3) + ")"
                : "rgba(255, 248, 241, " + (twinkle * 0.8).toFixed(3) + ")";
            starCtx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            starCtx.fill();

            if (star.r > 1.05 && twinkle > 0.7) {
                starCtx.strokeStyle = "rgba(255, 248, 241, " + (twinkle * 0.22).toFixed(3) + ")";
                starCtx.lineWidth = 0.6;
                starCtx.beginPath();
                starCtx.moveTo(star.x - star.r * 3, star.y);
                starCtx.lineTo(star.x + star.r * 3, star.y);
                starCtx.moveTo(star.x, star.y - star.r * 3);
                starCtx.lineTo(star.x, star.y + star.r * 3);
                starCtx.stroke();
            }
        }

        if (!reduced && running) {
            starRaf = window.requestAnimationFrame(drawStars);
        } else {
            starRaf = null;
        }
    }

    function startStars() {
        if (starRaf) return;
        starRaf = window.requestAnimationFrame(drawStars);
    }

    function stopStars() {
        if (starRaf) {
            window.cancelAnimationFrame(starRaf);
            starRaf = null;
        }
    }

    function particle(x, y, options) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (options.speed || 6) * (0.35 + Math.random() * 0.9);
        return {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (options.lift || 0),
            size: options.size || (4 + Math.random() * 6),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rotation: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.28,
            gravity: options.gravity == null ? 0.16 : options.gravity,
            drag: options.drag == null ? 0.991 : options.drag,
            shape: Math.random() < 0.28 ? "circle" : "rect",
            opacity: 1,
            ttl: options.ttl || 260
        };
    }

    function drawParticles() {
        if (!fxCtx) return;

        fxCtx.clearRect(0, 0, width, height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            p.vx *= p.drag;
            p.vy = p.vy * p.drag + p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.spin;
            p.ttl -= 1;

            if (p.ttl < 40) {
                p.opacity = Math.max(0, p.ttl / 40);
            }

            if (p.ttl <= 0 || p.y > height + 40 || p.x < -60 || p.x > width + 60) {
                particles.splice(i, 1);
                continue;
            }

            fxCtx.save();
            fxCtx.globalAlpha = p.opacity;
            fxCtx.translate(p.x, p.y);
            fxCtx.rotate(p.rotation);
            fxCtx.fillStyle = p.color;

            if (p.shape === "circle") {
                fxCtx.beginPath();
                fxCtx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
                fxCtx.fill();
            } else {
                fxCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            }

            fxCtx.restore();
        }

        if (particles.length > 0) {
            fxRaf = window.requestAnimationFrame(drawParticles);
        } else {
            fxCtx.clearRect(0, 0, width, height);
            fxRaf = null;
        }
    }

    function startParticles() {
        if (fxRaf) return;
        fxRaf = window.requestAnimationFrame(drawParticles);
    }

    return {
        init: function () {
            starCanvas = document.getElementById("stars");
            fxCanvas = document.getElementById("fx");
            if (!starCanvas || !fxCanvas) return;

            starCtx = starCanvas.getContext("2d");
            fxCtx = fxCanvas.getContext("2d");

            this.resize();
            startStars();

            document.addEventListener("visibilitychange", function () {
                running = !document.hidden;
                if (running) {
                    startStars();
                } else {
                    stopStars();
                }
            });
        },

        resize: function () {
            if (!starCtx || !fxCtx) return;

            width = window.innerWidth;
            height = window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 2);

            sizeCanvas(starCanvas, starCtx);
            sizeCanvas(fxCanvas, fxCtx);
            buildStars();

            if (QU.prefersReducedMotion()) {
                stopStars();
                drawStars(0);
            }
        },

        /** Салют из точки. */
        burst: function (x, y, count) {
            if (!fxCtx || !QUEST.settings.confetti || QU.prefersReducedMotion()) return;

            const amount = count || 80;
            for (let i = 0; i < amount; i++) {
                particles.push(particle(x, y, { speed: 7.5, lift: 2.5, gravity: 0.18 }));
            }
            startParticles();
        },

        /** Медленный дождь конфетти сверху. */
        rain: function (count, spread) {
            if (!fxCtx || !QUEST.settings.confetti || QU.prefersReducedMotion()) return;

            const amount = count || 90;
            const delayHeight = spread || height;

            for (let i = 0; i < amount; i++) {
                const p = particle(
                    Math.random() * width,
                    -Math.random() * delayHeight,
                    { speed: 0, lift: 0, gravity: 0.045, drag: 0.999, ttl: 420, size: 5 + Math.random() * 7 }
                );
                p.vx = (Math.random() - 0.5) * 0.9;
                p.vy = 1.2 + Math.random() * 1.8;
                p.spin = (Math.random() - 0.5) * 0.12;
                particles.push(p);
            }
            startParticles();
        },

        celebrate: function () {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight * 0.38;
            this.burst(cx, cy, 90);
            window.setTimeout(function () {
                FX.burst(window.innerWidth * 0.2, window.innerHeight * 0.55, 45);
            }, 180);
            window.setTimeout(function () {
                FX.burst(window.innerWidth * 0.8, window.innerHeight * 0.5, 45);
            }, 320);
        }
    };
})();
