BEGIN;
-- Existing brand keys and token encryption AAD stay unchanged. Founder is its own
-- destination, never an alias for either product. No credential is copied.
CREATE TABLE IF NOT EXISTS social_destinations_v1 (
 destination_key text PRIMARY KEY, display_name text NOT NULL,
 product text, expected_username text NOT NULL UNIQUE
);
INSERT INTO social_destinations_v1 VALUES
 ('imali','IMALI','imali','imali_defi'),
 ('sports_jedi','Sports Jedi','sports_jedi','sportsjedi'),
 ('founder','Founder / personal',NULL,'whoisblackgriff')
ON CONFLICT (destination_key) DO NOTHING;
ALTER TABLE social_connections_v1 DROP CONSTRAINT social_connections_v1_brand_check;
ALTER TABLE social_connections_v1 ADD CONSTRAINT social_connections_v1_brand_check CHECK (brand IN ('imali','sports_jedi','founder'));
INSERT INTO social_connections_v1(brand,platform) VALUES ('founder','instagram'),('founder','threads') ON CONFLICT DO NOTHING;
-- Add requested destinations as disabled; existing production schedules are preserved.
INSERT INTO social_automation_settings(brand,content_type,platform,enabled,posts_per_day,timezone,posting_windows,require_qualified_signal)
SELECT brand,content_type,'threads',false,posts_per_day,timezone,posting_windows,true FROM social_automation_settings WHERE platform='instagram' ON CONFLICT DO NOTHING;
INSERT INTO social_automation_settings(brand,content_type,platform,enabled,posts_per_day,timezone,posting_windows,require_qualified_signal)
SELECT brand,content_type,'facebook',false,posts_per_day,timezone,posting_windows,true FROM social_automation_settings WHERE brand='sportsjedi' AND platform='instagram' ON CONFLICT DO NOTHING;
COMMIT;
