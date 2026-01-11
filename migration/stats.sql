-- lb_summary_migration.sql
-- Migrates lb_summary table from migration to stats database
-- (No user_id mapping needed)

SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- Create the table in stats database if it doesn't exist
CREATE TABLE IF NOT EXISTS stats.lb_summary LIKE migration.lb_summary;
TRUNCATE TABLE stats.lb_summary;

-- Optional: Clear existing data if this is a fresh migration
-- TRUNCATE TABLE stats.lb_summary;

-- Copy all data directly
INSERT INTO stats.lb_summary (period, dateStamp, questionsAnswered, numUsers)
SELECT period, dateStamp, questionsAnswered, numUsers
FROM migration.lb_summary;

-- Verify the migration
SELECT
    'lb_summary Migration Complete' AS status,
    (SELECT COUNT(*) FROM migration.lb_summary) AS source_count,
    (SELECT COUNT(*) FROM stats.lb_summary) AS target_count;

-- leaderboard_migration.sql
-- Migrates leaderboard table with user_id → UUID mapping

-- null userid in leaderboard is garbage data. Not sure why it's there
DELETE FROM migration.leaderboard WHERE userid IS NULL;

-- Create the table in stats database if it doesn't exist
CREATE TABLE IF NOT EXISTS stats.leaderboard LIKE migration.leaderboard;

-- Optional: Clear existing data if this is a fresh migration
TRUNCATE TABLE stats.leaderboard;

-- Copy data with user_id → UUID mapping
-- Alternative if you want to handle unmapped users differently:
 INSERT INTO stats.leaderboard (userid, dateStamp, questionsAnswered, startScore)
 SELECT
     CASE
         WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
         ELSE CONCAT('LEGACY_', l.userid)  -- Flag unmapped users
     END AS userid,
     l.dateStamp,
     l.questionsAnswered,
     l.startScore
 FROM migration.leaderboard l
 LEFT JOIN migration.migration_progress mp
     ON l.userid = mp.userid;

-- Audit the FINAL state of stats.leaderboard
SELECT
    'Final Stats Table Audit' AS report,
    COUNT(*) AS total_rows_in_stats,
    SUM(CASE WHEN mp.keycloak_uuid IS NOT NULL THEN 1 ELSE 0 END) AS rows_with_valid_uuid,
    SUM(CASE WHEN mp.keycloak_uuid IS NULL THEN 1 ELSE 0 END) AS rows_with_legacy_or_unmapped_id,
    -- Breakdown of the 'unmapped' group
    SUM(CASE WHEN s.userid LIKE 'LEGACY_%' THEN 1 ELSE 0 END) AS rows_explicitly_tagged_legacy,
    SUM(CASE WHEN mp.keycloak_uuid IS NULL AND s.userid NOT LIKE 'LEGACY_%' THEN 1 ELSE 0 END) AS rows_unexpected
FROM stats.leaderboard s
LEFT JOIN migration.migration_progress mp
    ON s.userid = mp.keycloak_uuid  -- Join on the final UUID in the stats table
ORDER BY rows_unexpected DESC; -- Show any unexpected rows first

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
