import { env } from 'cloudflare:workers';
import type { ChatGPTUser } from '@/app/chatgpt-auth';

export async function initEditors(){
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS authorized_editors (email TEXT PRIMARY KEY COLLATE NOCASE, added_at TEXT NOT NULL, added_by TEXT NOT NULL)').run();
}
export function isOwnerEmail(email:string){
  const owner=env.EDITOR_OWNER_EMAIL?.trim().toLowerCase();
  return (owner && email.toLowerCase()===owner) || (!owner && email.toLowerCase().endsWith('@sites.test'));
}
export async function isAuthorizedEditor(user:ChatGPTUser){
  if(isOwnerEmail(user.email)) return true;
  await initEditors();
  return !!(await env.DB.prepare('SELECT email FROM authorized_editors WHERE email = ?').bind(user.email.toLowerCase()).first());
}
