// === Particle System ===
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
let animationId;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createParticle() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
    };
}

function initParticles() {
    const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
    particles = Array.from({ length: count }, createParticle);
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 51, ${p.alpha})`;
        ctx.fill();
    }

    // Draw connections between nearby particles
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 120) {
                const alpha = (1 - dist / 120) * 0.15;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(255, 0, 51, ${alpha})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }

    animationId = requestAnimationFrame(drawParticles);
}

// === Staggered Entrance Animations ===
function triggerEntranceAnimations() {
    const elements = document.querySelectorAll('.title, .accent-line, .username, .message');
    elements.forEach((el, i) => {
        setTimeout(() => {
            el.classList.add('animate');
        }, i * 300);
    });
}

// === Respect Reduced Motion ===
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function init() {
    resize();

    if (!prefersReducedMotion.matches) {
        initParticles();
        drawParticles();
        triggerEntranceAnimations();
    }
}

window.addEventListener('resize', () => {
    resize();
    if (!prefersReducedMotion.matches) {
        initParticles();
    }
});

prefersReducedMotion.addEventListener('change', () => {
    if (prefersReducedMotion.matches) {
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        initParticles();
        drawParticles();
    }
});

init();
