-- Camp Business Advisor - Initial Schema

create table if not exists camps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  days integer not null default 1,
  capacity_per_day integer not null default 20,
  price_day numeric(10,2) not null default 0,
  price_week numeric(10,2) not null default 0,
  price_two_week numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references camps(id) on delete cascade,
  child_name text not null,
  booking_type text not null check (booking_type in ('day','week','two_week')),
  days integer not null default 1,
  fee numeric(10,2) not null default 0,
  deposit_paid numeric(10,2) not null default 0,
  balance_due numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists costs (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references camps(id) on delete cascade,
  label text not null,
  category text not null check (category in ('fixed','staff','variable')),
  amount numeric(10,2) not null default 0,
  paid boolean not null default false,
  is_capital boolean not null default false,
  recurring_upkeep boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists funding (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references camps(id) on delete cascade,
  source text not null,
  amount numeric(10,2) not null default 0,
  status text not null check (status in ('applied','awarded','received')) default 'applied',
  restricted boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists bookings_camp_id_idx on bookings(camp_id);
create index if not exists costs_camp_id_idx on costs(camp_id);
create index if not exists funding_camp_id_idx on funding(camp_id);

-- Enable RLS (Row Level Security) - permissive for now, tighten with auth later
alter table camps enable row level security;
alter table bookings enable row level security;
alter table costs enable row level security;
alter table funding enable row level security;

-- Allow all operations for now (no auth required)
create policy "Allow all on camps" on camps for all using (true) with check (true);
create policy "Allow all on bookings" on bookings for all using (true) with check (true);
create policy "Allow all on costs" on costs for all using (true) with check (true);
create policy "Allow all on funding" on funding for all using (true) with check (true);
