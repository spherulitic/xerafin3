#!/usr/bin/env bash
#
# Deploy changed Xerafin containers on the prod host.
#
# Called by .github/workflows/build-and-push-docker.yml after the quadlet
# files and this script have been copied to ~/.config/xerafin3/.
#
# Environment:
#   CHANGED         space-separated container names whose image changed
#                   (e.g. "cardbox chat"). Empty for a config-only deploy.
#   CONFIG_CHANGED  "true" when deploy/ (or the workflow/script) changed.
#   DRY_RUN         "1" to print destructive commands instead of running them.
#
# Layer 3 of #472 / #473: restart only the changed units, pre-pull images so
# downloads do not happen inside systemd's start timeout, and fail the job if
# the site or a changed service does not come back.

set -euo pipefail

CHANGED="${CHANGED:-}"
CONFIG_CHANGED="${CONFIG_CHANGED:-false}"
DRY_RUN="${DRY_RUN:-0}"
UNIT_DIR="$HOME/.config/containers/systemd"
SITE_HOST="x3.xerafin.net"
AUTH_HOST="auth.xerafin.net"
HTTPS_PORT="7443"

CHANGED_UNITS=()
if [ -n "$CHANGED" ]; then
  read -r -a CHANGED_UNITS <<< "$CHANGED"
fi
UNITS_TO_CHECK=()

run() {
  if [ "$DRY_RUN" = "1" ]; then
    printf '[dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

fail() {
  echo "DEPLOY FAILED: $*" >&2
  for unit in "${UNITS_TO_CHECK[@]:-}"; do
    [ -n "$unit" ] || continue
    echo "----- systemctl status $unit -----" >&2
    systemctl --user --no-pager status "$unit" 2>&1 | tail -25 >&2 || true
    echo "----- journalctl -u $unit (last 80 lines) -----" >&2
    journalctl --user -u "$unit" -n 80 --no-pager 2>&1 >&2 || true
  done
  exit 1
}

wait_active() {
  local unit="$1" i
  for i in $(seq 1 120); do
    if systemctl --user is-active --quiet "$unit"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

probe_http() {
  local host="$1" path="$2" want="$3" i code
  for i in $(seq 1 100); do
    code=$(curl -sk --max-time 10 -o /dev/null -w '%{http_code}' \
      --resolve "$host:$HTTPS_PORT:127.0.0.1" \
      "https://$host:$HTTPS_PORT$path" || true)
    if [ "$code" = "$want" ]; then
      echo "  $host$path -> $code"
      return 0
    fi
    sleep 3
  done
  echo "probe failed: https://$host:$HTTPS_PORT$path -> ${code:-<none>} (want $want)" >&2
  return 1
}

probe_spec() {
  case "$1" in
    frontend) echo "$SITE_HOST / 200" ;;
    keycloak) echo "$AUTH_HOST /realms/Xerafin 200" ;;
    login)    echo "$SITE_HOST /getCountries 401" ;;
    stats)    echo "$SITE_HOST /get_site_records 401" ;;
    sloth)    echo "$SITE_HOST /getSlothStats 401" ;;
    cardbox)  echo "$SITE_HOST /getCardboxScore 401" ;;
    quiz)     echo "$SITE_HOST /getQuizList 401" ;;
    lexicon)  echo "$SITE_HOST /getAlphagramCounts 401" ;;
    chat)     echo "$SITE_HOST /getChatsInit 401" ;;
    *)        echo "" ;;
  esac
}

echo "Changed images: ${CHANGED:-<none>}"
echo "Config changed: $CONFIG_CHANGED"
echo "Dry run: $DRY_RUN"

