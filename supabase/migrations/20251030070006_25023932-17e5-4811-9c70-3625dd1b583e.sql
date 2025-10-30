-- Add time field to tasks table
ALTER TABLE public.tasks 
ADD COLUMN time TIME DEFAULT NULL;

-- Add time field to archived_tasks table
ALTER TABLE public.archived_tasks 
ADD COLUMN time TIME DEFAULT NULL;