import { useTournament } from '../shared/useTournament';
import { PublicStageSections } from './PublicStageSections';
import './public.css';

export default function PublicApp() {
  const { tournament } = useTournament();
  const live = tournament.matches.find(match => match.status === 'live') ?? tournament.matches[0];
  const home = tournament.teams.find(team => team.id === live?.home);
  const away = tournament.teams.find(team => team.id === live?.away);
  const standings = [...tournament.teams].sort((a, b) => b.points - a.points).slice(0, 4);

  return <main className="shell"><header className="topbar"><a className="brand" href="#top"><span className="brand-mark">P</span><span>CLUB PADEL</span></a><nav className="nav"><a href="#overview">Overview</a><a href="#matches">Matches</a><a href="#standings">Standings</a></nav><a className="admin-link" href="?admin=1">Manage tournament</a></header>
    <section className="hero" id="overview"><div><p className="eyebrow"><span className="live-dot"/> LIVE TOURNAMENT</p><h1>{tournament.name}</h1><p className="hero-copy">Follow every match, point and position live from the club courts.</p></div><div className="hero-stats"><div><strong>{tournament.teams.length}</strong><span>TEAMS</span></div><div><strong>{tournament.matches.length}</strong><span>MATCHES</span></div><div><strong>{new Set(tournament.matches.map(match => match.court)).size}</strong><span>COURTS</span></div></div></section>
    <section className="content-grid"><div id="matches"><div className="section-title"><div><p className="kicker">ON COURT NOW</p><h2>Live match</h2></div><span className="updated">Live updates</span></div>{live && <article className="live-card"><div className="match-meta"><span className="live-pill">{live.status.toUpperCase()}</span><span>{live.court} · {tournament.format}</span></div><div className="score-row"><div className="team"><span className="avatar lime">{home?.name.slice(0, 2).toUpperCase()}</span><div><strong>{home?.name}</strong><small>{home?.players}</small></div></div><div className="score"><strong>{live.homeScore}</strong><span>—</span><strong>{live.awayScore}</strong><small>LIVE SCORE</small></div><div className="team away"><div><strong>{away?.name}</strong><small>{away?.players}</small></div><span className="avatar blue">{away?.name.slice(0, 2).toUpperCase()}</span></div></div><div className="sets"><span>SETS</span><b>{live.sets || 'Not started'}</b></div></article>}<div className="section-title upcoming"><div><p className="kicker">FULL TOURNAMENT</p><h2>Matches by stage</h2></div></div><PublicStageSections tournament={tournament}/></div>
      <aside className="standings-card" id="standings"><div className="section-title"><div><p className="kicker">GROUP STAGE</p><h2>Standings</h2></div></div><div className="table-head"><span>TEAM</span><span>P</span><span>W</span><span>PTS</span></div>{standings.map((team, index) => <div className="standing" key={team.id}><span className={`rank ${index === 0 ? 'first' : ''}`}>{index + 1}</span><div><strong>{team.name}</strong><small>{team.players}</small></div><span>{team.played}</span><span>{team.won}</span><b>{team.points}</b></div>)}</aside>
    </section><footer><span>{tournament.name} · {tournament.dates}</span><span>Scores update live</span></footer></main>;
}

