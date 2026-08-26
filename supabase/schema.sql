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
create table if not exists public.organizer_requests (
  email text primary key check (email = lower(email)),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  notified_at timestamptz
);
alter table public.tournament_state enable row level security;
alter table public.authorized_editors enable row level security;
alter table public.organizer_requests enable row level security;

create or replace function public.is_tournament_editor()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.authorized_editors where email=lower(auth.jwt()->>'email')) $$;
create or replace function public.is_tournament_owner()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.authorized_editors where email=lower(auth.jwt()->>'email') and role='owner') $$;

create or replace function public.queue_organizer_request()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if new.email is not null then
    insert into public.organizer_requests(email) values (lower(new.email))
    on conflict (email) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists queue_organizer_request_after_signup on auth.users;
create trigger queue_organizer_request_after_signup
after insert on auth.users for each row execute function public.queue_organizer_request();

create or replace function public.review_organizer_request(request_email text, approve boolean)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_tournament_owner() then raise exception 'Only the tournament owner can review organizer requests'; end if;
  if not exists(select 1 from public.organizer_requests where email=lower(request_email) and status='pending') then raise exception 'Pending request not found'; end if;
  if approve then
    insert into public.authorized_editors(email,role,added_by)
    values(lower(request_email),'editor',lower(auth.jwt()->>'email'))
    on conflict(email) do update set role='editor', added_by=excluded.added_by;
  end if;
  update public.organizer_requests set status=case when approve then 'approved' else 'rejected' end,
    reviewed_at=now(), reviewed_by=lower(auth.jwt()->>'email') where email=lower(request_email);
end;
$$;

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

drop policy if exists "Applicants can see own request" on public.organizer_requests;
create policy "Applicants can see own request" on public.organizer_requests for select to authenticated using (email=lower(auth.jwt()->>'email'));
drop policy if exists "Owner can see organizer requests" on public.organizer_requests;
create policy "Owner can see organizer requests" on public.organizer_requests for select to authenticated using (public.is_tournament_owner());

revoke all on function public.review_organizer_request(text,boolean) from public;
grant execute on function public.review_organizer_request(text,boolean) to authenticated;

do $$ begin alter publication supabase_realtime add table public.tournament_state; exception when duplicate_object then null; end $$;

insert into public.authorized_editors(email,role)
values ('ahmedate125@gmail.com','owner')
on conflict (email) do update set role='owner';

