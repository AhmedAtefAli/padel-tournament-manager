import type { Tournament } from '../shared/tournament';

type LiveMatchesProps = {
  tournament: Tournament;
};

export function LiveMatches({ tournament }: LiveMatchesProps) {
  const liveMatches = tournament.matches.filter((match, index, matches) =>
    match.status === 'live' && matches.findIndex(candidate =>
      candidate.status === 'live' && candidate.court.trim().toLocaleLowerCase() === match.court.trim().toLocaleLowerCase()
    ) === index
  );

  if (liveMatches.length === 0) {
    return <div className="live-empty" role="status">No matches are live right now.</div>;
  }

  return <div className="live-match-grid">
    {liveMatches.map(match => {
      const home = tournament.teams.find(team => team.id === match.home);
      const away = tournament.teams.find(team => team.id === match.away);

      return <article className="live-card" key={match.id}>
        <div className="match-meta"><span className="live-pill">LIVE</span><span>{match.court} · {tournament.format}</span></div>
        <div className="score-row">
          <div className="team"><span className="avatar lime">{home?.name.slice(0, 2).toUpperCase()}</span><div><strong>{home?.name}</strong><small>{home?.players}</small></div></div>
          <div className="score"><strong>{match.homeScore}</strong><span>—</span><strong>{match.awayScore}</strong><small>LIVE SCORE</small></div>
          <div className="team away"><div><strong>{away?.name}</strong><small>{away?.players}</small></div><span className="avatar blue">{away?.name.slice(0, 2).toUpperCase()}</span></div>
        </div>
        <div className="sets"><span>SETS</span><b>{match.sets || 'In progress'}</b></div>
      </article>;
    })}
  </div>;
}
