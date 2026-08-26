import { stageOrder, type Tournament } from '../shared/tournament';

type Props = { tournament: Tournament; onChange: (id: number, field: string, value: string | number) => void; onRemove: (id: number) => void };

export function AdminStageSections({ tournament, onChange, onRemove }: Props) {
  return <div className="stage-stack">{[...stageOrder].reverse().map(stage => {
    const matches = tournament.matches.filter(match => (match.stage ?? 'Group stage') === stage).reverse();
    if (!matches.length) return null;
    return <section className="admin-card stage-admin-card" key={stage}><header className="stage-admin-head"><div><p className="kicker">TOURNAMENT STAGE</p><h3>{stage}</h3></div><span>{matches.length} {matches.length === 1 ? 'match' : 'matches'}</span></header>{matches.map(match => {
      const home = tournament.teams.find(team => team.id === match.home);
      const away = tournament.teams.find(team => team.id === match.away);
      return <div className="edit-match" key={match.id}><div><b>{home?.name}</b><small>{match.time} · {match.court}</small><b>{away?.name}</b></div><input type="number" min="0" value={match.homeScore} onChange={event => onChange(match.id, 'homeScore', +event.target.value)}/><span>—</span><input type="number" min="0" value={match.awayScore} onChange={event => onChange(match.id, 'awayScore', +event.target.value)}/><input value={match.sets} placeholder="6–3, 6–4" onChange={event => onChange(match.id, 'sets', event.target.value)}/><select value={match.status} onChange={event => onChange(match.id, 'status', event.target.value)}><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="finished">Finished</option></select><button className="remove-match" onClick={() => onRemove(match.id)}>Remove</button></div>;
    })}</section>;
  })}</div>;
}

