-- Add foreign key constraint for reviews to profiles
ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);