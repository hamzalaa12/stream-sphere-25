-- Insert sample content data
INSERT INTO public.content (title, title_en, description, poster_url, backdrop_url, rating, release_date, duration, content_type, categories, language, country, is_netflix) VALUES
  ('الجوكر', 'Joker', 'قصة آرثر فليك، كوميدي فاشل يتحول إلى مجرم جنوني في مدينة جوثام المظلمة.', 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', 'https://image.tmdb.org/t/p/w1280/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg', 8.4, '2019-10-04', 122, 'movie', '{دراما,جريمة,إثارة}', 'ar', 'USA', false),
  ('طفيليات', 'Parasite', 'عائلة فقيرة تتسلل إلى حياة عائلة غنية بطرق غير متوقعة.', 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', 'https://image.tmdb.org/t/p/w1280/TU9NIjwzjoKPwQHoHshkBcQZzr.jpg', 8.6, '2019-05-30', 132, 'movie', '{دراما,كوميديا,إثارة}', 'ar', 'South Korea', false),
  ('أحداث لا تُصدق', 'Stranger Things', 'مجموعة من الأطفال يواجهون قوى خارقة للطبيعة في بلدة صغيرة.', 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', 'https://image.tmdb.org/t/p/w1280/lXS60geme1LlEob5Wgvj3KilClA.jpg', 8.7, '2016-07-15', 50, 'series', '{خيال علمي,دراما,رعب}', 'ar', 'USA', true),
  ('ناروتو', 'Naruto', 'قصة شاب نينجا يسعى ليصبح أقوى محارب في قريته.', 'https://image.tmdb.org/t/p/w500/mlL0LF5ODh2f36o7dkz9NqoLvfz.jpg', 'https://image.tmdb.org/t/p/w1280/ew7YzCKsuP8J9YhBFRHKLaMYB0I.jpg', 8.3, '2002-10-03', 24, 'anime', '{أكشن,مغامرة,أنيمي}', 'ar', 'Japan', false),
  ('هجوم العمالقة', 'Attack on Titan', 'البشرية تحارب عمالقة ضخمة تهدد وجودها.', 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', 'https://image.tmdb.org/t/p/w1280/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg', 9.0, '2013-04-07', 24, 'anime', '{أكشن,دراما,أنيمي}', 'ar', 'Japan', false),
  ('صراع العروش', 'Game of Thrones', 'معركة ملحمية من أجل العرش الحديدي في عالم خيالي.', 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', 'https://image.tmdb.org/t/p/w1280/suopoADq0k8YZr4dQXcU6pToj6s.jpg', 9.3, '2011-04-17', 60, 'series', '{فانتازيا,دراما,أكشن}', 'ar', 'USA', false);

-- Insert sample seasons data for series and anime
INSERT INTO public.seasons (content_id, season_number, title, episode_count, release_date) 
SELECT 
  c.id,
  1,
  'الموسم الأول',
  CASE 
    WHEN c.content_type = 'anime' THEN 24
    ELSE 8
  END,
  c.release_date
FROM public.content c 
WHERE c.content_type IN ('series', 'anime');

-- Insert sample episodes
INSERT INTO public.episodes (season_id, episode_number, title, description, duration, thumbnail_url)
SELECT 
  s.id,
  generate_series(1, s.episode_count),
  'الحلقة ' || generate_series(1, s.episode_count),
  'وصف الحلقة ' || generate_series(1, s.episode_count),
  CASE 
    WHEN c.content_type = 'anime' THEN 24
    ELSE 60
  END,
  'https://image.tmdb.org/t/p/w500/placeholder.jpg'
FROM public.seasons s
JOIN public.content c ON s.content_id = c.id;

-- Insert sample streaming links
INSERT INTO public.streaming_links (content_id, episode_id, streaming_url, server_name, quality, is_active)
SELECT 
  c.id,
  NULL,
  'https://example.com/stream/' || c.id,
  'Server 1',
  '1080p',
  true
FROM public.content c 
WHERE c.content_type = 'movie'
UNION ALL
SELECT 
  NULL,
  e.id,
  'https://example.com/stream/episode/' || e.id,
  'Server 1',
  '1080p',
  true
FROM public.episodes e;