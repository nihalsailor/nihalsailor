/**
 * NIHALSAILOR ATMOSPHERE CANVAS
 * Renders drifting maritime fog, embers from the burning ghost ship, and cursed lightning strikes.
 */

class MaritimeAtmosphere {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.embers = [];
    this.lightningAlpha = 0;
    this.isCursed = false;
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    this.createParticles();
    this.createEmbers();
    this.animate();

    // Occasional lightning strike trigger
    setInterval(() => {
      if (Math.random() > (this.isCursed ? 0.35 : 0.85)) {
        this.triggerLightning();
      }
    }, 4500);
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    const count = Math.min(Math.floor(this.width / 35), 45); // Responsive density
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 80 + Math.random() * 140,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: 0.03 + Math.random() * 0.05,
        baseAlpha: 0.03 + Math.random() * 0.05
      });
    }
  }

  createEmbers() {
    this.embers = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.embers.push({
        x: Math.random() * this.width,
        y: this.height + Math.random() * 100,
        size: 1 + Math.random() * 3,
        vy: -(0.5 + Math.random() * 1.4),
        vx: (Math.random() - 0.5) * 0.6,
        alpha: 0.3 + Math.random() * 0.7,
        hue: Math.random() > 0.4 ? 40 : 15 // Amber / gold
      });
    }
  }

  triggerLightning() {
    this.lightningAlpha = this.isCursed ? 0.45 : 0.18;
    setTimeout(() => {
      this.lightningAlpha = 0.06;
      setTimeout(() => {
        this.lightningAlpha = this.isCursed ? 0.3 : 0.12;
        setTimeout(() => {
          this.lightningAlpha = 0;
        }, 110);
      }, 70);
    }, 60);
  }

  toggleCursedMode(state) {
    this.isCursed = state;
    this.triggerLightning();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Lightning Flash if active
    if (this.lightningAlpha > 0) {
      this.ctx.fillStyle = this.isCursed 
        ? `rgba(255, 42, 75, ${this.lightningAlpha})` 
        : `rgba(180, 220, 255, ${this.lightningAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Render Sea Fog / Mist
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -p.radius) p.x = this.width + p.radius;
      if (p.x > this.width + p.radius) p.x = -p.radius;
      if (p.y < -p.radius) p.y = this.height + p.radius;
      if (p.y > this.height + p.radius) p.y = -p.radius;

      const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      const color = this.isCursed ? '255, 42, 75' : '65, 120, 160';
      grad.addColorStop(0, `rgba(${color}, ${p.alpha})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 3. Render Rising Ghost Embers / Sparks
    for (let e of this.embers) {
      e.y += e.vy;
      e.x += e.vx + Math.sin(e.y * 0.02) * 0.4;

      if (e.y < -10) {
        e.y = this.height + 10;
        e.x = Math.random() * this.width;
      }

      this.ctx.save();
      this.ctx.globalAlpha = e.alpha;
      const emberColor = this.isCursed ? '#ff2a4b' : (e.hue === 40 ? '#e5b95c' : '#ff7a36');
      this.ctx.fillStyle = emberColor;
      this.ctx.shadowBlur = this.isCursed ? 12 : 8;
      this.ctx.shadowColor = emberColor;
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.maritimeCanvas = new MaritimeAtmosphere('atmosphere-canvas');
});
