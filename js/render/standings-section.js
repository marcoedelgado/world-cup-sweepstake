import { computeStandings, isAlive } from '../standings.js';
import { teamByCode, ownerForTeam } from '../data.js';
import { escape, formatGd, ownerTag, teamLabel } from '../utils.js';

const STORAGE_KEY = 'sweep26.standingsOpen';
const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export function renderStandingsSection(container, { teams, results, owners }) {
  const section = document.createElement('section');
  section.className = 'pn-section pn-standings';

  const isOpen = readOpen();
  if (!isOpen) section.classList.add('collapsed');

  const matches = results.matches ?? [];
  section.innerHTML = `
    <h3>Group Standings</h3>
    <button type="button" class="pn-standings-toggle">${toggleLabel(isOpen)}</button>
    <div class="pn-standings-grid">${gridHtml(teams, matches, owners)}</div>
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

function gridHtml(teams, matches, owners) {
  return GROUP_CODES.map((g) => groupCardHtml(g, teams, matches, owners)).join('');
}

function groupCardHtml(groupCode, teams, matches, owners) {
  const table = computeStandings(groupCode, teams, matches);
  const allFinished = matches
    .filter((m) => m.stage === 'group' && m.group === groupCode)
    .every((m) => m.status === 'finished');

  const rows = table.map((row) => {
    const t = teamByCode(teams, row.code);
    const alive = isAlive(row.code, teams, matches);
    const mark = allFinished ? (alive ? '<span class="qmk">✓</span>' : '<span class="xmk">✗</span>') : '';
    const rowCls = allFinished && !alive ? ' class="elim-row"' : '';
    const owner = ownerForTeam(owners, row.code);
    return `
      <tr${rowCls}>
        <td class="qcol">${mark}</td>
        <td class="tcol">
          ${teamLabel(t, row.code)}${ownerTag(owner)}
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
