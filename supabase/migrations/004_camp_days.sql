create table camp_days (
  id uuid primary key default gen_random_uuid(),
  week int2 not null,
  weekday text not null,
  date_label text not null,
  sort_index int2 not null,
  image_url text,
  description text default '',
  special_guest text,
  availability text not null default 'available'
    check (availability in ('available','nearly_full','full')),
  book_url text,
  show_on_site boolean not null default true,
  updated_at timestamptz default now()
);

create table published_plan (
  id int primary key default 1,
  days jsonb not null,
  published_at timestamptz default now()
);

-- RLS
alter table camp_days enable row level security;
alter table published_plan enable row level security;

-- camp_days: only authenticated users can read/write
create policy "Auth users manage camp_days" on camp_days
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- published_plan: anyone can read, only auth can write
create policy "Anyone can read published_plan" on published_plan
  for select using (true);
create policy "Auth users write published_plan" on published_plan
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
