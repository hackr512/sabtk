insert into public.store_settings (key, value) values
  ('maintenance_mode', 'true'),
  ('maintenance_message', ''),
  ('maintenance_until', '')
on conflict (key) do nothing;