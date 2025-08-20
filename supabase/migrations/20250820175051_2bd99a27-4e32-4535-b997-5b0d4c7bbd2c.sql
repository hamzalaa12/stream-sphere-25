-- StreamSphere Database Schema
-- Create enums for different content types and categories

CREATE TYPE public.content_type AS ENUM ('movie', 'series', 'anime');
CREATE TYPE public.content_category AS ENUM ('action', 'drama', 'comedy', 'romance', 'thriller', 'horror', 'sci-fi', 'fantasy', 'documentary', 'animation');
CREATE TYPE public.content_status AS ENUM ('released', 'ongoing', 'upcoming', 'completed');
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'moderator');

-- Content table (movies, series, anime)
CREATE TABLE public.content (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    title_en TEXT,
    description TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    trailer_url TEXT,
    release_date DATE,
    rating DECIMAL(3,1) DEFAULT 0,
    duration INTEGER, -- in minutes for movies
    content_type content_type NOT NULL,
    status content_status DEFAULT 'released',
    categories content_category[] DEFAULT '{}',
    country TEXT,
    language TEXT DEFAULT 'ar',
    is_netflix BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seasons table for series and anime
CREATE TABLE public.seasons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    poster_url TEXT,
    release_date DATE,
    episode_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(content_id, season_number)
);

-- Episodes table
CREATE TABLE public.episodes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    duration INTEGER, -- in minutes
    release_date DATE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(season_id, episode_number)
);

-- Streaming links table
CREATE TABLE public.streaming_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
    server_name TEXT NOT NULL,
    quality TEXT NOT NULL, -- 1080p, 720p, 480p, etc.
    streaming_url TEXT NOT NULL,
    download_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CHECK ((content_id IS NOT NULL AND episode_id IS NULL) OR (content_id IS NULL AND episode_id IS NOT NULL))
);

-- User profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Favorites table
CREATE TABLE public.favorites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, content_id)
);

-- Watch history table
CREATE TABLE public.watch_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
    watch_time INTEGER DEFAULT 0, -- in seconds
    completed BOOLEAN DEFAULT false,
    last_watched TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, content_id, episode_id)
);

-- Reviews table
CREATE TABLE public.reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, content_id)
);

-- Enable Row Level Security
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Content is viewable by everyone
CREATE POLICY "Content is viewable by everyone" ON public.content FOR SELECT USING (true);
CREATE POLICY "Seasons are viewable by everyone" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Episodes are viewable by everyone" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Streaming links are viewable by everyone" ON public.streaming_links FOR SELECT USING (true);

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Watch history policies
CREATE POLICY "Users can view their own watch history" ON public.watch_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to watch history" ON public.watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their watch history" ON public.watch_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their watch history" ON public.watch_history FOR DELETE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can add reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Admin policies for content management
CREATE POLICY "Admins can manage content" ON public.content FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage seasons" ON public.seasons FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage episodes" ON public.episodes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage streaming links" ON public.streaming_links FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Functions and triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON public.content
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, username, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_content_type ON public.content(content_type);
CREATE INDEX idx_content_status ON public.content(status);
CREATE INDEX idx_content_rating ON public.content(rating DESC);
CREATE INDEX idx_content_release_date ON public.content(release_date DESC);
CREATE INDEX idx_content_categories ON public.content USING GIN(categories);
CREATE INDEX idx_episodes_season_id ON public.episodes(season_id);
CREATE INDEX idx_streaming_links_content_id ON public.streaming_links(content_id);
CREATE INDEX idx_streaming_links_episode_id ON public.streaming_links(episode_id);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX idx_reviews_content_id ON public.reviews(content_id);