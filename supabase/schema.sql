-- Run this once in Supabase Dashboard > SQL Editor.
create table if not exists public.tournament_state (
  id integer primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.authorized_editors (
  email text primary key check (email = lower(email)),
  role text not null default 'editor' check (role in ('owner','editor')),
  added_at timestamptz not null default now(),
  added_by text
);
alter table public.tournament_state enable row level security;
alter table public.authorized_editors enable row level security;

create or replace function public.is_tournament_editor()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.authorized_editors where email=lower(auth.jwt()->>'email')) $$;
create or replace function public.is_tournament_owner()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.authorized_editors where email=lower(auth.jwt()->>'email') and role='owner') $$;

drop policy if exists "Public can view scores" on public.tournament_state;
create policy "Public can view scores" on public.tournament_state for select using (true);
drop policy if exists "Editors can create scores" on public.tournament_state;
create policy "Editors can create scores" on public.tournament_state for insert to authenticated with check (public.is_tournament_editor());
drop policy if exists "Editors can update scores" on public.tournament_state;
create policy "Editors can update scores" on public.tournament_state for update to authenticated using (public.is_tournament_editor()) with check (public.is_tournament_editor());
drop policy if exists "Editors can see organizer list" on public.authorized_editors;
create policy "Editors can see organizer list" on public.authorized_editors for select to authenticated using (public.is_tournament_editor());
drop policy if exists "Owner can add organizers" on public.authorized_editors;
create policy "Owner can add organizers" on public.authorized_editors for insert to authenticated with check (public.is_tournament_owner() and role='editor');
drop policy if exists "Owner can remove organizers" on public.authorized_editors;
create policy "Owner can remove organizers" on public.authorized_editors for delete to authenticated using (public.is_tournament_owner() and role='editor');

do $$ begin alter publication supabase_realtime add table public.tournament_state; exception when duplicate_object then null; end $$;

insert into public.authorized_editors(email,role)
values ('ahmedate125@gmail.com','owner')
on conflict (email) do update set role='owner';

