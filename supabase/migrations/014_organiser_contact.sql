alter table site_content
  add column if not exists organiser_email text not null default '',
  add column if not exists organiser_whatsapp text not null default '',
  add column if not exists organiser_instagram text not null default '',
  add column if not exists organiser_facebook text not null default '';
