-- "Who's behind the camp" section
alter table site_content
  add column if not exists about_mdc_body text not null default 'The camp is run by The Mindful Digital Collective CIC, a community interest company based in Dorset and working with primary schools across the south — including Burhill, Symondsbury, Bridport Primary and Mountjoy — delivering discussion-led workshops on online safety, AI, money, attention and critical thinking. As the national curriculum is reformed to bring media literacy, AI and financial education into primary classrooms for the first time, our sessions help schools get ahead.

The summer camp takes that same idea outdoors: two weeks where children build independence, friendships and real-world skills, and leave feeling a little taller than when they arrived.',
  add column if not exists about_mdc_haf_places text not null default '12',
  add column if not exists about_mdc_quote_text text not null default 'Lovely to have you in. The children really enjoyed it. You did a brilliant job landing some very important messages. Will highly recommend you to other schools.',
  add column if not exists about_mdc_quote_author text not null default 'Greg Proudfoot, Teacher';

-- "What a guest session looks like" block
alter table site_content
  add column if not exists session_looks_like_body text not null default 'Every guest session follows the same shape: a real person, doing something real, hands-on with the children. Kat gets rackets into their hands. Ross gets them cooking over open flame. Jess gets them speaking up in front of the group.',
  add column if not exists session_group_size text not null default '6–8';

-- Safeguarding
alter table site_content
  add column if not exists safeguarding_body text not null default 'All camp staff and regular volunteers are enhanced-DBS checked, and every guest session is supervised by our team at all times. We carry full public liability insurance and follow a written safeguarding policy — you can read it in full below.',
  add column if not exists safeguarding_policy_url text not null default '';

-- Partners section intro/closing copy
alter table site_content
  add column if not exists partners_intro text not null default '',
  add column if not exists partners_closing text not null default 'We''re always open to organisations who want to run a session, fund a place, or support what we do.';

-- Distinguish partner vs school logos
alter table partner_logos add column if not exists category text not null default 'partner';
alter table partner_logos add column if not exists blurb text not null default '';

-- Reframe the HAF line in the fine print
update site_content set pricing_haf_info = 'Free HAF places — funded by Dorset Council for children on benefits-related free school meals'
  where id = 1 and pricing_haf_info = 'HAF places available';

-- New FAQ entry
insert into faqs (question, answer, sort_index)
values (
  'Can my organisation get involved?',
  'Yes — we welcome guest session hosts, funders and local partners. Email nick@themindfuldigitalcollective.co.uk and we''ll find the right fit.',
  (select coalesce(max(sort_index), 0) + 1 from faqs)
);
