import { buildBracketTree, computeEliminated, winnersByNode } from './radial-model.js';
import { showTeamTooltip } from './team-tooltip.js';
import { OWNER_PALETTE } from '../config.js';

const CX = 500, CY = 500, STEP = 360 / 32;
const RADII_NODE = [355, 280, 200, 120, 0]; // r32, r16, qf, sf, final(centre)
const R_TEAMNODE = 405, R_FLAG = 440, R_FACE = 478;
const FACE_R = 21, FACE_ZOOM = 1.95, FOCUS_X = 0.5, FOCUS_Y = 0.33;
const CHAMP = [CX, CY - 84]; // champion flag sits just above the trophy

const NS = 'http://www.w3.org/2000/svg';
const el = (t, attrs = {}) => {
  const e = document.createElementNS(NS, t);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const polar = (deg, r) => {
  const a = (deg - 90) * Math.PI / 180; // -90 so slot 0 is at top
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
// radial-in then arc-along-ring (clean bracket link); innermost goes to centre
const elbow = (ca, cr, pa, pr) => {
  const [x1, y1] = polar(ca, cr);
  if (pr <= 1) return `M${x1},${y1} L${CX},${CY}`;
  const [x2, y2] = polar(ca, pr);
  const [x3, y3] = polar(pa, pr);
  return `M${x1},${y1} L${x2},${y2} A${pr},${pr} 0 0 ${pa >= ca ? 1 : 0} ${x3},${y3}`;
};

export function renderRadial(container, state) {
  const teams = Array.isArray(state.teams) ? state.teams : [];
  const teamByCode = Object.fromEntries(teams.map((t) => [t.code, t]));

  const ownerList = state.owners?.owners ?? [];
  const ownerByTeam = {};
  ownerList.forEach((o, i) => {
    const colour = OWNER_PALETTE[i % OWNER_PALETTE.length];
    for (const c of o.teams ?? []) ownerByTeam[c] = { name: o.name, photo: o.photo, colour };
  });

  const matches = state.results?.matches ?? [];
  const { leaves, levels } = buildBracketTree(matches.filter((m) => m.stage === 'r32'));
  const eliminated = computeEliminated(matches);
  const winners = winnersByNode(matches);

  const wrap = document.createElement('div');
  wrap.className = 'pn-radial';

  // ---- legend / owner filter ----
  const legend = document.createElement('div');
  legend.className = 'pn-radial-legend';
  ownerList.forEach((o, i) => {
    const chip = document.createElement('span');
    chip.dataset.owner = o.name;
    chip.textContent = o.name;
    chip.style.background = OWNER_PALETTE[i % OWNER_PALETTE.length];
    legend.appendChild(chip);
  });
  const resetChip = document.createElement('span');
  resetChip.className = 'reset';
  resetChip.hidden = true;
  resetChip.textContent = '✕ clear';
  legend.appendChild(resetChip);
  wrap.appendChild(legend);

  // ---- svg scaffold ----
  const svg = el('svg', { viewBox: '0 0 1000 1000', role: 'img', 'aria-label': 'Radial knockout bracket' });
  wrap.appendChild(svg);

  const defs = el('defs');
  svg.appendChild(defs);
  const glow = el('radialGradient', { id: 'pn-goldGlow' });
  // amber halo that reads on the cream page (a pale-gold glow would vanish)
  glow.appendChild(el('stop', { offset: '0%', 'stop-color': '#f6c04a', 'stop-opacity': '.7' }));
  glow.appendChild(el('stop', { offset: '45%', 'stop-color': '#ee964b', 'stop-opacity': '.32' }));
  glow.appendChild(el('stop', { offset: '100%', 'stop-color': '#ee964b', 'stop-opacity': '0' }));
  defs.appendChild(glow);

  // ---- edges ----
  const gEdges = el('g');
  svg.appendChild(gEdges);
  const edgeById = {};
  const leafEdges = leaves.map(() => []);
  const addEdge = (id, ca, cr, pa, pr) => {
    const p = el('path', { class: 'pn-edge', d: elbow(ca, cr, pa, pr) });
    gEdges.appendChild(p);
    edgeById[id] = p;
  };
  levels[0].forEach((n, m) => n.children.forEach((cp, k) => {
    const li = m * 2 + k;
    const id = `e-leaf-${li}`;
    addEdge(id, cp * STEP, R_TEAMNODE, n.pos * STEP, RADII_NODE[0]);
    leafEdges[li].push(id);
  }));
  for (let lv = 0; lv < 4; lv++) {
    levels[lv].forEach((child, i) => {
      const parent = levels[lv + 1][Math.floor(i / 2)];
      const id = `e-${lv}-${i}`;
      addEdge(id, child.pos * STEP, RADII_NODE[lv], parent.pos * STEP, RADII_NODE[lv + 1]);
      const span = 2 ** (lv + 1);
      for (let li = i * span; li < (i + 1) * span; li++) leafEdges[li].push(id);
    });
  }

  // ---- junction nodes ----
  const gNodes = el('g');
  svg.appendChild(gNodes);
  levels.flat().forEach((n) => {
    if (RADII_NODE[n.level] === 0) return;
    const [x, y] = polar(n.pos * STEP, RADII_NODE[n.level]);
    gNodes.appendChild(el('circle', { class: 'pn-node', cx: x, cy: y, r: 3.2 }));
  });

  // ---- trophy centre ----
  gNodes.appendChild(el('circle', { cx: CX, cy: CY, r: 90, fill: 'url(#pn-goldGlow)' }));
  const trophy = el('text', { class: 'pn-trophy', x: CX, y: CY + 4 });
  trophy.textContent = '🏆';
  gNodes.appendChild(trophy);

  // ---- inner-round advancing flags ----
  const gInner = el('g');
  svg.appendChild(gInner);
  for (let lv = 0; lv < 5; lv++) {
    levels[lv].forEach((n) => {
      const code = winners.get(`${lv}-${n.index}`);
      if (!code) return;
      const [x, y] = lv === 4 ? CHAMP : polar(n.pos * STEP, RADII_NODE[lv]);
      const colour = ownerByTeam[code]?.colour ?? '#888';
      const g = el('g', { class: `pn-inner${eliminated.has(code) ? ' elim' : ''}` });
      g.appendChild(el('circle', { class: 'pn-inner-ring', cx: x, cy: y, r: lv === 4 ? 17 : 13, stroke: colour }));
      const ft = el('text', { class: 'pn-inner-flag', x, y, style: `font-size:${lv === 4 ? 22 : 17}px` });
      ft.textContent = teamByCode[code]?.flag ?? '🏳️';
      g.appendChild(ft);
      gInner.appendChild(g);
    });
  }

  // ---- rim teams: owner face (outer) + flag (inner) ----
  const gTeams = el('g');
  svg.appendChild(gTeams);
  const teamEls = [];
  leaves.forEach((leaf, i) => {
    const ang = i * STEP;
    const g = el('g', { class: 'pn-team' });

    if (!leaf.code) {
      const [fx, fy] = polar(ang, R_FLAG);
      g.appendChild(el('circle', { class: 'pn-flag-tbd', cx: fx, cy: fy, r: 16 }));
      const t = el('text', { class: 'pn-code', x: fx, y: fy });
      t.textContent = 'TBD';
      g.appendChild(t);
      gTeams.appendChild(g);
      teamEls.push({ g, edges: [], lit: [], owner: null, name: null });
      return;
    }

    const owner = ownerByTeam[leaf.code];
    const colour = owner?.colour ?? '#888';
    if (eliminated.has(leaf.code)) g.classList.add('elim');

    // owner face (outermost) with owner-colour ring
    const [px, py] = polar(ang, R_FACE);
    const clipId = `pn-clip${i}`;
    const clip = el('clipPath', { id: clipId });
    clip.appendChild(el('circle', { cx: px, cy: py, r: FACE_R }));
    defs.appendChild(clip);
    if (owner?.photo) {
      const S = FACE_R * 2 * FACE_ZOOM;
      g.appendChild(el('image', {
        class: 'pn-face', href: owner.photo,
        x: px - FOCUS_X * S, y: py - FOCUS_Y * S, width: S, height: S,
        'clip-path': `url(#${clipId})`, preserveAspectRatio: 'xMidYMid slice',
      }));
    }
    g.appendChild(el('circle', { class: 'pn-face-ring', cx: px, cy: py, r: FACE_R, stroke: colour }));

    // flag (inner) — bare emoji
    const [fx, fy] = polar(ang, R_FLAG);
    const ft = el('text', { class: 'pn-flag', x: fx, y: fy });
    ft.textContent = teamByCode[leaf.code]?.flag ?? '🏳️';
    g.appendChild(ft);

    // 3-letter code toward centre
    const [nx, ny] = polar(ang, R_TEAMNODE - 10);
    const ct = el('text', { class: 'pn-code', x: nx, y: ny });
    ct.textContent = leaf.code;
    g.appendChild(ct);

    gTeams.appendChild(g);

    // Highlight path = full run to the trophy for teams still alive; for
    // eliminated teams, only as far as the round they went out (rounds won
    // + the stub into the match they lost).
    let wins = 0;
    for (let k = 0; k < 5; k++) {
      if (winners.get(`${k}-${Math.floor(i / 2 ** (k + 1))}`) === leaf.code) wins++;
      else break;
    }
    const lit = eliminated.has(leaf.code) ? leafEdges[i].slice(0, wins + 1) : leafEdges[i];

    teamEls.push({ g, edges: leafEdges[i], lit, owner: owner?.name ?? null, name: teamByCode[leaf.code]?.name ?? leaf.code });
  });

  // ---- interactions: single-select owner filter + hover trace + name-on-click ----
  let selectedOwner = null;

  const clearFx = () => {
    teamEls.forEach((t) => t.g.classList.remove('dim'));
    Object.values(edgeById).forEach((e) => e.classList.remove('hot'));
  };
  const focusTeam = (rec) => {
    teamEls.forEach((t) => t.g.classList.add('dim'));
    rec.g.classList.remove('dim');
    rec.lit.forEach((id) => edgeById[id]?.classList.add('hot'));
  };
  const focusOwner = () => teamEls.forEach((t) => {
    if (t.owner === selectedOwner) t.lit.forEach((id) => edgeById[id]?.classList.add('hot'));
    else t.g.classList.add('dim');
  });
  const paint = () => {
    clearFx();
    resetChip.hidden = selectedOwner === null;
    legend.classList.toggle('has-sel', selectedOwner !== null);
    legend.querySelectorAll('[data-owner]').forEach((c) => c.classList.toggle('active', c.dataset.owner === selectedOwner));
    if (selectedOwner) focusOwner();
  };

  legend.addEventListener('click', (e) => {
    const chip = e.target.closest('span');
    if (!chip) return;
    if (chip.classList.contains('reset')) selectedOwner = null;
    else if (chip.dataset.owner) selectedOwner = selectedOwner === chip.dataset.owner ? null : chip.dataset.owner;
    else return;
    paint();
  });
  gTeams.addEventListener('mouseover', (e) => {
    const g = e.target.closest('.pn-team');
    if (!g) return;
    const rec = teamEls[[...gTeams.children].indexOf(g)];
    if (!rec?.edges.length) return;
    clearFx();
    focusTeam(rec);
  });
  gTeams.addEventListener('mouseout', paint);
  // Clicking a team just reveals its country name — no path pinning.
  gTeams.addEventListener('click', (e) => {
    const g = e.target.closest('.pn-team');
    if (!g) return;
    const rec = teamEls[[...gTeams.children].indexOf(g)];
    if (rec?.name) { showTeamTooltip(e.clientX, e.clientY, rec.name); e.stopPropagation(); }
  });

  container.appendChild(wrap);
}
