# GitHub Pages + Supabase setup

The public website will be:
`https://ahmedatefali.github.io/padel-tournament-manager/`

## 1. Create Supabase

1. Create a free project at https://supabase.com/dashboard.
2. Open **SQL Editor**, paste and run `supabase/schema.sql`. The owner is already set to `ahmedate125@gmail.com`.
3. In **Authentication > URL Configuration**, set Site URL to the GitHub Pages URL above and add it as a Redirect URL. Organizer sign-in uses secure email magic links, including Gmail addresses.
4. The anon/publishable key is designed for browser use; row-level security protects edits. Never use the service-role key here.

## 2. Configure GitHub

The public Supabase URL and publishable key are already configured. Open **Settings > Pages** and choose **GitHub Actions** as the source. Pushes to `main` deploy automatically.

## 3. Local preview

Copy `.env.example` to `.env.local`, fill in the same two values, then run:

```sh
pnpm install
pnpm dev
```

Open the local URL shown in the terminal. Use `#/admin` for management. Spectators use the normal link and do not sign in.

