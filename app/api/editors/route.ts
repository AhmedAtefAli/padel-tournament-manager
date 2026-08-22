import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { initEditors,isOwnerEmail } from '@/lib/access';

async function owner(){ const user=await getChatGPTUser(); return user&&isOwnerEmail(user.email)?user:null; }
export async function GET(){
  const user=await owner(); if(!user)return Response.json({error:'Owner access required'},{status:403});
  await initEditors(); const result=await env.DB.prepare('SELECT email, added_at as addedAt FROM authorized_editors ORDER BY added_at DESC').all<{email:string;addedAt:string}>();
  return Response.json({owner:user.email,editors:result.results});
}
export async function POST(request:Request){
  const user=await owner(); if(!user)return Response.json({error:'Owner access required'},{status:403});
  const {email}=await request.json() as {email?:string}; const normalized=email?.trim().toLowerCase();
  if(!normalized||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))return Response.json({error:'Enter a valid email address'},{status:400});
  if(isOwnerEmail(normalized))return Response.json({error:'The owner is already authorized'},{status:400});
  await initEditors(); await env.DB.prepare('INSERT OR IGNORE INTO authorized_editors (email,added_at,added_by) VALUES (?,?,?)').bind(normalized,new Date().toISOString(),user.email).run();
  return GET();
}
export async function DELETE(request:Request){
  const user=await owner(); if(!user)return Response.json({error:'Owner access required'},{status:403});
  const {email}=await request.json() as {email?:string}; if(!email)return Response.json({error:'Email required'},{status:400});
  await initEditors(); await env.DB.prepare('DELETE FROM authorized_editors WHERE email = ?').bind(email.trim().toLowerCase()).run();
  return GET();
}
