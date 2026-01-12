-- quiz_user_detail_10_batches.sql
-- Migrates 1.9M rows in 10 batches of 200,000 rows each

-- 1. Setup: Create table and drop the composite index
CREATE TABLE IF NOT EXISTS quiz.quiz_user_detail LIKE migration.quiz_user_detail;
DROP INDEX quiz_user_idx ON quiz.quiz_user_detail;
TRUNCATE TABLE quiz.quiz_user_detail;
SELECT 'Table created, index dropped. Starting batch migration...' AS status;

-- Batch 1: Rows 1-200,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 0;
SELECT '✓ Batch 1 complete: 200,000 rows' AS progress;

-- Batch 2: Rows 200,001-400,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 200000;
SELECT '✓ Batch 2 complete: 400,000 rows' AS progress;

-- Batch 3: Rows 400,001-600,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 400000;
SELECT '✓ Batch 3 complete: 600,000 rows' AS progress;

-- Batch 4: Rows 600,001-800,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 600000;
SELECT '✓ Batch 4 complete: 800,000 rows' AS progress;

-- Batch 5: Rows 800,001-1,000,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 800000;
SELECT '✓ Batch 5 complete: 1,000,000 rows' AS progress;

-- Batch 6: Rows 1,000,001-1,200,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 1000000;
SELECT '✓ Batch 6 complete: 1,200,000 rows' AS progress;

-- Batch 7: Rows 1,200,001-1,400,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 1200000;
SELECT '✓ Batch 7 complete: 1,400,000 rows' AS progress;

-- Batch 8: Rows 1,400,001-1,600,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 1400000;
SELECT '✓ Batch 8 complete: 1,600,000 rows' AS progress;

-- Batch 9: Rows 1,600,001-1,800,000
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 1600000;
SELECT '✓ Batch 9 complete: 1,800,000 rows' AS progress;

-- Batch 10: Rows 1,800,001-1,900,034 (last batch with remaining rows)
INSERT INTO quiz.quiz_user_detail (
    quiz_id, user_id, alphagram, correct, incorrect,
    last_answered, locked, completed, id
)
SELECT
    qd.quiz_id,
    CASE
        WHEN mp.keycloak_uuid IS NOT NULL THEN mp.keycloak_uuid
        WHEN qd.user_id IS NOT NULL THEN CONCAT('LEGACY_', qd.user_id)
        ELSE 'LEGACY_NULL_USER'
    END AS user_id,
    qd.alphagram,
    qd.correct,
    qd.incorrect,
    qd.last_answered,
    qd.locked,
    qd.completed,
    qd.id
FROM migration.quiz_user_detail qd
LEFT JOIN migration.migration_progress mp
    ON qd.user_id = mp.userid
ORDER BY qd.id
LIMIT 200000 OFFSET 1800000;
SELECT '✓ Batch 10 complete: ALL 1,900,034 rows migrated' AS progress;

-- Final cleanup and optimization
DELETE FROM quiz.quiz_user_detail WHERE user_id IS NULL;
SELECT 'NULL user_id rows cleaned up' AS status;

CREATE INDEX quiz_user_idx ON quiz.quiz_user_detail (quiz_id, user_id);
SELECT 'Composite index recreated' AS status;

-- Reset AUTO_INCREMENT counter
SELECT MAX(id) INTO @max_id FROM quiz.quiz_user_detail;
SET @sql = CONCAT('ALTER TABLE quiz.quiz_user_detail AUTO_INCREMENT = ', @max_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SELECT CONCAT('AUTO_INCREMENT reset to ', @max_id + 1) AS status;

-- Final verification
SELECT
    'QUIZ USER DETAIL MIGRATION COMPLETE' AS status,
    (SELECT COUNT(*) FROM migration.quiz_user_detail) AS source_count,
    (SELECT COUNT(*) FROM quiz.quiz_user_detail) AS target_count,
    (SELECT COUNT(*) FROM quiz.quiz_user_detail WHERE user_id LIKE 'LEGACY_%') AS legacy_tagged_rows;
