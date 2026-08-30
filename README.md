# Padel Tournament Manager

A mobile-friendly tournament manager for club padel events. Spectators can follow live scores, matches by stage, standings, and each team's tournament journey. Authorized organizers can manage teams, matches, scores, stages, and organizer access through a Supabase-authenticated admin area.

## Production links

- [Tournament overview and live matches](https://ahmedatefali.github.io/padel-tournament-manager/?view=main)
- [Standings and team journeys](https://ahmedatefali.github.io/padel-tournament-manager/?view=standings)
- [Organizer sign-in and management](https://ahmedatefali.github.io/padel-tournament-manager/?admin=1)

The public views do not require an account. Only approved organizers can access tournament management.

## Features

- Public live scores and stage-by-stage match sections
- Dedicated interactive standings view for every team
- Automatically calculated played, won, lost, score difference, and points from finished group-stage matches
- Visual road from the group stage through the final, including elimination and champion states
- Responsive layouts for phones, tablets, and desktop browsers
- Email/password organizer authentication with owner approval
- Realtime updates through Supabase
- Pull-request preview deployments for testing changes before merging

## Technology

- React, TypeScript, and Vite
- Supabase Database, Authentication, Realtime, Row Level Security, and Edge Functions
- GitHub Actions and GitHub Pages
- Resend for organizer notification emails

## Source structure

```text
src/
  admin/       Authentication and tournament management
  public/      Public tournament and stage views
    standings/ Standings UI, calculations, styles, and tests
  shared/      Shared tournament types and Supabase data access
supabase/      Database schema and notification Edge Functions
.github/       Production and pull-request deployment workflow
```

## Local development

1. Copy `.env.example` to `.env.local` and provide the Supabase project URL and publishable key.
2. Install dependencies and start Vite:

```sh
pnpm install
pnpm dev
```

Use the URLs printed by Vite. Add `?view=standings` for the standings view or `?admin=1` for organizer management.

## Validation

```sh
pnpm test
pnpm build
```

`pnpm test` verifies standings and tournament-progression calculations. `pnpm build` runs TypeScript checking and creates the production Vite bundle.

## Deployment

Pushes to `main` deploy the production website through GitHub Actions. Pull requests receive an isolated preview under `/previews/pr-<number>/` and use the configured test Supabase project.

See [SETUP.md](SETUP.md) for Supabase schema, authentication, email notification, and GitHub Pages configuration.
