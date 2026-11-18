# Blank (?) quiz end-to-end checks

Local-only Playwright script for the blank question UI (issue #812 and the
blank quiz epic #195). It is intentionally **not** wired into CI: it needs the
whole dev stack, Keycloak, a seeded database and a test user.

It exercises:

- Basic Quiz: normal `?` tile/letter, sloth disabled, typo vs wrong vs
  duplicate, red supplied-letter highlight, hints, auto-submit, completion.
- Overview: Reset All returns a blank quiz to unattempted.
- Display/sort: capital letters, vowels-first, consonants-first, shuffle and
  revert, always exactly one `?`.
- Invaders: a blank question resolves typed words, wrong rows and the Solved
  tab.
- Network: a `?` key never leaves `/submitQuestion` for the cardbox, sloth or
  alpha stats, and no leftover JavaScript errors.

Screenshots go to `e2e/shots/`, the per-check results and the network log to
`e2e/results.json`.

## Prerequisites

- A local Xerafin stack with the frontend at `https://localhost:7443/` and a
  quiz/lexicon image that includes #821 / #815 (blank serving).
- `podman`, the repo's `config/*.env` files, and `jq` for the seed script.
- Playwright's Chromium, which the container setup below installs.

## Seed the fixtures

```sh
./e2e/seed-local.sh
```

This creates or updates the `blankqa@example.test` Keycloak user (password is
written to the git-ignored `e2e/credentials.json`), seeds four local quizzes
(ids 990001-990004) into `/var/lib/xerafin/quizjson` and the quiz MySQL
database, and bookmarks them for the test user. Re-running it resets progress
for those quizzes.

## Run it

The repo does not need Node on the host; run Playwright in a container with
the Chromium system dependencies installed:

```sh
podman run -d --name xerafin-e2e --network=host \
  -v "$PWD/e2e:/e2e" -w /e2e \
  -e PLAYWRIGHT_BROWSERS_PATH=/e2e/browsers \
  node:22-bookworm \
  sh -c "npx playwright install-deps chromium && sleep infinity"

podman exec -it xerafin-e2e sh -c "npm install && npx playwright install chromium"
podman exec -it xerafin-e2e npm test
```

`--network=host` is needed because the app is published on the host
(`localhost:7443`) and Keycloak redirects through `auth.localhost:7443`.

Clean up with `podman rm -f xerafin-e2e`; `node_modules/`, `browsers/`,
`shots/`, `results.json` and `credentials.json` are git-ignored.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `E2E_BASE_URL` | `https://localhost:7443/` | frontend URL |
| `E2E_USERNAME` / `E2E_PASSWORD` | from `e2e/credentials.json` | Keycloak login |
| `E2E_CREDENTIALS` | `e2e/credentials.json` | credential file path |
| `E2E_SHOTS` | `e2e/shots` | screenshot directory |
| `E2E_RESULTS` | `e2e/results.json` | result/network log |

## Notes

- Headless Chromium cannot decode the Invaders audio; that one page error is
  filtered and is not an app fault.
- Invaders opens on a prescreen. The script waits for `invader` and presses
  Enter in the answer box to start the game, then polls for the question.
- The script types answers and waits for short UI transitions; it deliberately
  does not do real drag-and-drop, mobile layout or sound.
