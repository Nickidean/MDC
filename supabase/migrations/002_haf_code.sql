-- Add haf_code column to bookings
alter table bookings add column if not exists haf_code text;
