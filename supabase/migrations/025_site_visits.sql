create table if not exists site_visits (
  date date primary key,
  views integer not null default 0
);

alter table site_visits enable row level security;
create policy "Auth read" on site_visits for select using (auth.role() = 'authenticated');

create or replace function public.track_site_visit()
returns void as $$
begin
  insert into site_visits (date, views)
  values (current_date, 1)
  on conflict (date) do update set views = site_visits.views + 1;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.track_site_visit() to anon, authenticated;
