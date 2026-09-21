-- Allow manually reviewed marketing packages in the existing queue.
-- This does not configure OAuth, grant publishing permissions, or enable any scheduler.
BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE social_connections_v1 DROP CONSTRAINT social_connections_v1_platform_check;
ALTER TABLE social_connections_v1 ADD CONSTRAINT social_connections_v1_platform_check
CHECK(platform IN ('x','facebook','instagram','tiktok','linkedin','youtube','pinterest','telegram','threads'));
COMMIT;
