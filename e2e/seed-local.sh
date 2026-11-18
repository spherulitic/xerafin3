#!/usr/bin/env bash
# Seeds the local dev stack with the fixtures e2e/blank-quiz.js expects.
#
# Local-only: creates/updates a Keycloak test user, writes four blank quiz JSON
# files into the running quiz container, inserts the matching quiz_master rows
# and bookmarks, and writes the git-ignored e2e/credentials.json.
#
# Re-running resets progress for these quizzes.
set -euo pipefail
cd "$(dirname "$0")/.."

for f in config/keycloak.env config/mysql.env config/quiz.env; do
  if [ -f "$f" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$f"
    set +a
  fi
done

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

E2E_USERNAME="${E2E_USERNAME:-blankqa@example.test}"
E2E_PASSWORD="${E2E_PASSWORD:-$(openssl rand -hex 10)}"
KC_BASE="${KC_BASE:-http://localhost:8080}"
MYSQL_HOST_E2E="${MYSQL_HOST_E2E:-127.0.0.1}"
MYSQL_PORT_E2E="${MYSQL_PORT_E2E:-${MYSQL_PORT:-3306}}"
REALM="${REALM:-Xerafin}"

TOKEN=$(curl -s \
  -d "client_id=admin-cli" \
  --data-urlencode "username=${KEYCLOAK_ADMIN}" \
  --data-urlencode "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  "$KC_BASE/realms/master/protocol/openid-connect/token" | jq -r '.access_token // empty')
[ -n "$TOKEN" ] || { echo "could not get a Keycloak admin token" >&2; exit 1; }

# --- Keycloak test user -----------------------------------------------------
ENCODED_USER=$(printf '%s' "$E2E_USERNAME" | jq -sRr @uri)
USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$KC_BASE/admin/realms/$REALM/users?username=$ENCODED_USER" | jq -r '.[0].id // empty')

BODY=$(jq -n --arg user "$E2E_USERNAME" '{
  username: $user,
  email: $user,
  firstName: "Blank",
  lastName: "QA",
  enabled: true,
  emailVerified: true,
  requiredActions: [],
  attributes: {
    lexicon: ["csw"],
    lexiconVersion: ["24"],
    schedVersion: ["0"],
    newWordsAtOnce: ["4"],
    reschedHrs: ["24"],
    cb0max: ["200"],
    closet: ["20"],
    countryId: ["140"],
    showNumSolutions: ["Y"]
  }
}')

if [ -z "$USER_ID" ]; then
  curl -s -o /dev/null -X POST -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$BODY" "$KC_BASE/admin/realms/$REALM/users"
  USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$KC_BASE/admin/realms/$REALM/users?username=$ENCODED_USER" | jq -r '.[0].id // empty')
else
  curl -s -o /dev/null -X PUT -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$BODY" "$KC_BASE/admin/realms/$REALM/users/$USER_ID"
fi
[ -n "$USER_ID" ] || { echo "could not create/find Keycloak user $E2E_USERNAME" >&2; exit 1; }

curl -s -o /dev/null -X PUT -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg p "$E2E_PASSWORD" '{type:"password", value:$p, temporary:false}')" \
  "$KC_BASE/admin/realms/$REALM/users/$USER_ID/reset-password"

# --- quiz JSON --------------------------------------------------------------
# Written through the quiz container: the host volume is owned by the
# container's mapped uid.
podman exec -i quiz sh -c 'cat > /app/quizjson/990001.json' <<'JSON'
{"name": "Local Blank 7s", "alphagrams": ["AAIINR?", "AAIINT?", "ADIINR?", "AACDER?", "AACDIR?", "AAAADN?"], "id": 990001, "size": 6}
JSON
podman exec -i quiz sh -c 'cat > /app/quizjson/990002.json' <<'JSON'
{"name": "Local Blank 8s", "alphagrams": ["AABCELR?", "AABELPS?", "AABCELS?", "AAAABCL?"], "id": 990002, "size": 4}
JSON
podman exec -i quiz sh -c 'cat > /app/quizjson/990003.json' <<'JSON'
{"name": "Local Blank Invaders", "alphagrams": ["AAIINR?"], "id": 990003, "size": 1}
JSON
podman exec -i quiz sh -c 'cat > /app/quizjson/990004.json' <<'JSON'
{"name": "Local Blank Invaders 2", "alphagrams": ["AAIINR?"], "id": 990004, "size": 1}
JSON

# --- quiz database ----------------------------------------------------------
MYSQL_PWD="$MYSQL_PWD" mysql -h "$MYSQL_HOST_E2E" -P "$MYSQL_PORT_E2E" \
  -u "$MYSQL_USER" "$MYSQL_DB" <<SQL
DELETE FROM user_quiz_bookmark
 WHERE user_id = '$USER_ID' AND quiz_id IN (990001, 990002, 990003, 990004);
DELETE FROM quiz_user_detail
 WHERE user_id = '$USER_ID' AND quiz_id IN (990001, 990002, 990003, 990004);
DELETE FROM quiz_master WHERE quiz_id IN (990001, 990002, 990003, 990004);

INSERT INTO quiz_master
  (quiz_id, quiz_name, quiz_size, expired, creator, create_date,
   length, quiz_type, lexicon, version, sub_id, min_prob, max_prob)
VALUES
  (990001, 'Local Blank 7s', 6, 0, 'e2e', CURDATE(), 7, 2, 'CSW', 24, NULL, NULL, NULL),
  (990002, 'Local Blank 8s', 4, 0, 'e2e', CURDATE(), 8, 2, 'CSW', 24, NULL, NULL, NULL),
  (990003, 'Local Blank Invaders', 1, 0, 'e2e', CURDATE(), 7, 2, 'CSW', 24, NULL, NULL, NULL),
  (990004, 'Local Blank Invaders 2', 1, 0, 'e2e', CURDATE(), 7, 2, 'CSW', 24, NULL, NULL, NULL);

INSERT INTO user_quiz_bookmark (quiz_id, user_id, create_date) VALUES
  (990001, '$USER_ID', CURDATE()),
  (990002, '$USER_ID', CURDATE()),
  (990003, '$USER_ID', CURDATE()),
  (990004, '$USER_ID', CURDATE());
SQL

# --- credentials for the Playwright script ----------------------------------
jq -n --arg id "$USER_ID" --arg username "$E2E_USERNAME" --arg password "$E2E_PASSWORD" \
  '{id: $id, username: $username, password: $password}' > e2e/credentials.json
chmod 600 e2e/credentials.json

echo "Seeded quizzes 990001-990004 for $E2E_USERNAME ($USER_ID)."
echo "Credentials written to e2e/credentials.json."
