-- EverydayFitness initial schema.
-- Every table is user-owned and protected by row level security: a user can
-- only see and change rows where user_id = auth.uid().

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.workout_status as enum ('trained', 'rest');
create type public.workout_type as enum ('push', 'pull', 'legs', 'upper', 'lower', 'cardio', 'full_body', 'other');
create type public.energy_unit as enum ('kcal', 'kj');
create type public.food_source as enum ('manual', 'saved_food', 'saved_meal', 'copied', 'database', 'barcode');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  -- IANA zone used to decide which calendar day "now" is.
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  energy_unit public.energy_unit not null default 'kcal',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Goal history: each row applies from effective_date until the next row.
-- ---------------------------------------------------------------------------

create table public.goal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  effective_date date not null,
  calories integer not null check (calories between 500 and 10000),
  protein_g numeric(6, 1) not null check (protein_g between 0 and 1000),
  carbs_g numeric(6, 1) not null check (carbs_g between 0 and 1000),
  fat_g numeric(6, 1) not null check (fat_g between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, effective_date)
);

create trigger goal_history_updated_at before update on public.goal_history
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Saved foods & meals
-- ---------------------------------------------------------------------------

create table public.saved_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  serving text check (char_length(serving) <= 60),
  calories numeric(7, 1) not null check (calories between 0 and 10000),
  protein_g numeric(6, 1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(6, 1) not null default 0 check (fat_g between 0 and 1000),
  use_count integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index saved_foods_user_name_key on public.saved_foods (user_id, lower(name));

create trigger saved_foods_updated_at before update on public.saved_foods
  for each row execute function public.set_updated_at();

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger saved_meals_updated_at before update on public.saved_meals
  for each row execute function public.set_updated_at();

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.saved_meals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position smallint not null check (position between 0 and 29),
  name text not null check (char_length(name) between 1 and 120),
  serving text check (char_length(serving) <= 60),
  calories numeric(7, 1) not null check (calories between 0 and 10000),
  protein_g numeric(6, 1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(6, 1) not null default 0 check (fat_g between 0 and 1000),
  unique (meal_id, position)
);

create index saved_meal_items_meal_idx on public.saved_meal_items (meal_id);

-- ---------------------------------------------------------------------------
-- Food entries
-- ---------------------------------------------------------------------------

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Local calendar day in the user's timezone. Totals group on this column.
  entry_date date not null,
  -- Absolute instant eaten.
  logged_at timestamptz not null,
  meal public.meal_type not null,
  name text not null check (char_length(name) between 1 and 120),
  serving text check (char_length(serving) <= 60),
  calories numeric(7, 1) not null check (calories between 0 and 10000),
  protein_g numeric(6, 1) not null default 0 check (protein_g between 0 and 1000),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(6, 1) not null default 0 check (fat_g between 0 and 1000),
  saved_food_id uuid references public.saved_foods (id) on delete set null,
  source public.food_source not null default 'manual',
  -- Identifier in an external nutrition database / barcode, when used.
  external_ref text check (char_length(external_ref) <= 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_entries_user_date_idx on public.food_entries (user_id, entry_date);
create index food_entries_user_logged_idx on public.food_entries (user_id, logged_at desc);

create trigger food_entries_updated_at before update on public.food_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Workout logs: one row per user per day. No row = not logged.
-- ---------------------------------------------------------------------------

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  status public.workout_status not null,
  workout_type public.workout_type,
  duration_min smallint check (duration_min between 1 and 600),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date),
  -- Rest days carry no workout details.
  constraint workout_details_only_when_trained
    check (status = 'trained' or (workout_type is null and duration_min is null))
);

create trigger workout_logs_updated_at before update on public.workout_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.goal_history enable row level security;
alter table public.saved_foods enable row level security;
alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
alter table public.food_entries enable row level security;
alter table public.workout_logs enable row level security;

create policy "Profiles: owner can read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles: owner can update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Same four policies for every user-owned table.
do $$
declare
  t text;
begin
  foreach t in array array['goal_history', 'saved_foods', 'saved_meals', 'saved_meal_items', 'food_entries', 'workout_logs']
  loop
    execute format(
      'create policy "%1$s: owner can read" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: owner can insert" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: owner can update" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: owner can delete" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- A meal item must belong to a meal owned by the same user.
create or replace function public.check_meal_item_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.saved_meals m where m.id = new.meal_id and m.user_id = new.user_id) then
    raise exception 'saved meal not found' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger saved_meal_items_owner before insert or update on public.saved_meal_items
  for each row execute function public.check_meal_item_owner();

-- A food entry may only reference the same user's saved food.
create or replace function public.check_entry_saved_food_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.saved_food_id is not null
     and not exists (select 1 from public.saved_foods f where f.id = new.saved_food_id and f.user_id = new.user_id) then
    raise exception 'saved food not found' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger food_entries_saved_food_owner before insert or update on public.food_entries
  for each row execute function public.check_entry_saved_food_owner();

-- Replace a saved meal's items atomically (runs with the caller's RLS).
create or replace function public.replace_saved_meal_items(p_meal_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.saved_meals where id = p_meal_id and user_id = auth.uid()) then
    raise exception 'saved meal not found' using errcode = '23503';
  end if;
  delete from public.saved_meal_items where meal_id = p_meal_id;
  insert into public.saved_meal_items (meal_id, user_id, position, name, serving, calories, protein_g, carbs_g, fat_g)
  select p_meal_id, auth.uid(), (ord - 1)::smallint, item->>'name', nullif(item->>'serving', ''),
         (item->>'calories')::numeric, (item->>'protein')::numeric, (item->>'carbs')::numeric, (item->>'fat')::numeric
  from jsonb_array_elements(p_items) with ordinality as t(item, ord);
end;
$$;

grant execute on function public.replace_saved_meal_items(uuid, jsonb) to authenticated;
