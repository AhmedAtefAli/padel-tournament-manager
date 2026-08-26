import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://ahmedatefali.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
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

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const ownerEmail = authData.user?.email?.trim().toLowerCase();
  if (authError || !ownerEmail) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers });

  const { data: owner } = await admin.from('authorized_editors').select('role').eq('email', ownerEmail).eq('role', 'owner').maybeSingle();
  if (!owner) return new Response(JSON.stringify({ error: 'Only the tournament owner can send approval emails' }), { status: 403, headers });

  const { email } = await request.json().catch(() => ({ email: '' }));
  const applicantEmail = String(email).trim().toLowerCase();
  if (!applicantEmail) return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers });

  const { data: organizer } = await admin.from('organizer_requests').select('status,decision_notified_at').eq('email', applicantEmail).maybeSingle();
  if (!organizer || organizer.status !== 'approved') return new Response(JSON.stringify({ error: 'Organizer is not approved' }), { status: 409, headers });
  if (organizer.decision_notified_at) return new Response(JSON.stringify({ sent: false, duplicate: true }), { headers });

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return new Response(JSON.stringify({ error: 'Email service is not configured' }), { status: 503, headers });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('OWNER_NOTIFICATION_FROM') ?? 'Padel Tournament <onboarding@resend.dev>',
      to: [applicantEmail],
      subject: 'You are approved as a padel tournament organizer',
      html: '<p>Your organizer request has been approved.</p><p>You can now sign in to the padel tournament management page with your email and password.</p>',
    }),
  });
  if (!response.ok) return new Response(JSON.stringify({ error: 'Confirmation email could not be sent' }), { status: 502, headers });

  await admin.from('organizer_requests').update({ decision_notified_at: new Date().toISOString() }).eq('email', applicantEmail).is('decision_notified_at', null);
  return new Response(JSON.stringify({ sent: true }), { headers });
});
