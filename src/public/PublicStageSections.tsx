import { stageOrder, type Tournament } from '../shared/tournament';

export function PublicStageSections({ tournament }: { tournament: Tournament }) {
  return <div className="stage-stack">{[...stageOrder].reverse().map(stage => {
    const matches = tournament.matches.filter(match => (match.stage ?? 'Group stage') === stage).reverse();
    if (!matches.length) return null;
    return <section className={`stage-box stage-${stage.toLowerCase().replaceAll(' ', '-')}`} key={stage}>
      <header><div><p className="kicker">TOURNAMENT STAGE</p><h3>{stage}</h3></div><span>{matches.length} {matches.length === 1 ? 'match' : 'matches'}</span></header>
      <div className="match-list">{matches.map(match => {
        const home = tournament.teams.find(team => team.id === match.home);
        const away = tournament.teams.find(team => team.id === match.away);
        return <article key={match.id}><time>{match.time}<small>{match.court}</small></time><div><strong>{home?.name}</strong><small>{home?.players}</small></div><span>{match.status === 'finished' || match.status === 'live' ? `${match.homeScore}–${match.awayScore}` : 'VS'}</span><div className="right"><strong>{away?.name}</strong><small className={`status-${match.status}`}>{match.status.toUpperCase()}</small></div></article>;
      })}</div>
    </section>;
  })}</div>;
}

