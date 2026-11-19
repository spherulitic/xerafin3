-- 001_blank_quiz_type.sql
--
-- Issue #813: register the Blank quiz type and its two Daily subscriptions.
-- Run against the `quiz` database.
--
-- Re-runnable: every statement is a no-op once its row exists.
--
-- Preflight (abort and pick the next free ids if either check is not empty):
--
--   SELECT quiz_type, description FROM quiz_type_master WHERE quiz_type = 8;
--     -- must return no row, or (8, 'Blank')
--
--   SELECT sub_id, descr FROM sub_master WHERE sub_id IN (22, 23);
--     -- must return no rows, or only the two 'Daily Blank' rows
--
-- The sub_master ids are explicit because sub_id is the only unique key; an
-- INSERT ... ON DUPLICATE KEY UPDATE needs a known id to be idempotent.

START TRANSACTION;

INSERT INTO quiz_type_master (quiz_type, description)
VALUES (8, 'Blank')
ON DUPLICATE KEY UPDATE description = 'Blank';

INSERT INTO sub_master
  (sub_id, sub_group, descr, frequency, quiz_type, quantity, min_length, max_length)
VALUES
  (22, 'Daily Quizzes', 'Daily Blank 7s', 'Daily', 8, 50, 7, 7)
ON DUPLICATE KEY UPDATE
  sub_group = 'Daily Quizzes',
  descr = 'Daily Blank 7s',
  frequency = 'Daily',
  quiz_type = 8,
  quantity = 50,
  min_length = 7,
  max_length = 7;

INSERT INTO sub_master
  (sub_id, sub_group, descr, frequency, quiz_type, quantity, min_length, max_length)
VALUES
  (23, 'Daily Quizzes', 'Daily Blank 8s', 'Daily', 8, 50, 8, 8)
ON DUPLICATE KEY UPDATE
  sub_group = 'Daily Quizzes',
  descr = 'Daily Blank 8s',
  frequency = 'Daily',
  quiz_type = 8,
  quantity = 50,
  min_length = 8,
  max_length = 8;

COMMIT;
