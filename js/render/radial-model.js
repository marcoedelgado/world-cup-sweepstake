// Pure knockout-bracket model: folds the 16 R32 matches into a binary tree,
// and derives eliminations + advancing teams from finished matches.

export const KO_LEVEL = Object.freeze({ r32: 0, r16: 1, qf: 2, sf: 3, final: 4 });

export function sortByKickoff(list) {
  return [...list].sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));
}

// Bracket order is defined by match id, not kickoff: consecutive ids feed the
// next round (id 415 & 416 meet in the R16, etc). Kickoff order scrambles this
// on real fixtures, so we key the tree off the trailing integer of the id.
function bracketKey(id) {
  const m = String(id ?? '').match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : 0;
}

export function sortByBracket(list) {
  return [...list].sort((a, b) => bracketKey(a?.id) - bracketKey(b?.id));
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
  const r32 = sortByBracket(r32Matches).slice(0, 16);
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

// Map "level-index" -> advancing team code.
//
// The bracket topology (which R32 matches meet in the R16, which R16 winners
// meet in the QF, ...) is fixed by match-id adjacency at the R32 leaves. Later
// rounds are then placed by *team code*: an R16/QF/... match belongs to the
// node whose two children already produced exactly its two competitors. This
// is result-driven and never relies on per-stage kickoff order (which does not
// line up with the tree on real fixtures).
export function winnersByNode(matches) {
  const stageByLevel = ['r32', 'r16', 'qf', 'sf', 'final'];
  const byStage = {};
  for (const m of matches) {
    if (!(m.stage in KO_LEVEL)) continue;
    (byStage[m.stage] ??= []).push(m);
  }

  const map = new Map();
  // winnerAt[level][index] = code that won that node's match (else null).
  const winnerAt = [];

  // Level 0 (R32): node index follows the same bracket ordering as the tree.
  const r32 = sortByBracket(byStage.r32 ?? []).slice(0, 16);
  winnerAt[0] = r32.map((m, i) => {
    const w = matchWinner(m);
    if (w) map.set(`0-${i}`, w);
    return w ?? null;
  });

  // Levels 1..4: match each stage's fixtures to the node whose two children
  // produced its competitors.
  for (let lv = 1; lv < 5; lv++) {
    const nodes = winnerAt[lv - 1].length >> 1;
    const stageMatches = byStage[stageByLevel[lv]] ?? [];
    const used = new Set();
    winnerAt[lv] = [];
    for (let j = 0; j < nodes; j++) {
      const a = winnerAt[lv - 1][j * 2];
      const b = winnerAt[lv - 1][j * 2 + 1];
      let w = null;
      if (a && b) {
        const idx = stageMatches.findIndex((m, i) => !used.has(i)
          && ((m.home === a && m.away === b) || (m.home === b && m.away === a)));
        if (idx !== -1) {
          used.add(idx);
          w = matchWinner(stageMatches[idx]);
          if (w) map.set(`${lv}-${j}`, w);
        }
      }
      winnerAt[lv].push(w);
    }
  }
  return map;
}
