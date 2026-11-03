# Goongle GitHub sync Worker

This Cloudflare Worker keeps the GitHub token out of the public static website.

## Secret configuration

Create a fine-grained GitHub token owned by `dev4anand`, restricted to the `virtual-warriors` repository, with **Contents: Read and write**. In Cloudflare, add it under the Production environment as a **Secret** named `GH_TOKEN`. For secure lost-device recovery, also create a separate high-entropy **Secret** named `ADMIN_RECOVERY_SECRET` (for example, generate it with `openssl rand -hex 32`). Do not reuse the GitHub token.

Never place the token in a repository file, browser JavaScript, or public JSON.

## Deployment

The Worker source is `worker/index.js`. Deploy the complete current file to the Cloudflare Worker named `go-tracker-sync`. Keep the `GH_TOKEN` and (when using lost-key recovery) `ADMIN_RECOVERY_SECRET` Production Secrets configured. The browser recovery UI requires the updated Worker source and the `ADMIN_RECOVERY_SECRET` secret.

## Endpoints

- `GET /health` — verifies that the Worker and GitHub repository access are available.
- `GET /players` — lists public player records for the in-app dropdown.
- `GET /players/{player-id}` — returns one public player record without its private authentication hash.
- `PUT /players/{player-id}` — validates the player's device key and creates or updates their JSON file.
- `POST /admin/relink/{player-id}` — rotates a lost player device key only when the separate `ADMIN_RECOVERY_SECRET` is supplied. It preserves the existing player history and profile data. The endpoint is restricted by the same official-site Origin check.

The Worker accepts valid calendar dates in `YYYY-MM-DD` format across all months and years. Each answer is stored as either:
- `{"answered": true, "clean": true, "updatedAt": "..."}` for a clean day.
- `{"answered": true, "updatedAt": "..."}` for an answered day without a clean contribution.

The Worker normalizes legacy records on read/write. Previous `went: false` entries become clean contributions. Previous `went: true` entries become answered-only metadata; no red contribution series is retained or returned. Invalid and future day keys are ignored; malformed legacy timestamps receive a deterministic date-based fallback. Writes re-read and merge the record after GitHub SHA conflicts (up to three attempts), so simultaneous tabs are less likely to overwrite each other's days. Player status remains active so check-ins can continue every day.

## Website and storage

The website is hosted at https://dev4anand.github.io/virtual-warriors/ and uses the Worker at https://go-tracker-sync.chknhntr123.workers.dev.

The browser writes to localStorage first, keeps a per-player daily history and device key, then syncs the daily record with the Worker. On site open, it merges local history with the public record by timestamp and retries pending changes. The browser also protects saved answers from being carried into another player's profile. The Pages build runs the regression suite in `tests/core.test.cjs` before publishing.

Each player has a random device-specific key stored in browser localStorage. GitHub stores only the SHA-256 hash. Clearing browser storage loses that device key; cross-device editing requires a recovery-key feature.

Google Calendar is optional and serves only as a reminder/notification channel. Check-in answers and contribution history remain in Goongle.

Player names and daily history are public GitHub repository data. Use a username and do not enter private information.
