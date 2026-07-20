insert into faqs (question, answer, sort_index)
select
  'How do you keep children safe?',
  coalesce(nullif(safeguarding_body, ''), 'All camp staff and regular volunteers are enhanced-DBS checked, and every guest session is supervised by our team at all times. We carry full public liability insurance and follow a written safeguarding policy.')
    || case when safeguarding_policy_url <> '' then E'\n\nRead our full safeguarding policy: ' || safeguarding_policy_url else '' end,
  (select coalesce(max(sort_index), 0) + 1 from faqs)
from site_content
where id = 1;
