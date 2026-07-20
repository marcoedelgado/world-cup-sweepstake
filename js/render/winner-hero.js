import { getWinner } from '../standings.js';
import { teamByCode, ownerForTeam } from '../data.js';
import { escape, flag } from '../utils.js';

export function renderWinnerHero(container, { teams, results, owners }) {
  const matches = results?.matches ?? [];
  const winner = getWinner(matches);
  if (!winner) return;

  const team = teamByCode(teams, winner.teamCode);
  const ownerName = ownerForTeam(owners, winner.teamCode);
  const teamName = team?.name ?? winner.teamCode;
  const teamFlag = flag(team);

  const section = document.createElement('section');
  section.className = 'pn-winner-hero';

  const canvas = document.createElement('canvas');
  canvas.className = 'pn-confetti';
  section.appendChild(canvas);

  const badge = document.createElement('div');
  badge.className = 'pn-winner-hero__badge';
  badge.innerHTML = `
    <div class="pn-winner-hero__trophy">🏆</div>
    <div class="pn-winner-hero__label">World Champions 2026</div>
    <div class="pn-winner-hero__team">${teamFlag} ${escape(teamName)}</div>
    ${ownerName ? `<div class="pn-winner-hero__owner">Swept by <strong>${escape(ownerName)}</strong></div>` : ''}
  `;
  section.appendChild(badge);

  container.appendChild(section);
  startConfetti(canvas);
}

let _rafHandle = null;
let _resizeListener = null;

function startConfetti(canvas) {
  // Cancel any previous loop and resize listener
  if (_rafHandle !== null) cancelAnimationFrame(_rafHandle);
  if (_resizeListener !== null) window.removeEventListener('resize', _resizeListener, { passive: true });

  const ctx = canvas.getContext('2d');
  const COLORS = ['#f4d35e', '#ee964b', '#e8b94a', '#7a1818', '#f5e7c1', '#ffffff', '#f4cf63'];
  const COUNT = 90;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  _resizeListener = resize;
  window.addEventListener('resize', _resizeListener, { passive: true });

  const pieces = Array.from({ length: COUNT }, () => makePiece(canvas));

  function makePiece(canvas, fromTop = false) {
    return {
      x: Math.random() * canvas.width,
      y: fromTop ? -10 : Math.random() * canvas.height,
      w: 6 + Math.random() * 8,
      h: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.08,
      speed: 1.2 + Math.random() * 2.2,
      drift: (Math.random() - 0.5) * 0.6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 0.7 + Math.random() * 0.3,
    };
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.y += p.speed;
      p.x += p.drift;
      p.rot += p.rotSpeed;
      if (p.y > canvas.height + 10) {
        Object.assign(p, makePiece(canvas, true));
      }
    }
    _rafHandle = requestAnimationFrame(frame);
  }
  _rafHandle = requestAnimationFrame(frame);
}
