// Pure knockout-bracket model: folds the 16 R32 matches into a binary tree,
// and derives eliminations + advancing teams from finished matches.

export const KO_LEVEL = Object.freeze({ r32: 0, r16: 1, qf: 2, sf: 3, final: 4 });

export function sortByKickoff(list) {
  return [...list].sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));
}

export function matchWinner(m) {
  if (!m || m.status !== 'finished') return null;
  if (m.homeScore == null || m.awayScore == null) return null;
  if (m.homeScore > m.awayScore) return m.home;
  if (m.awayScore > m.homeScore) return m.away;
  return null; // draw — KO shouldn't produce one, but guard
}

// 16 R32 matches (kickoff order) -> 32 leaves + node levels [16,8,4,2,1].
export function buildBracketTree(r32Matches) {
  const r32 = sortByKickoff(r32Matches).slice(0, 16);
  const leaves = [];
  for (let m = 0; m < 16; m++) {
    const mm = r32[m];
    leaves.push({ pos: m * 2, code: mm?.home ?? null, side: 'home', matchId: mm?.id ?? null });
    leaves.push({ pos: m * 2 + 1, code: mm?.away ?? null, side: 'away', matchId: mm?.id ?? null });
  }

  const levels = [];
  let childPos = leaves.map((l) => l.pos);
  let count = 16;
  for (let lv = 0; lv < 5; lv++) {
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const c0 = childPos[i * 2];
      const c1 = childPos[i * 2 + 1];
      nodes.push({ level: lv, index: i, pos: (c0 + c1) / 2, children: [c0, c1] });
    }
    levels.push(nodes);
    childPos = nodes.map((n) => n.pos);
    count = Math.floor(count / 2);
  }
  return { leaves, levels };
}

const KO_STAGES = new Set(Object.keys(KO_LEVEL));

export function computeEliminated(matches) {
  const out = new Set();
  for (const m of matches) {
    if (!KO_STAGES.has(m.stage)) continue;
    const w = matchWinner(m);
    if (!w) continue;
    out.add(w === m.home ? m.away : m.home);
  }
  return out;
}

// Map "level-index" -> advancing team code, indexed by per-stage kickoff order.
export function winnersByNode(matches) {
  const byStage = {};
  for (const m of matches) {
    if (!(m.stage in KO_LEVEL)) continue;
    (byStage[m.stage] ??= []).push(m);
  }
  const map = new Map();
  for (const [stage, lv] of Object.entries(KO_LEVEL)) {
    sortByKickoff(byStage[stage] ?? []).forEach((m, i) => {
      const w = matchWinner(m);
      if (w) map.set(`${lv}-${i}`, w);
    });
  }
  return map;
}
