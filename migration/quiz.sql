-- quiz_master_migration.sql
-- Simple copy (creator field is only 0 = system user)

CREATE TABLE IF NOT EXISTS quiz.quiz_type_master LIKE migration.quiz_type_master;
CREATE TABLE IF NOT EXISTS quiz.sub_master LIKE migration.sub_master;

TRUNCATE TABLE quiz.quiz_type_master;
TRUNCATE TABLE quiz.sub_master;

INSERT INTO quiz.quiz_type_master (quiz_type, description)
SELECT quiz_type, description FROM migration.quiz_type_master;

INSERT INTO quiz.sub_master
(sub_id, sub_group, descr, frequency, quiz_type, quantity, min_length, max_length)
SELECT sub_id, sub_group, descr, frequency, quiz_type, quantity, min_length, max_length
FROM migration.sub_master;

-- Create table in quiz database
CREATE TABLE IF NOT EXISTS quiz.quiz_master LIKE migration.quiz_master;

-- Optional: Clear existing data if fresh migration
TRUNCATE TABLE quiz.quiz_master;

-- Direct copy (no user mapping needed)
INSERT INTO quiz.quiz_master (
    quiz_id, quiz_name, quiz_size, expired, creator,
    create_date, length, quiz_type, lexicon, version,
    sub_id, min_prob, max_prob
)
SELECT
    quiz_id, quiz_name, quiz_size, expired, creator,
    create_date, length, quiz_type, lexicon, version,
    sub_id, min_prob, max_prob
FROM migration.quiz_master;


-- quiz_remaining_tables_fk_safe.sql
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- 1. user_quiz_bookmark (no foreign keys)
CREATE TABLE IF NOT EXISTS quiz.user_quiz_bookmark LIKE migration.user_quiz_bookmark;
INSERT INTO quiz.user_quiz_bookmark (quiz_id, user_id, create_date)
SELECT
    bm.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN bm.user_id IS NOT NULL THEN CONCAT('LEGACY_', bm.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    bm.create_date
FROM migration.user_quiz_bookmark bm
LEFT JOIN migration.migration_progress mp
    ON bm.user_id = mp.userid;
DELETE FROM quiz.user_quiz_bookmark WHERE user_id IS NULL;

-- Now migrate sub_user_xref
CREATE TABLE IF NOT EXISTS quiz.sub_user_xref LIKE migration.sub_user_xref;
INSERT INTO quiz.sub_user_xref (sub_id, user_id)
SELECT
    sx.sub_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN sx.user_id IS NOT NULL THEN CONCAT('LEGACY_', sx.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id
FROM migration.sub_user_xref sx
LEFT JOIN migration.migration_progress mp
    ON sx.user_id = mp.userid;
DELETE FROM quiz.sub_user_xref WHERE user_id IS NULL;

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

-- Verification
SELECT
    'quiz_master' AS table_name,
    (SELECT COUNT(*) FROM migration.quiz_master) AS source_count,
    (SELECT COUNT(*) FROM quiz.quiz_master) AS target_count,
    0 as legacy_tagged
UNION ALL
SELECT
    'user_quiz_bookmark',
    (SELECT COUNT(*) FROM migration.user_quiz_bookmark),
    (SELECT COUNT(*) FROM quiz.user_quiz_bookmark),
    (SELECT COUNT(*) FROM quiz.user_quiz_bookmark WHERE user_id LIKE 'LEGACY_%')
UNION ALL
SELECT
    'sub_user_xref',
    (SELECT COUNT(*) FROM migration.sub_user_xref),
    (SELECT COUNT(*) FROM quiz.sub_user_xref),
    (SELECT COUNT(*) FROM quiz.sub_user_xref WHERE user_id LIKE 'LEGACY_%');

SELECT 'QUIZ DATABASE COMPLETE' AS status;
