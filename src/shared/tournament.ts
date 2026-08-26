export type Team = { id: number; name: string; players: string; played: number; won: number; points: number };
export type MatchStage = 'Group stage' | 'Quarter-final' | 'Semi-final' | 'Final' | 'Friendly';
export const stageOrder: MatchStage[] = ['Group stage', 'Quarter-final', 'Semi-final', 'Final', 'Friendly'];
export type Match = { id: number; stage?: MatchStage; court: string; time: string; home: number; away: number; homeScore: number; awayScore: number; sets: string; status: 'scheduled' | 'live' | 'finished' };
export type Tournament = { name: string; dates: string; format: 'Round robin' | 'Two groups'; teams: Team[]; matches: Match[]; updatedAt: string };

export const defaultTournament: Tournament = {
  name: 'Summer Club Championship', dates: '22–24 August', format: 'Two groups', updatedAt: new Date().toISOString(),
  teams: [
    {id:1,name:'Smash Bros',players:'Omar & Karim',played:3,won:3,points:9},{id:2,name:'Court Kings',players:'Ahmed & Youssef',played:3,won:2,points:6},
    {id:3,name:'Glass Hunters',players:'Tarek & Ziad',played:3,won:2,points:6},{id:4,name:'Net Ninjas',players:'Ali & Hassan',played:3,won:1,points:3},
    {id:5,name:'Power Padel',players:'Samir & Fadi',played:2,won:1,points:3},{id:6,name:'Golden Point',players:'Amr & Mostafa',played:2,won:0,points:0},
    {id:7,name:'Lob Squad',players:'Nader & Bilal',played:2,won:0,points:0},{id:8,name:'Sidewall',players:'Rami & Hany',played:2,won:0,points:0}],
  matches:[{id:1,court:'Court 1',time:'18:00',home:1,away:4,homeScore:4,awayScore:2,sets:'6–3, 4–2',status:'live'},{id:2,court:'Court 2',time:'18:30',home:2,away:3,homeScore:0,awayScore:0,sets:'',status:'scheduled'},{id:3,court:'Court 1',time:'19:15',home:5,away:6,homeScore:0,awayScore:0,sets:'',status:'scheduled'}]
};

