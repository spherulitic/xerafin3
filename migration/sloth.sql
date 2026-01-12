-- sloth_completed_migration.sql
START TRANSACTION;

-- Create table
CREATE TABLE IF NOT EXISTS sloth.sloth_completed LIKE migration.sloth_completed;
TRUNCATE TABLE sloth.sloth_completed;

-- Migrate with user_id → UUID mapping
INSERT INTO sloth.sloth_completed (
    id, userid, alphagram, time_taken, correct,
    accuracy, date, token, lex
)
SELECT
    sc.id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN sc.userid IS NOT NULL THEN CONCAT('LEGACY_', sc.userid)
        ELSE 'LEGACY_NULL_USER'
    END AS userid,
    sc.alphagram,
    sc.time_taken,
    sc.correct,
    sc.accuracy,
    sc.date,
    sc.token,
    sc.lex
FROM migration.sloth_completed sc
LEFT JOIN migration.migration_progress mp
    ON sc.userid = mp.userid;

-- Cleanup NULLs
DELETE FROM sloth.sloth_completed WHERE userid IS NULL;

-- CHANGE DEFAULT LEXICON from CSW19 to CSW24
ALTER TABLE sloth.sloth_completed
ALTER COLUMN lex SET DEFAULT 'CSW24';

COMMIT;

-- invaders_migration.sql
START TRANSACTION;

-- invaders_daily
CREATE TABLE IF NOT EXISTS sloth.invaders_daily LIKE migration.invaders_daily;
TRUNCATE TABLE sloth.invaders_daily;

INSERT INTO sloth.invaders_daily (userid, dateStamp, score)
SELECT
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN id.userid IS NOT NULL THEN CONCAT('LEGACY_', id.userid)
        ELSE 'LEGACY_NULL_USER'
    END AS userid,
    id.dateStamp,
    id.score
FROM migration.invaders_daily id
LEFT JOIN migration.migration_progress mp
    ON id.userid = mp.userid;
DELETE FROM sloth.invaders_daily WHERE userid IS NULL;

-- invaders_personal
CREATE TABLE IF NOT EXISTS sloth.invaders_personal LIKE migration.invaders_personal;
TRUNCATE TABLE sloth.invaders_personal;

INSERT INTO sloth.invaders_personal (userid, score)
SELECT
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN ip.userid IS NOT NULL THEN CONCAT('LEGACY_', ip.userid)
        ELSE 'LEGACY_NULL_USER'
    END AS userid,
    ip.score
FROM migration.invaders_personal ip
LEFT JOIN migration.migration_progress mp
    ON ip.userid = mp.userid;
DELETE FROM sloth.invaders_personal WHERE userid IS NULL;

COMMIT;

-- Verification
SELECT
    'sloth_completed Migration Complete' AS status,
    (SELECT COUNT(*) FROM migration.sloth_completed) AS source_count,
    (SELECT COUNT(*) FROM sloth.sloth_completed) AS target_count,
    (SELECT COUNT(*) FROM sloth.sloth_completed WHERE userid LIKE 'LEGACY_%') AS legacy_tagged,
    (SELECT COLUMN_DEFAULT FROM information_schema.columns
     WHERE table_schema = 'sloth'
       AND table_name = 'sloth_completed'
       AND column_name = 'lex') AS new_default_lexicon;

SELECT 'INVADERS MIGRATION COMPLETE' AS status;
SELECT
    'invaders_daily' AS table_name,
    (SELECT COUNT(*) FROM migration.invaders_daily) AS source,
    (SELECT COUNT(*) FROM sloth.invaders_daily) AS target,
    (SELECT COUNT(*) FROM sloth.invaders_daily WHERE userid LIKE 'LEGACY_%') AS legacy_tagged
UNION ALL
SELECT
    'invaders_personal',
    (SELECT COUNT(*) FROM migration.invaders_personal),
    (SELECT COUNT(*) FROM sloth.invaders_personal),
    (SELECT COUNT(*) FROM sloth.invaders_personal WHERE userid LIKE 'LEGACY_%');
