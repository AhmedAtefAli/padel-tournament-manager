import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isConfigured, supabase } from '../shared/supabase';
import { stageOrder, type MatchStage, type Tournament } from '../shared/tournament';
import { useTournament } from '../shared/useTournament';
import { AdminStageSections } from './AdminStageSections';
import './admin.css';

type Editor = { email: string; role: 'owner' | 'editor' };

export default function AdminApp() {
  const { tournament, setTournament } = useTournament();
  const [session, setSession] = useState<Session | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const email = session?.user.email?.toLowerCase();
    if (!supabase || !email) { setAuthorized(false); return; }
    void supabase.from('authorized_editors').select('email').eq('email', email).maybeSingle().then(({ data }) => setAuthorized(Boolean(data)));
  }, [session]);

  if (!isConfigured) return <Gate title="Setup required" text="Add your Supabase project values to .env.local, then restart the app."/>;
  if (!session) return <OrganizerLogin/>;
  if (!authorized) return <Gate title="Access not authorized" text={`${session.user.email?.toLowerCase()} is signed in, but is not on the organizer list.`} action={() => supabase?.auth.signOut()} actionText="Sign out"/>;
  return <TournamentEditor tournament={tournament} setTournament={setTournament} session={session}/>;
}

function TournamentEditor({ tournament, setTournament, session }: { tournament: Tournament; setTournament: (value: Tournament) => void; session: Session }) {
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState({ stage: 'Quarter-final' as MatchStage, home: 1, away: 2, time: '18:00', court: 'Court 1' });
  const [editors, setEditors] = useState<Editor[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const email = session.user.email?.toLowerCase() ?? '';
  const owner = editors.some(editor => editor.email === email && editor.role === 'owner');
  const loadEditors = useCallback(async () => { if (!supabase) return; const { data } = await supabase.from('authorized_editors').select('email,role').order('role'); setEditors((data ?? []) as Editor[]); }, []);
  useEffect(() => { void loadEditors(); }, [loadEditors]);

  const save = async () => { if (!supabase) return setNote('Supabase is not connected yet. Follow SETUP.md.'); const now = new Date().toISOString(); const { error } = await supabase.from('tournament_state').upsert({ id: 1, data: { ...tournament, updatedAt: now }, updated_at: now }); setNote(error?.message ?? 'Changes are live'); };
  const patchMatch = (id: number, field: string, value: string | number) => setTournament({ ...tournament, matches: tournament.matches.map(match => match.id === id ? { ...match, [field]: value } : match) });
  const addMatch = () => { if (draft.home === draft.away) return setNote('Choose two different teams'); setTournament({ ...tournament, matches: [...tournament.matches, { id: Math.max(0, ...tournament.matches.map(match => match.id)) + 1, ...draft, homeScore: 0, awayScore: 0, sets: '', status: 'scheduled' }] }); };
  const addEditor = async () => { if (!supabase) return; const { error } = await supabase.from('authorized_editors').insert({ email: newEmail.trim().toLowerCase(), role: 'editor', added_by: email }); setNote(error?.message ?? 'Organizer added'); setNewEmail(''); void loadEditors(); };
  const removeEditor = async (editorEmail: string) => { if (!supabase) return; const { error } = await supabase.from('authorized_editors').delete().eq('email', editorEmail); setNote(error?.message ?? 'Organizer removed'); void loadEditors(); };

  return <main className="admin-shell"><header className="admin-head"><div><a href="./" target="_blank" rel="noreferrer">View public scoreboard ↗</a><h1>Tournament control</h1><p>Signed in as {email}</p></div><button onClick={save}>Publish changes</button></header>{note && <p className="notice">{note}</p>}
    <section className="settings"><label>Tournament name<input value={tournament.name} onChange={event => setTournament({ ...tournament, name: event.target.value })}/></label><label>Dates<input value={tournament.dates} onChange={event => setTournament({ ...tournament, dates: event.target.value })}/></label><label>Structure<select value={tournament.format} onChange={event => setTournament({ ...tournament, format: event.target.value as Tournament['format'] })}><option>Two groups</option><option>Round robin</option></select></label></section>
    <section className="admin-card add-match-card"><div className="section-title"><div><p className="kicker">NEXT STAGE</p><h2>Add a match</h2></div></div><div className="new-match-grid"><label>Stage<select value={draft.stage} onChange={event => setDraft({ ...draft, stage: event.target.value as MatchStage })}>{stageOrder.map(stage => <option key={stage}>{stage}</option>)}</select></label><label>Team 1<select value={draft.home} onChange={event => setDraft({ ...draft, home: +event.target.value })}>{tournament.teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label><label>Team 2<select value={draft.away} onChange={event => setDraft({ ...draft, away: +event.target.value })}>{tournament.teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label><label>Time<input type="time" value={draft.time} onChange={event => setDraft({ ...draft, time: event.target.value })}/></label><label>Court<input value={draft.court} onChange={event => setDraft({ ...draft, court: event.target.value })}/></label><button onClick={addMatch}>+ Add match</button></div></section>
    <section className="admin-match-area"><div className="section-title admin-matches-title"><div><p className="kicker">SCORE DESK</p><h2>Matches by stage</h2></div></div><AdminStageSections tournament={tournament} onChange={patchMatch} onRemove={id => setTournament({ ...tournament, matches: tournament.matches.filter(match => match.id !== id) })}/></section>
    <section className="admin-card"><div className="section-title"><div><p className="kicker">REGISTRATION</p><h2>Teams & players</h2></div></div>{tournament.teams.map((team, index) => <div className="edit-team" key={team.id}><span>{index + 1}</span><input value={team.name} onChange={event => setTournament({ ...tournament, teams: tournament.teams.map(item => item.id === team.id ? { ...item, name: event.target.value } : item) })}/><input value={team.players} onChange={event => setTournament({ ...tournament, teams: tournament.teams.map(item => item.id === team.id ? { ...item, players: event.target.value } : item) })}/></div>)}</section>
    {owner && <section className="admin-card access-card"><div className="section-title"><div><p className="kicker">SECURITY</p><h2>Authorized organizers</h2></div></div><div className="add-editor"><input type="email" value={newEmail} placeholder="organizer@gmail.com" onChange={event => setNewEmail(event.target.value)}/><button onClick={addEditor}>Add organizer</button></div><div className="editor-list">{editors.map(editor => <div className="editor-row" key={editor.email}><span><b>{editor.email}</b><small>{editor.role}</small></span>{editor.role !== 'owner' && <button onClick={() => removeEditor(editor.email)}>Remove</button>}</div>)}</div></section>}
  </main>;
}

function Gate({ title, text, action, actionText = 'Continue' }: { title: string; text: string; action?: () => void; actionText?: string }) {
  return <main className="admin-shell"><header className="admin-head"><div><a href="./" target="_blank" rel="noreferrer">View public scoreboard ↗</a><h1>{title}</h1><p>{text}</p></div>{action && <button onClick={action}>{actionText}</button>}</header></main>;
}

function OrganizerLogin() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const signIn = async () => { if (!supabase) return; setBusy(true); setMessage(''); const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); setBusy(false); setMessage(error?.message ?? 'Signed in successfully. Opening tournament control…'); };
  return <main className="admin-shell"><header className="admin-head"><div><a href="./" target="_blank" rel="noreferrer">View public scoreboard ↗</a><h1>Organizer sign-in</h1><p>Spectators do not need an account. Authorized organizers sign in with email and password.</p></div></header><section className="admin-card access-card"><div className="password-login"><label>Email<input type="email" autoComplete="email" value={email} placeholder="yourname@gmail.com" onChange={event => setEmail(event.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" value={password} placeholder="Your password" onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void signIn(); }}/></label><button onClick={signIn} disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button></div>{message && <p className="access-note">{message}</p>}</section></main>;
}

