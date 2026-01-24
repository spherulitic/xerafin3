-- Migration of login tables -- reference data only
START TRANSACTION;

CREATE TABLE IF NOT EXISTS login.countries LIKE migration.countries;
CREATE TABLE IF NOT EXISTS login.lexicon_info LIKE migration.lexicon_info;

TRUNCATE TABLE login.countries;
TRUNCATE TABLE login.lexicon_info;

INSERT INTO login.countries
(countryId, name, short, countryCode, continent)
SELECT countryId, name, short, countryCode, continent
FROM migration.countries;

INSERT INTO login.lexicon_info
(lexicon, name, release_date, active_date, license, info, country, replaced_by)
SELECT lexicon, name, release_date, active_date, license, info, country, replaced_by
FROM migration.lexicon_info;

COMMIT;
