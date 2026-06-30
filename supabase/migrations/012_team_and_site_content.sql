-- Team members table
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  role text not null default '',
  image_url text not null default '',
  bio text not null default '',
  sort_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table team_members enable row level security;
create policy "Public read" on team_members for select using (true);
create policy "Auth insert" on team_members for insert with check (auth.role() = 'authenticated');
create policy "Auth update" on team_members for update using (auth.role() = 'authenticated');
create policy "Auth delete" on team_members for delete using (auth.role() = 'authenticated');

-- Pricing and location fields on site_content
alter table site_content
  add column if not exists pricing_day text not null default '£40',
  add column if not exists pricing_week text not null default '£180',
  add column if not exists pricing_two_weeks text not null default '£340',
  add column if not exists pricing_sibling_discount text not null default '20% sibling discount on additional children',
  add column if not exists pricing_haf_info text not null default 'HAF-funded places are available for eligible families at no cost. Ask us for details.',
  add column if not exists location_name text not null default 'Litton Lakes',
  add column if not exists location_address text not null default '',
  add column if not exists location_description text not null default '',
  add column if not exists location_map_url text not null default '';
