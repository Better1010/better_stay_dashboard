import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local (see .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BED_PICTURES_BUCKET = 'bed-pictures';

export async function uploadBedPicture(file: File, bedId: string): Promise<string> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    throw new Error('You must be logged in to upload images. Please log in again.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${bedId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BED_PICTURES_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('Storage upload error:', error);
    if (error.message?.includes('Bucket not found')) {
      throw new Error('Storage bucket "bed-pictures" not found. Create it in Supabase Dashboard → Storage.');
    }
    if (error.message?.includes('row-level security') || error.message?.includes('policy') || error.message?.includes('new row violates')) {
      throw new Error('Storage policy missing. Run migration 006_storage_bed_pictures_policies.sql in Supabase SQL Editor.');
    }
    throw new Error(error.message || 'Failed to upload image');
  }

  const { data } = supabase.storage.from(BED_PICTURES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
