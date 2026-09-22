-- ============================================================
-- Migration 003: Storage buckets for teams, players and images
-- Run in Supabase SQL Editor if you want to use Supabase Storage
-- ============================================================

-- Create public storage buckets
insert into storage.buckets (id, name, public)
values
  ('images', 'images', true),
  ('teams', 'teams', true),
  ('players', 'players', true)
on conflict (id) do update set public = true;

-- Storage RLS policies (allow reading and uploading for MVP)
create policy "Public Access Images"
  on storage.objects for select
  using (bucket_id in ('images', 'teams', 'players'));

create policy "Allow Uploads (mvp)"
  on storage.objects for insert
  with check (bucket_id in ('images', 'teams', 'players'));

create policy "Allow Updates (mvp)"
  on storage.objects for update
  with check (bucket_id in ('images', 'teams', 'players'));

create policy "Allow Deletes (mvp)"
  on storage.objects for delete
  using (bucket_id in ('images', 'teams', 'players'));
