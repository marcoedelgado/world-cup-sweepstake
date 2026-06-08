import { getZone, setZone, ZONES } from '../tz.js';

export function renderHeader(container) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'pn-header';

  const tz = document.createElement('div');
  tz.className = 'tz';

  const label = document.createElement('span');
  label.className = 'tz-label';
  label.textContent = 'Timezone';

  const grp = document.createElement('div');
  grp.className = 'tz-grp';

  const current = getZone();
  for (const [shortCode, zoneId, flag, name] of [
    ['uk', ZONES.UK, '🇬🇧', 'UK'],
    ['cy', ZONES.CY, '🇨🇾', 'Cyprus'],
  ]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.zone = zoneId;
    btn.title = name;
    btn.textContent = flag;
    if (zoneId === current) btn.classList.add('active');
    btn.addEventListener('click', () => {
      setZone(zoneId);
      for (const b of grp.querySelectorAll('button')) {
        b.classList.toggle('active', b.dataset.zone === zoneId);
      }
    });
    grp.appendChild(btn);
  }

  tz.append(label, grp);
  wrap.appendChild(tz);
  container.appendChild(wrap);
}
