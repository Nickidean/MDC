create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null default '',
  answer text not null default '',
  sort_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table faqs enable row level security;
create policy "Public read" on faqs for select using (true);
create policy "Auth insert" on faqs for insert with check (auth.role() = 'authenticated');
create policy "Auth update" on faqs for update using (auth.role() = 'authenticated');
create policy "Auth delete" on faqs for delete using (auth.role() = 'authenticated');

insert into faqs (question, answer, sort_index) values (
  'What''s your cancellation policy?',
  'Plans change - we get it. Cancel more than 7 days before and you''ll get a full refund or a free swap to another day. Within 7 days we can''t refund (we staff each day based on numbers), but we''ll always try to swap you to another day, or you can send a sibling or friend instead. Child poorly on the day? We''ll credit it towards another session. And if we ever have to cancel, you get every penny back.',
  0
);
