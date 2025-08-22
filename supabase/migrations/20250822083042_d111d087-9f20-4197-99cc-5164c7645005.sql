-- Insert seasons for series and anime content
INSERT INTO public.seasons (content_id, season_number, title, episode_count, release_date) 
SELECT 
  c.id,
  1,
  'الموسم الأول',
  CASE 
    WHEN c.content_type = 'anime' THEN 24
    WHEN c.content_type = 'series' THEN 8
    ELSE 1
  END,
  c.release_date
FROM public.content c 
WHERE c.content_type IN ('series', 'anime')
ON CONFLICT DO NOTHING;

-- Insert episodes for all seasons
INSERT INTO public.episodes (season_id, episode_number, title, description, duration, thumbnail_url)
SELECT 
  s.id,
  n,
  'الحلقة ' || n,
  'وصف مثير للحلقة ' || n,
  CASE 
    WHEN c.content_type = 'anime' THEN 24
    ELSE 50
  END,
  'https://image.tmdb.org/t/p/w500/placeholder.jpg'
FROM public.seasons s
JOIN public.content c ON s.content_id = c.id
CROSS JOIN generate_series(1, s.episode_count) as n
ON CONFLICT DO NOTHING;

-- Insert streaming links for movies
INSERT INTO public.streaming_links (content_id, streaming_url, server_name, quality, is_active)
SELECT 
  c.id,
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  'خادم ' || (ROW_NUMBER() OVER (PARTITION BY c.id)),
  CASE ROW_NUMBER() OVER (PARTITION BY c.id)
    WHEN 1 THEN '1080p'
    WHEN 2 THEN '720p'
    ELSE '480p'
  END,
  true
FROM public.content c 
CROSS JOIN generate_series(1, 3) as server_num
WHERE c.content_type = 'movie'
ON CONFLICT DO NOTHING;

-- Insert streaming links for episodes
INSERT INTO public.streaming_links (episode_id, streaming_url, server_name, quality, is_active)
SELECT 
  e.id,
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  'خادم ' || (ROW_NUMBER() OVER (PARTITION BY e.id)),
  CASE ROW_NUMBER() OVER (PARTITION BY e.id)
    WHEN 1 THEN '1080p'
    WHEN 2 THEN '720p'
    ELSE '480p'
  END,
  true
FROM public.episodes e
CROSS JOIN generate_series(1, 2) as server_num
ON CONFLICT DO NOTHING;