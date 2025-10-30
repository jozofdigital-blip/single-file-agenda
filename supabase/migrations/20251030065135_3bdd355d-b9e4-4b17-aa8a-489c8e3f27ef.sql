-- Add photo_url column to profiles table for Telegram avatar
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS photo_url TEXT;