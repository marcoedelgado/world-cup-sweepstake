// Mobile-only tooltip: tap a .t-team chip (flag + code) inside a match card to
// reveal the team's full name. Desktop already shows the full name, so the
// tooltip silently no-ops there.

let tooltipEl = null;
let dismissTimer = null;

export function initTeamTooltips() {
  if (typeof document === 'undefined') return;
  document.addEventListener('click', handleClick);
}

function handleClick(e) {
  const target = e.target.closest('[data-full]');
  if (!target) {
    hide();
    return;
  }
  if (!window.matchMedia('(max-width: 600px)').matches) return;
  const full = target.dataset.full;
  if (!full) return;
  show(e.clientX, e.clientY, full);
}

function ensure() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 't-tooltip';
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function show(clientX, clientY, text) {
  const t = ensure();
  t.textContent = text;
  t.style.left = `${clientX + window.scrollX}px`;
  t.style.top = `${clientY + window.scrollY - 12}px`;
  t.classList.add('visible');
  clearTimeout(dismissTimer);
  dismissTimer = setTimeout(hide, 2000);
}

function hide() {
  if (tooltipEl) tooltipEl.classList.remove('visible');
}