# ---------------------------------------------------------------------------
# 1. Apply the prod-only rewrites to the freshly copied quadlet files.
#    The workflow copies deploy/* from the repo each time, so these patterns
#    are present on every deploy.
# ---------------------------------------------------------------------------
if [ "$DRY_RUN" != "1" ]; then
  find "$UNIT_DIR" -name '*.container' -exec sed -i 's|Image=x-|Image=docker.io/spherulitic/x-|' {} \;
  find "$UNIT_DIR" -name '*.container' -exec sed -i 's|--runtime=/home/linuxbrew/.linuxbrew/bin/crun|--runtime=/usr/bin/crun|g' {} \;
  sed -i 's|Volume=/home/spherulitic/xerafin3/frontend/ssl/dev|Volume=/etc/letsencrypt/archive/x3.xerafin.net|' "$UNIT_DIR/keycloak.container"
  sed -i 's|Volume=/home/spherulitic/xerafin3/frontend/ssl/dev:/etc/nginx/ssl:ro|Volume=/etc/letsencrypt/live/x3.xerafin.net/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro\nVolume=/etc/letsencrypt/live/x3.xerafin.net/privkey.pem:/etc/nginx/ssl/privkey.pem:ro|' "$UNIT_DIR/frontend.container"
else
  echo "[dry-run] skipping prod-only sed rewrites"
fi

# ---------------------------------------------------------------------------
# 2. Reload unit files. For a config-only change this is the whole deploy:
#    dependency edits take effect on daemon-reload, no unit is restarted.
# ---------------------------------------------------------------------------
echo "Reloading systemd units"
run systemctl --user daemon-reload || fail "systemctl daemon-reload failed"

if [ "${#CHANGED_UNITS[@]}" -eq 0 ]; then
  echo "No image changes; unit files reloaded, nothing restarted."
  if [ "$DRY_RUN" != "1" ]; then
    probe_http "$SITE_HOST" "/" "200" || fail "site did not respond after daemon-reload"
  fi
  echo "Deploy OK (config-only)"
  exit 0
fi

# ---------------------------------------------------------------------------
# 3. Pre-pull every changed image before touching a running unit, so image
#    downloads do not happen inside systemd's start timeout.
# ---------------------------------------------------------------------------
for c in "${CHANGED_UNITS[@]}"; do
  unit_file="$UNIT_DIR/$c.container"
  [ -f "$unit_file" ] || fail "missing unit file $unit_file"
  image=$(awk -F= '/^Image=/{print $2; exit}' "$unit_file")
  [ -n "$image" ] || fail "no Image= in $unit_file"
  echo "Pulling $image"
  run podman pull "$image" || fail "podman pull failed for $image"
done

# ---------------------------------------------------------------------------
# 4. Restart only the changed units, backends first, frontend last.
# ---------------------------------------------------------------------------
ORDERED_UNITS=()
for c in "${CHANGED_UNITS[@]}"; do
  if [ "$c" != "frontend" ]; then
    ORDERED_UNITS+=("$c")
  fi
done
for c in "${CHANGED_UNITS[@]}"; do
  if [ "$c" = "frontend" ]; then
    ORDERED_UNITS+=("$c")
  fi
done

for c in "${ORDERED_UNITS[@]}"; do
  unit="$c.service"
  UNITS_TO_CHECK+=("$unit")
  echo "Clearing failed state for $unit (if any)"
  run systemctl --user reset-failed "$unit" || true
  echo "Restarting $unit"
  run systemctl --user restart "$unit" || fail "restart failed for $unit"
done

if [ "$DRY_RUN" = "1" ]; then
  echo "[dry-run] skipping health checks"
  exit 0
fi

# ---------------------------------------------------------------------------
# 5. Verify: each changed unit is active and its route through nginx answers
#    with the expected status. This is the gate that CI lacked in #724.
# ---------------------------------------------------------------------------
for c in "${ORDERED_UNITS[@]}"; do
  unit="$c.service"
  echo "Waiting for $unit to be active"
  wait_active "$unit" || fail "$unit did not become active"

  spec=$(probe_spec "$c")
  if [ -n "$spec" ]; then
    read -r host path want <<< "$spec"
    echo "Probing $c"
    probe_http "$host" "$path" "$want" || fail "$c probe failed"
  else
    echo "  no HTTP probe for $c; is-active is enough"
  fi
done

echo "Deploy OK: ${ORDERED_UNITS[*]}"
