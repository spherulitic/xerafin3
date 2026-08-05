# AGENTS.md

Xerafin is a word-study/anagramming web app for word gamers. v3 is a microservice rewrite; every push to `main` rebuilds and redeploys to prod.

## Architecture

- **Monorepo of independently-deployed containers**, one top-level dir per service. CI builds only the dirs changed on `main` (canonical list in `versions.json`). Keep each service self-contained in its own dir.
- **Flask microservices** (Python 3.11, gunicorn, port 5000): `cardbox`, `lexicon`, `login`, `quiz`, `sloth`, `stats`. `chat/` is a **Go 1.22 service** (`chat/cmd`, `chat/internal`), not Flask — the README is stale on this.
- **`frontend/`**: nginx serving a vanilla JS/jQuery Bootstrap SPA (`frontend/html/`) and reverse-proxying every API route. Adding a backend endpoint requires a matching `location` block in `frontend/locations.conf` (included by both `default.conf.dev` and `default.conf.prod`); otherwise it 404s behind nginx.
- **Keycloak** is the IdP; realm `Xerafin`, client `x-client`. Services verify JWTs against the realm public key at `http://keycloak:8080/realms/Xerafin`; `login` uses the Keycloak admin API.
- **Data stores**: MongoDB for the lexicon (populated at startup by `lexicon-loader` from `/var/lib/xerafin/word-data`), plus one MySQL database per service (`chat`, `login`, `quiz`, `stats`, `sloth`); DDL lives in `mysql/`.
- Services reach each other by container name on the `systemd-xerafin` network (e.g. `http://keycloak:8080`, `http://chat:5000`). Dev MySQL host is `host.docker.internal`.
- `lex_update/` is a local-only dictionary-update utility (not deployed); `migration/`, `lexicon-loader/`, and `cron/` are one-off/utility containers not part of `xerafin.target`.

## Build & deploy

- Pushing/merging to `main` triggers `.github/workflows/build-and-push-docker.yml`: builds changed containers, increments `versions.json`, pushes `spherulitic/x-*` images to DockerHub, deploys to prod, and opens a version-update PR. **Do not hand-edit `versions.json`** — CI owns it.
- Each container builds from its dir's `Dockerfile` (`keycloak` uses `Dockerfile.prod`). The frontend takes `--build-arg NGINX_ENV=dev|prod` and `KEYCLOAK_URL`; the `__KEYCLOAK_URL__` placeholder in `index.htm` is sed-replaced at build time.
- Prod runs containers as systemd user services via Podman quadlets (`deploy/*.container`). Committed files use `Image=x-*:latest` and local dev paths; CI rewrites image refs to `docker.io/spherulitic/...`, swaps in LetsEncrypt certs, and fixes the crun runtime path on the server. Don't be misled by the committed `:latest` tags.

## Local dev

- No docker-compose. Credentials live in root `.env` and `config/*.env` (both gitignored); containers run as `deploy/*.container` quadlets. Build images locally as `x-<name>:latest`, e.g. `podman build --build-arg NGINX_ENV=dev -t x-frontend:latest frontend`. **Use `podman`, not `docker`**, for local container work (docker generally works too, but podman matches prod).
- No automated test suite exists. Verify by building/running the container and exercising endpoints.

## Lint & conventions

- `pre-commit` runs: trailing-whitespace, end-of-file-fixer, check-yaml, check-added-large-files, pylint (`.pylintrc`, `fail-under=9.5`), and trufflehog (docker, commit stage). Note `.pre-commit-config.yaml` hardcodes the absolute rcfile path `/home/spherulitic/xerafin3/.pylintrc`.
- **pylint is broken locally**: the hook fails on every file (runtime deps like `dawg_python` aren't installed, so the score collapses below 9.5 even for untouched code). Commit with `git commit --no-verify` to bypass. Fixing this (e.g. a formatter like black instead of pylint) is a known TODO.
- Branch names are issue-number-prefixed (e.g. `174-photo-upload-capability`); commits use conventional prefixes (`feat:`, `ci:`, `build(deps):`).
- Shared utils are **duplicated** per service (`xerafinUtil/xerafinUtil.py` under each of cardbox/login/quiz/sloth/stats, `cardbox/cardbox/xerafinLib.py`, and a top-level `xerafinLib/`). Mirror changes across all copies.
- `.gitignore` is stale: `lex_upd/*` doesn't match the real `lex_update/` dir (its `prob/` and `json/` are populated but untracked); `word-data/` is ignored but required for lexicon loading.
- `.env` contains real-looking credentials — never commit or echo it.
