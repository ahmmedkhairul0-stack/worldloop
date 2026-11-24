-- WORLDLOOP initial schema. Run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'WORLDLOOP member' check (char_length(display_name) between 1 and 32),
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 90),
  category text not null check (category in ('LANGUAGE','CULTURE','CREATIVITY','ART','SKILLS')),
  body text not null check (char_length(body) between 20 and 1200),
  country text check (country is null or char_length(country) <= 40),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_lessons (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, lesson_id)
);

create table if not exists public.lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key(user_id, lesson_id)
);

create table if not exists public.lesson_reports (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  created_at timestamptz not null default now(),
  unique(lesson_id, reporter_id)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'display_name',32),''),'WORLDLOOP member'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.saved_lessons enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.lesson_reports enable row level security;

-- Public may read display names attached to approved lessons; no email fields exist here.
drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable" on public.profiles for select using (true);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);

drop policy if exists "Approved lessons are public" on public.lessons;
create policy "Approved lessons are public" on public.lessons for select using (status='approved' or author_id=auth.uid());
drop policy if exists "Signed in users submit lessons" on public.lessons;
create policy "Signed in users submit lessons" on public.lessons for insert to authenticated with check (auth.uid()=author_id and status='pending');
-- Deliberately no client update/delete policy: moderation changes happen in trusted Supabase dashboard.

drop policy if exists "Users manage own saved lessons" on public.saved_lessons;
create policy "Users manage own saved lessons" on public.saved_lessons for all to authenticated
using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users manage own progress" on public.lesson_completions;
create policy "Users manage own progress" on public.lesson_completions for all to authenticated
using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users submit reports" on public.lesson_reports;
create policy "Users submit reports" on public.lesson_reports for insert to authenticated
with check (auth.uid()=reporter_id);
drop policy if exists "Users read own reports" on public.lesson_reports;
create policy "Users read own reports" on public.lesson_reports for select to authenticated
using (auth.uid()=reporter_id);

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.lessons to anon, authenticated;
grant update(display_name) on public.profiles to authenticated;
grant insert on public.lessons to authenticated;
grant select, insert, delete on public.saved_lessons to authenticated;
grant select, insert, delete on public.lesson_completions to authenticated;
grant insert, select on public.lesson_reports to authenticated;
