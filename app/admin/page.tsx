import { requireChatGPTUser } from '@/app/chatgpt-auth';
import AdminPanel from './panel';
import { isAuthorizedEditor,isOwnerEmail } from '@/lib/access';
export const dynamic='force-dynamic';
export default async function Admin(){ const user=await requireChatGPTUser('/admin'); if(!(await isAuthorizedEditor(user)))return <main className="access-denied"><div><p>ACCESS RESTRICTED</p><h1>Organizer access required</h1><span>{user.email} is signed in, but is not on this tournament&apos;s organizer list.</span><a href="/">Return to public scoreboard</a></div></main>; return <AdminPanel editor={user.displayName} isOwner={isOwnerEmail(user.email)}/>; }
