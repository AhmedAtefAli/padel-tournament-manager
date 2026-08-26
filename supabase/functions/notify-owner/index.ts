import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://ahmedatefali.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
]);

Deno.serve(async request => {
  const origin = request.headers.get('origin') ?? '';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://ahmedatefali.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  const { email } = await request.json().catch(() => ({ email: '' }));
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail) return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: requestRow } = await supabase.from('organizer_requests').select('email,status,notified_at').eq('email', normalizedEmail).maybeSingle();
  if (!requestRow || requestRow.status !== 'pending' || requestRow.notified_at) return new Response(JSON.stringify({ sent: false }), { headers });

  const ownerEmail = Deno.env.get('OWNER_EMAIL') ?? 'ahmedate125@gmail.com';
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return new Response(JSON.stringify({ error: 'Email service is not configured' }), { status: 503, headers });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('OWNER_NOTIFICATION_FROM') ?? 'Padel Tournament <onboarding@resend.dev>',
      to: [ownerEmail],
      subject: 'New tournament organizer request',
      html: `<p><strong>${normalizedEmail}</strong> requested access to manage the padel tournament.</p><p>Sign in to the tournament management page to approve or reject the request.</p>`,
    }),
  });
  if (!response.ok) return new Response(JSON.stringify({ error: 'Notification could not be sent' }), { status: 502, headers });

  await supabase.from('organizer_requests').update({ notified_at: new Date().toISOString() }).eq('email', normalizedEmail).is('notified_at', null);
  return new Response(JSON.stringify({ sent: true }), { headers });
});

