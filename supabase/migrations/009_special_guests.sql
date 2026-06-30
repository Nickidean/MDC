create table if not exists special_guests (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  image_url text not null default '',
  bio text not null default '',
  sort_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table special_guests enable row level security;
create policy "Public read" on special_guests for select using (true);
create policy "Auth insert" on special_guests for insert with check (auth.role() = 'authenticated');
create policy "Auth update" on special_guests for update using (auth.role() = 'authenticated');
create policy "Auth delete" on special_guests for delete using (auth.role() = 'authenticated');
