-- ============================================================
-- Fixes: "Table publicly accessible" Supabase security alert.
-- RLS was disabled on farm_sync (and likely others) — meaning anyone
-- with the project's public anon key (visible in the shipped app
-- bundle / network traffic) could read or write EVERY farm's data,
-- not just their own, completely bypassing the app's code-based
-- access model.
--
-- After running: log in as two different test accounts (or two farm
-- codes) and confirm: sign in works, creating/joining a farm works,
-- sync still pushes/pulls, and Settings -> team roster still shows
-- members. If anything breaks, the policy is too strict — don't just
-- disable RLS again, tell me what broke and I'll adjust the policy.
-- ============================================================

-- Helper function: checks if the current authenticated user belongs to
-- a given farm. SECURITY DEFINER so it bypasses RLS internally — this
-- avoids infinite recursion when farm_members' own policy needs to
-- check farm_members itself (a well-known Postgres/Supabase RLS
-- pattern for self-referencing membership tables).
create or replace function public.is_farm_member(check_farm_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from farm_members
    where farm_id = check_farm_id
      and user_id = auth.uid()
  );
$$;

-- ── farms ────────────────────────────────────────────────────
alter table farms enable row level security;

-- Any signed-in user can look up a farm by code (needed to join it) —
-- codes are random 6-char strings from a 32-char alphabet (~1 billion
-- combinations), not practically guessable, and farm metadata alone
-- (name, code, subscription status) isn't the sensitive part.
create policy "authenticated can read farms"
  on farms for select
  to authenticated
  using (true);

create policy "user can create own farm"
  on farms for insert
  to authenticated
  with check (owner_id = auth.uid());

-- ── farm_members ─────────────────────────────────────────────
alter table farm_members enable row level security;

create policy "user can view own membership"
  on farm_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "co-members can view farm roster"
  on farm_members for select
  to authenticated
  using (is_farm_member(farm_id));

create policy "user can join a farm as self"
  on farm_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- ── profiles ─────────────────────────────────────────────────
alter table profiles enable row level security;

create policy "co-members can view each other's profile"
  on profiles for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from farm_members fm1
      join farm_members fm2 on fm1.farm_id = fm2.farm_id
      where fm1.user_id = auth.uid() and fm2.user_id = profiles.user_id
    )
  );

create policy "user can upsert own profile"
  on profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user can update own profile"
  on profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── farm_sync ────────────────────────────────────────────────
alter table farm_sync enable row level security;

create policy "farm members can read farm_sync"
  on farm_sync for select
  to authenticated
  using (
    exists (
      select 1 from farms f
      where f.code = farm_sync.code
        and is_farm_member(f.id)
    )
  );

create policy "farm members can insert farm_sync"
  on farm_sync for insert
  to authenticated
  with check (
    exists (
      select 1 from farms f
      where f.code = farm_sync.code
        and is_farm_member(f.id)
    )
  );

create policy "farm members can update farm_sync"
  on farm_sync for update
  to authenticated
  using (
    exists (
      select 1 from farms f
      where f.code = farm_sync.code
        and is_farm_member(f.id)
    )
  );

-- ── farm_sync_history ────────────────────────────────────────
alter table farm_sync_history enable row level security;

create policy "farm members can read farm_sync_history"
  on farm_sync_history for select
  to authenticated
  using (
    exists (
      select 1 from farms f
      where f.code = farm_sync_history.farm_code
        and is_farm_member(f.id)
    )
  );
-- No insert policy needed — history rows are written by a DB trigger,
-- which runs with the privileges of its owner and bypasses RLS.

-- ── feedback (only if this table already exists) ─────────────
-- No client policies needed — submissions go through the
-- submit-feedback Edge Function using the service role key, which
-- bypasses RLS entirely. Enabling RLS with zero policies just denies
-- all *direct* client access (the actual goal here), without touching
-- the Edge Function path.
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'feedback') then
    execute 'alter table feedback enable row level security';
  end if;
end $$;
