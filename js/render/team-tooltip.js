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
  const target = e.target.closest('.t-team');
  if (!target) {
    hide();
    return;
  }
  if (!window.matchMedia('(max-width: 600px)').matches) return;
  const full = target.dataset.full;
  if (!full) return;
  show(target, full);
}

function ensure() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 't-tooltip';
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function show(anchor, text) {
  const t = ensure();
  t.textContent = text;
  const rect = anchor.getBoundingClientRect();
  t.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
  t.style.top = `${rect.top + window.scrollY - 6}px`;
  t.classList.add('visible');
  clearTimeout(dismissTimer);
  dismissTimer = setTimeout(hide, 2000);
}

function hide() {
  if (tooltipEl) tooltipEl.classList.remove('visible');
}
