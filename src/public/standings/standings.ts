import type { Match, MatchStage, Team, Tournament } from '../../shared/tournament';

export const journeyStages = ['Group stage', 'Quarter-final', 'Semi-final', 'Final'] as const;
export type JourneyStage = typeof journeyStages[number];
export type ResultState = 'win' | 'loss' | 'draw' | 'live' | 'scheduled';
export type ProgressState = 'completed' | 'active' | 'upcoming' | 'not-reached' | 'eliminated' | 'runner-up' | 'champion';
export type RankedTeam = Team & { rank: number; lost: number; scoreFor: number; scoreAgainst: number; scoreDifference: number; status: string };
export type TeamMatchResult = { match: Match; stage: MatchStage; opponent?: Team; result: ResultState; scoreFor: number; scoreAgainst: number };
export type StageProgress = { stage: JourneyStage; state: ProgressState; label: string };
export type TeamJourney = { status: string; stages: StageProgress[]; matches: TeamMatchResult[]; friendlies: TeamMatchResult[] };

const stageOf = (match: Match): MatchStage => match.stage ?? 'Group stage';

function resultFor(match: Match, teamId: number): ResultState {
  if (match.status === 'live') return 'live';
  if (match.status === 'scheduled') return 'scheduled';
  const own = match.home === teamId ? match.homeScore : match.awayScore;
  const other = match.home === teamId ? match.awayScore : match.homeScore;
  return own === other ? 'draw' : own > other ? 'win' : 'loss';
}

export function teamMatchResult(match: Match, team: Team, teams: Team[]): TeamMatchResult {
  const isHome = match.home === team.id;
  return { match, stage: stageOf(match), opponent: teams.find(candidate => candidate.id === (isHome ? match.away : match.home)), result: resultFor(match, team.id), scoreFor: isHome ? match.homeScore : match.awayScore, scoreAgainst: isHome ? match.awayScore : match.homeScore };
}

function statusFor(team: Team, tournament: Tournament): string {
  const results = tournament.matches.filter(match => match.home === team.id || match.away === team.id).map(match => teamMatchResult(match, team, tournament.teams)).filter(result => result.stage !== 'Friendly');
  const final = results.find(result => result.stage === 'Final');
  if (final?.result === 'win') return 'Champion';
  if (final?.result === 'loss') return 'Runner-up';
  if (final) return final.result === 'live' ? 'Final live' : 'Finalist';
  for (const stage of ['Semi-final', 'Quarter-final'] as JourneyStage[]) {
    const stageResult = results.find(result => result.stage === stage);
    if (stageResult?.result === 'loss') return `Eliminated in ${stage}`;
  }
  const highestTeamIndex = Math.max(0, ...results.map(result => journeyStages.indexOf(result.stage as JourneyStage)));
  const highestCreatedIndex = Math.max(0, ...tournament.matches.filter(match => stageOf(match) !== 'Friendly').map(match => journeyStages.indexOf(stageOf(match) as JourneyStage)));
  if (highestCreatedIndex > highestTeamIndex) return `Eliminated after ${journeyStages[highestTeamIndex]}`;
  const highestResult = results.find(result => result.stage === journeyStages[highestTeamIndex]);
  if (highestTeamIndex > 0 && highestResult) return highestResult.result === 'live' ? `${highestResult.stage} live` : `Active in ${highestResult.stage}`;
  return results.some(result => result.result === 'live') ? 'Group stage live' : 'Group stage';
}

export function buildStandings(tournament: Tournament): RankedTeam[] {
  const ranked = tournament.teams.map(team => {
    const groupMatches = tournament.matches.filter(match => stageOf(match) === 'Group stage' && match.status === 'finished' && (match.homeScore !== 0 || match.awayScore !== 0 || match.sets.trim() !== '') && (match.home === team.id || match.away === team.id));
    const scoreFor = groupMatches.reduce((sum, match) => sum + (match.home === team.id ? match.homeScore : match.awayScore), 0);
    const scoreAgainst = groupMatches.reduce((sum, match) => sum + (match.home === team.id ? match.awayScore : match.homeScore), 0);
    const won = groupMatches.filter(match => (match.home === team.id ? match.homeScore : match.awayScore) > (match.home === team.id ? match.awayScore : match.homeScore)).length;
    const drawn = groupMatches.filter(match => match.homeScore === match.awayScore).length;
    const lost = groupMatches.length - won - drawn;
    return { ...team, played: groupMatches.length, won, points: won * 3 + drawn, rank: 0, lost, scoreFor, scoreAgainst, scoreDifference: scoreFor - scoreAgainst, status: statusFor(team, tournament) };
  }).sort((a, b) => b.points - a.points || b.won - a.won || b.scoreDifference - a.scoreDifference || a.name.localeCompare(b.name));
  return ranked.map((team, index) => ({ ...team, rank: index + 1 }));
}

export function buildTeamJourney(tournament: Tournament, team: Team): TeamJourney {
  const all = tournament.matches.filter(match => match.home === team.id || match.away === team.id).map(match => teamMatchResult(match, team, tournament.teams));
  const matches = all.filter(result => result.stage !== 'Friendly');
  const status = statusFor(team, tournament);
  const highestIndex = Math.max(0, ...matches.map(result => journeyStages.indexOf(result.stage as JourneyStage)));
  const stages = journeyStages.map((stage, index): StageProgress => {
    const stageResults = matches.filter(result => result.stage === stage);
    const loss = stageResults.some(result => result.result === 'loss');
    const active = stageResults.some(result => result.result === 'live' || result.result === 'scheduled');
    let state: ProgressState = index < highestIndex ? 'completed' : index > highestIndex ? 'not-reached' : active ? 'active' : 'completed';
    let label = state === 'not-reached' ? 'Not reached' : state === 'active' ? 'In progress' : 'Completed';
    if (stage === 'Final' && status === 'Champion') { state = 'champion'; label = 'Champion'; }
    else if (stage === 'Final' && status === 'Runner-up') { state = 'runner-up'; label = 'Runner-up'; }
    else if (loss && stage !== 'Group stage') { state = 'eliminated'; label = 'Eliminated'; }
    else if (index === highestIndex && status.startsWith('Eliminated after')) { state = 'eliminated'; label = 'Eliminated'; }
    else if (!stageResults.length && index === highestIndex && stage !== 'Group stage') { state = 'upcoming'; label = 'Awaiting match'; }
    return { stage, state, label };
  });
  return { status, stages, matches, friendlies: all.filter(result => result.stage === 'Friendly') };
}
