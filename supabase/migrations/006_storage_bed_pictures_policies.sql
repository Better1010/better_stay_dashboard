-- Storage policies for bed-pictures bucket.
-- The bucket must be created manually first via Supabase Dashboard → Storage → New bucket "bed-pictures" (public).

-- Allow authenticated users to upload files
create policy "bed_pictures_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bed-pictures');

-- Allow authenticated users to update/overwrite files
create policy "bed_pictures_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'bed-pictures');

-- Allow anyone to read/view files (public bucket)
create policy "bed_pictures_select" on storage.objects
  for select to public
  using (bucket_id = 'bed-pictures');

-- Allow authenticated users to delete files
create policy "bed_pictures_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bed-pictures');
