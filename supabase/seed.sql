-- ─── The Cellar — Seed Data (30 whiskeys) ────────────────────────────────────
-- Run AFTER schema.sql in the Supabase SQL editor.

insert into public.whiskeys (name, distillery, type, region, abv, price_tier) values

-- Bourbons (8)
('Buffalo Trace',               'Buffalo Trace Distillery',   'Bourbon', 'Kentucky',   45.0, 'Budget'),
('Maker''s Mark',               'Maker''s Mark Distillery',   'Bourbon', 'Kentucky',   45.0, 'Mid'),
('Woodford Reserve',            'Woodford Reserve Distillery','Bourbon', 'Kentucky',   43.2, 'Mid'),
('Four Roses Single Barrel',    'Four Roses Distillery',      'Bourbon', 'Kentucky',   50.0, 'Premium'),
('Eagle Rare 10 Year',          'Buffalo Trace Distillery',   'Bourbon', 'Kentucky',   45.0, 'Mid'),
('Wild Turkey Rare Breed',      'Wild Turkey Distillery',     'Bourbon', 'Kentucky',   58.4, 'Mid'),
('Blanton''s Original',         'Buffalo Trace Distillery',   'Bourbon', 'Kentucky',   46.5, 'Premium'),
('Pappy Van Winkle 15 Year',    'Buffalo Trace Distillery',   'Bourbon', 'Kentucky',   53.5, 'Unicorn'),

-- Scotches (7)
('Glenfiddich 12 Year',         'Glenfiddich Distillery',     'Scotch',  'Speyside',   40.0, 'Mid'),
('The Macallan 12 Year',        'The Macallan Distillery',    'Scotch',  'Speyside',   40.0, 'Premium'),
('Laphroaig 10 Year',           'Laphroaig Distillery',       'Scotch',  'Islay',      43.0, 'Mid'),
('Ardbeg 10 Year',              'Ardbeg Distillery',          'Scotch',  'Islay',      46.0, 'Mid'),
('Balvenie DoubleWood 12 Year', 'The Balvenie Distillery',    'Scotch',  'Speyside',   40.0, 'Premium'),
('Highland Park 12 Year',       'Highland Park Distillery',   'Scotch',  'Orkney',     40.0, 'Mid'),
('The Dalmore 12 Year',         'Dalmore Distillery',         'Scotch',  'Highlands',  40.0, 'Premium'),

-- Japanese (5)
('Suntory Toki',                'Suntory',                    'Japanese','Japan',       43.0, 'Mid'),
('Nikka From the Barrel',       'Nikka Whisky',               'Japanese','Japan',       51.4, 'Premium'),
('Hibiki Harmony',              'Suntory',                    'Japanese','Japan',       43.0, 'Premium'),
('Yamazaki 12 Year',            'Suntory',                    'Japanese','Japan',       43.0, 'Luxury'),
('Nikka Yoichi Single Malt',    'Nikka Whisky',               'Japanese','Hokkaido',   45.0, 'Premium'),

-- Irish (5)
('Jameson',                     'Irish Distillers',           'Irish',   'Cork',        40.0, 'Budget'),
('Redbreast 12 Year',           'Irish Distillers',           'Irish',   'Cork',        40.0, 'Mid'),
('Green Spot',                  'Irish Distillers',           'Irish',   'Cork',        40.0, 'Mid'),
('Teeling Small Batch',         'Teeling Whiskey',            'Irish',   'Dublin',      46.0, 'Mid'),
('Writers'' Tears Copper Pot',  'Walsh Whiskey',              'Irish',   'Carlow',      40.0, 'Mid'),

-- Ryes (5)
('Sazerac Rye',                 'Buffalo Trace Distillery',   'Rye',     'Kentucky',   45.0, 'Budget'),
('WhistlePig 10 Year',          'WhistlePig Whiskey',         'Rye',     'Vermont',    50.0, 'Premium'),
('Rittenhouse Rye',             'Heaven Hill Distillery',     'Rye',     'Kentucky',   50.0, 'Budget'),
('High West Double Rye',        'High West Distillery',       'Rye',     'Utah',       46.0, 'Mid'),
('Michter''s US*1 Rye',         'Michter''s Distillery',      'Rye',     'Kentucky',   42.4, 'Mid');
