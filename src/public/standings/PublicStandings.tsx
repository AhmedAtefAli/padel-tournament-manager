import { useEffect, useMemo, useState } from 'react';
import type { Tournament } from '../../shared/tournament';
import { buildStandings, buildTeamJourney, journeyStages, type TeamMatchResult } from './standings';
import './standings.css';

const resultLabel = { win: 'Win', loss: 'Loss', draw: 'Draw', live: 'Live', scheduled: 'Scheduled' } as const;

function MatchTrail({ results, empty }: { results: TeamMatchResult[]; empty: string }) {
  if (!results.length) return <p className="journey-empty">{empty}</p>;
  return <div className="result-trail">{results.map(({ match, opponent, result, scoreFor, scoreAgainst }) => <article className={`result-card result-${result}`} key={match.id}>
    <div><span className="result-state">{resultLabel[result]}</span><strong>vs {opponent?.name ?? 'Unknown team'}</strong><small>{match.court} · {match.time}</small></div>
    <div className="result-score"><b>{scoreFor}–{scoreAgainst}</b><small>{match.sets || (result === 'scheduled' ? 'Not started' : 'No set details')}</small></div>
  </article>)}</div>;
}

export function PublicStandings({ tournament }: { tournament: Tournament }) {
  const standings = useMemo(() => buildStandings(tournament), [tournament]);
  const [selectedId, setSelectedId] = useState<number | null>(standings[0]?.id ?? null);
  useEffect(() => { if (!standings.some(team => team.id === selectedId)) setSelectedId(standings[0]?.id ?? null); }, [standings, selectedId]);
  const selected = standings.find(team => team.id === selectedId) ?? standings[0];
  const journey = useMemo(() => selected ? buildTeamJourney(tournament, selected) : null, [tournament, selected]);
  if (!selected || !journey) return <section className="standings-window" id="standings"><h2>Standings</h2><p>No teams have been added yet.</p></section>;
  return <section className="standings-window" id="standings">
    <div className="section-title"><div><p className="kicker">TOURNAMENT TABLE</p><h2>Standings & team journey</h2></div><span className="updated">Select a team to follow its road</span></div>
    <div className="standings-table" role="grid" aria-label="Tournament standings">
      <div className="standings-head" role="row"><span>#</span><span>TEAM</span><span>P</span><span>W</span><span>L</span><span>FOR</span><span>AG</span><span>DIFF</span><span>PTS</span><span>STATUS</span></div>
      {standings.map(team => <button className={`standings-row ${team.id === selected.id ? 'selected' : ''}`} key={team.id} onClick={() => setSelectedId(team.id)} role="row" aria-selected={team.id === selected.id}>
        <span className={`rank ${team.rank === 1 ? 'first' : ''}`}>{team.rank}</span><span className="standing-team"><strong>{team.name}</strong><small>{team.players}</small></span>
        <span data-label="Played">{team.played}</span><span data-label="Won">{team.won}</span><span data-label="Lost">{team.lost}</span><span data-label="For">{team.scoreFor}</span><span data-label="Against">{team.scoreAgainst}</span><span data-label="Difference">{team.scoreDifference > 0 ? '+' : ''}{team.scoreDifference}</span><b data-label="Points">{team.points}</b><span className="team-status">{team.status}</span>
      </button>)}
    </div>
    <div className="journey-panel"><header><div><p className="kicker">SELECTED TEAM</p><h3>{selected.name}</h3><p>{selected.players}</p></div><span className="outcome">{journey.status}</span></header>
      <div className="journey-stats"><span><b>#{selected.rank}</b> Rank</span><span><b>{selected.points}</b> Points</span><span><b>{selected.won}</b> Wins</span><span><b>{selected.scoreDifference > 0 ? '+' : ''}{selected.scoreDifference}</b> Difference</span></div>
      <ol className="stage-road" aria-label={`${selected.name} tournament journey`}>{journey.stages.map((progress, index) => <li className={`road-${progress.state}`} key={progress.stage}><span className="road-marker">{progress.state === 'champion' ? '★' : progress.state === 'eliminated' || progress.state === 'runner-up' ? '×' : index + 1}</span><div><strong>{progress.stage}</strong><small>{progress.label}</small></div></li>)}</ol>
      <div className="stage-results">{journeyStages.map(stage => <section key={stage}><h4>{stage}</h4><MatchTrail results={journey.matches.filter(result => result.stage === stage)} empty={journey.stages.find(item => item.stage === stage)?.state === 'not-reached' ? 'This team did not reach this stage.' : 'No match scheduled yet.'}/></section>)}</div>
      {journey.friendlies.length > 0 && <section className="friendly-results"><h4>Friendlies</h4><p>Shown for history only — these results do not affect standings.</p><MatchTrail results={journey.friendlies} empty="No friendly matches."/></section>}
    </div>
  </section>;
}
