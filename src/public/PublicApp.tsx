import { useTournament } from '../shared/useTournament';
import { PublicStageSections } from './PublicStageSections';
import { PublicStandings } from './standings/PublicStandings';
import './public.css';

export default function PublicApp() {
  const { tournament } = useTournament();
  const isStandingsView = new URLSearchParams(window.location.search).get('view') === 'standings';
  const live = tournament.matches.find(match => match.status === 'live') ?? tournament.matches[0];
  const home = tournament.teams.find(team => team.id === live?.home);
  const away = tournament.teams.find(team => team.id === live?.away);

  return <main className="shell" id="top">
    <header className="topbar">
      <a className="brand" href="?view=main#top"><span className="brand-mark">P</span><span>CLUB PADEL</span></a>
      <nav className="nav" aria-label="Public tournament views"><a className={!isStandingsView ? 'active' : ''} href="?view=main#overview">Tournament</a><a className={isStandingsView ? 'active' : ''} href="?view=standings">Standings</a></nav>
      <a className="admin-link" href="?admin=1" target="_blank" rel="noreferrer">Manage tournament ↗</a>
    </header>

    {!isStandingsView ? <>
      <section className="hero" id="overview"><div><p className="eyebrow"><span className="live-dot"/> LIVE TOURNAMENT</p><h1>{tournament.name}</h1><p className="hero-copy">Follow every match, point and position live from the club courts.</p></div><div className="hero-stats"><div><strong>{tournament.teams.length}</strong><span>TEAMS</span></div><div><strong>{tournament.matches.length}</strong><span>MATCHES</span></div><div><strong>{new Set(tournament.matches.map(match => match.court)).size}</strong><span>COURTS</span></div></div></section>
      <section className="content-grid" id="matches"><div><div className="section-title"><div><p className="kicker">ON COURT NOW</p><h2>Live match</h2></div><span className="updated">Live updates</span></div>{live && <article className="live-card"><div className="match-meta"><span className="live-pill">{live.status.toUpperCase()}</span><span>{live.court} · {tournament.format}</span></div><div className="score-row"><div className="team"><span className="avatar lime">{home?.name.slice(0, 2).toUpperCase()}</span><div><strong>{home?.name}</strong><small>{home?.players}</small></div></div><div className="score"><strong>{live.homeScore}</strong><span>—</span><strong>{live.awayScore}</strong><small>LIVE SCORE</small></div><div className="team away"><div><strong>{away?.name}</strong><small>{away?.players}</small></div><span className="avatar blue">{away?.name.slice(0, 2).toUpperCase()}</span></div></div><div className="sets"><span>SETS</span><b>{live.sets || 'Not started'}</b></div></article>}<div className="section-title upcoming"><div><p className="kicker">FULL TOURNAMENT</p><h2>Matches by stage</h2></div></div><PublicStageSections tournament={tournament}/></div></section>
    </> : <>
      <section className="standings-view-head"><div><p className="eyebrow">TOURNAMENT PROGRESS</p><h1>Standings</h1><p>Choose a team to see every result and its road through the tournament.</p></div><a href="?view=main#matches">View live matches</a></section>
      <PublicStandings tournament={tournament}/>
    </>}

    <footer><span>{tournament.name} · {tournament.dates}</span><span>Scores update live</span></footer>
  </main>;
}
