create table if not exists daily_structure (
  id uuid primary key default gen_random_uuid(),
  emoji text not null default '',
  time_label text not null default '',
  activity text not null default '',
  description text not null default '',
  sort_index integer not null default 0
);

alter table daily_structure enable row level security;
create policy "Public read" on daily_structure for select using (true);
create policy "Auth insert" on daily_structure for insert with check (auth.role() = 'authenticated');
create policy "Auth update" on daily_structure for update using (auth.role() = 'authenticated');
create policy "Auth delete" on daily_structure for delete using (auth.role() = 'authenticated');

insert into daily_structure (emoji, time_label, activity, description, sort_index) values
  ('🌅', 'Morning', 'Move, play & explore', 'A fun, active start to the day with sport or outdoor activities to get everyone moving', 0),
  ('🍉', 'Midday', 'Lunch & downtime', 'Time to relax, recharge and enjoy the surroundings with friends', 1),
  ('🎨', 'Afternoon', 'Confidence-building sessions', 'Engaging activities focused on friendships, confidence and real-world skills, balanced with calm, creative time to reset and recharge', 2),
  ('🏁', 'End of day', 'Team challenges & games', 'Finishing the day with energy, teamwork and plenty of smiles', 3);
