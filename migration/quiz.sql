-- quiz_master_migration.sql
-- Simple copy (creator field is only 0 = system user)

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

-- Verification
SELECT
    'quiz_master Migration Complete' AS status,
    (SELECT COUNT(*) FROM migration.quiz_master) AS source_count,
    (SELECT COUNT(*) FROM quiz.quiz_master) AS target_count;
