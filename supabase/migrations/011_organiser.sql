create table if not exists site_content (
  id integer primary key default 1,
  organiser_name text not null default '',
  organiser_intro text not null default '',
  organiser_image_url text not null default '',
  constraint single_row check (id = 1)
);

alter table site_content enable row level security;
create policy "Public read" on site_content for select using (true);
create policy "Auth insert" on site_content for insert with check (auth.role() = 'authenticated');
create policy "Auth update" on site_content for update using (auth.role() = 'authenticated');

insert into site_content (id, organiser_name, organiser_intro, organiser_image_url)
values (1, '', '', '')
on conflict (id) do nothing;
