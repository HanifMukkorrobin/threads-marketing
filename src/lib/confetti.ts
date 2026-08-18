/**
 * Lightweight Zero-Dependency Retro Confetti Celebration
 * Uses standard HTML5 Canvas for super crisp, retro-styled particle bursts
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  shape: 'square' | 'circle' | 'strip';
  life: number;
  maxLife: number;
}

const RETRO_CONFETTI_COLORS = [
  '#FFE600', // Retro Yellow
  '#FF6B4A', // Retro Coral
  '#00F0FF', // Retro Cyan
  '#00E699', // Retro Mint
  '#FF6584', // Retro Pink
  '#121212', // Retro Black
  '#B8B8FF', // Retro Lavender
];

export function fireRetroConfetti(xOrigin = 0.5, yOrigin = 0.6) {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const startX = width * xOrigin;
  const startY = height * yOrigin;
  const particleCount = 65;
  const particles: Particle[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5);
    const speed = 4 + Math.random() * 8;
    const maxLife = 50 + Math.floor(Math.random() * 30);
    const shapes: ('square' | 'circle' | 'strip')[] = ['square', 'circle', 'strip'];

    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.5),
      vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.5) - 3,
      size: 6 + Math.random() * 8,
      color: RETRO_CONFETTI_COLORS[Math.floor(Math.random() * RETRO_CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      life: 0,
      maxLife,
    });
  }

  let animationFrameId: number;

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let activeParticles = 0;

    for (const p of particles) {
      if (p.life < p.maxLife) {
        activeParticles++;
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.98; // friction
        p.rotation += p.rotSpeed;

        const progress = p.life / p.maxLife;
        const opacity = Math.max(0, 1 - progress);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#121212';
        ctx.lineWidth = 1.5;

        if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // strip
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size * 1.5, p.size / 2);
          ctx.strokeRect(-p.size / 2, -p.size / 4, p.size * 1.5, p.size / 2);
        }

        ctx.restore();
      }
    }

    if (activeParticles > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  }

  render();
}
