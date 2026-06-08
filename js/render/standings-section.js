import { computeStandings } from '../standings.js';
import { teamByCode } from '../data.js';
import { escape, flag } from '../utils.js';

const STORAGE_KEY = 'sweep26.standingsOpen';
const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export function renderStandingsSection(container, { teams, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section pn-standings';

  const isOpen = readOpen();
  if (!isOpen) section.classList.add('collapsed');

  section.innerHTML = `
    <h3>Group Standings</h3>
    <button type="button" class="pn-standings-toggle">${toggleLabel(isOpen)}</button>
    <div class="pn-standings-grid">${gridHtml(teams, results.matches ?? [])}</div>
  `;

  const btn = section.querySelector('.pn-standings-toggle');
  btn.addEventListener('click', () => {
    const nowOpen = section.classList.contains('collapsed');
    section.classList.toggle('collapsed', !nowOpen);
    btn.textContent = toggleLabel(nowOpen);
    writeOpen(nowOpen);
  });

  container.appendChild(section);
}

function gridHtml(teams, matches) {
  return GROUP_CODES.map((g) => groupCardHtml(g, teams, matches)).join('');
}

function groupCardHtml(groupCode, teams, matches) {
  const table = computeStandings(groupCode, teams, matches);
  const allFinished = matches
    .filter((m) => m.stage === 'group' && m.group === groupCode)
    .every((m) => m.status === 'finished');

  const rows = table.map((row, i) => {
    const t = teamByCode(teams, row.code);
    const mark = allFinished ? (i < 2 ? '<span class="qmk">✓</span>' : '<span class="xmk">✗</span>') : '';
    const rowCls = allFinished && i >= 2 ? ' class="elim-row"' : '';
    return `
      <tr${rowCls}>
        <td class="qcol">${mark}</td>
        <td class="tcol">
          <span class="pn-sticker mini"><span class="flag">${flag(t)}</span><span class="code">${escape(row.code)}</span></span>
          ${escape(t?.name ?? row.code)}
        </td>
        <td>${row.played}</td>
        <td>${formatGd(row.gd)}</td>
        <td><b>${row.points}</b></td>
      </tr>
    `;
  }).join('');

  return `
    <div class="pn-group-card">
      <div class="pn-group-title">Group ${escape(groupCode)}</div>
      <table class="pn-group-tbl">
        <thead><tr><th></th><th>Team</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function formatGd(gd) {
  if (gd > 0) return `+${gd}`;
  if (gd < 0) return `−${Math.abs(gd)}`;
  return '0';
}

function toggleLabel(isOpen) {
  return isOpen ? '▾ Hide group standings' : '▸ Show group standings';
}

function readOpen() {
  try { return globalThis.localStorage?.getItem(STORAGE_KEY) === 'true'; }
  catch { return false; }
}
function writeOpen(open) {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, String(open)); }
  catch { /* private mode etc — ignore */ }
}
