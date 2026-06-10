-- Add last_seen_at column for online status tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

-- Optional: backfill existing users
UPDATE public.profiles 
SET last_seen_at = created_at 
WHERE last_seen_at IS NULL;
