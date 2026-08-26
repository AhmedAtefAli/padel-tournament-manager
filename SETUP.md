# GitHub Pages + Supabase setup

The public website will be:
`https://ahmedatefali.github.io/padel-tournament-manager/`

## 1. Create Supabase

1. Create a free project at https://supabase.com/dashboard.
2. Open **SQL Editor**, paste and run `supabase/schema.sql`. The owner is already set to `ahmedate125@gmail.com`.
3. In **Authentication > URL Configuration**, set Site URL to the GitHub Pages URL above and add it as a Redirect URL. Organizers use email/password authentication; Supabase securely hashes passwords.
4. The anon/publishable key is designed for browser use; row-level security protects edits. Never use the service-role key here.

## Organizer signup and owner approval

Run the latest `supabase/schema.sql` to add pending organizer requests and the owner-only approval function. A trigger on `auth.users` creates a pending request whenever a new account signs up.

The optional owner email notification uses the `notify-owner` Supabase Edge Function and Resend:

```sh
supabase secrets set RESEND_API_KEY=your_resend_key OWNER_EMAIL=ahmedate125@gmail.com
supabase functions deploy notify-owner --no-verify-jwt
```

For a verified sending domain, also set `OWNER_NOTIFICATION_FROM`. The function receives only the applicant email; passwords remain inside Supabase Auth and are never emailed or stored in `organizer_requests`.

## 2. Configure GitHub

The public Supabase URL and publishable key are already configured. Open **Settings > Pages** and choose **GitHub Actions** as the source. Pushes to `main` deploy automatically.

## 3. Local preview

Copy `.env.example` to `.env.local`, fill in the same two values, then run:

```sh
pnpm install
pnpm dev
```

Open the local URL shown in the terminal. Use `#/admin` for management. Spectators use the normal link and do not sign in.

