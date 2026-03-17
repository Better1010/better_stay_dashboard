-- Storage policies for nid-pictures bucket (NID front/back images).
-- Create bucket "nid-pictures" in Supabase Dashboard → Storage first (public).

create policy "nid_pictures_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'nid-pictures');

create policy "nid_pictures_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'nid-pictures');

create policy "nid_pictures_select" on storage.objects
  for select to public
  using (bucket_id = 'nid-pictures');

create policy "nid_pictures_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'nid-pictures');
