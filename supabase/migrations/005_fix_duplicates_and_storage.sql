-- Fix duplicate days: add unique constraint on sort_index
-- First clean up any duplicates (keep the first of each sort_index)
delete from camp_days
where id not in (
  select distinct on (sort_index) id
  from camp_days
  order by sort_index, created_at
);

-- Add unique constraint so it can't happen again
alter table camp_days add constraint camp_days_sort_index_unique unique (sort_index);

-- Supabase Storage: create a public bucket for camp images
-- (Run this in the SQL editor; or create via Supabase dashboard Storage tab)
insert into storage.buckets (id, name, public)
values ('camp-images', 'camp-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "Auth users upload camp images" on storage.objects
  for insert with check (bucket_id = 'camp-images' and auth.role() = 'authenticated');

-- Allow anyone to view
create policy "Public read camp images" on storage.objects
  for select using (bucket_id = 'camp-images');

-- Allow auth users to delete/update their uploads
create policy "Auth users manage camp images" on storage.objects
  for delete using (bucket_id = 'camp-images' and auth.role() = 'authenticated');
