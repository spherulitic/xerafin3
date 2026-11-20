# MySQL migrations

`mysql/deploy_databases.sh` only bootstraps fresh databases (`0*.sql`). It does
not carry an existing database forward, and `mysql/<service>.sql` is a
drop-and-recreate reference dump. There is no migration framework.

Schema and reference-data changes to a live database therefore go in this
directory. They are applied by hand, once, to each environment.

## Convention

- One file per change, named `NNN_short_description.sql` with a zero-padded,
  increasing number. Apply files in numeric order.
- The file must be idempotent. Running it twice must leave the same rows behind.
- Use explicit ids where the table has no natural unique key, so
  `INSERT ... ON DUPLICATE KEY UPDATE` is idempotent. Record any preflight
  checks (id collisions, existing rows with different values) in the file.
- Update the matching `mysql/<service>.sql` reference dump in the same pull
  request, including `AUTO_INCREMENT`, so a fresh dev database matches a
  migrated one.
- Add a row to the ledger below when the migration has been applied.
- CI does not run these files. A `mysql/`-only push builds no containers and
  deploys nothing.

## Applying a migration

### Local / scratch database

Load the reference dump into a throwaway database, then apply the file:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -e 'CREATE DATABASE quiz'
mysql -h 127.0.0.1 -P 3306 -u root quiz < mysql/quiz.sql
mysql -h 127.0.0.1 -P 3306 -u root quiz < mysql/migrations/001_blank_quiz_type.sql
```

Apply it a second time to prove it is a no-op, then run the verification
queries below.

### Prod

The prod host runs MySQL as a host service. The `quiz` database user already
has `INSERT`/`UPDATE` on `quiz.*` (see `mysql/03_grant_privileges.sql`).
`mysql.env` supplies the host and port, and `quiz.env` supplies the user,
password and database name. `MYSQL_PWD` is exported by `set -a`, so the
password never appears in the process list.

From a checkout that has the migration file, pipe it over SSH:

```bash
ssh <prod-host> '
  set -a
  . ~/.config/xerafin3/mysql.env
  . ~/.config/xerafin3/quiz.env
  set +a
  mysql --protocol=TCP -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" "$MYSQL_DB"
' < mysql/migrations/001_blank_quiz_type.sql
```

If the MySQL client is not installed on the prod host, use
`podman exec -i <mysql-container> mysql ...` instead.

## Verifying

Run these before and after the migration. Before, the first query must return
no row (or one `Blank`) and the second no rows (or the two `Daily Blank` rows);
after, they must return one and two rows. Running the migration again must not
change them.

```sql
SELECT quiz_type, description FROM quiz_type_master WHERE quiz_type = 8;

SELECT sub_id, sub_group, descr, frequency, quiz_type,
       quantity, min_length, max_length
FROM sub_master
WHERE descr IN ('Daily Blank 7s', 'Daily Blank 8s')
ORDER BY sub_id;

SHOW CREATE TABLE sub_master;
-- the trailing AUTO_INCREMENT should be 24 (or higher)
```

`information_schema.TABLES.AUTO_INCREMENT` can be stale until `ANALYZE TABLE`,
so read the value from `SHOW CREATE TABLE` instead.

## Ledger

| File | Issue | Environment | Applied | Result |
|---|---|---|---|---|
| `001_blank_quiz_type.sql` | #813 | prod | pending — apply with the #809 deploy | — |
