const GROUP_STAGE_MATCH_COUNT = 72;

export function tournamentPhase(matches) {
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const allFinished = groupMatches.length === GROUP_STAGE_MATCH_COUNT
    && groupMatches.every((m) => m.status === 'finished');
  return allFinished ? 'knockout' : 'group';
}
