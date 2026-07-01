create table if not exists partner_logos (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  image_url text not null default '',
  link_url text not null default '',
  sort_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table partner_logos enable row level security;
create policy "Public read" on partner_logos for select using (true);
create policy "Auth insert" on partner_logos for insert with check (auth.role() = 'authenticated');
create policy "Auth update" on partner_logos for update using (auth.role() = 'authenticated');
create policy "Auth delete" on partner_logos for delete using (auth.role() = 'authenticated');
