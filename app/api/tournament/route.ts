import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { defaultTournament, type Tournament } from '@/lib/tournament';
import { isAuthorizedEditor } from '@/lib/access';

async function init(){ await env.DB.prepare('CREATE TABLE IF NOT EXISTS tournament_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL)').run(); }
export async function GET(){
  await init(); const row=await env.DB.prepare('SELECT data FROM tournament_state WHERE id = 1').first<{data:string}>();
  return Response.json(row ? JSON.parse(row.data) : defaultTournament, {headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
  const user=await getChatGPTUser(); if(!user) return Response.json({error:'Sign in required'},{status:401});
  if(!(await isAuthorizedEditor(user))) return Response.json({error:'You are not an authorized organizer'},{status:403});
  const data=await request.json() as Tournament; data.updatedAt=new Date().toISOString(); await init();
  await env.DB.prepare('INSERT INTO tournament_state (id,data,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at').bind(JSON.stringify(data),data.updatedAt).run();
  return Response.json(data);
}
