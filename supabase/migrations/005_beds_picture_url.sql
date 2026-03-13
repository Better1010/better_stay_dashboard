-- Add picture_url column to beds for client images.
alter table public.beds add column if not exists picture_url text null;
